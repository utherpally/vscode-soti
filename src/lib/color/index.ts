import Color from "color";
import * as vscode from "vscode";
import { editSelections } from "../utils";
import { color2HslaChannel, color2RgbaChannel } from "./utils";

function color2Hsla(color: Color) {
  const { hue, saturation, lightness, alpha } = color2HslaChannel(color);

  if (alpha == null) {
    return `hsl(${hue}, ${saturation}%, ${lightness}%)`;
  } else {
    return `hsla(${hue}, ${saturation}%, ${lightness}%, ${alpha})`;
  }
}
function color2HslaChannelString(color: Color) {
  const { hue, saturation, lightness, alpha } = color2HslaChannel(color);

  if (alpha == null) {
    return `${hue} ${saturation}% ${lightness}%`;
  } else {
    return `${hue} ${saturation}% ${lightness}% / ${alpha}`;
  }
}

function color2Rgba(color: Color) {
  const { red, green, blue, alpha } = color2RgbaChannel(color);

  return alpha == null
    ? `rgb(${red}, ${green}, ${blue})`
    : `rgba(${red}, ${green}, ${blue}, ${alpha})`;
}
function color2RgbaChannelString(color: Color) {
  const { red, green, blue, alpha } = color2RgbaChannel(color);

  return alpha == null
    ? `${red} ${green} ${blue}`
    : `${red} ${green} ${blue} / ${alpha}`;
}

const commands = {
  convertToHsl: {
    callback: () => replaceColorText(color2Hsla),
  },
  convertToHslChannel: {
    callback: () => replaceColorText(color2HslaChannelString),
  },
  convertToRgb: {
    callback: () => replaceColorText(color2Rgba),
  },
  convertToRgbChannel: {
    callback: () => replaceColorText(color2RgbaChannelString),
  },
};

export const color = (context: vscode.ExtensionContext) => {
  for (const [command, { callback }] of Object.entries(commands)) {
    const disposable = vscode.commands.registerCommand(
      `soti.color.${command}`,
      callback
    );
    context.subscriptions.push(disposable);
  }
};

function replaceColorText(conversion: (color: Color) => string) {
  editSelections((document, selection) => {
    const text = document.getText(selection);

    let color: Color;

    try {
      color = Color(text);
    } catch {
      // Trim the selected text in case it's really long so the error message doesn't blow up
      const badSelection = text.substring(0, 30);
      vscode.window.showErrorMessage(
        `Could not convert color '${badSelection}', unknown format.`
      );
      return;
    }

    const colorString = conversion(color).toLowerCase();

    return colorString;
  });
}
