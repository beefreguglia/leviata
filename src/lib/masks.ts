/** Máscaras de input (puras — testáveis). */

/** Só os dígitos. */
export const digits = (v: string) => v.replace(/\D/g, "");

/** 1500000 → "1.500.000" (dinheiro do jogo é sempre inteiro). Vazio fica vazio. */
export function formatMoney(raw: string | number | null | undefined) {
  const d = digits(String(raw ?? "")).replace(/^0+(?=\d)/, "");
  if (!d) return "";
  return d.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
}

/** Telefone da cidade: (055) 123-456 — até 9 dígitos, formata enquanto digita. */
export function formatPhone(raw: string | null | undefined) {
  const d = digits(raw ?? "").slice(0, 9);
  if (d.length === 0) return "";
  if (d.length <= 3) return `(${d}`;
  if (d.length <= 6) return `(${d.slice(0, 3)}) ${d.slice(3)}`;
  return `(${d.slice(0, 3)}) ${d.slice(3, 6)}-${d.slice(6)}`;
}
