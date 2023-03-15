# Yo

Yolo

## Usage

### Swish

Switch segments of text with predefined replacements

Default binding: `Alt+b`

You can re-binding command: `yo.swish`

Example Configuration:
```jsonc
"yo.swish.useDefaultDefinitions": true,
// All languages
"yo.swish.customDefinitions": [
    // [source, replacement, optional flags]
    ["hello", "hi", "b"],  // str.replace(/\bhello\b/g, "hi")
    ["foo", "bar", "i"],  // source will match: Foo, foo, FOO
    ["(\\d+)", "numbers: $1"]  // foo12  => numbers: 12
]
// Per languages
"yo.swish.languages": {
    "javascript,typescript": [
        // List of definitions here ...
    ]
}
```

`flags` includes:

* `b`: Word boundaries
* `i`: Ignore case

**_NOTE_**: The cursor must be inside the `source` text and match a single line of text only.

**_Known bugs_**: When you change text from a longer length to a shorter length, the cursor may move to an unexpected positio

### Emoji Commit

Generate random emojis for your WIP commits!!
