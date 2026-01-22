# Soti

A VS Code extension that provides multiple text manipulation and visualization features for enhanced productivity.

## Features

### Swish

Switch segments of text with predefined replacements using pattern matching.

**Default keybinding:** `Alt+b`

**Command:** `soti.swish`

#### Example Configuration

```jsonc
{
  "soti.swish.useDefault": true,

  // Global definitions (all languages)
  "soti.swish.global": [
    // [source, replacement, optional flags]
    ["hello", "hi", "b"],  // str.replace(/\bhello\b/g, "hi")
    ["foo", "bar", "i"],   // source will match: Foo, foo, FOO
    ["(\\d+)", "numbers: $1"]  // foo12 => numbers: 12
  ],

  // Per-language definitions
  "soti.swish.languages": {
    "javascript": [
      // List of definitions here...
    ],
    "typescript": [
      // List of definitions here...
    ]
  }
}
```

**Flags:**
* `b`: Word boundaries
* `i`: Ignore case

**Note:** The cursor must be inside the source text and match a single line of text only.

### Emoji Commit

Generate random emojis for your Git commits directly from the Source Control view.

Click the emoji icon in the SCM title bar to insert a random emoji into your commit message.

**Command:** `soti.emojiCommit`

### Color Converter

Convert colors between different formats with ease.

**Available Commands:**
* `Convert Color to hsl/hsla()` - Convert to HSL format
* `Convert Color to rgb/rgba()` - Convert to RGB format
* `Convert Color to hsl/hsla channel` - Convert to HSL channel format
* `Convert Color to rgb/rgba channel` - Convert to RGB channel format

Select a color value in your editor and run one of the conversion commands from the Command Palette.

### Masks

Visual text replacement using TextMate grammars. Replace code patterns with custom symbols while keeping the actual code unchanged.

#### Example Configuration

```jsonc
{
  "soti.masks": [
    {
      // Single language ID (string)
      "selector": "typescript",
      "patterns": [
        {
          "pattern": "(?<=[\\b\\s])===(?=[\\b\\s])",
          "replace": "≡"
        },
        {
          "pattern": "!==",
          "replace": "≢"
        }
      ]
    },
    {
      // Array of language IDs
      "selector": ["typescript", "javascript"],
      "patterns": [
        {
          "pattern": "=>",
          "replace": "⇒"
        }
      ]
    },
    {
      // DocumentFilter object for file pattern matching
      "selector": { "pattern": "**/*.{js,jsx}" },
      "patterns": [
        {
          "pattern": "function",
          "replace": "ƒ"
        }
      ]
    },
    {
      // DocumentFilter with multiple properties
      "selector": {
        "language": "typescript",
        "pattern": "**/test/**"
      },
      "patterns": [
        {
          "pattern": "&&",
          "replace": "∧"
        }
      ]
    },
    {
      // Array of DocumentFilters
      "selector": [
        { "language": "javascript" },
        { "pattern": "**/*.vue" },
        { "language": "typescript", "scheme": "file" }
      ],
      "patterns": [
        {
          "pattern": "||",
          "replace": "∨"
        }
      ]
    }
  ]
}
```

**Selector:**

The `selector` field determines which files the mask patterns will apply to. You can use:

* **Language ID (string)**: `"typescript"` - matches files with that language ID
* **Array of language IDs**: `["typescript", "javascript"]` - matches any of those languages
* **DocumentFilter (object)**: For more advanced matching with the following properties:
  * `language`: Language ID like `"typescript"`
  * `pattern`: Glob pattern matched on absolute path like `"**/*.test.ts"` or `"**/src/**"`
  * `scheme`: URI scheme like `"file"` or `"untitled"`
  * `notebookType`: Notebook type like `"jupyter-notebook"`
* **Array of DocumentFilters**: Combines multiple filter objects

**Pattern Options:**
* `pattern` (required): The regex pattern to match
* `replace`: The text or object defining the visual replacement
* `scope`: Optional TextMate scope to restrict matches
* `ignoreCase`: Whether to ignore case when matching
* `style`: Styling options (backgroundColor, color, fontStyle, fontWeight, border, css)

Use "Developer: Inspect Editor Tokens and Scopes" to find scope names for precise pattern matching.

## License

MIT

## Repository

[https://github.com/utherpally/vscode-soti](https://github.com/utherpally/vscode-soti)

## Issues

Report issues at: [https://github.com/utherpally/vscode-soti/issues](https://github.com/utherpally/vscode-soti/issues)
