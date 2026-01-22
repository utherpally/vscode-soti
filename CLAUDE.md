# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Soti is a VS Code extension that provides multiple text manipulation and visualization features:
- **Swish**: Text replacement with predefined patterns
- **Emoji Commit**: Random emoji generator for Git commits
- **Color Converter**: Convert colors between different formats (RGB, HSL, channels)
- **Masks**: Visual text replacement using TextMate grammars

## Development Commands

```bash
# Build the extension (bundles with esbuild and copies WASM files)
npm run build

# Watch mode for development (auto-rebuilds on file changes)
npm run watch

# Lint the code
npm run lint

# Auto-fix linting issues
npm run lint:fix

# Create a new release (bumps version, tags, commits, and pushes)
npm run release

# Prepare for publishing to VS Code marketplace
npm run vscode:prepublish
```

## Project Structure

```
src/
├── extension.ts              # Main entry point, activates all features
├── lib/
│   ├── index.ts             # Feature exports
│   ├── swish/               # Text replacement engine
│   ├── emoji-commit/        # Git commit emoji feature
│   ├── color/               # Color conversion utilities
│   ├── mask/                # TextMate-based text masking
│   │   ├── index.ts         # Main mask activation
│   │   ├── controller.ts    # Manages decorations
│   │   └── scoped-document.ts # Document tokenization
│   └── utils.ts             # Shared utilities
```

## Architecture

### Extension Activation
- Entry point: `src/extension.ts`
- All features are registered in the `activate()` function
- Each feature module exports an activation function that accepts `ExtensionContext` and optionally `OutputChannel`

### Feature Modules

**Swish** (`src/lib/swish/index.ts`):
- Pattern-based text replacement using regex
- Supports global and language-specific definitions
- Uses a `MappingProvider` to manage definitions
- Matches are prioritized by specificity (smaller ranges preferred)

**Emoji Commit** (`src/lib/emoji-commit/index.ts`):
- Integrates with VS Code's built-in Git extension API
- Adds emoji to Git commit message input box
- Accessible from SCM view title bar

**Color Converter** (`src/lib/color/index.ts`):
- Uses the `color` npm package for parsing and conversion
- Converts selected color text to: HSL, RGB, or channel formats
- Operates on current selection using `editSelections` utility

**Masks** (`src/lib/mask/index.ts`):
- Uses `vscode-textmate` and `vscode-oniguruma` for TextMate grammar support
- Applies visual replacements to code based on regex patterns and TextMate scopes
- `ScopedDocument` tokenizes the document using TextMate grammars
- `MaskController` manages VS Code decorations for visual replacements
- WASM file (`onig.wasm`) must be copied to `out/` directory during build

### Key Implementation Details

1. **Build System**: The extension uses esbuild (`esbuild.js`) to bundle all TypeScript code and dependencies into a single optimized `out/extension.js` file. This ensures all npm dependencies (like the `color` package) are included in the distribution.

2. **WASM Dependency**: The mask feature requires `onig.wasm` from `vscode-oniguruma`. The esbuild plugin automatically copies this to `out/node_modules/vscode-oniguruma/release/` during the build process.

3. **Shared Utilities** (`src/lib/utils.ts`): Contains `editSelections()` helper that applies edits to all current selections.

4. **Configuration**: All features use the `soti.*` configuration namespace. Settings are defined in `package.json` under `contributes.configuration`.

5. **Commands**: Commands follow the pattern `soti.<feature>.<action>`. All are registered in `package.json` under `contributes.commands`.

## Debugging

Use VS Code's built-in debugger:
- Press F5 to launch the extension in development mode
- The default build task (`npm run watch`) runs automatically before launch
- Two launch configurations available:
  - "Launch Extension": Opens a new VS Code window with the extension loaded
  - "Extension Tests": Runs extension tests

## Configuration Schema

The extension uses complex configuration for masks, which includes:
- Language selectors
- Pattern matching with regex
- Scope-based filtering using TextMate scopes
- Styling options (colors, fonts, decorations)

Refer to `package.json` lines 82-215 for the complete configuration schema.
