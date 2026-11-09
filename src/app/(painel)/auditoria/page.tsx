import { db } from "@/lib/db";
import { requireViewer } from "@/lib/session";
import { fmtDateTime } from "@/lib/dates";
import { PageHeader } from "@/components/layout/page-header";
import { EmptyState } from "@/components/layout/grouped-list";
import { Button } from "@/components/ui/button";
import { LinkButton } from "@/components/ui/link-button";
import { LayoutListIcon } from "@/components/icons";

export const metadata = { title: "Auditoria" };

const PAGE_SIZE = 50;

export default async function AuditoriaPage({ searchParams }: PageProps<"/auditoria">) {
  await requireViewer("auditoria.ver");
  const sp = await searchParams;
  const page = Math.max(1, Number(typeof sp.p === "string" ? sp.p : 1) || 1);

  const [logs, total] = await Promise.all([
    db.auditLog.findMany({
      include: { user: { include: { member: true } } },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
    }),
    db.auditLog.count(),
  ]);
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <>
      <PageHeader title="Auditoria" description="Tudo que foi criado, editado ou apagado no painel." />
      {logs.length === 0 ? (
        <EmptyState icon={LayoutListIcon} title="Nada registrado ainda" />
      ) : (
        <div className="overflow-hidden rounded-card glass-card [&>*+*]:border-t [&>*+*]:border-white/10">
          {logs.map((log) => (
            <div key={log.id} className="flex flex-col gap-0.5 px-5 py-4 sm:flex-row sm:items-center sm:gap-4">
              <span className="w-36 shrink-0 text-sm text-muted-foreground tabular-nums">{fmtDateTime(log.createdAt)}</span>
              <span className="w-40 shrink-0 truncate text-base font-medium">
                {log.user?.member?.rpName ?? log.user?.username ?? "Sistema"}
              </span>
              <span className="min-w-0 flex-1 text-base text-muted-foreground">{log.summary}</span>
              <code className="hidden text-xs text-muted-foreground/70 lg:block">{log.action}</code>
            </div>
          ))}
        </div>
      )}
      {pages > 1 && (
        <div className="mt-4 flex items-center justify-between">
          {page > 1 ? (
            <LinkButton href={`/auditoria?p=${page - 1}`} variant="ghost">Anterior</LinkButton>
          ) : (
            <Button variant="ghost" disabled>Anterior</Button>
          )}
          <span className="text-sm text-muted-foreground tabular-nums">
            {page} de {pages}
          </span>
          {page < pages ? (
            <LinkButton href={`/auditoria?p=${page + 1}`} variant="ghost">Próxima</LinkButton>
          ) : (
            <Button variant="ghost" disabled>Próxima</Button>
          )}
        </div>
      )}
    </>
  );
}
