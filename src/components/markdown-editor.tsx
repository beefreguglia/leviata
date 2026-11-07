"use client";

import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Markdown } from "./markdown";

/** Editor de markdown com aba de pré-visualização. */
export function MarkdownEditor({
  name,
  defaultValue = "",
  rows = 18,
  placeholder,
}: {
  name: string;
  defaultValue?: string;
  rows?: number;
  placeholder?: string;
}) {
  const [value, setValue] = useState(defaultValue);
  return (
    <Tabs defaultValue="write" className="gap-2">
      <TabsList>
        <TabsTrigger value="write">Escrever</TabsTrigger>
        <TabsTrigger value="preview">Visualizar</TabsTrigger>
      </TabsList>
      <TabsContent value="write" keepMounted>
        <Textarea
          name={name}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          rows={rows}
          placeholder={placeholder}
          className="field-sizing-fixed font-mono text-sm md:text-sm"
        />
        <p className="mt-1.5 text-xs text-muted-foreground">
          Markdown: <code>## Título</code>, <code>**negrito**</code>, <code>- lista</code>, <code>| tabela |</code>,{" "}
          <code>&gt; destaque</code>
        </p>
      </TabsContent>
      <TabsContent value="preview">
        <div className="min-h-40 rounded-lg bg-muted p-4">
          {value.trim() ? <Markdown>{value}</Markdown> : <p className="text-sm text-muted-foreground">Nada para mostrar.</p>}
        </div>
      </TabsContent>
    </Tabs>
  );
}
