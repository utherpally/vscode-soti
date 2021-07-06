# Swish

Switch segments of text with predefined replacements

## Usage

This plugin export default binding: `Alt+b`

You can re-binding command: `swish.switch`

## Configuration Options

```jsonc
"useDefaultDefinitions": true,
// All languages
"customDefinitions": [
    // [source, replacement, optional flags]
    ["hello", "hi", "b"],  // str.replace(/\bhello\b/g, "hi")
    ["foo", "bar", "i"],  // source will match: Foo, foo, FOO
    ["(\\d+)", "numbers: $1"]  // foo12  => numbers: 12
]
// Per languages
"languages": {
    "javascript,typescript": [
        // List of definitions here ...
    ]
}
```

`flags` includes:

* `b`: Word boundaries
* `i`: Ignore case

**_NOTE_**: The cursor must be inside `source` text and match single line of text

## TODO

* [ ] Add tests
* [ ] Increment/Decrement numbers
* [ ] Increment/Decrement date, datetimes

## Known bugs

When change text with long length to shorter text length will move cursor to unexpected position.
