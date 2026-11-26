/**
 * Busca por similaridade usada nos selects com autocomplete e nas sugestões das buscas.
 * Ignora maiúsculas e acentos; cada palavra digitada precisa aparecer (em qualquer ordem).
 * Uma palavra casa se é pedaço do texto ("bal" → "Ballas") ou, por último, se as letras aparecem
 * na ordem com saltos ("blls" → "Ballas"), para tolerar abreviação.
 */

/** "Polícia Civil" → "policia civil" */
export function normalize(text: string) {
  return text
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .trim();
}

export function tokens(query: string) {
  return normalize(query).split(/\s+/).filter(Boolean);
}

/** as letras de `needle` aparecem em `hay` nessa ordem (com saltos)? */
function isSubsequence(needle: string, hay: string) {
  let i = 0;
  for (let j = 0; j < hay.length && i < needle.length; j++) if (hay[j] === needle[i]) i++;
  return i === needle.length;
}

/**
 * Nota de 0 (não casa) a 100 (igual). Maior = mais parecido.
 * Ordem: igual > começa com > começo de uma palavra > pedaço > letras na ordem.
 */
export function matchScore(query: string, text: string) {
  const qs = tokens(query);
  if (qs.length === 0) return 1;
  const t = normalize(text);
  if (!t) return 0;
  const whole = normalize(query);
  if (t === whole) return 100;
  const words = t.split(/[\s\-_/·.,()[\]]+/).filter(Boolean);
  let total = 0;
  for (const q of qs) {
    let s = 0;
    if (t.startsWith(q)) s = 40;
    else if (words.some((w) => w.startsWith(q))) s = 30;
    else if (t.includes(q)) s = 20;
    else if (q.length >= 2 && isSubsequence(q, t)) s = 6;
    if (s === 0) return 0;
    total += s;
  }
  // frase inteira como pedaço ganha um pouco; textos curtos (mais "certeiros") também
  if (qs.length > 1 && t.includes(whole)) total += 10;
  return Math.min(99, Math.round(total / qs.length) + Math.max(0, 8 - Math.floor(t.length / 8)));
}

/** Filtra e ordena pela nota (empate: ordem original). */
export function fuzzyFilter<T>(items: readonly T[], query: string, toText: (item: T) => string, limit = Infinity) {
  if (!tokens(query).length) return items.slice(0, limit === Infinity ? undefined : limit);
  return items
    .map((item, i) => ({ item, i, s: matchScore(query, toText(item)) }))
    .filter((x) => x.s > 0)
    .sort((a, b) => b.s - a.s || a.i - b.i)
    .slice(0, limit === Infinity ? undefined : limit)
    .map((x) => x.item);
}

/**
 * Para buscas no banco: cada palavra tem de aparecer em algum dos campos (pedaço, sem maiúsculas).
 * `fields(token)` devolve as condições "OR" de uma palavra.
 */
export function tokensWhere<W>(query: string, fields: (token: string) => W[]) {
  const ts = query.trim().split(/\s+/).filter(Boolean).slice(0, 6);
  return ts.length ? { AND: ts.map((t) => ({ OR: fields(t) })) } : {};
}
