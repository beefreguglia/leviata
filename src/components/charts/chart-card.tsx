/** Moldura dos gráficos: título, legenda, gráfico, tabela com os mesmos dados e estado vazio. */
export type ChartSeries = { key: string; label: string; color: string };

export function ChartCard({
  title,
  description,
  series,
  empty,
  emptyText = "O gráfico aparece com as primeiras movimentações.",
  table,
  testId,
  children,
}: {
  title: string;
  description?: string;
  /** com 2 ou mais séries mostra a legenda */
  series?: ChartSeries[];
  empty: boolean;
  emptyText?: string;
  table: { columns: string[]; rows: string[][] };
  testId: string;
  children: React.ReactNode;
}) {
  return (
    <section className="flex min-w-0 flex-col gap-4 rounded-card bg-card p-5 md:p-6" data-testid={testId}>
      <header className="flex flex-col gap-1">
        <h2 className="text-base font-bold text-grey-100">{title}</h2>
        {description && <p className="text-sm text-muted-foreground">{description}</p>}
      </header>
      {empty ? (
        <p className="py-10 text-center text-sm text-muted-foreground">{emptyText}</p>
      ) : (
        <>
          {series && series.length > 1 && (
            <ul className="flex flex-wrap gap-4 text-sm text-grey-200">
              {series.map((s) => (
                <li key={s.key} className="flex items-center gap-2">
                  <span aria-hidden="true" className="size-3 rounded-sm" style={{ backgroundColor: s.color }} />
                  {s.label}
                </li>
              ))}
            </ul>
          )}
          {children}
          <details className="text-sm text-muted-foreground">
            <summary className="flex min-h-10 cursor-pointer items-center hover:text-grey-200">Ver dados</summary>
            <div className="mt-2 overflow-x-auto">
              <table className="w-full text-left tabular-nums">
                <thead>
                  <tr className="border-b border-grey-700">
                    {table.columns.map((c) => (
                      <th key={c} scope="col" className="py-2 pr-4 font-medium">
                        {c}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {table.rows.map((row, i) => (
                    <tr key={i} className="border-b border-grey-700 last:border-b-0">
                      {row.map((cell, j) => (
                        <td key={j} className="py-2 pr-4 text-grey-200">
                          {cell}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </details>
        </>
      )}
    </section>
  );
}
