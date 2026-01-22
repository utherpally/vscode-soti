import * as vscode from "vscode";
import { color, emojiCommit, swish, tsSorter, masks } from "./lib";

let outputChannel: vscode.OutputChannel;
export function activate(context: vscode.ExtensionContext) {
  outputChannel = vscode.window.createOutputChannel("Soti");

  color(context);
  emojiCommit(context);
  swish(context, outputChannel);
  tsSorter(context, outputChannel);
  masks(context);
}

export function deactivate() {
  if (outputChannel) {
    outputChannel.dispose();
  }
}
