/** Mensagens de sucesso depois de um redirect (só códigos fixos: o texto não vem da URL). */
export const FLASH = {
  criado: "Criado com sucesso",
  salvo: "Alterações salvas",
  apagado: "Apagado",
} as const;
export type FlashCode = keyof typeof FLASH;
