"use client";

import { Children, Fragment, isValidElement, useMemo, useRef, useState } from "react";
import { Combobox } from "@base-ui/react/combobox";
import { CheckIcon, ChevronDownIcon } from "@/components/icons";
import { fuzzyFilter } from "@/lib/search";
import { cn } from "@/lib/utils";

type Option = { value: string; label: string; disabled: boolean };

/** Texto de um nó React (o conteúdo de um <option>). */
function textOf(node: React.ReactNode): string {
  if (node == null || typeof node === "boolean") return "";
  if (typeof node === "string" || typeof node === "number") return String(node);
  if (Array.isArray(node)) return node.map(textOf).join("");
  if (isValidElement<{ children?: React.ReactNode }>(node)) return textOf(node.props.children);
  return "";
}

/** Lê os <option> passados como filhos (aceita arrays e fragmentos). */
function readOptions(children: React.ReactNode): Option[] {
  const out: Option[] = [];
  Children.forEach(children, (child) => {
    if (!isValidElement<{ value?: string | number; disabled?: boolean; children?: React.ReactNode }>(child)) return;
    if (child.type === Fragment) {
      out.push(...readOptions(child.props.children));
      return;
    }
    if (child.type !== "option") return;
    const label = textOf(child.props.children).trim();
    out.push({ value: String(child.props.value ?? label), label, disabled: Boolean(child.props.disabled) });
  });
  return out;
}

/**
 * Select com busca (autocomplete): mesma API de um <select> com <option> dentro
 * (name, value/defaultValue, onChange, required, disabled), mas dá para digitar parte do nome.
 * O valor vai no formulário por um campo escondido com o mesmo `name`.
 */
export function SelectSearch({
  id,
  name,
  value,
  defaultValue,
  onChange,
  required,
  disabled,
  form,
  className,
  children,
  "aria-label": ariaLabel,
}: React.ComponentProps<"select">) {
  const options = useMemo(() => readOptions(children), [children]);
  // como o <select>: sem valor inicial, fica a primeira opção
  const [inner, setInner] = useState(() => String(defaultValue ?? options[0]?.value ?? ""));
  const current = value !== undefined ? String(value) : inner;
  const selected = options.find((o) => o.value === current) ?? null;
  // null = não está digitando (o campo mostra o escolhido)
  const [query, setQuery] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // texto igual ao escolhido = ainda não começou a buscar: mostra tudo
  const searching = query !== null && query.trim() !== "" && query !== selected?.label;
  const filtered = useMemo(() => (searching && query ? fuzzyFilter(options, query, (o) => o.label) : options), [options, query, searching]);
  const placeholder = options.find((o) => o.value === "")?.label;

  function choose(o: Option | null) {
    setQuery(null);
    if (!o || o.disabled) return;
    if (value === undefined) setInner(o.value);
    onChange?.({ target: { value: o.value, name }, currentTarget: { value: o.value, name } } as unknown as React.ChangeEvent<HTMLSelectElement>);
  }

  return (
    <Combobox.Root
      items={options}
      filteredItems={filtered}
      value={selected}
      onValueChange={(o) => choose(o as Option | null)}
      inputValue={query ?? selected?.label ?? ""}
      onInputValueChange={(v) => setQuery(v)}
      onOpenChange={(open) => {
        if (!open) setQuery(null);
      }}
      itemToStringLabel={(o: Option) => o.label}
      itemToStringValue={(o: Option) => o.value}
      isItemEqualToValue={(a: Option, b: Option) => a.value === b.value}
      disabled={disabled}
      autoHighlight
    >
      <div className={cn("relative w-full rounded-md bg-input", disabled && "opacity-50", className)}>
        <Combobox.Input
          ref={inputRef}
          id={id}
          aria-label={ariaLabel}
          placeholder={placeholder ?? "Escolha…"}
          autoComplete="off"
          spellCheck={false}
          onFocus={(e) => e.currentTarget.select()}
          onBlur={() => setQuery(null)}
          className="h-12 w-full rounded-md border-2 border-transparent bg-transparent px-4 pr-10 text-base text-grey-100 outline-none placeholder:text-muted-foreground focus-visible:border-primary"
        />
        <Combobox.Trigger
          aria-label="Ver opções"
          tabIndex={-1}
          className="absolute inset-y-0 right-0 flex w-10 items-center justify-center text-muted-foreground hover:text-grey-200"
        >
          <ChevronDownIcon className="size-4" />
        </Combobox.Trigger>
        {/* valor enviado no formulário (e validação de "obrigatório" do navegador) */}
        {name && (
          <input
            tabIndex={-1}
            aria-hidden
            name={name}
            form={form}
            value={current}
            required={required}
            onChange={() => {}}
            onFocus={() => inputRef.current?.focus()}
            className="pointer-events-none absolute bottom-0 left-4 h-px w-px opacity-0"
          />
        )}
      </div>
      <Combobox.Portal>
        <Combobox.Positioner sideOffset={4} className="z-[60] outline-none">
          <Combobox.Popup className="max-h-[min(var(--available-height),20rem)] w-[var(--anchor-width)] min-w-48 overflow-y-auto overscroll-contain rounded-md border border-border bg-popover p-1 text-popover-foreground shadow-lg">
            <Combobox.Empty className="px-3 py-2 text-sm text-muted-foreground empty:hidden">Nada encontrado</Combobox.Empty>
            <Combobox.List>
              {(o: Option) => (
                <Combobox.Item
                  key={o.value}
                  value={o}
                  disabled={o.disabled}
                  data-value={o.value}
                  className="flex min-h-10 cursor-pointer items-center gap-2 rounded px-3 py-2 text-base text-grey-100 outline-none select-none data-[disabled]:cursor-not-allowed data-[disabled]:opacity-40 data-[highlighted]:bg-grey-700"
                >
                  <span className="flex-1">{o.label || "—"}</span>
                  <Combobox.ItemIndicator>
                    <CheckIcon className="size-4 text-cyan-light" />
                  </Combobox.ItemIndicator>
                </Combobox.Item>
              )}
            </Combobox.List>
          </Combobox.Popup>
        </Combobox.Positioner>
      </Combobox.Portal>
    </Combobox.Root>
  );
}
