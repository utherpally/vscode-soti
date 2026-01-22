import * as vscode from "vscode";
import * as vsctm from "vscode-textmate";
import * as fs from "fs";
import * as path from "path";
import DocumentMaskManager from "./document-manager";
import * as oniguruma from "vscode-oniguruma"

/**
 * A wrapper around fs.readFile which returns a Promise
 */

function readFile(path: string): Promise<string> {
    return new Promise((resolve, reject) => {
        fs.readFile(path, (error, data) => error ? reject(error) : resolve(data.toString()));
    })
}

const wasmBin = fs.readFileSync(path.join(__dirname, 'onig.wasm')).buffer as ArrayBuffer;
const vscodeOnigurumaLib = oniguruma.loadWASM(wasmBin).then(() => {
    return {
        createOnigScanner(patterns: string[]) { return new oniguruma.OnigScanner(patterns); },
        createOnigString(s: string) { return new oniguruma.OnigString(s); }
    } as vsctm.IOnigLib;
});

/**
 * The textmate grammar registry.
 * Used to load textmate grammars
 */
const registry = new vsctm.Registry({
    onigLib: vscodeOnigurumaLib,
	/**
	 * Load the grammar for a given scope name
	 */
	loadGrammar: async (scopeName: string) => {
		for (const extension of vscode.extensions.all) {
			const grammars = extension.packageJSON.contributes?.grammars;
			if (grammars && grammars instanceof Array) {
				for (const grammar of grammars) {
					if (grammar.scopeName === scopeName) {
						const filePath = path.resolve(extension.extensionPath, grammar.path);
						const rawGrammar = await readFile(filePath);
						return vsctm.parseRawGrammar(rawGrammar, filePath);
					}
				}
			}
		}
		return null;
	}
});

/**
 * Get the textmate scope name for a given language id. (i.e. 'typescript')
 * This method is required when loading the textmate grammar for the language,
 * because the textmate scope must be used.
 */
const getLanguageScopeName = (languageId?: string) => {
	if (!languageId) {
		return null;
	}

	for (const extension of vscode.extensions.all) {
		const grammars = extension.packageJSON.contributes?.grammars;
		if (grammars && grammars instanceof Array) {
			for (const grammar of grammars) {
				if (grammar.language === languageId) {
					return grammar.scopeName;
				}
			}
		}
	}
	return null;
};

export function activate(context: vscode.ExtensionContext) {
	let configuration = vscode.workspace.getConfiguration();

	// Create the document mask manager
	const manager = new DocumentMaskManager(registry, getLanguageScopeName);

	// Helper to get user masks from configuration
	const getUserMasks = () => configuration.get("soti.masks") as any;

	/**
	 * Initialize masks for all currently visible editors
	 */
	const initializeVisibleEditors = async () => {
		const visibleEditors = vscode.window.visibleTextEditors;
		for (const editor of visibleEditors) {
			await manager.updateMasks(editor, getUserMasks());
		}
	};

	// Initialize on activation
	initializeVisibleEditors();

	/**
	 * Update masks when visible editors change
	 * (new editors opened, editors closed, split view changes)
	 */
	vscode.window.onDidChangeVisibleTextEditors(async editors => {
		// Update all visible editors
		for (const editor of editors) {
			manager.debounceUpdateMasks(editor, getUserMasks());
		}
	}, null, context.subscriptions);

	/**
	 * Clean up when a document is closed
	 */
	vscode.workspace.onDidCloseTextDocument(document => {
		manager.removeInstance(document.uri.toString());
	}, null, context.subscriptions);

	/**
	 * Update masks when a document is saved
	 * (because the file could have just obtained a grammar, or obtained a different one)
	 */
	vscode.workspace.onDidSaveTextDocument(async document => {
		// Find the editor(s) showing this document
		const editors = vscode.window.visibleTextEditors.filter(
			editor => editor.document.uri.toString() === document.uri.toString()
		);

		for (const editor of editors) {
			await manager.reloadGrammar(editor);
			manager.debounceUpdateMasks(editor, getUserMasks());
		}
	}, null, context.subscriptions);

	/**
	 * Update masks when document content changes
	 */
	vscode.workspace.onDidChangeTextDocument(async event => {
		// Find the editor(s) showing this document
		const editors = vscode.window.visibleTextEditors.filter(
			editor => editor.document.uri.toString() === event.document.uri.toString()
		);

		for (const editor of editors) {
			// Retokenize if the document is dirty
			manager.retokenizeIfDirty(editor);
			// Update masks with longer debounce to reduce flickering
			manager.debounceUpdateMasks(editor, getUserMasks(), 200);
		}
	}, null, context.subscriptions);

	/**
	 * Update masks when the text editor selection changes
	 * (for cursor-based mask hiding)
	 */
	vscode.window.onDidChangeTextEditorSelection(async event => {
		// Only update for cursor movement, not text changes
		// Use shorter debounce for responsive cursor-based hiding
		manager.debounceUpdateMasks(event.textEditor, getUserMasks(), 50);
	}, null, context.subscriptions);

	/**
	 * Update all visible editors when configuration changes
	 */
	vscode.workspace.onDidChangeConfiguration(async event => {
		if (event.affectsConfiguration("soti.masks")) {
			configuration = vscode.workspace.getConfiguration();
			await manager.updateAllVisibleMasks(getUserMasks());
		}
	}, null, context.subscriptions);

	// Clean up on deactivation
	context.subscriptions.push({
		dispose: () => manager.dispose()
	});
}
