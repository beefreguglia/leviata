/**
 * Escala de cores das patentes: quanto mais alto o cargo, mais ciano;
 * quanto mais baixo, mais azul escuro (ainda legível sobre o fundo #202024).
 */
export const RANK_PALETTE = [
  "#06d4ec", // 1 · Líder (ciano da marca)
  "#13b6f2", // 2 · Sub-líder
  "#2593e3", // 3 · Gerente
  "#3471d2", // 4 · Soldado
  "#3d52bd", // 5 · Recruta (azul escuro)
] as const;

/** Cor sugerida para uma patente pela ordem (1 = topo). Abaixo da 5ª repete o azul mais escuro. */
export function suggestRankColor(order: number) {
  const i = Math.min(Math.max(Math.round(order), 1), RANK_PALETTE.length) - 1;
  return RANK_PALETTE[i];
}
