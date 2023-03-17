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
    const defaults = config.get("swish.useDefaultDefinitions")
      ? defaultDefinitions
      : [];
    const customs = config.get<RawDefinition[]>("swish.customDefinitions", []);

    const languages: Record<string, Definition[]> = {};
    for (const [langId, definitions] of Object.entries<RawDefinition[]>(
      config.get("swish.languages", {})
    )) {
      const languageDefinitions = definitions.map(Definition.parse);
      langId.split(",").forEach((lang) => {
        languages[lang] = (languages[lang] || []).concat(languageDefinitions);
      });
    }

    return {
      default: [...defaults, ...customs].map(Definition.parse),
      languages,
    };
  };

  const provider = new MappingProvider(getDefinitions());

  let disposable;

  disposable = vscode.workspace.onDidChangeConfiguration((e) => {
    if (
      [
        "soti.swish.useDefaultDefinitions",
        "soti.swish.customDefinitions",
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
          if (def.options.wordBoundaries) {
            const wordRange = document.getWordRangeAtPosition(selection.end);
            if (wordRange) {
              const text = document.getText(wordRange);
              if (def.match(text)) {
                const result = text.replace(def.regexp, def.value);
                return new Match(def, wordRange, result);
              }
            }
          }

          const line = selection.end.line;
          const textLine = document.lineAt(line);
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
  private _definition: Definition;
  private _range: Range;
  private _finalValue: string;

  constructor(definition: Definition, range: Range, finalValue: string) {
    this._definition = definition;
    this._range = range;
    this._finalValue = finalValue;
  }

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
    return this._range.isEmpty;
  }

  get range(): Range {
    return this._range;
  }

  get finalValue() {
    return this._finalValue;
  }
}

type Context = { lang?: string };

type SetOfDefinitions = {
  default: Definition[];
  languages: Record<string, Definition[]>;
};

class MappingProvider {
  private _definitions: Definition[] = [];
  private _languages: Record<string, Definition[]> = {};

  constructor(definitions: SetOfDefinitions) {
    this.setDefinitions(definitions);
  }

  setDefinitions(definitions: SetOfDefinitions) {
    this._definitions = definitions.default;
    this._languages = definitions.languages;
  }

  match(context: Context, handle: Matcher): Match | undefined {
    let minMatch: Match | undefined = undefined;
    const langDefinitions = context.lang
      ? this._languages[context.lang] || []
      : [];
    const definitions = [...this._definitions, ...langDefinitions];
    for (let index = 0; index < definitions.length; index++) {
      const definition = definitions[index];
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
