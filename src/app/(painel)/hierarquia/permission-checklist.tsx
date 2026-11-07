import { PERMISSIONS } from "@/lib/permissions";

/** Caixas de permissão (patente e gerência usam a mesma lista). */
export function PermissionChecklist({ selected = [], legend = "Permissões" }: { selected?: string[]; legend?: string }) {
  return (
    <fieldset className="flex flex-col gap-1.5">
      <legend className="mb-2 text-sm font-medium text-grey-200">{legend}</legend>
      <div className="overflow-hidden rounded-md bg-input [&>*+*]:border-t [&>*+*]:border-grey-700">
        {Object.entries(PERMISSIONS).map(([key, label]) => (
          <label key={key} className="flex min-h-12 cursor-pointer items-center justify-between gap-3 px-4 text-base">
            <span>
              {label}
              {key === "admin" && <span className="ml-1 text-xs text-warning">· libera tudo</span>}
            </span>
            <input type="checkbox" name="permissions" value={key} defaultChecked={selected.includes(key)} className="size-5 accent-[var(--primary)]" />
          </label>
        ))}
      </div>
    </fieldset>
  );
}
