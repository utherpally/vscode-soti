import * as vscode from "vscode";
import {emojiCommit, swish} from './lib';

let outputChannel: vscode.OutputChannel;
export function activate(context: vscode.ExtensionContext) {
  outputChannel = vscode.window.createOutputChannel("Soti");

  swish(context, outputChannel);
  emojiCommit(context);
}

export function deactivate() {
  if (outputChannel) {
    outputChannel.dispose();
  }
}
