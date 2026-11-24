"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { usePathname, useRouter } from "next/navigation";
import { toast } from "sonner";
import { AiChatIcon, CheckIcon, Loader2Icon, SendIcon, Trash2Icon } from "@/components/icons";
import { Markdown } from "@/components/markdown";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { confirmAssistantAction } from "@/lib/ai/actions";
import type { PendingAction } from "@/lib/ai/tools";
import { cn } from "@/lib/utils";

type CardState = { status: "aberto" | "salvando" | "feito" | "cancelado"; error?: string; message?: string };
type Msg = { role: "user" | "assistant"; content: string; pending?: PendingAction[]; model?: string | null; error?: boolean };

const STORAGE_KEY = "leviata-assistente";

function load(): { messages: Msg[]; cards: Record<string, CardState> } {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch {
    /* sem storage: começa vazio */
  }
  return { messages: [], cards: {} };
}

function ActionCard({ action, state, onConfirm, onCancel }: { action: PendingAction; state: CardState; onConfirm: () => void; onCancel: () => void }) {
  const [first, ...rest] = action.lines;
  return (
    <div data-testid="assistant-action" className="flex flex-col gap-3 rounded-md border border-cyan-mid/40 bg-grey-800 p-4">
      <div className="flex flex-col gap-1">
        <span className="type-label text-cyan-light">{action.title}</span>
        {first && <p className="text-base font-bold text-grey-100">{first}</p>}
        {rest.map((l, i) => (
          <p key={i} className="text-sm whitespace-pre-line text-grey-300">
            {l}
          </p>
        ))}
      </div>
      {state.status === "feito" ? (
        <p className="flex items-center gap-1.5 text-sm text-success">
          <CheckIcon className="size-4" /> {state.message ?? "Feito"}
        </p>
      ) : state.status === "cancelado" ? (
        <p className="text-sm text-muted-foreground">Cancelado</p>
      ) : (
        <>
          {state.error && <p className="text-sm text-danger-light">{state.error}</p>}
          <div className="flex gap-2">
            <Button size="sm" onClick={onConfirm} disabled={state.status === "salvando"}>
              {state.status === "salvando" ? <Loader2Icon className="animate-spin" /> : <CheckIcon />} Confirmar
            </Button>
            <Button size="sm" variant="ghost" onClick={onCancel} disabled={state.status === "salvando"}>
              Cancelar
            </Button>
          </div>
        </>
      )}
    </div>
  );
}

/** Botão flutuante + painel lateral do assistente de IA. */
export function AssistantChat({ enabled, suggestions }: { enabled: boolean; suggestions: string[] }) {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [cards, setCards] = useState<Record<string, CardState>>({});
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [, startTransition] = useTransition();
  const pathname = usePathname();
  const router = useRouter();
  const endRef = useRef<HTMLDivElement>(null);
  const restored = useRef(false);

  // conversa guardada só nesta aba (some ao fechar o navegador)
  useEffect(() => {
    const saved = load();
    setMessages(saved.messages);
    setCards(saved.cards);
    restored.current = true;
  }, []);
  useEffect(() => {
    if (!restored.current) return;
    try {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify({ messages: messages.slice(-40), cards }));
    } catch {
      /* ignora */
    }
  }, [messages, cards]);
  useEffect(() => {
    if (open) endRef.current?.scrollIntoView({ block: "end" });
  }, [messages, loading, open]);

  async function send(text: string) {
    const content = text.trim();
    if (!content || loading) return;
    const next: Msg[] = [...messages, { role: "user", content }];
    setMessages(next);
    setInput("");
    setLoading(true);
    try {
      const res = await fetch("/api/assistente", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ page: pathname, messages: next.filter((m) => !m.error).map(({ role, content }) => ({ role, content })) }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? "O assistente não respondeu");
      setMessages((m) => [...m, { role: "assistant", content: data.reply, pending: data.pending, model: data.model }]);
    } catch (err) {
      setMessages((m) => [...m, { role: "assistant", content: err instanceof Error ? err.message : "Falha no assistente", error: true }]);
    } finally {
      setLoading(false);
    }
  }

  function confirm(p: PendingAction) {
    setCards((c) => ({ ...c, [p.id]: { status: "salvando" } }));
    startTransition(async () => {
      const r = await confirmAssistantAction(p.action, p.fields);
      if (r.ok) {
        setCards((c) => ({ ...c, [p.id]: { status: "feito", message: r.message } }));
        if (r.message) toast.success(r.message);
        router.refresh();
      } else {
        setCards((c) => ({ ...c, [p.id]: { status: "aberto", error: r.error } }));
      }
    });
  }

  function clear() {
    setMessages([]);
    setCards({});
  }

  const lastModel = [...messages].reverse().find((m) => m.model)?.model;

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger
        render={
          <Button size="lg" className="fixed right-5 bottom-5 z-40 rounded-full shadow-[0_8px_28px_-6px_rgba(6,212,236,0.55)] max-sm:size-14 max-sm:p-0" aria-label="Abrir o assistente">
            <AiChatIcon className="size-5" />
            <span className="max-sm:sr-only">Assistente</span>
          </Button>
        }
      />
      <SheetContent side="right" className="w-full gap-0 p-0 data-[side=right]:sm:max-w-md" data-testid="assistant-panel">
        <SheetHeader className="border-b border-border px-5 py-4">
          <SheetTitle className="flex items-center gap-2">
            <AiChatIcon className="size-5 text-cyan-light" /> Assistente
          </SheetTitle>
          <SheetDescription>Tira dúvidas do painel e prepara ações para você confirmar. Só faz o que o seu cargo permite.</SheetDescription>
        </SheetHeader>

        <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto px-5 py-4" aria-live="polite">
          {!enabled ? (
            <p className="rounded-md bg-warning-low px-4 py-3 text-sm text-warning">O assistente ainda não foi configurado. Avise a liderança.</p>
          ) : messages.length === 0 ? (
            <div className="flex flex-col gap-3">
              <p className="text-sm text-muted-foreground">Pergunte qualquer coisa do painel ou peça para fazer algo. Exemplos:</p>
              <div className="flex flex-col gap-2">
                {suggestions.map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => send(s)}
                    className="min-h-10 rounded-md bg-grey-800 px-3 py-2 text-left text-sm text-grey-200 transition-colors hover:bg-grey-700"
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            messages.map((m, i) => (
              <div key={i} className={cn("flex flex-col gap-2", m.role === "user" ? "items-end" : "items-start")} data-testid={`assistant-msg-${m.role}`}>
                <div
                  className={cn(
                    "max-w-[90%] rounded-2xl px-4 py-2.5 text-sm",
                    m.role === "user" ? "rounded-br-sm bg-primary text-primary-foreground" : m.error ? "bg-danger-low text-danger-light" : "rounded-bl-sm bg-grey-800 text-grey-100",
                  )}
                >
                  {m.role === "assistant" && !m.error ? <Markdown className="text-sm [&_p]:my-1">{m.content}</Markdown> : <p className="whitespace-pre-wrap">{m.content}</p>}
                </div>
                {m.pending?.map((p) => (
                  <div key={p.id} className="w-full">
                    <ActionCard
                      action={p}
                      state={cards[p.id] ?? { status: "aberto" }}
                      onConfirm={() => confirm(p)}
                      onCancel={() => setCards((c) => ({ ...c, [p.id]: { status: "cancelado" } }))}
                    />
                  </div>
                ))}
              </div>
            ))
          )}
          {loading && (
            <p className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2Icon className="size-4 animate-spin" /> Pensando…
            </p>
          )}
          <div ref={endRef} />
        </div>

        <form
          className="flex flex-col gap-2 border-t border-border px-5 py-4"
          onSubmit={(e) => {
            e.preventDefault();
            send(input);
          }}
        >
          <div className="flex items-end gap-2">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
                  e.preventDefault();
                  send(input);
                }
              }}
              rows={2}
              maxLength={2000}
              disabled={!enabled}
              aria-label="Mensagem para o assistente"
              placeholder="Pergunte ou peça algo…"
              className="min-h-12 flex-1 resize-none rounded-md bg-input px-3 py-2.5 text-base text-grey-100 outline-none placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring"
            />
            <Button type="submit" size="icon-lg" disabled={!enabled || loading || !input.trim()} aria-label="Enviar">
              <SendIcon />
            </Button>
          </div>
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>{lastModel ? `IA grátis · ${lastModel}` : "IA grátis · pode errar, confira antes de confirmar"}</span>
            {messages.length > 0 && (
              <button type="button" onClick={clear} className="inline-flex min-h-8 items-center gap-1 rounded px-1.5 hover:text-grey-200">
                <Trash2Icon className="size-3.5" /> Limpar conversa
              </button>
            )}
          </div>
        </form>
      </SheetContent>
    </Sheet>
  );
}

