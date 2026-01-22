import * as vscode from "vscode";
import * as vsctm from "vscode-textmate";
import MaskController from "./controller";
import ScopedDocument from "./scoped-document";

interface InstanceData {
	controller: MaskController;
	scopedDocument: ScopedDocument;
	debounceTimer?: NodeJS.Timeout;
}

/**
 * Manages mask controllers and scoped documents for multiple visible editors.
 * Each document gets its own controller and scoped document instance to maintain
 * independent grammar state and decorations.
 */
export default class DocumentMaskManager {
	private instances: Map<string, InstanceData>;
	private registry: vsctm.Registry;
	private getLanguageScopeName: (languageId?: string) => string | null;

	constructor(
		registry: vsctm.Registry,
		getLanguageScopeName: (languageId?: string) => string | null
	) {
		this.instances = new Map();
		this.registry = registry;
		this.getLanguageScopeName = getLanguageScopeName;
	}

	/**
	 * Get or create a controller and scoped document instance for the given editor
	 */
	async getOrCreateInstance(editor: vscode.TextEditor): Promise<InstanceData> {
		const uri = editor.document.uri.toString();

		// Return existing instance if available
		if (this.instances.has(uri)) {
			const instance = this.instances.get(uri)!;
			// Update the editor reference in the controller
			instance.controller.setEditor(editor, false); // Don't clear decorations
			return instance;
		}

		// Create new instance
		const controller = new MaskController(editor);
		const scopedDocument = new ScopedDocument(editor.document);
		controller.setScopedDocument(scopedDocument);

		const instance: InstanceData = {
			controller,
			scopedDocument
		};

		this.instances.set(uri, instance);

		// Load grammar and tokenize
		const languageScopeName = this.getLanguageScopeName(editor.document.languageId);
		if (languageScopeName) {
			try {
				const grammar = await this.registry.loadGrammar(languageScopeName);
				scopedDocument.setGrammar(grammar);
				scopedDocument.tokenize();
			} catch (err) {
				console.error("Failed to load grammar:", err);
				scopedDocument.clearGrammar();
			}
		}

		return instance;
	}

	/**
	 * Remove and dispose of an instance for the given document URI
	 */
	removeInstance(uri: string) {
		const instance = this.instances.get(uri);
		if (instance) {
			// Clear any pending debounce timer
			if (instance.debounceTimer) {
				clearTimeout(instance.debounceTimer);
			}
			// Clear decorations
			instance.controller.clear();
			// Remove from map
			this.instances.delete(uri);
		}
	}

	/**
	 * Update masks for a specific editor
	 */
	async updateMasks(editor: vscode.TextEditor, userMasks: any[], clearFirst = false) {
		try {
			const instance = await this.getOrCreateInstance(editor);
			const document = instance.scopedDocument.getDocument();

			if (!document) {
				return;
			}

			// Clear decorations and reset active patterns if explicitly requested (e.g., config changes)
			// Otherwise just reset active patterns to track the new update cycle
			if (clearFirst) {
				instance.controller.clear();
			} else {
				instance.controller.resetActivePatterns();
			}

			// Apply masks that match this document's language
			for (const mask of userMasks) {
				if (vscode.languages.match(mask.selector, document) > 0) {
					for (const pattern of mask.patterns) {
						const regex = new RegExp(pattern.pattern, pattern.ignoreCase ? "ig" : "g");
						instance.controller.apply(regex, {
							text: pattern.replace,
							scope: pattern.scope,
							hover: pattern.hover,
							backgroundColor: pattern.style?.backgroundColor,
							border: pattern.style?.border,
							borderColor: pattern.style?.borderColor,
							color: pattern.style?.color,
							fontStyle: pattern.style?.fontStyle,
							fontWeight: pattern.style?.fontWeight,
							css: pattern.style?.css
						});
					}
				}
			}

			// Finalize decorations and clean up unused patterns
			instance.controller.finalizeDecorations();
		} catch (err) {
			console.error("Error updating masks:", err);
		}
	}

	/**
	 * Debounced version of updateMasks for a specific editor
	 */
	debounceUpdateMasks(editor: vscode.TextEditor, userMasks: any[], delay = 200, clearFirst = false) {
		const uri = editor.document.uri.toString();
		const instance = this.instances.get(uri);

		if (instance) {
			// Clear existing timer for this document
			if (instance.debounceTimer) {
				clearTimeout(instance.debounceTimer);
			}

			// Set new timer
			instance.debounceTimer = setTimeout(() => {
				this.updateMasks(editor, userMasks, clearFirst);
			}, delay);
		} else {
			// If instance doesn't exist yet, create it and update immediately
			this.updateMasks(editor, userMasks, clearFirst);
		}
	}

	/**
	 * Update masks for all visible editors
	 */
	async updateAllVisibleMasks(userMasks: any[], clearFirst = true) {
		const visibleEditors = vscode.window.visibleTextEditors;

		for (const editor of visibleEditors) {
			await this.updateMasks(editor, userMasks, clearFirst);
		}
	}

	/**
	 * Reload grammar and retokenize for a specific document
	 */
	async reloadGrammar(editor: vscode.TextEditor) {
		const uri = editor.document.uri.toString();
		const instance = this.instances.get(uri);

		if (instance) {
			const languageScopeName = this.getLanguageScopeName(editor.document.languageId);
			if (languageScopeName) {
				try {
					const grammar = await this.registry.loadGrammar(languageScopeName);
					instance.scopedDocument.setGrammar(grammar);
					instance.scopedDocument.tokenize();
				} catch (err) {
					console.error("Failed to reload grammar:", err);
					instance.scopedDocument.clearGrammar();
				}
			}
		}
	}

	/**
	 * Retokenize a document if it's dirty
	 */
	retokenizeIfDirty(editor: vscode.TextEditor) {
		const uri = editor.document.uri.toString();
		const instance = this.instances.get(uri);

		if (instance && editor.document.isDirty) {
			instance.scopedDocument.tokenize();
		}
	}

	/**
	 * Check if an editor is currently managed
	 */
	hasInstance(editor: vscode.TextEditor): boolean {
		return this.instances.has(editor.document.uri.toString());
	}

	/**
	 * Dispose all instances
	 */
	dispose() {
		for (const [uri, instance] of this.instances) {
			if (instance.debounceTimer) {
				clearTimeout(instance.debounceTimer);
			}
			instance.controller.clear();
		}
		this.instances.clear();
	}
}
