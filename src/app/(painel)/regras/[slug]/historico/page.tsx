import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { requireViewer } from "@/lib/session";
import { fmtDateTime } from "@/lib/dates";
import { Markdown } from "@/components/markdown";

export const metadata = { title: "Histórico da regra" };

export default async function HistoricoRegraPage({ params }: PageProps<"/regras/[slug]/historico">) {
  await requireViewer("regras.editar");
  const { slug } = await params;
  const page = await db.rulePage.findUnique({
    where: { slug },
    include: { versions: { orderBy: { createdAt: "desc" }, include: { author: true }, take: 30 } },
  });
  if (!page) notFound();

  return (
    <div className="max-w-3xl">
      <h1 className="mb-2 text-2xl font-bold leading-shorter md:text-[2rem]">Histórico</h1>
      <p className="mb-10 text-base text-muted-foreground">{page.title}</p>
      <div className="flex flex-col gap-4">
        {page.versions.map((v, i) => (
          <details key={v.id} className="group rounded-card bg-card" open={i === 0}>
            <summary className="flex min-h-14 cursor-pointer list-none items-center justify-between gap-3 px-5 text-base">
              <span>
                {fmtDateTime(v.createdAt)}
                <span className="text-muted-foreground"> · {v.author?.rpName ?? "desconhecido"}</span>
              </span>
              {i === 0 && <span className="text-xs text-primary">versão atual</span>}
            </summary>
            <div className="border-t border-grey-700 px-6 py-6">
              <Markdown>{v.content}</Markdown>
            </div>
          </details>
        ))}
      </div>
    </div>
  );
}
