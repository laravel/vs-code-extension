# Contributing

To get the extension running locally:

```
git clone https://github.com/laravel/vs-code-extension.git
cd vs-code-extension
npm install
```

- Open the project in VS Code
- Open the command palette and search for "Debug: Start Debugging"
- A new VS Code window will open, you'll see "[Extension Development Host]" in the title
- Open any folder you'd like to test against
- Press `⌘ + R` to reload the Extension Development Host project and see changes

## Of Note

- `console.log` will appear in your main VS Code "Debug Console" tab, _not_ the Extension Development Host window
- `info`, `error`, etc from `src/support/logger.ts` will show up in the "Output" tab (make sure to select "Laravel" from the list) of your Extension Development Host window

## Testing the LSP

The [Laravel LSP](https://github.com/laravel/lsp) is a standalone binary that powers language-server behavior, item detection, and autocomplete.

If you are making changes to the LSP, create an `.env` file at the root of the `vs-code-extension` with the full path to this variable set:

`LARAVEL_LSP_BINARY_PATH=[FULL PATH TO DIRECTORY]/lsp/server`

If you make changes to your `.env` file, you'll have to close the Extension Development Host and start debugging again.
