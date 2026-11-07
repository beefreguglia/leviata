import { CHANGELOG } from "@/lib/changelog";
import { requireViewer } from "@/lib/session";
import { fmtDate } from "@/lib/dates";
import { PageHeader } from "@/components/layout/page-header";
import { Markdown } from "@/components/markdown";
import { StatusBadge } from "@/components/status-badge";
import { Stagger, StaggerItem } from "@/components/motion";

export const metadata = { title: "Novidades" };

/** O que mudou no painel (mesmo texto que vai para o canal de novidades do Discord). */
export default async function NovidadesPage() {
  await requireViewer();
  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader title="Novidades" description="O que mudou no painel. As novas também chegam no Discord." />
      <Stagger className="flex flex-col gap-4">
        {CHANGELOG.map((e, i) => (
          <StaggerItem key={e.id}>
            <article className="flex flex-col gap-3 rounded-card bg-card p-6" data-testid="changelog-entry">
              <header className="flex flex-wrap items-center gap-2">
                <time dateTime={e.date} className="type-label text-muted-foreground">
                  {fmtDate(new Date(`${e.date}T12:00:00-03:00`))}
                </time>
                {i === 0 && <StatusBadge label="Nova" className="bg-cyan-low text-cyan-light" />}
              </header>
              <h2 className="type-h3 text-grey-100">{e.title}</h2>
              <Markdown>{e.items.map((item) => `- ${item}`).join("\n")}</Markdown>
            </article>
          </StaggerItem>
        ))}
      </Stagger>
    </div>
  );
}
