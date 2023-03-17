import Color from "color";

const formatter = Intl.NumberFormat("en-US", {
  minimumFractionDigits: 0,
  maximumFractionDigits: 1,
});

export function color2HslaChannel(color: Color) {
  const array = color.array();

  const hue = formatter.format(color.hue());
  const saturation = formatter.format(color.saturationl());
  const lightness = formatter.format(color.lightness());
  const alpha = formatter.format(color.alpha());

  if (array.length === 3) {
    return { hue, saturation, lightness };
  } else {
    return { hue, saturation, lightness, alpha };
  }
}

export function color2RgbaChannel(color: Color) {
  const array = color.array();
  const red = Math.round(color.red());
  const green = Math.round(color.green());
  const blue = Math.round(color.blue());
  if (array.length === 3) {
    return {
      red,
      green,
      blue,
    };
  }

  const alpha = formatter.format(color.alpha());

  return {
    red,
    green,
    blue,
    alpha,
  };
}
