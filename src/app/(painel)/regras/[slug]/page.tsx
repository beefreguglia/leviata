import { notFound } from "next/navigation";
import { HistoryIcon, PencilIcon } from "lucide-react";
import { db } from "@/lib/db";
import { getViewer } from "@/lib/session";
import { fmtAgo } from "@/lib/dates";
import { Markdown } from "@/components/markdown";
import { LinkButton } from "@/components/ui/link-button";
import { FadeIn } from "@/components/motion";

export async function generateMetadata({ params }: PageProps<"/regras/[slug]">) {
  const { slug } = await params;
  const page = await db.rulePage.findUnique({ where: { slug }, select: { title: true } });
  return { title: page?.title ?? "Regras" };
}

export default async function RegraPage({ params }: PageProps<"/regras/[slug]">) {
  const { slug } = await params;
  const viewer = await getViewer();
  const page = await db.rulePage.findUnique({
    where: { slug },
    include: { versions: { orderBy: { createdAt: "desc" }, take: 1, include: { author: true } } },
  });
  if (!page || (!page.isPublic && !viewer?.can("painel.ver"))) notFound();
  const last = page.versions[0];

  return (
    <FadeIn key={page.id} className="max-w-3xl">
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="type-h1 text-grey-100">{page.title}</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Atualizado {fmtAgo(page.updatedAt)}
            {last?.author ? ` por ${last.author.rpName}` : ""}
            {page.isPublic ? " · visível para recrutas" : ""}
          </p>
        </div>
        {viewer?.can("regras.editar") && (
          <div className="flex gap-3">
            <LinkButton href={`/regras/${page.slug}/historico`} variant="ghost">
              <HistoryIcon /> Histórico
            </LinkButton>
            <LinkButton href={`/regras/${page.slug}/editar`} variant="secondary">
              <PencilIcon /> Editar
            </LinkButton>
          </div>
        )}
      </div>
      <article className="rounded-card bg-card px-6 py-8 sm:px-10">
        <Markdown>{page.content}</Markdown>
      </article>
    </FadeIn>
  );
}
