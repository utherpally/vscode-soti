import type {Range} from "vscode";
type Matcher = (definition: Definition) => Match | undefined;

export type RawDefinition = [string, string, string] | [string, string];

type DefinitionOptions = {
  wordBoundaries: boolean;
  ignoreCase: boolean;
};
export class Definition {
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

export class Match {
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

export type Context = { lang?: string };

type SetOfDefinitions = {
  default: Definition[];
  languages: Record<string, Definition[]>;
};

export class MappingProvider {
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
