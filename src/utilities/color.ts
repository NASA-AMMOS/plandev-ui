const getChunksFromString = (st: string, chunkSize: number) => st.match(new RegExp(`.{${chunkSize}}`, 'g'));

const convertHexUnitTo256 = (hexStr: string) => parseInt(hexStr.repeat(2 / hexStr.length), 16);

const getAlphafloat = (a: number, alpha: number) => {
  if (typeof a !== 'undefined') {
    return a / 255;
  }
  if (typeof alpha !== 'number' || alpha < 0 || alpha > 1) {
    return 1;
  }
  return alpha;
};

export const isValidHex = (hex: string) => /^#([A-Fa-f0-9]{3,4}){1,2}$/.test(hex);

export const hexToRgba = (hex: string, alpha: number) => {
  if (!isValidHex(hex)) {
    return 'rgba(0,0,0,1)';
  }
  const chunkSize = Math.floor((hex.length - 1) / 3);
  const hexArr = getChunksFromString(hex.slice(1), chunkSize);
  const [r, g, b, a] = (hexArr ?? []).map(convertHexUnitTo256);
  return `rgba(${r}, ${g}, ${b}, ${getAlphafloat(a, alpha)})`;
};

export function hslToHex(h: number, s: number, l: number) {
  l /= 100;
  const a = (s * Math.min(l, 1 - l)) / 100;
  const f = (n: number) => {
    const k = (n + h / 30) % 12;
    const color = l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
    return Math.round(255 * color)
      .toString(16)
      .padStart(2, '0'); // convert to Hex and prefix "0" if needed
  };
  return `#${f(0)}${f(8)}${f(4)}`;
}

/**
 * @param color Hex value format: #ffffff or ffffff
 * @param decimal lighten or darken decimal value, example 0.5 to lighten by 50% or 1.5 to darken by 50%.
 */
export function shadeColor(color: string, decimal: number): string {
  const base = color.startsWith('#') ? 1 : 0;

  let r = parseInt(color.substring(base, 3), 16);
  let g = parseInt(color.substring(base + 2, 5), 16);
  let b = parseInt(color.substring(base + 4, 7), 16);

  r = Math.round(r / decimal);
  g = Math.round(g / decimal);
  b = Math.round(b / decimal);

  r = r < 255 ? r : 255;
  g = g < 255 ? g : 255;
  b = b < 255 ? b : 255;

  const rr = r.toString(16).length === 1 ? `0${r.toString(16)}` : r.toString(16);
  const gg = g.toString(16).length === 1 ? `0${g.toString(16)}` : g.toString(16);
  const bb = b.toString(16).length === 1 ? `0${b.toString(16)}` : b.toString(16);

  return `#${rr}${gg}${bb}`;
}

/**
 * Returns a random pastel color in hex format.
 */
export function generateRandomPastelColor(): string {
  return hslToHex(360 * Math.random(), 25 + 70 * Math.random(), 82 + 10 * Math.random());
}

/**
 * Returns dark if the bgColor hex has an acceptable WCAG 2.0 contrast ratio
 * and otherwise returns light.
 *
 * From https://stackoverflow.com/a/41491220
 * See https://www.w3.org/WAI/WCAG21/Techniques/general/G18.html for further explanation
 * of the formula and magic numbers.
 */
export function pickTextColorBasedOnBgColor(bgColor: string): 'dark' | 'light' {
  const color = bgColor.charAt(0) === '#' ? bgColor.substring(1, 7) : bgColor;
  const r = parseInt(color.substring(0, 2), 16); // hexToR
  const g = parseInt(color.substring(2, 4), 16); // hexToG
  const b = parseInt(color.substring(4, 6), 16); // hexToB
  const uicolors = [r / 255, g / 255, b / 255];
  const c = uicolors.map(col => {
    if (col <= 0.03928) {
      return col / 12.92;
    }
    return Math.pow((col + 0.055) / 1.055, 2.4);
  });
  const L = 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
  return L > 0.179 ? 'dark' : 'light';
}
