import { Input } from "@/components/ui/input";
import { Field } from "@/components/forms/fields";
import { PERMISSIONS } from "@/lib/permissions";
import { suggestRankColor } from "@/lib/rank-colors";
import type { Rank } from "@/generated/prisma/client";

export function RankFields({ rank, nextOrder }: { rank?: Rank; nextOrder?: number }) {
  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-[1fr_88px_64px] gap-3">
        <Field label="Nome" htmlFor="name">
          <Input id="name" name="name" required defaultValue={rank?.name} placeholder="Ex.: Gerente" />
        </Field>
        <Field label="Ordem" htmlFor="order">
          <Input id="order" name="order" type="number" min={1} required defaultValue={rank?.order ?? nextOrder} />
        </Field>
        <Field label="Cor" htmlFor="color">
          <Input
            id="color"
            name="color"
            type="color"
            defaultValue={rank?.color ?? suggestRankColor(nextOrder ?? 1)}
            className="h-10 cursor-pointer p-1"
          />
        </Field>
      </div>
      <Field
        label="ID do cargo no Discord"
        htmlFor="discordRoleId"
        hint="Discord → Configurações do servidor → Cargos → botão direito → Copiar ID (precisa do modo desenvolvedor). Quem tiver esse cargo recebe esta patente ao logar."
      >
        <Input
          id="discordRoleId"
          name="discordRoleId"
          inputMode="numeric"
          defaultValue={rank?.discordRoleId ?? ""}
          placeholder="Ex.: 1234567890123456789"
        />
      </Field>
      <fieldset className="flex flex-col gap-1.5">
        <legend className="mb-2 text-sm font-medium text-grey-200">Permissões</legend>
        <div className="overflow-hidden rounded-md bg-input [&>*+*]:border-t [&>*+*]:border-grey-700">
          {Object.entries(PERMISSIONS).map(([key, label]) => (
            <label key={key} className="flex min-h-12 cursor-pointer items-center justify-between gap-3 px-4 text-base">
              <span>
                {label}
                {key === "admin" && <span className="ml-1 text-xs text-warning">· libera tudo</span>}
              </span>
              <input
                type="checkbox"
                name="permissions"
                value={key}
                defaultChecked={rank?.permissions.includes(key)}
                className="size-5 accent-[var(--primary)]"
              />
            </label>
          ))}
        </div>
      </fieldset>
    </div>
  );
}
