import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Field, NativeSelect } from "@/components/forms/fields";
import { MEMBER_STATUS } from "@/lib/labels";
import { toDateInputBRT } from "@/lib/dates";
import type { Member, Rank } from "@/generated/prisma/client";

/** Campos da ficha de membro (usados no cadastro e na edição). */
export function MemberFields({ member, ranks }: { member?: Member; ranks?: Rank[] }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <Field label="Nome no RP" htmlFor="rpName" className="sm:col-span-2">
        <Input id="rpName" name="rpName" required defaultValue={member?.rpName} placeholder="Ex.: Dante Moretti" />
      </Field>
      <Field label="Passaporte / ID" htmlFor="passport">
        <Input id="passport" name="passport" defaultValue={member?.passport ?? ""} inputMode="numeric" />
      </Field>
      <Field label="Telefone no jogo" htmlFor="phone">
        <Input id="phone" name="phone" defaultValue={member?.phone ?? ""} />
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
      <Field label="Status" htmlFor="status">
        <NativeSelect id="status" name="status" defaultValue={member?.status ?? "ATIVO"}>
          {Object.entries(MEMBER_STATUS).map(([value, { label }]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </NativeSelect>
      </Field>
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
