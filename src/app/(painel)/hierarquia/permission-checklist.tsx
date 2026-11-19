"use client";

import { useState } from "react";
import { CRUD_LABELS, CRUD_OPS, GENERAL_PERMISSIONS, PERMISSION_AREAS, PERMISSIONS, expandPermissions, type AreaDef } from "@/lib/permissions";
import { cn } from "@/lib/utils";

/** Todas as chaves de uma área (CRUD + extras). */
function areaKeys(a: AreaDef) {
  return [...Object.keys(a.ops).map((op) => `${a.key}.${op}`), ...Object.keys(a.extras ?? {})];
}

function Check({ value, checked, onChange, label }: { value: string; checked: boolean; onChange: (on: boolean) => void; label: string }) {
  return (
    <input
      type="checkbox"
      name="permissions"
      value={value}
      checked={checked}
      onChange={(e) => onChange(e.target.checked)}
      aria-label={label}
      title={label}
      className="size-5 cursor-pointer accent-[var(--primary)]"
    />
  );
}

/**
 * Matriz de permissões (patente, setor e gerência usam a mesma): cada área do site numa linha,
 * com Ver · Criar · Editar · Apagar nas colunas. Quem cria, edita ou apaga também vê a área.
 */
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
  const isAdmin = checked.has("admin");

  return (
    <fieldset className="flex flex-col gap-4">
      <legend className="mb-2 text-sm font-medium text-grey-200">
        {legend} <span className="font-normal text-muted-foreground tabular-nums">· {checked.size} marcadas</span>
      </legend>

      <div className="overflow-hidden rounded-md bg-input [&>*+*]:border-t [&>*+*]:border-grey-700">
        {Object.entries(GENERAL_PERMISSIONS).map(([key, label]) => (
          <label key={key} className="flex min-h-12 cursor-pointer items-center justify-between gap-3 px-4 text-base">
            <span>
              {label}
              {key === "admin" && <span className="ml-1 text-xs text-warning">· libera tudo</span>}
            </span>
            <Check value={key} checked={checked.has(key)} onChange={(on) => toggle([key], on)} label={label} />
          </label>
        ))}
      </div>

      <div className={cn("overflow-x-auto rounded-md bg-input", isAdmin && "opacity-50")} aria-disabled={isAdmin || undefined}>
        <table className="w-full min-w-[30rem] border-collapse text-sm">
          <thead>
            <tr className="text-left">
              <th scope="col" className="px-4 py-3 type-label text-muted-foreground">
                Área
              </th>
              {CRUD_OPS.map((op) => (
                <th key={op} scope="col" className="w-16 px-1 py-3 text-center type-label text-muted-foreground">
                  {CRUD_LABELS[op]}
                </th>
              ))}
              <th scope="col" className="w-20 px-2 py-3">
                <span className="sr-only">Marcar a linha</span>
              </th>
            </tr>
          </thead>
          {PERMISSION_AREAS.map((group) => (
            <tbody key={group.label} data-testid="permission-group">
              <tr>
                <th colSpan={6} scope="colgroup" className="border-t border-grey-700 bg-grey-800/60 px-4 py-2 text-left type-label text-cyan-light">
                  {group.label}
                </th>
              </tr>
              {(group.areas as readonly AreaDef[]).map((area) => {
                const keys = areaKeys(area);
                const all = keys.every((k) => checked.has(k));
                return (
                  <tr key={area.key} className="border-t border-grey-700/70" data-testid={`permission-row-${area.key}`}>
                    <th scope="row" className="px-4 py-2.5 text-left text-base font-normal text-grey-100">
                      {area.label}
                      {area.extras &&
                        Object.entries(area.extras).map(([key, desc]) => (
                          <label key={key} className="mt-1.5 flex cursor-pointer items-center gap-2 text-sm text-grey-300">
                            <Check value={key} checked={checked.has(key)} onChange={(on) => toggle([key], on)} label={PERMISSIONS[key as keyof typeof PERMISSIONS]} />
                            {desc}
                          </label>
                        ))}
                    </th>
                    {CRUD_OPS.map((op) => {
                      const desc = area.ops[op];
                      const key = `${area.key}.${op}`;
                      return (
                        <td key={op} className="px-1 py-2.5 text-center align-top">
                          {desc ? (
                            <Check value={key} checked={checked.has(key)} onChange={(on) => toggle([key], on)} label={`${area.label}: ${desc}`} />
                          ) : (
                            <span className="text-grey-600" aria-hidden>
                              —
                            </span>
                          )}
                        </td>
                      );
                    })}
                    <td className="px-2 py-2.5 text-right align-top">
                      <button
                        type="button"
                        className="min-h-8 rounded-md px-2 text-xs font-medium text-cyan-light transition-colors hover:bg-muted"
                        onClick={() => toggle(keys, !all)}
                        aria-label={`${all ? "Desmarcar" : "Marcar"} tudo em ${area.label}`}
                      >
                        {all ? "Nenhum" : "Tudo"}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          ))}
        </table>
      </div>
      <p className="text-xs leading-base text-muted-foreground">
        Passe o mouse em cada caixa para ver o que ela libera. Quem pode criar, editar ou apagar numa área também consegue vê-la.
      </p>
    </fieldset>
  );
}
