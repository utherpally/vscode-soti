import { Project } from "ts-morph";
import * as vscode from "vscode";

function documentRange(document: vscode.TextDocument) {
  const firstLine = document.lineAt(0); // Get the first line of the document
  const lastLine = document.lineAt(document.lineCount - 1); // Get the last line of the document
  const range = new vscode.Range(firstLine.range.start, lastLine.range.end); // Create a range from the start of the first line to the end of the last line
  return range;
}

export const tsSorter = (
  context: vscode.ExtensionContext,
  outputChannel: vscode.OutputChannel
) => {
  const sorter = new TsSorter(outputChannel);
  const providerDisposable = vscode.languages.registerCodeActionsProvider(
    "typescript",
    sorter,
    {
      providedCodeActionKinds: [vscode.CodeActionKind.Empty],
    }
  );

  context.subscriptions.push(providerDisposable);

  context.subscriptions.push(sorter.registerCommand());
};

const interfaceRegex = /interface\s+(\w+)/g;

class TsSorter implements vscode.CodeActionProvider {
  static sortCommand = "yo.sortInterface";
  constructor(private outputChannel: vscode.OutputChannel) {}

  provideCodeActions(
    document: vscode.TextDocument,
    range: vscode.Range | vscode.Selection,
    context: vscode.CodeActionContext,
    token: vscode.CancellationToken
  ): vscode.ProviderResult<(vscode.CodeAction | vscode.Command)[]> {
    if (!this.isAtStartOfInterface(document, range)) {
      // this.outputChannel.appendLine("Stop");
      return;
    }
    // this.outputChannel.appendLine("Start");
    const codeAction = new vscode.CodeAction(
      `Sort this interface`,
      vscode.CodeActionKind.Empty
    );
    codeAction.command = {
      command: TsSorter.sortCommand,
      title: "Sort interface",
      arguments: [document, range],
    };
    return [codeAction];
  }

  private isAtStartOfInterface(
    document: vscode.TextDocument,
    range: vscode.Range
  ) {
    const start = range.start;
    const line = document.lineAt(start.line);

    // this.outputChannel.appendLine(line.text);
    if (!interfaceRegex.test(line.text)) {
      return false;
    }

    return true;
  }

  private command(document: vscode.TextDocument, range: vscode.Range) {
    if (document.languageId !== "typescript") {
      return;
    }
    const project = new Project();
    const sourceFile = project.createSourceFile(
      document.fileName,
      document.getText()
    ); // Create a source file object from the document

    // Find all interface declarations and sort their properties
    sourceFile.getInterfaces().forEach((interfaceDeclaration) => {
      const properties = interfaceDeclaration.getProperties();

      // Sort the properties by name, including JSDoc comments and regular comments
      properties
        .sort((a, b) => {
          const nameOrder = a.getName().localeCompare(b.getName());
          const aType = a.getType();
          const bType = b.getType();
          const aIsOptional = aType
            .getUnionTypes()
            .some((t) => t.isUndefined());
          const bIsOptional = bType
            .getUnionTypes()
            .some((t) => t.isUndefined());
          if (aIsOptional || bIsOptional) {
            if (aIsOptional && bIsOptional) {
              return nameOrder;
            }
            return aIsOptional === bIsOptional ? 0 : aIsOptional ? -1 : 1;
          }

          return nameOrder;
        })
        // Update the interface properties with the sorted order
        .forEach((p, i) => p.setOrder(i));
    });
    // Update the document text with the modified source file
    const newDocumentText = sourceFile.getFullText();
    const fullRange = document.validateRange(
      new vscode.Range(0, 0, Infinity, Infinity)
    );
    const edit = new vscode.WorkspaceEdit();
    edit.replace(document.uri, fullRange, newDocumentText);
    vscode.workspace.applyEdit(edit);
  }

  public registerCommand() {
    return vscode.commands.registerCommand(TsSorter.sortCommand, this.command);
  }
}
