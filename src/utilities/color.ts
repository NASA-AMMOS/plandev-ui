const isValidHex = hex => /^#([A-Fa-f0-9]{3,4}){1,2}$/.test(hex);

const getChunksFromString = (st, chunkSize) => st.match(new RegExp(`.{${chunkSize}}`, 'g'));

const convertHexUnitTo256 = hexStr => parseInt(hexStr.repeat(2 / hexStr.length), 16);

const getAlphafloat = (a, alpha) => {
  if (typeof a !== 'undefined') {
    return a / 255;
  }
  if (typeof alpha != 'number' || alpha < 0 || alpha > 1) {
    return 1;
  }
  return alpha;
};

export const hexToRgba = (hex, alpha) => {
  if (!isValidHex(hex)) {
    return 'rgba(0,0,0,1)';
  }
  const chunkSize = Math.floor((hex.length - 1) / 3);
  const hexArr = getChunksFromString(hex.slice(1), chunkSize);
  const [r, g, b, a] = hexArr.map(convertHexUnitTo256);
  return `rgba(${r}, ${g}, ${b}, ${getAlphafloat(a, alpha)})`;
};

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
