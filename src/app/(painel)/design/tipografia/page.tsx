import { requireViewer } from "@/lib/session";
import { PageHeader } from "@/components/layout/page-header";
import { GroupedList } from "@/components/layout/grouped-list";
import { StatusBadge } from "@/components/status-badge";

export const metadata = { title: "Tipografia" };

const SCALE = [
  { cls: "type-display", font: "Bebas Neue", size: "48 → 64px", use: "Capa / telas especiais", sample: "Leviatã" },
  { cls: "type-h1", font: "Bebas Neue", size: "36 → 44px", use: "Título da página", sample: "Próximas ações" },
  { cls: "type-h2", font: "Barlow Condensed 600", size: "15px", use: "Cabeçalho de seção", sample: "Estoque de itens" },
  { cls: "type-h3", font: "Barlow 600", size: "18px", use: "Título de card", sample: "Fleeca da praça" },
  { cls: "type-body", font: "Barlow 400", size: "16px", use: "Texto corrido", sample: "A lealdade à Leviatã está acima de interesses, amizades externas ou benefícios individuais." },
  { cls: "type-small", font: "Barlow 400", size: "14px", use: "Descrição / metadado", sample: "Atualizado há 5 min por Dante Moretti" },
  { cls: "type-caption", font: "Barlow 500", size: "12px", use: "Dica de campo", sample: "Ex.: 1 fabricação faz 10 munições → 10" },
  { cls: "type-label", font: "Barlow Condensed 600", size: "13px", use: "Selo / rótulo", sample: "Sábado, 7 de novembro" },
  { cls: "type-stat", font: "Bebas Neue", size: "40px", use: "Número grande", sample: "R$ 250.000" },
  { cls: "type-accent", font: "Permanent Marker", size: "herda", use: "Destaque (1× por tela)", sample: "Bom trampo, Dante" },
  { cls: "type-code", font: "Fira Code", size: "0.875em", use: "IDs e códigos", sample: "#1024 · ERR-7f3a" },
] as const;

const FAMILIES = [
  { name: "Bebas Neue", cls: "font-display uppercase", role: "Título", why: "Condensada e maiúscula, impacto de tela de missão do GTA." },
  { name: "Barlow", cls: "font-sans", role: "Texto", why: "Interface de jogo legível, estilo GPS/celular." },
  { name: "Barlow Condensed", cls: "font-label uppercase tracking-[0.06em]", role: "Rótulo", why: "Compacta como os rótulos do HUD." },
  { name: "Permanent Marker", cls: "font-accent", role: "Destaque", why: "Traço de grafite, conversa com o logo." },
  { name: "Fira Code", cls: "font-mono", role: "Código", why: "IDs, passaportes e valores técnicos." },
];

/** Manual de tipografia ao vivo (o texto completo está em docs/TIPOGRAFIA.md). */
export default async function TipografiaPage() {
  await requireViewer("admin");
  return (
    <>
      <PageHeader title="Tipografia" description="As fontes do painel e quando usar cada uma. Use sempre as classes type-*." />

      <section className="mb-12 grid gap-4 md:grid-cols-2 xl:grid-cols-3 [&>*]:min-w-0">
        {FAMILIES.map((f) => (
          <article key={f.name} className="flex flex-col gap-3 rounded-card bg-card p-6">
            <StatusBadge label={f.role} className="w-fit bg-cyan-low text-cyan-light" />
            <p className={`${f.cls} text-[2.5rem] leading-none text-grey-100`}>Aa Çã 0123</p>
            <h3 className="type-h3 text-grey-100">{f.name}</h3>
            <p className="type-small text-muted-foreground">{f.why}</p>
          </article>
        ))}
      </section>

      <GroupedList header="Escala">
        {SCALE.map((t) => (
          <div key={t.cls} className="flex flex-col gap-3 px-6 py-5 md:flex-row md:items-baseline md:gap-8">
            <div className="flex shrink-0 flex-col gap-1 md:w-56">
              <code className="type-code text-cyan-light">.{t.cls}</code>
              <span className="type-caption text-muted-foreground">
                {t.font} · {t.size}
              </span>
              <span className="type-caption text-muted-foreground">{t.use}</span>
            </div>
            <p className={`${t.cls} min-w-0 text-grey-100 ${t.cls === "type-accent" ? "text-2xl text-cyan-light" : ""}`}>{t.sample}</p>
          </div>
        ))}
      </GroupedList>

      <section className="mt-12 grid gap-4 lg:grid-cols-2 [&>*]:min-w-0">
        <GroupedList header="Exemplo de tela">
          <div className="flex flex-col gap-4 p-6">
            <span className="type-label text-muted-foreground">Sábado, 7 de novembro</span>
            <h1 className="type-h1 text-grey-100">
              Boa noite, <span className="type-accent text-[0.82em] normal-case text-cyan-light">Dante</span>
            </h1>
            <div className="grid grid-cols-2 gap-4">
              <div className="rounded-card bg-grey-700 p-5">
                <span className="block type-stat text-grey-100">R$ 250.000</span>
                <span className="type-small text-muted-foreground">sujo</span>
              </div>
              <div className="rounded-card bg-grey-700 p-5">
                <span className="block type-stat text-grey-100">12</span>
                <span className="type-small text-muted-foreground">membros ativos</span>
              </div>
            </div>
            <h2 className="type-h2 text-grey-300">Próximas ações e corridas</h2>
            <div className="flex items-center justify-between gap-3 rounded-md bg-grey-700 px-4 py-3">
              <span className="flex flex-col">
                <span className="type-h3 text-grey-100">Fleeca da praça</span>
                <span className="type-small text-muted-foreground">Sábado · 21:00</span>
              </span>
              <StatusBadge label="Vou" className="bg-success-low text-success" />
            </div>
          </div>
        </GroupedList>
        <GroupedList header="Regras">
          <ol className="flex flex-col gap-3 p-6 type-body text-grey-200">
            <li>
              <strong className="text-grey-100">Um título de página por tela</strong> (<code className="type-code">type-h1</code>, via PageHeader).
            </li>
            <li>
              <strong className="text-grey-100">Bebas Neue só maiúscula e de 24px para cima.</strong> Menor que isso, use <code className="type-code">type-label</code>.
            </li>
            <li>
              <strong className="text-grey-100">Texto corrido é sempre Barlow</strong> — nunca Bebas ou Marker em parágrafos, botões ou campos.
            </li>
            <li>
              <strong className="text-grey-100">Permanent Marker no máximo uma vez por tela</strong>, poucas palavras, em ciano claro.
            </li>
            <li>
              <strong className="text-grey-100">Números comparáveis com tabular-nums</strong> (<code className="type-code">type-stat</code> já inclui).
            </li>
            <li>
              <strong className="text-grey-100">Maiúscula vem da classe</strong>, não do texto digitado — leitores de tela leem normal.
            </li>
          </ol>
        </GroupedList>
      </section>
    </>
  );
}
