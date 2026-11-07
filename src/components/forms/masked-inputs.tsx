"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { digits, formatMoney, formatPhone } from "@/lib/masks";

type BaseProps = Omit<React.ComponentProps<typeof Input>, "value" | "defaultValue" | "onChange" | "type" | "name"> & {
  name: string;
};

/**
 * Dinheiro: mostra "R$ 1.500.000" e envia só os números no campo `name` (o servidor recebe "1500000").
 * Use `value`/`onValueChange` quando precisar do valor ao vivo (ex.: total da venda).
 */
export function MoneyInput({
  name,
  defaultValue,
  value,
  onValueChange,
  className,
  ...props
}: BaseProps & { defaultValue?: number | string | null; value?: string; onValueChange?: (digits: string) => void }) {
  const [inner, setInner] = useState(() => digits(String(defaultValue ?? "")));
  const raw = value ?? inner;
  return (
    <div className="relative">
      <span aria-hidden="true" className="pointer-events-none absolute top-1/2 left-4 -translate-y-1/2 text-base text-muted-foreground">
        R$
      </span>
      <Input
        {...props}
        inputMode="numeric"
        autoComplete="off"
        value={formatMoney(raw)}
        onChange={(e) => {
          const d = digits(e.target.value).replace(/^0+(?=\d)/, "").slice(0, 12);
          setInner(d);
          onValueChange?.(d);
        }}
        className={cn("pl-11 tabular-nums", className)}
      />
      <input type="hidden" name={name} value={raw} />
    </div>
  );
}

/** Telefone da cidade: formata "(055) 123-456" enquanto digita. */
export function PhoneInput({ name, defaultValue, className, ...props }: BaseProps & { defaultValue?: string | null }) {
  const [value, setValue] = useState(() => formatPhone(defaultValue));
  return (
    <Input
      {...props}
      name={name}
      inputMode="tel"
      autoComplete="off"
      placeholder={props.placeholder ?? "(055) 000-000"}
      value={value}
      onChange={(e) => setValue(formatPhone(e.target.value))}
      className={cn("tabular-nums", className)}
    />
  );
}
