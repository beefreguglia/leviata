"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Field, NativeSelect } from "@/components/forms/fields";
import { MoneyInput } from "@/components/forms/masked-inputs";

const KINDS = [
  ["ADVERTENCIA", "Advertência (vale 30 dias)"],
  ["MULTA", "Multa"],
  ["SUSPENSAO", "Suspensão"],
  ["REBAIXAMENTO", "Rebaixamento"],
  ["EXPULSAO", "Expulsão"],
] as const;

export function PunishmentFields({
  members,
  ranks,
  defaultMemberId,
}: {
  members: { id: string; name: string; rank: string | null; warnings: number }[];
  ranks: { id: string; name: string }[];
  defaultMemberId?: string;
}) {
  const [kind, setKind] = useState<string>("ADVERTENCIA");
  return (
    <div className="flex flex-col gap-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Membro" htmlFor="pn-member">
          <NativeSelect id="pn-member" name="memberId" required defaultValue={defaultMemberId ?? ""}>
            <option value="">Escolha…</option>
            {members.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name}
                {m.rank ? ` · ${m.rank}` : ""}
                {m.warnings ? ` · ${m.warnings} adv.` : ""}
              </option>
            ))}
          </NativeSelect>
        </Field>
        <Field label="Tipo" htmlFor="pn-kind">
          <NativeSelect id="pn-kind" name="kind" value={kind} onChange={(e) => setKind(e.target.value)}>
            {KINDS.map(([v, label]) => (
              <option key={v} value={v}>
                {label}
              </option>
            ))}
          </NativeSelect>
        </Field>
      </div>
      {kind === "MULTA" && (
        <Field label="Valor da multa (R$)" htmlFor="pn-fine">
          <MoneyInput id="pn-fine" name="fineAmount" required placeholder="0" />
        </Field>
      )}
      {kind === "SUSPENSAO" && (
        <Field label="Dias de suspensão" htmlFor="pn-days" hint="Durante a suspensão o membro não pode ser escalado.">
          <Input id="pn-days" name="days" type="number" min={1} max={365} required />
        </Field>
      )}
      {kind === "REBAIXAMENTO" && (
        <Field label="Nova patente" htmlFor="pn-rank">
          <NativeSelect id="pn-rank" name="toRankId" required defaultValue="">
            <option value="">Escolha…</option>
            {ranks.map((r) => (
              <option key={r.id} value={r.id}>
                {r.name}
              </option>
            ))}
          </NativeSelect>
        </Field>
      )}
      {kind === "EXPULSAO" && (
        <p className="rounded-md bg-danger-low px-4 py-3 text-sm text-danger-light">O membro perde o acesso ao painel na hora. Dá para revogar depois.</p>
      )}
      <Field label="Motivo" htmlFor="pn-reason">
        <Textarea id="pn-reason" name="reason" required rows={3} placeholder="Ex.: faltou à ação escalada sem avisar" />
      </Field>
    </div>
  );
}
