/**
 * Número (telefone no jogo) e ID (passaporte) de uma ficha: depois de preenchidos,
 * só o membro dev (BOOTSTRAP_ADMIN_DISCORD_IDS) altera. Preencher um campo vazio é livre
 * (primeiro registro do membro / cadastro feito pela liderança).
 */
export const CONTACT_LOCK_MESSAGE = "Número e ID já cadastrados só podem ser alterados pelo dev do painel";

type Contact = { passport?: string | null; phone?: string | null };

const norm = (v: string | null | undefined) => (v ?? "").trim();

/** Campos que mudariam um valor já preenchido. */
export function lockedContactChanges(before: Contact, after: Contact) {
  const changed: ("passport" | "phone")[] = [];
  for (const key of ["passport", "phone"] as const) {
    if (norm(before[key]) && norm(before[key]) !== norm(after[key])) changed.push(key);
  }
  return changed;
}

export function assertCanChangeContact(isDev: boolean, before: Contact, after: Contact) {
  if (!isDev && lockedContactChanges(before, after).length) throw new Error(CONTACT_LOCK_MESSAGE);
}
