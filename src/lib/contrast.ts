/** Luminância relativa (WCAG 2) de uma cor #rrggbb. */
export function luminance(hex: string) {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex.trim());
  if (!m) return 0;
  const n = parseInt(m[1], 16);
  const [r, g, b] = [n >> 16, (n >> 8) & 255, n & 255].map((v) => {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function ratio(a: number, b: number) {
  return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
}

const LIGHT = 1; // branco
const DARK = luminance("#121214"); // grey-950

/**
 * Letra clara ou escura sobre um fundo (uma ou mais cores, ex.: as duas metades do ícone).
 * Escolhe a que tem o melhor contraste no lado pior.
 */
export function textToneOn(...backgrounds: string[]): "light" | "dark" {
  const ls = backgrounds.map(luminance);
  const worst = (text: number) => Math.min(...ls.map((l) => ratio(text, l)));
  return worst(LIGHT) >= worst(DARK) ? "light" : "dark";
}
