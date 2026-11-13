import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Field, NativeSelect } from "@/components/forms/fields";
import { MEMBER_STATUS } from "@/lib/labels";
import { EDITABLE_STATUSES, isGone } from "@/lib/members";
import { toDateInputBRT } from "@/lib/dates";
import type { Member, Rank } from "@/generated/prisma/client";
import { PhoneInput } from "@/components/forms/masked-inputs";

/** Campos da ficha de membro (usados no cadastro e na edição). */
export function MemberFields({ member, ranks, canEditContact = true }: { member?: Member; ranks?: Rank[]; canEditContact?: boolean }) {
  // número e ID já preenchidos: só o dev altera (o servidor também confere)
  const passportLocked = !canEditContact && Boolean(member?.passport);
  const phoneLocked = !canEditContact && Boolean(member?.phone);
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <Field label="Nome no RP" htmlFor="rpName" className="sm:col-span-2">
        <Input id="rpName" name="rpName" required defaultValue={member?.rpName} placeholder="Ex.: Dante Moretti" />
      </Field>
      <Field label="Passaporte / ID" htmlFor="passport" hint={passportLocked ? "Só o dev do painel altera." : undefined}>
        <Input id="passport" name="passport" autoComplete="off" defaultValue={member?.passport ?? ""} inputMode="numeric" readOnly={passportLocked} aria-readonly={passportLocked} className={passportLocked ? "opacity-60" : undefined} />
      </Field>
      <Field label="Telefone no jogo" htmlFor="phone" hint={phoneLocked ? "Só o dev do painel altera." : undefined}>
        <PhoneInput id="phone" name="phone" defaultValue={member?.phone} readOnly={phoneLocked} aria-readonly={phoneLocked} className={phoneLocked ? "opacity-60" : undefined} />
      </Field>
      {ranks && (
        <Field label="Patente" htmlFor="rankId">
          <NativeSelect id="rankId" name="rankId" defaultValue="">
            <option value="">Sem patente</option>
            {ranks.map((r) => (
              <option key={r.id} value={r.id}>
                {r.name}
              </option>
            ))}
          </NativeSelect>
        </Field>
      )}
      {!isGone(member?.status) && (
        <Field label="Status" htmlFor="status">
          <NativeSelect id="status" name="status" defaultValue={member?.status ?? "ATIVO"}>
            {EDITABLE_STATUSES.map((value) => (
              <option key={value} value={value}>
                {MEMBER_STATUS[value].label}
              </option>
            ))}
          </NativeSelect>
        </Field>
      )}
      <Field label="Entrou na fac em" htmlFor="joinedAt">
        <Input id="joinedAt" name="joinedAt" type="date" defaultValue={toDateInputBRT(member?.joinedAt ?? new Date())} />
      </Field>
      <Field label="Aniversário do personagem" htmlFor="birthday">
        <Input id="birthday" name="birthday" type="date" defaultValue={toDateInputBRT(member?.birthday)} />
      </Field>
      <Field label="Observações" htmlFor="notes" className="sm:col-span-2" hint="Visível para quem tem acesso ao painel.">
        <Textarea id="notes" name="notes" defaultValue={member?.notes ?? ""} rows={3} />
      </Field>
    </div>
  );
}
