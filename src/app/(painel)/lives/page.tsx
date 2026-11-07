import { after } from "next/server";
import { RadioIcon, RefreshCwIcon, Trash2Icon, TriangleAlertIcon } from "lucide-react";
import { db } from "@/lib/db";
import { requireViewer } from "@/lib/session";
import { refreshStreamsIfStale } from "@/lib/stream-refresh";
import { STREAM_PLATFORM } from "@/lib/labels";
import { STREAM_URL } from "@/lib/streams";
import { STREAM_HANDLE_HINT, STREAM_PLATFORMS } from "@/lib/schemas/content";
import { fmtAgo } from "@/lib/dates";
import { PageHeader } from "@/components/layout/page-header";
import { EmptyState, GroupedList } from "@/components/layout/grouped-list";
import { ActionForm, SubmitButton } from "@/components/forms/action-form";
import { ConfirmButton } from "@/components/forms/confirm-button";
import { Field, NativeSelect } from "@/components/forms/fields";
import { StatusBadge } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Stagger, StaggerItem } from "@/components/motion";
import { AutoRefresh } from "./auto-refresh";
import { LiveCard } from "./live-card";
import { addStreamChannel, refreshStreamsNow, removeStreamChannel } from "./actions";

export const metadata = { title: "Ao vivo" };

const CONFIGURED = {
  TWITCH: () => Boolean(process.env.TWITCH_CLIENT_ID && process.env.TWITCH_CLIENT_SECRET),
  KICK: () => true,
  YOUTUBE: () => Boolean(process.env.YOUTUBE_API_KEY),
};

export default async function LivesPage() {
  const viewer = await requireViewer();
  const canManage = viewer.can("conteudo.editar");
  // atualiza em segundo plano se os dados estiverem velhos (a próxima visita/auto-refresh já mostra)
  after(() => refreshStreamsIfStale().catch((err) => console.error("Falha ao atualizar lives:", err)));

  const channels = await db.streamChannel.findMany({
    include: { member: true },
    orderBy: [{ isLive: "desc" }, { viewers: { sort: "desc", nulls: "last" } }, { member: { rpName: "asc" } }],
  });
  const live = channels.filter((c) => c.isLive);
  const offline = channels.filter((c) => !c.isLive);
  const mine = channels.filter((c) => c.memberId === viewer.member?.id);
  const missingConfig = STREAM_PLATFORMS.filter((p) => !CONFIGURED[p]() && channels.some((c) => c.platform === p));
  const lastCheck = channels.reduce<Date | null>((acc, c) => (c.checkedAt && (!acc || c.checkedAt > acc) ? c.checkedAt : acc), null);

  return (
    <>
      <AutoRefresh seconds={60} />
      <PageHeader
        title="Ao vivo"
        description={`Quem da Leviata está em live agora${lastCheck ? ` · verificado ${fmtAgo(lastCheck)}` : ""}.`}
        actions={
          canManage && (
            <ActionForm action={async () => { "use server"; return refreshStreamsNow(); }}>
              <SubmitButton variant="secondary">
                <RefreshCwIcon /> Atualizar agora
              </SubmitButton>
            </ActionForm>
          )
        }
      />

      {missingConfig.length > 0 && canManage && (
        <p className="mb-8 flex items-start gap-3 rounded-card bg-warning-low px-5 py-4 text-sm text-warning">
          <TriangleAlertIcon className="mt-0.5 size-5 shrink-0" />
          <span>
            {missingConfig.map((p) => STREAM_PLATFORM[p].label).join(" e ")} sem configuração: os canais dessa(s) plataforma(s) não são
            verificados. Preencha as chaves no <code>.env</code> (veja o README).
          </span>
        </p>
      )}

      <div className="flex flex-col gap-10">
        <section className="flex flex-col gap-3">
          <h2 className="flex items-center gap-2 text-sm font-bold text-grey-200">
            <span className="size-2 rounded-full bg-danger-light" /> Ao vivo agora · {live.length}
          </h2>
          {live.length === 0 ? (
            <EmptyState icon={RadioIcon} title="Ninguém ao vivo agora" description="Quando alguém da fac abrir live, aparece aqui sozinho." />
          ) : (
            <Stagger className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {live.map((c) => (
                <StaggerItem key={c.id}>
                  <LiveCard channel={c} />
                </StaggerItem>
              ))}
            </Stagger>
          )}
        </section>

        <GroupedList header="Meus canais" footer={`Até 3 canais. ${STREAM_HANDLE_HINT.YOUTUBE}`}>
          {mine.map((c) => (
            <div key={c.id} className="flex min-h-14 items-center justify-between gap-3 px-5 py-3">
              <span className="flex min-w-0 items-center gap-2">
                <StatusBadge {...STREAM_PLATFORM[c.platform]} />
                <a href={STREAM_URL[c.platform](c.handle)} target="_blank" rel="noreferrer" className="truncate text-base text-grey-100 hover:underline">
                  {c.handle}
                </a>
              </span>
              <ConfirmButton
                title="Remover este canal?"
                confirmLabel="Remover"
                destructive
                action={removeStreamChannel.bind(null, c.id)}
                trigger={
                  <Button variant="ghost" size="icon-sm" aria-label={`Remover canal ${c.handle}`}>
                    <Trash2Icon />
                  </Button>
                }
              />
            </div>
          ))}
          {mine.length < 3 && (
            <ActionForm action={addStreamChannel} resetOnSuccess className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-end">
              <Field label="Plataforma" htmlFor="platform" className="sm:w-40">
                <NativeSelect id="platform" name="platform" defaultValue="TWITCH">
                  {STREAM_PLATFORMS.map((p) => (
                    <option key={p} value={p}>
                      {STREAM_PLATFORM[p].label}
                    </option>
                  ))}
                </NativeSelect>
              </Field>
              <Field label="Canal" htmlFor="handle" className="flex-1">
                <Input id="handle" name="handle" required placeholder="Link do canal ou nome" />
              </Field>
              <SubmitButton size="lg">Adicionar</SubmitButton>
            </ActionForm>
          )}
        </GroupedList>

        {offline.length > 0 && (
          <GroupedList header={`Offline · ${offline.length}`}>
            {offline.map((c) => (
              <div key={c.id} className="flex min-h-14 items-center justify-between gap-3 px-5 py-3">
                <div className="flex min-w-0 flex-col">
                  <span className="text-base text-grey-100">{c.member.rpName}</span>
                  <a href={STREAM_URL[c.platform](c.handle)} target="_blank" rel="noreferrer" className="truncate text-sm text-muted-foreground hover:underline">
                    {STREAM_PLATFORM[c.platform].label} · {c.handle}
                  </a>
                  {canManage && c.lastError && <span className="text-xs text-warning">⚠ {c.lastError}</span>}
                </div>
                <div className="flex items-center gap-2">
                  <span className="hidden text-xs text-muted-foreground sm:inline">{c.checkedAt ? `visto ${fmtAgo(c.checkedAt)}` : "ainda não verificado"}</span>
                  {canManage && c.memberId !== viewer.member?.id && (
                    <ConfirmButton
                      title={`Remover o canal de ${c.member.rpName}?`}
                      confirmLabel="Remover"
                      destructive
                      action={removeStreamChannel.bind(null, c.id)}
                      trigger={
                        <Button variant="ghost" size="icon-sm" aria-label={`Remover canal ${c.handle}`}>
                          <Trash2Icon />
                        </Button>
                      }
                    />
                  )}
                </div>
              </div>
            ))}
          </GroupedList>
        )}
      </div>
    </>
  );
}
