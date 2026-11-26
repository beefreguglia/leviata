"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Autocomplete } from "@base-ui/react/autocomplete";
import { SearchIcon } from "@/components/icons";
import { fuzzyFilter } from "@/lib/search";
import { cn } from "@/lib/utils";

export type Suggestion = { id: string; label: string; hint?: string | null; href?: string; keywords?: string };

/**
 * Campo de busca com sugestões por similaridade (parte da palavra, sem acento, em qualquer ordem).
 * Escolher uma sugestão abre o item (`href`) ou chama `onPick`; Enter sem sugestão marcada envia o formulário.
 * Funciona solto (controlado com `value`/`onValueChange`) ou dentro de um <form method="get"> (com `name`).
 */
export function SearchSuggest({
  items,
  name,
  defaultValue = "",
  value,
  onValueChange,
  onPick,
  placeholder,
  "aria-label": ariaLabel,
  className,
  limit = 8,
}: {
  items: Suggestion[];
  name?: string;
  defaultValue?: string;
  value?: string;
  onValueChange?: (v: string) => void;
  onPick?: (item: Suggestion) => void;
  placeholder?: string;
  "aria-label": string;
  className?: string;
  limit?: number;
}) {
  const router = useRouter();
  const [inner, setInner] = useState(defaultValue);
  const text = value ?? inner;
  const filtered = useMemo(
    () => (text.trim() ? fuzzyFilter(items, text, (i) => `${i.label} ${i.hint ?? ""} ${i.keywords ?? ""}`, limit) : []),
    [items, text, limit],
  );
  const set = (v: string) => {
    if (value === undefined) setInner(v);
    onValueChange?.(v);
  };

  return (
    <Autocomplete.Root name={name} items={items} filteredItems={filtered} value={text} onValueChange={(v, details) => {
        set(v);
        // escolheu uma sugestão (clique ou Enter): abre o item
        if (details.reason === "item-press") {
          const item = filtered.find((i) => i.label === v);
          if (!item) return;
          if (onPick) onPick(item);
          else if (item.href) router.push(item.href);
        }
      }} itemToStringValue={(i: Suggestion) => i.label}>
      <div className={cn("relative w-full", className)}>
        <SearchIcon className="pointer-events-none absolute top-1/2 left-4 size-5 -translate-y-1/2 text-grey-500" />
        <Autocomplete.Input
          aria-label={ariaLabel}
          placeholder={placeholder}
          autoComplete="off"
          spellCheck={false}
          className="h-12 w-full rounded-md border-2 border-transparent bg-card pr-4 pl-12 text-base text-grey-100 outline-none placeholder:text-muted-foreground focus-visible:border-primary"
        />
      </div>
      <Autocomplete.Portal>
        <Autocomplete.Positioner sideOffset={4} className="z-[60] outline-none">
          <Autocomplete.Popup className="max-h-[min(var(--available-height),22rem)] w-[var(--anchor-width)] overflow-y-auto overscroll-contain rounded-md border border-border bg-popover p-1 text-popover-foreground shadow-lg empty:hidden">
            <Autocomplete.List>
              {(item: Suggestion) => (
                <Autocomplete.Item
                  key={item.id}
                  value={item}
                  data-testid="search-suggestion"
                  className="flex min-h-11 cursor-pointer flex-col justify-center rounded px-3 py-2 outline-none select-none data-[highlighted]:bg-grey-700"
                >
                  <span className="text-base text-grey-100">{item.label}</span>
                  {item.hint && <span className="text-xs text-muted-foreground">{item.hint}</span>}
                </Autocomplete.Item>
              )}
            </Autocomplete.List>
          </Autocomplete.Popup>
        </Autocomplete.Positioner>
      </Autocomplete.Portal>
    </Autocomplete.Root>
  );
}
