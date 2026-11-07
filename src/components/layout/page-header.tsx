import { FadeIn } from "@/components/motion";

/** Título da página (Andromeda heading 2xl/4xl) + descrição em text-support. */
export function PageHeader({
  title,
  description,
  actions,
}: {
  title: string;
  description?: React.ReactNode;
  actions?: React.ReactNode;
}) {
  return (
    <FadeIn className="mb-10 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-bold leading-shorter text-grey-100 md:text-[2rem]">{title}</h1>
        {description && <p className="text-base text-muted-foreground">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-3">{actions}</div>}
    </FadeIn>
  );
}
