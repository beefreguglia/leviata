import { notFound } from "next/navigation";
import { PencilIcon } from "lucide-react";
import { db } from "@/lib/db";
import { requireViewer } from "@/lib/session";
import { LORE_CATEGORY } from "@/lib/labels";
import { fmtAgo, fmtDate } from "@/lib/dates";
import { Markdown } from "@/components/markdown";
import { StatusBadge } from "@/components/status-badge";
import { UploadImage } from "@/components/upload-image";
import { LinkButton } from "@/components/ui/link-button";
import { FadeIn } from "@/components/motion";

export async function generateMetadata({ params }: PageProps<"/lore/[slug]">) {
  const { slug } = await params;
  const a = await db.loreArticle.findUnique({ where: { slug }, select: { title: true } });
  return { title: a?.title ?? "Lore" };
}

export default async function LoreArticlePage({ params }: PageProps<"/lore/[slug]">) {
  const viewer = await requireViewer();
  const { slug } = await params;
  const article = await db.loreArticle.findUnique({ where: { slug }, include: { author: true } });
  if (!article) notFound();

  return (
    <FadeIn className="mx-auto max-w-3xl">
      {article.coverId && (
        <UploadImage id={article.coverId} alt="" className="mb-8 aspect-[16/7] w-full rounded-card" />
      )}
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex flex-col gap-3">
          <div className="flex flex-wrap items-center gap-1.5">
            <StatusBadge {...LORE_CATEGORY[article.category]} />
            {article.happenedAt && <span className="text-sm text-muted-foreground">{fmtDate(article.happenedAt)}</span>}
          </div>
          <h1 className="text-2xl font-bold leading-shorter text-grey-100 md:text-[2rem]">{article.title}</h1>
          {article.summary && <p className="text-lg text-grey-300">{article.summary}</p>}
          <p className="text-sm text-muted-foreground">
            Por {article.author?.rpName ?? "Leviatã"} · atualizado {fmtAgo(article.updatedAt)}
          </p>
        </div>
        {viewer.can("conteudo.editar") && (
          <LinkButton href={`/lore/${article.slug}/editar`} variant="secondary">
            <PencilIcon /> Editar
          </LinkButton>
        )}
      </div>
      <article className="rounded-card bg-card px-6 py-8 sm:px-10">
        <Markdown>{article.content}</Markdown>
      </article>
      {article.tags.length > 0 && (
        <p className="mt-6 flex flex-wrap gap-1.5">
          {article.tags.map((t) => (
            <a key={t} href={`/lore?tag=${encodeURIComponent(t)}`} className="inline-flex h-7 items-center rounded-full bg-grey-700 px-3 text-xs font-bold text-grey-200 hover:bg-grey-600">
              #{t}
            </a>
          ))}
        </p>
      )}
    </FadeIn>
  );
}
