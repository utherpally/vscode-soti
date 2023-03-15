import * as vscode from "vscode";
import { getEmoji } from "./emoji";
import { GitExtension, Repository } from "./git";

export function emojiCommit(context: vscode.ExtensionContext) {
  let disposable = vscode.commands.registerCommand(
    "soti.emojiCommit",
    (sourceControl?: vscode.SourceControl) => {
      const git = getGitExtension();

      if (!git) {
        vscode.window.showErrorMessage("Unable to load Git Extension");
        return;
      }

      const emoji = getEmoji();

      vscode.commands.executeCommand("workbench.view.scm");
      const uri = sourceControl && sourceControl.rootUri;
      if (uri) {
        let selectedRepository = git.repositories.find((repository) => {
          return repository.rootUri.path === uri.path;
        });
        if (selectedRepository) {
          prefixCommit(selectedRepository, emoji);
        }
      } else if (!sourceControl) {
        for (let repo of git.repositories) {
          prefixCommit(repo, emoji);
        }
      }
    }
  );

  context.subscriptions.push(disposable);
}

function prefixCommit(repository: Repository, prefix: String) {
  repository.inputBox.value = `${prefix}${repository.inputBox.value}`;
}

function getGitExtension() {
  const vscodeGit = vscode.extensions.getExtension<GitExtension>("vscode.git");
  const gitExtension = vscodeGit && vscodeGit.exports;
  return gitExtension && gitExtension.getAPI(1);
}
