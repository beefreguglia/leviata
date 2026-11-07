import { Input } from "@/components/ui/input";
import { Field, NativeSelect } from "@/components/forms/fields";
import type { Management, Sector } from "@/generated/prisma/client";
import { PermissionChecklist } from "./permission-checklist";

const ROLE_HINT = "Discord → botão direito no cargo → Copiar ID (modo desenvolvedor). Quem tiver esse cargo entra aqui ao logar.";

export function SectorFields({ sector }: { sector?: Sector }) {
  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-[1fr_64px] gap-3">
        <Field label="Nome" htmlFor="s-name">
          <Input id="s-name" name="name" required defaultValue={sector?.name} placeholder="Ex.: Vanguarda" />
        </Field>
        <Field label="Cor" htmlFor="s-color">
          <Input id="s-color" name="color" type="color" defaultValue={sector?.color ?? "#06d4ec"} className="h-10 cursor-pointer p-1" />
        </Field>
      </div>
      <div className="grid grid-cols-[1fr_88px] gap-3">
        <Field label="O que faz" htmlFor="s-desc">
          <Input id="s-desc" name="description" defaultValue={sector?.description ?? ""} placeholder="Ex.: Ações" />
        </Field>
        <Field label="Ordem" htmlFor="s-order">
          <Input id="s-order" name="order" type="number" min={0} defaultValue={sector?.order ?? 0} />
        </Field>
      </div>
      <Field label="ID do cargo no Discord" htmlFor="s-role" hint={ROLE_HINT}>
        <Input id="s-role" name="discordRoleId" inputMode="numeric" defaultValue={sector?.discordRoleId ?? ""} placeholder="Ex.: 1234567890123456789" />
      </Field>
    </div>
  );
}

export function ManagementFields({ management, sectors }: { management?: Management; sectors: Pick<Sector, "id" | "name">[] }) {
  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-[1fr_88px] gap-3">
        <Field label="Nome" htmlFor="g-name">
          <Input id="g-name" name="name" required defaultValue={management?.name} placeholder="Ex.: G-Ação" />
        </Field>
        <Field label="Ordem" htmlFor="g-order">
          <Input id="g-order" name="order" type="number" min={0} defaultValue={management?.order ?? 0} />
        </Field>
      </div>
      <Field label="Setor (opcional)" htmlFor="g-sector" hint="Deixe vazio para gerência geral.">
        <NativeSelect id="g-sector" name="sectorId" defaultValue={management?.sectorId ?? ""}>
          <option value="">Geral (todos os setores)</option>
          {sectors.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </NativeSelect>
      </Field>
      <Field label="ID do cargo no Discord" htmlFor="g-role" hint="Quem tiver esse cargo ganha esta gerência (e as permissões dela) ao logar.">
        <Input id="g-role" name="discordRoleId" inputMode="numeric" defaultValue={management?.discordRoleId ?? ""} placeholder="Ex.: 1234567890123456789" />
      </Field>
      <PermissionChecklist selected={management?.permissions} legend="Permissões que esta gerência soma à patente" />
    </div>
  );
}
