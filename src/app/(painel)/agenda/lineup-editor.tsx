"use client";

import { useState } from "react";
import { PlusIcon, XIcon } from "@/components/icons";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/forms/fields";
import { ActionForm, SubmitButton } from "@/components/forms/action-form";
import type { ActionResult } from "@/lib/actions";

type Slot = { key: number; role: string; memberId: string; vehicle: string; notes: string };
export type LineupMember = { id: string; name: string; rank: string | null; attendance: "VOU" | "TALVEZ" | "NAO_VOU" | null; unavailable: string | null };

const ATT_LABEL = { VOU: "vou", TALVEZ: "talvez", NAO_VOU: "não vou" } as const;

type InitialSlot = { role: string; memberId: string | null; vehicle: string | null; notes: string | null };

/**
 * Editor da escalação: função, membro, veículo e observação por vaga.
 * O formulário fica montado (para o toast aparecer); só as linhas reiniciam quando a escalação muda no servidor.
 */
export function LineupEditor({
  action,
  members,
  slots,
  version,
}: {
  action: (fd: FormData) => Promise<ActionResult>;
  members: LineupMember[];
  slots: InitialSlot[];
  /** muda quando a escalação muda no servidor (ex.: "Gerar pelo perímetro") */
  version: string;
}) {
  return (
    <ActionForm action={action} className="flex flex-col gap-3">
      <LineupRows key={version} members={members} slots={slots} />
    </ActionForm>
  );
}

function LineupRows({ members, slots: initial }: { members: LineupMember[]; slots: InitialSlot[] }) {
  const [slots, setSlots] = useState<Slot[]>(
    (initial.length ? initial : [{ role: "", memberId: null, vehicle: null, notes: null }]).map((s, i) => ({
      key: i,
      role: s.role,
      memberId: s.memberId ?? "",
      vehicle: s.vehicle ?? "",
      notes: s.notes ?? "",
    })),
  );
  const set = (key: number, patch: Partial<Slot>) => setSlots((ss) => ss.map((s) => (s.key === key ? { ...s, ...patch } : s)));
  const taken = new Map(slots.filter((s) => s.memberId).map((s) => [s.memberId, s.key]));
  // ordem: quem confirmou primeiro, depois talvez, sem resposta, não vou; indisponíveis no fim
  const rankOf = (m: LineupMember) => (m.unavailable ? 9 : m.attendance === "VOU" ? 0 : m.attendance === "TALVEZ" ? 1 : m.attendance === null ? 2 : 3);
  const sorted = [...members].sort((a, b) => rankOf(a) - rankOf(b) || a.name.localeCompare(b.name));

  return (
    <>
      <div className="hidden grid-cols-[1fr_1.4fr_1fr_48px] gap-2 px-1 text-xs text-muted-foreground md:grid">
        <span>Função</span>
        <span>Membro</span>
        <span>Veículo</span>
      </div>
      {slots.map((s, i) => (
        <div key={s.key} className="grid grid-cols-[1fr_48px] gap-2 rounded-md bg-grey-900/50 p-2 md:grid-cols-[1fr_1.4fr_1fr_48px] md:bg-transparent md:p-0" data-testid="lineup-row">
          <Input name="slotRole" aria-label={`Função da vaga ${i + 1}`} placeholder="Função" value={s.role} onChange={(e) => set(s.key, { role: e.target.value })} />
          <Button type="button" variant="ghost" size="icon" className="size-12 md:order-last" aria-label={`Remover vaga ${i + 1}`} onClick={() => setSlots((ss) => ss.filter((x) => x.key !== s.key))}>
            <XIcon />
          </Button>
          <NativeSelect
            name="slotMember"
            aria-label={`Membro da vaga ${i + 1}`}
            value={s.memberId}
            onChange={(e) => set(s.key, { memberId: e.target.value })}
            className="col-span-2 md:col-span-1"
          >
            <option value="">— vaga aberta —</option>
            {sorted.map((m) => {
              const usedElsewhere = taken.has(m.id) && taken.get(m.id) !== s.key;
              const tag = m.unavailable ? ` (${m.unavailable})` : m.attendance ? ` (${ATT_LABEL[m.attendance]})` : "";
              return (
                <option key={m.id} value={m.id} disabled={Boolean(m.unavailable) || usedElsewhere}>
                  {m.name}
                  {tag}
                  {usedElsewhere ? " · já escalado" : ""}
                </option>
              );
            })}
          </NativeSelect>
          <Input name="slotVehicle" aria-label={`Veículo da vaga ${i + 1}`} placeholder="Veículo (opcional)" value={s.vehicle} onChange={(e) => set(s.key, { vehicle: e.target.value })} className="col-span-2 md:col-span-1" />
          <input type="hidden" name="slotNotes" value={s.notes} />
        </div>
      ))}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Button
          type="button"
          variant="ghost"
          className="text-cyan-light"
          onClick={() => setSlots((ss) => [...ss, { key: Math.max(0, ...ss.map((x) => x.key)) + 1, role: "", memberId: "", vehicle: "", notes: "" }])}
        >
          <PlusIcon /> Adicionar vaga
        </Button>
        <SubmitButton>Salvar escalação</SubmitButton>
      </div>
    </>
  );
}
