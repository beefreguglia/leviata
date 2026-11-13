"use client";

import { useState } from "react";
import { PERMISSION_GROUPS, expandPermissions } from "@/lib/permissions";

/** Caixas de permissão por área (patente, setor e gerência usam a mesma lista). */
export function PermissionChecklist({ selected = [], legend = "Permissões" }: { selected?: string[]; legend?: string }) {
  const [checked, setChecked] = useState(() => new Set<string>(expandPermissions(selected)));
  const toggle = (keys: string[], on: boolean) =>
    setChecked((prev) => {
      const next = new Set(prev);
      for (const k of keys) {
        if (on) next.add(k);
        else next.delete(k);
      }
      return next;
    });

  return (
    <fieldset className="flex flex-col gap-4">
      <legend className="mb-2 text-sm font-medium text-grey-200">
        {legend} <span className="font-normal text-muted-foreground tabular-nums">· {checked.size} marcadas</span>
      </legend>
      {PERMISSION_GROUPS.map((group) => {
        const keys = Object.keys(group.items);
        const all = keys.every((k) => checked.has(k));
        return (
          <div key={group.label} className="flex flex-col gap-1.5" data-testid="permission-group">
            <div className="flex items-center justify-between gap-3">
              <span className="type-label text-muted-foreground">{group.label}</span>
              <button
                type="button"
                className="min-h-8 rounded-md px-2 text-xs font-medium text-cyan-light transition-colors hover:bg-muted"
                onClick={() => toggle(keys, !all)}
              >
                {all ? "Desmarcar todas" : "Marcar todas"}
              </button>
            </div>
            <div className="overflow-hidden rounded-md bg-input [&>*+*]:border-t [&>*+*]:border-grey-700">
              {Object.entries(group.items).map(([key, label]) => (
                <label key={key} className="flex min-h-12 cursor-pointer items-center justify-between gap-3 px-4 text-base">
                  <span>
                    {label}
                    {key === "admin" && <span className="ml-1 text-xs text-warning">· libera tudo</span>}
                  </span>
                  <input
                    type="checkbox"
                    name="permissions"
                    value={key}
                    checked={checked.has(key)}
                    onChange={(e) => toggle([key], e.target.checked)}
                    className="size-5 shrink-0 accent-[var(--primary)]"
                  />
                </label>
              ))}
            </div>
          </div>
        );
      })}
    </fieldset>
  );
}
