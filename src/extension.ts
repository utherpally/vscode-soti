import * as vscode from "vscode";
import {RawDefinition, Definition, MappingProvider, Context, Match} from './lib';

let outputChannel: vscode.OutputChannel;
export function activate(context: vscode.ExtensionContext) {
  outputChannel = vscode.window.createOutputChannel("Swish");

  const defaultDefinitions: RawDefinition[] = [
    ["True", "False", "b"],
    ["False", "True", "b"],
    ["true", "false", "b"],
    ["false", "true", "b"],
    ["on", "off", "b"],
    ["off", "on", "b"],
  ];

  const getDefinitions = () => {
    const config = vscode.workspace.getConfiguration("swish");
    const defaults = config.get("useDefaultDefinitions")
      ? defaultDefinitions
      : [];
    const customs = config.get<RawDefinition[]>("customDefinitions", []);

    const languages: Record<string, Definition[]> = {};
    Object.entries<RawDefinition[]>(config.get("languages", {})).forEach(
      ([langId, definitions]) => {
        const languageDefinitions = definitions.map(Definition.parse);
        langId.split(",").forEach((lang) => {
          languages[lang] = (languages[lang] || []).concat(languageDefinitions);
        });
      }
    );

    return {
      default: [...defaults, ...customs].map(Definition.parse),
      languages,
    };
  };

  const provider = new MappingProvider(getDefinitions());

  let disposable;

  disposable = vscode.workspace.onDidChangeConfiguration((e) => {
    debugger;
    if (
      [
        "swish.useDefaultDefinitions",
        "swish.customDefinitions",
        "swish.languages",
      ].some((c) => e.affectsConfiguration(c))
    ) {
      provider.setDefinitions(getDefinitions());
      outputChannel.appendLine("Definitions reloaded.");
    }
  });
  context.subscriptions.push(disposable);

  disposable = vscode.commands.registerCommand("swish.switch", () => {
    const editor = vscode.window.activeTextEditor;
    if (editor) {
      const getMatch = (selection: vscode.Selection, context: Context) => {
        return provider.match(context, (def) => {
          if (def.options.wordBoundaries) {
            const wordRange = editor.document.getWordRangeAtPosition(
              selection.end
            );
            if (wordRange) {
              const text = editor.document.getText(wordRange);
              if (def.match(text)) {
                const result = text.replace(def.regexp, def.value);
                return new Match(def, wordRange, result);
              }
            }
          }

          const line = selection.end.line;
          const textLine = editor.document.lineAt(line);
          const reg = def.regexp;
          reg.lastIndex = 0;
          let match;
          while ((match = reg.exec(textLine.text))) {
            const range = new vscode.Range(
              line,
              match.index,
              line,
              reg.lastIndex
            );
            if (range.contains(selection)) {
              const text = editor.document.getText(range);
              reg.lastIndex = 0;
              return new Match(def, range, text.replace(reg, def.value));
            }
          }
          return undefined;
        });
      };
      const context = {
        lang: editor.document.languageId,
      };
      editor.selections.forEach((selection) => {
        const match = getMatch(selection, context);
        if (match) {
          editor.edit((e) => e.replace(match.range, match.finalValue));
        }
      });
    }
  });

  context.subscriptions.push(disposable);
}

export function deactivate() {
  if (outputChannel) {
    outputChannel.dispose();
  }
}
