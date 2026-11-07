import Link from "next/link";
import { BookOpenIcon, PinIcon, PlusIcon, SearchIcon } from "lucide-react";
import type { LoreCategory, Prisma } from "@/generated/prisma/client";
import { db } from "@/lib/db";
import { requireViewer } from "@/lib/session";
import { LORE_CATEGORY } from "@/lib/labels";
import { fmtDate } from "@/lib/dates";
import { cn } from "@/lib/utils";
import { PageHeader } from "@/components/layout/page-header";
import { EmptyState } from "@/components/layout/grouped-list";
import { NativeSelect } from "@/components/forms/fields";
import { StatusBadge } from "@/components/status-badge";
import { UploadImage } from "@/components/upload-image";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { LinkButton } from "@/components/ui/link-button";
import { Stagger, StaggerItem } from "@/components/motion";

export const metadata = { title: "Lore" };

const monthLabel = (d: Date | null) =>
  d
    ? new Intl.DateTimeFormat("pt-BR", { month: "long", year: "numeric", timeZone: "America/Sao_Paulo" }).format(d)
    : "Sem data";

export default async function LorePage({ searchParams }: PageProps<"/lore">) {
  const viewer = await requireViewer();
  const sp = await searchParams;
  const q = typeof sp.q === "string" ? sp.q.trim() : "";
  const cat = typeof sp.categoria === "string" && sp.categoria in LORE_CATEGORY ? (sp.categoria as LoreCategory) : null;
  const tag = typeof sp.tag === "string" ? sp.tag : null;

  const where: Prisma.LoreArticleWhereInput = {};
  if (q) where.OR = [{ title: { contains: q, mode: "insensitive" } }, { summary: { contains: q, mode: "insensitive" } }, { content: { contains: q, mode: "insensitive" } }];
  if (cat) where.category = cat;
  if (tag) where.tags = { has: tag };
  const filtering = Boolean(q || cat || tag);

  const [articles, allTags] = await Promise.all([
    db.loreArticle.findMany({
      where,
      include: { author: true },
      orderBy: [{ happenedAt: { sort: "desc", nulls: "last" } }, { createdAt: "desc" }],
    }),
    db.loreArticle.findMany({ select: { tags: true } }),
  ]);
  const tagCounts = new Map<string, number>();
  for (const a of allTags) for (const t of a.tags) tagCounts.set(t, (tagCounts.get(t) ?? 0) + 1);
  const topTags = [...tagCounts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 12);

  const pinned = filtering ? [] : articles.filter((a) => a.isPinned);
  const timeline = filtering ? articles : articles.filter((a) => !a.isPinned);
  const groups = new Map<string, typeof timeline>();
  for (const a of timeline) {
    const key = monthLabel(a.happenedAt);
    groups.set(key, [...(groups.get(key) ?? []), a]);
  }

  const qs = (patch: Record<string, string | null>) => {
    const p = new URLSearchParams();
    const cur = { q: q || null, categoria: cat, tag, ...patch };
    for (const [k, v] of Object.entries(cur)) if (v) p.set(k, v);
    const s = p.toString();
    return s ? `/lore?${s}` : "/lore";
  };

  return (
    <>
      <PageHeader
        title="Lore"
        description="A história da Cidade dos Anjos contada pela Leviata."
        actions={
          viewer.can("conteudo.editar") && (
            <LinkButton href="/lore/novo">
              <PlusIcon /> Escrever
            </LinkButton>
          )
        }
      />

      <form className="mb-4 flex flex-col gap-3 sm:flex-row" role="search">
        <div className="relative flex-1">
          <SearchIcon className="pointer-events-none absolute top-1/2 left-4 size-5 -translate-y-1/2 text-grey-500" />
          <Input name="q" defaultValue={q} placeholder="Buscar na lore" className="bg-card pl-12" />
        </div>
        <div className="flex gap-3">
          <NativeSelect name="categoria" defaultValue={cat ?? ""} className="bg-card sm:w-44" aria-label="Categoria">
            <option value="">Todas</option>
            {Object.entries(LORE_CATEGORY).map(([v, { label }]) => (
              <option key={v} value={v}>
                {label}
              </option>
            ))}
          </NativeSelect>
          {tag && <input type="hidden" name="tag" value={tag} />}
          <Button type="submit" variant="secondary" size="lg">
            Filtrar
          </Button>
        </div>
      </form>

      {topTags.length > 0 && (
        <div className="mb-10 flex flex-wrap gap-1.5" aria-label="Tags">
          {topTags.map(([t, n]) => (
            <Link
              key={t}
              href={qs({ tag: tag === t ? null : t })}
              className={cn(
                "inline-flex h-7 items-center gap-1 rounded-full px-3 text-xs font-bold transition-colors",
                tag === t ? "bg-primary text-primary-foreground" : "bg-grey-700 text-grey-200 hover:bg-grey-600",
              )}
            >
              #{t} <span className="font-normal opacity-70">{n}</span>
            </Link>
          ))}
          {filtering && (
            <Link href="/lore" className="inline-flex h-7 items-center px-3 text-xs font-bold text-cyan-light hover:underline">
              Limpar filtros
            </Link>
          )}
        </div>
      )}

      {articles.length === 0 ? (
        <EmptyState
          icon={BookOpenIcon}
          title={filtering ? "Nada encontrado" : "A lore ainda está em branco"}
          description={filtering ? "Tente outra busca ou limpe os filtros." : "Comece registrando os fatos que marcaram a cidade."}
        />
      ) : (
        <div className="flex flex-col gap-10">
          {pinned.length > 0 && (
            <section className="flex flex-col gap-3">
              <h2 className="flex items-center gap-2 text-sm font-bold text-grey-200">
                <PinIcon className="size-4 text-primary" /> Em destaque
              </h2>
              <div className="grid gap-4 md:grid-cols-2">
                {pinned.map((a) => (
                  <LoreCard key={a.id} article={a} large />
                ))}
              </div>
            </section>
          )}
          <Stagger className="flex flex-col gap-10">
            {[...groups.entries()].map(([label, items]) => (
              <StaggerItem key={label}>
                <section className="relative flex flex-col gap-3 border-l-2 border-grey-700 pl-6">
                  <span className="absolute top-1 -left-[7px] size-3 rounded-full bg-primary ring-4 ring-background" aria-hidden="true" />
                  <h2 className="text-sm font-bold text-grey-200 first-letter:uppercase">{label}</h2>
                  <div className="flex flex-col gap-3">
                    {items.map((a) => (
                      <LoreCard key={a.id} article={a} />
                    ))}
                  </div>
                </section>
              </StaggerItem>
            ))}
          </Stagger>
        </div>
      )}
    </>
  );
}

function LoreCard({
  article,
  large,
}: {
  article: Awaited<ReturnType<typeof db.loreArticle.findMany<{ include: { author: true } }>>>[number];
  large?: boolean;
}) {
  return (
    <Link
      href={`/lore/${article.slug}`}
      data-testid="lore-card"
      className={cn(
        "group flex overflow-hidden rounded-card bg-card transition-colors hover:bg-grey-700",
        large ? "flex-col" : "flex-col sm:flex-row",
      )}
    >
      {article.coverId && (
        <UploadImage
          id={article.coverId}
          alt=""
          className={large ? "aspect-[16/7] w-full" : "aspect-video w-full sm:aspect-auto sm:w-48 sm:shrink-0"}
        />
      )}
      <div className="flex flex-1 flex-col gap-2 p-5">
        <div className="flex flex-wrap items-center gap-1.5">
          <StatusBadge {...LORE_CATEGORY[article.category]} />
          {article.happenedAt && <span className="text-xs text-muted-foreground">{fmtDate(article.happenedAt)}</span>}
        </div>
        <h3 className="text-lg font-bold text-grey-100">{article.title}</h3>
        {article.summary && <p className="text-sm text-grey-300">{article.summary}</p>}
        {article.tags.length > 0 && (
          <p className="mt-auto flex flex-wrap gap-x-2 pt-1 text-xs text-cyan-light">
            {article.tags.map((t) => (
              <span key={t}>#{t}</span>
            ))}
          </p>
        )}
      </div>
    </Link>
  );
}
