import type { Range } from "vscode";
import * as vscode from "vscode";
import { editSelections } from "../utils";

export const swish = (
  context: vscode.ExtensionContext,
  outputChannel: vscode.OutputChannel
) => {
  const defaultDefinitions: RawDefinition[] = [
    ["True", "False", "b"],
    ["False", "True", "b"],
    ["true", "false", "b"],
    ["false", "true", "b"],
    ["on", "off", "b"],
    ["off", "on", "b"],
  ];

  const getDefinitions = () => {
    const config = vscode.workspace.getConfiguration("soti");
    const defaultGlobal = config.get("swish.useDefault")
      ? defaultDefinitions
      : [];
    const globals = config
      .get<RawDefinition[]>("swish.global", [])
      .concat(defaultGlobal)
      .map(Definition.parse);

    const languages: Record<string, Definition[]> = {};
    for (const [langId, definitions] of Object.entries<RawDefinition[]>(
      config.get("swish.languages", {})
    )) {
      langId.split(",").forEach((lang) => {
        if (lang) {
          languages[lang] = (languages[lang] || []).concat(
            definitions.map(Definition.parse)
          );
        }
      });
    }

    outputChannel.appendLine(JSON.stringify(globals));
    return {
      globals,
      languages,
    };
  };

  const provider = new MappingProvider(getDefinitions());

  let disposable;

  disposable = vscode.workspace.onDidChangeConfiguration((e) => {
    if (
      [
        "soti.swish.useDefault",
        "soti.swish.global",
        "soti.swish.languages",
      ].some((c) => e.affectsConfiguration(c))
    ) {
      provider.setDefinitions(getDefinitions());
      outputChannel.appendLine("Swish dfinitions reloaded.");
    }
  });
  context.subscriptions.push(disposable);

  disposable = vscode.commands.registerCommand("soti.swish", () => {
    editSelections((document, selection) => {
      const match = provider.match(
        {
          lang: document.languageId,
        },
        (def) => {
          const reg = def.regexp;
          reg.lastIndex = 0;
          if (def.options.wordBoundaries) {
            const wordRange = document.getWordRangeAtPosition(selection.end);
            if (wordRange) {
              const text = document.getText(wordRange);
              if (def.match(text)) {
                const result = text.replace(reg, def.value);
                return new Match(def, wordRange, result);
              }
            }
          }

          const line = selection.end.line;
          const textLine = document.lineAt(line);
          let match;
          while ((match = reg.exec(textLine.text))) {
            const range = new vscode.Range(
              line,
              match.index,
              line,
              reg.lastIndex
            );
            if (range.contains(selection)) {
              const text = document.getText(range);
              reg.lastIndex = 0;
              return new Match(def, range, text.replace(reg, def.value));
            }
          }
        }
      );

      if (match) {
        return { location: match.range, text: match.finalValue };
      }
    });
  });

  context.subscriptions.push(disposable);
};

type Matcher = (definition: Definition) => Match | undefined;

type RawDefinition = [string, string, string] | [string, string];

type DefinitionOptions = {
  wordBoundaries: boolean;
  ignoreCase: boolean;
};
class Definition {
  public key: string;
  public value: string;
  public options: DefinitionOptions;
  public regexp: RegExp;

  constructor(key: string, value: string, options?: DefinitionOptions) {
    this.key = key;
    this.value = value;
    this.options = options || {
      wordBoundaries: false,
      ignoreCase: false,
    };
    let pattern = this.key;
    let flags = "g";
    if (this.options.wordBoundaries) {
      pattern = `\\b${pattern}\\b`;
    }
    if (this.options.ignoreCase) {
      flags += "i";
    }
    this.regexp = new RegExp(pattern, flags);
  }

  static parse([key, value, flags]: RawDefinition) {
    const options = flags
      ? {
          wordBoundaries: flags.includes("b"),
          ignoreCase: flags.includes("i"),
        }
      : undefined;
    return new Definition(key, value, options);
  }

  match(text: string): boolean {
    const res = this.regexp.test(text);
    this.regexp.lastIndex = 0;
    return res;
  }
}

class Match {
  constructor(
    private definition: Definition,
    public range: Range,
    public finalValue: string
  ) {}

  isBetter(other: Match): boolean {
    if (this.isEmpty) {
      return false;
    } else if (other.isEmpty) {
      return true;
    } else if (other.range.contains(this.range)) {
      return true;
    }
    return false;
  }

  get isEmpty(): boolean {
    return this.range.isEmpty;
  }
}

type Context = { lang?: string };

interface SetOfDefinitions {
  globals: Definition[];
  languages: Record<string, Definition[]>;
};

class MappingProvider {
  private globals: Definition[] = [];
  private languages: Record<string, Definition[]> = {};

  constructor(definitions: SetOfDefinitions) {
    this.setDefinitions(definitions);
  }

  public setDefinitions(definitions: SetOfDefinitions) {
    Object.assign(this, definitions);
  }

  public match(context: Context, handle: Matcher) {
    const minMatch = this._match(this.globals, handle);
    return context.lang
      ? this._match(this.languages[context.lang] ?? [], handle, minMatch)
      : minMatch;
  }
  private _match(definitions: Definition[], handle: Matcher, minMatch?: Match) {
    for (const definition of definitions) {
      const match = handle(definition);
      if (match) {
        if (!minMatch) {
          minMatch = match;
        } else if (match.isBetter(minMatch)) {
          minMatch = match;
        }
      }
    }
    return minMatch;
  }
}
