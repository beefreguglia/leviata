---
name: leviata-ui
description: Regras de frontend do Painel Leviata — design system Andromeda (Rocketseat) com o roxo trocado pela escala ciano, menu shadcn sidebar-08, shadcn/ui (Base UI), Tailwind v4 e motion. Use SEMPRE que criar ou alterar páginas, componentes, layouts, formulários ou animações em src/app ou src/components.
---

# Painel Leviata — UI (Andromeda + ciano)

Base visual: **Andromeda** (https://andromeda.rocketseat.dev) — mesmas cores de superfície, espaçamento, tipografia e raios — com a cor de marca **roxa substituída pela escala ciano**. Usabilidade: princípios da Apple HIG (clareza, alvos de toque, movimento com propósito).

## Cores (tokens em `src/app/globals.css`)

| Andromeda | Leviata (Tailwind) | Uso |
|---|---|---|
| rocketseat-light / mid / dark / low | `cyan-light` #5cf0fa · `cyan-mid` = `primary` #06d4ec · `cyan-dark` #0aa5b9 · `cyan-low` #06303a | hover · ação principal/foco/ativo · pressionado · fundo tingido |
| color-background (grey-900) | `bg-background` #121214 | fundo do conteúdo |
| shape-primary (grey-800) | `bg-card` #202024 | modais |
| shape-secondary (grey-700) | `bg-secondary`/`bg-muted`/`bg-grey-700` #29292E | botão secundário, chips, hover de linha |
| shape-tertiary (grey-600) | `border-border`/`bg-accent` #323238 | bordas, hover em chips |
| preto | `bg-sidebar` #000 | menu lateral (e `glass-card` também é #000) |
| text-title / text-base / text-support / placeholder | `text-grey-100` · `text-grey-200` · `text-muted-foreground` (grey-300) · grey-400 | título · corpo · apoio · placeholder |
| success / danger / warning (light, base, low) | `text-success` + `bg-success-low`, `text-danger-light` + `bg-danger-low`, `text-warning` + `bg-warning-low` | status |

- Nunca use hex solto em componentes; use os tokens acima.
- **Cores de patente**: escala `RANK_PALETTE` (`src/lib/rank-colors.ts`) — topo = ciano #06d4ec, descendo até azul escuro #3D52BD. Nova patente sugere a cor pela ordem (`suggestRankColor`). A cor fica salva em `Rank.color` (editável em Hierarquia).
- Ciano só em: botão principal, foco, item ativo, links, indicadores. Badges de status = fundo `*-low` + texto `*-light`.
- Separadores dentro de cards: `border-grey-700`. Inputs ficam em `bg-input` (grey-900) — dentro de card contrastam; na página use `bg-card`.

## Tipografia (manual: `docs/TIPOGRAFIA.md`)
- Famílias: **Bebas Neue** (títulos e números grandes, sempre maiúscula), **Barlow** (texto), **Barlow Condensed** (rótulos/seções em maiúscula), **Permanent Marker** (destaque grafitado, no máx. 1× por tela) e **Fira Code** (IDs/códigos). Carregadas em `src/app/layout.tsx`.
- Use as classes `type-display`, `type-h1`, `type-h2`, `type-h3`, `type-body`, `type-small`, `type-caption`, `type-label`, `type-stat`, `type-accent`, `type-code` (em `globals.css`). A cor fica por conta de quem usa.
- Título de página: `type-h1 text-grey-100` (o `PageHeader` já faz). Cabeçalho de seção: `type-h2 text-grey-300` (o `GroupedList` já faz). Número grande: `type-stat`. Selos/patentes já usam a fonte de rótulo.
- Nunca Bebas abaixo de 24px nem em parágrafo/botão/campo. A maiúscula vem da classe, não do texto digitado.
- Pricedown (fonte do GTA) é proprietária: não usar.

## Gráficos
- Use `ChartCard` (`components/charts/chart-card.tsx`: título, legenda, tabela "Ver dados" e estado vazio) com `LineTrendChart`, `BarTrendChart` ou `RankedBars` (`components/charts/charts.tsx`). Tendência decorativa em card: `Sparkline`.
- Cores só por `var(--chart-1)` e `var(--chart-2)`, fixas por série. Um eixo só. Cálculo novo vai em `lib/economy-charts.ts` (puro) e sem zeros inventados antes do primeiro dado.

## Espaçamento e raios
- Escala de 4px (Andromeda space = Tailwind). Valores usuais: 2 (8) · 3 (12) · 4 (16) · 5 (20) · 6 (24) · 8 (32) · 10 (40).
- Página: `px-4 py-6 md:px-8 md:py-8`; cabeçalho da página `mb-10`; entre seções `gap-10`; cards em grid `gap-4`.
- Card: `rounded-card` (20px) `glass-card`, padding `p-5`/`p-6`. Linhas de lista: `min-h-14 px-5 py-4`.
- Todo card de página usa `glass-card` (e `glass-card-interactive` se for clicável). Linhas dentro dele: `hover:bg-white/5` e separadores `border-white/10`. Modais continuam em `bg-card`. Fundo da página é sempre `bg-background`, sem brilho.
- Raios (um pouco mais arredondados que o Andromeda, a pedido da fac): `rounded-md` = 12px (botões, inputs, menus), `rounded-card` = 20px (cards, blocos e modais), `rounded-full` (badges, avatares). Ajuste em `--radius` / `--radius-card`.

## Componentes
- **Menu**: `AppSidebar` (shadcn **sidebar-08**, variant `inset`). Itens/grupos em `src/components/layout/nav.ts` (`NAV_MAIN` com subitens recolhíveis, `NAV_SECONDARY` no rodapé, usuário em `NavUser`). Módulo novo = adicionar lá (com `perm`, e `soon` enquanto não existir).
- **Breadcrumb** automático no topo (`layout/breadcrumbs.tsx`), lê `nav.ts`.
- **Input / Textarea / NativeSelect**: altura 48px (`h-12`), `px-4`, texto 16px, `border-2 border-transparent`, foco `border-primary`.
- **Button**: `default` 40px, `lg` 48px, `sm` 32px; bold; `variant="default"` = ciano com texto escuro. Navegação com cara de botão = `<LinkButton href>` (`ui/link-button.tsx`), nunca `Button` + `render={<Link/>}`.
- **Modal** (`FormDialog`, `ConfirmButton`): `bg-card`, `p-6 sm:p-8`, título `text-xl font-bold`. Ações destrutivas sempre com confirmação.
- **Listas**: `GroupedList` / `GroupedRow` / `EmptyState` de `layout/grouped-list.tsx`.
- **Tags**: `StatusBadge` e `RankBadge` (pílula h-7, px-3, bold, `rounded-full`); várias tags juntas com `gap-1.5`. Se a linha tem hover `bg-grey-700`, a tag vai para `group-hover:bg-grey-600`.
- **Presença de membro** (ativo, ausente, afastado, inativo) = bolinha no avatar via `PresenceAvatar` + `presenceOf()` (`lib/labels.ts`), não badge de texto. `ringClassName` = cor do fundo atrás do avatar. Em listas, mostrar `PresenceLegend`.
- Base UI: composição via `render`, não `asChild`. Ao usar `cn()`, não misture classes `bg-[...]` arbitrárias com cores (o merge remove); use propriedades explícitas `[background-position:...]`.

## Movimento (`motion/react`)
- Presets de `src/components/motion.tsx` (`FadeIn`, `Stagger`/`StaggerItem`, `spring`). Animar só opacity/transform, curto (≤300ms). `reducedMotion="user"` já está no layout.
- Nunca `transition-all`: liste as propriedades (`transition-[color,background-color,border-color,box-shadow,opacity,transform]` ou `transition-colors`).
- Micro-interações discretas: card clicável sobe no máximo 2px ou acende a borda (`glass-card-interactive`), imagem dá zoom de 1.02 dentro da moldura, botão muda no hover e no clique. Nada de inclinar card, carrossel ou aba que troca sozinha.

## Acessibilidade e mobile
- Alvos de toque ≥ 40px (44px quando possível no mobile). Funciona em 375px, sem rolagem horizontal.
- Contraste AA; foco visível (`focus-visible:`, nunca `outline-none` sem substituto); `aria-label` em botões só com ícone; ícone decorativo com `aria-hidden`; textos em português.
- O layout do painel já tem o link "Pular para o conteúdo" (`#conteudo`): não remova; um `h1` por página (o `PageHeader`).
- Estados vazios com ícone + frase + ação.
- Texto que vem do usuário (nomes, títulos, descrições) aguenta curto, médio e muito longo: `truncate`/`line-clamp-*`/`break-words`, e `min-w-0` no filho de flex.

## Formulários e buscas (Web Interface Guidelines)
- Todo campo tem `<label>` (via `Field`) ou `aria-label`, inclusive buscas com ícone dentro.
- Busca de página: `<form role="search">`, ícone `SearchIcon` dentro do campo (`pl-12`), `bg-card` (na página o `bg-input` some no fundo) e botão de texto ("Buscar"/"Filtrar").
- Placeholder mostra exemplo e termina com `…` quando é convite a digitar ("Buscar na lore…"); "Ex.: …" para exemplos.
- Dados do RP (nome na cidade, ID/passaporte, telefone do jogo, placa): `autoComplete="off"` e `spellCheck={false}`, senão o navegador preenche com os dados reais da pessoa. Números: `inputMode="numeric"`.
- Botão de enviar fica habilitado até a ação começar; durante a ação, spinner (`SubmitButton` já faz). Textos de carregamento terminam com `…` ("Enviando…").
- Erro diz o que fazer, não só o que deu errado ("Informe o ID do comprador ou deixe em branco").
- Ação destrutiva: confirmação (`ConfirmButton`) ou desfazer; nunca imediata.

## Texto e números
- Reticências `…`, aspas curvas “ ”. Títulos com `text-balance`, parágrafos curtos com `text-pretty` (o `PageHeader` e o `GroupedList` já aplicam).
- Valores em colunas ou comparados: `tabular-nums`. Datas por `lib/dates.ts` e dinheiro por `money()` de `lib/finance.ts` (ambos com locale pt-BR), nunca formato montado à mão.
- Voz ativa e direta, botões específicos ("Registrar venda", não "Continuar"). Sem enfeite: a frase diz o que a tela faz.

## Estado na URL
- Filtros, abas, busca e paginação ficam na query string (`?q=`, `?status=`), para o link poder ser compartilhado no Discord e o voltar do navegador funcionar. `useState` só para estado passageiro de formulário.
- Navegação é sempre `<Link>`/`LinkButton` (abre em nova aba com Ctrl+clique), nunca `onClick` com `router.push`.

## Referências de design
- Para padrões de painel de produto (densidade, tabelas, paleta de comandos, atalhos), consulte o skill `awesome-design-md` (Linear, Raycast, Vercel, Supabase, Sentry). Use só ritmo e padrões: cores, fontes e logo continuam os da Leviatã.
- Revisão de conformidade: skill `web-design-guidelines`. Ver a tela de verdade (desktop 1440 e celular 390): `playwright-cli` com o login de dev.

## Checklist
- [ ] Item no `nav.ts` (e breadcrumb correto)
- [ ] Título/descrição com `PageHeader`; seções com `GroupedList`
- [ ] Só tokens; ciano apenas em ação/ativo/foco
- [ ] Inputs 48px, botões bold, raios 12px/20px
- [ ] Vazio / carregando / erro tratados
- [ ] Campos com label, buscas com `aria-label`, dados do RP com `autoComplete="off"`
- [ ] Filtros e abas na URL; navegação com `<Link>`
- [ ] Sem `transition-all`; foco visível por teclado
- [ ] 375px ok (conferido em print); testes e2e do módulo atualizados

## Identidade visual (marca)
- Fontes da marca em `brand/` (PNG transparentes): `leviata-logo.png` (dragão + "LEVIATÃ") e `lvt.png` (monograma). Depois de trocar, rode `npm run brand` — gera `public/brand/*.webp`, `src/app/{icon.png,favicon.ico,apple-icon.png,opengraph-image.png}` e os ícones do app instalado.
- Use `BrandLogo` (menu lateral, login) e `BrandMark` (telas cheias de 404/403, espaços pequenos) de `components/layout/logo.tsx`. Não redesenhe o logo em SVG nem aplique outra cor: é preto com contorno ciano, feito para fundo escuro.
- O nome é **Leviatã** (com til) em todo texto visível.
- Ciano da marca = contorno do logo: `cyan-mid` #06D4EC; brilho do olho = `cyan-light` #5CF0FA. Brilho decorativo: `drop-shadow-[0_0_12px_rgba(6,212,236,0.45)]` só no hover do logo/destaques, nunca em texto corrido.

## Ícones (Hugeicons)
- Biblioteca: **Hugeicons** gratuita (`@hugeicons/core-free-icons` + `@hugeicons/react`), estilo stroke rounded, traço 1.8.
- Importe sempre de `@/components/icons` (ex.: `import { PlusIcon, XIcon } from "@/components/icons"`), nunca direto do pacote. Lá cada nome usado no painel aponta para um desenho do Hugeicons — para trocar um desenho, mude só o mapeamento.
- Ícone novo: escolha em https://hugeicons.com/icons (filtro Free), importe em `components/icons.tsx` e exporte com `icon(...)`. Tipo para props/arrays: `AppIcon`.
- Tamanho pelo Tailwind (`size-4`, `size-5`); cor herda do texto (`currentColor`). Ícone sozinho em botão precisa de `aria-label` no botão.
- `lucide-react` foi removido; componentes novos do shadcn que vierem com Lucide devem ser ajustados para `@/components/icons`.
