import * as vscode from "vscode";

export const editSelections = (
  callback: (
    document: vscode.TextDocument,
    selection: vscode.Selection
  ) =>
    | {
        location?: vscode.Selection | vscode.Range | vscode.Position;
        text: string;
      }
    | null
    | undefined
    | void
    | string
) => {
  const editor = vscode.window.activeTextEditor;
  if (!editor) {
    return;
  }
  const { document, selections } = editor;
  editor.edit((e) =>
    selections.forEach((selection) => {
      const replaced = callback(document, selection);
      if (replaced != null) {
        if (typeof replaced === "string") {
          e.replace(selection, replaced);
        } else {
          e.replace(replaced.location ?? selection, replaced.text);
        }
      }
    })
  );
};
