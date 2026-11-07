---
name: leviata-ui
description: Regras de frontend do Painel Leviata — design system Andromeda (Rocketseat) com o roxo trocado pela escala ciano, menu shadcn sidebar-08, shadcn/ui (Base UI), Tailwind v4 e motion. Use SEMPRE que criar ou alterar páginas, componentes, layouts, formulários ou animações em src/app ou src/components.
---

# Painel Leviata — UI (Andromeda + ciano)

Base visual: **Andromeda** (https://andromeda.rocketseat.dev) — mesmas cores de superfície, espaçamento, tipografia e raios — com a cor de marca **roxa substituída pela escala ciano**. Usabilidade: princípios da Apple HIG (clareza, alvos de toque, movimento com propósito).

## Cores (tokens em `src/app/globals.css`)

| Andromeda | Leviata (Tailwind) | Uso |
|---|---|---|
| rocketseat-light / mid / dark / low | `cyan-light` #66E8FF · `cyan-mid` = `primary` #00D9FF · `cyan-dark` #00A6C7 · `cyan-low` #07303A | hover · ação principal/foco/ativo · pressionado · fundo tingido |
| color-background (grey-900) | `bg-background` #121214 | fundo do conteúdo |
| shape-primary (grey-800) | `bg-card` #202024 | cards, listas, modais |
| shape-secondary (grey-700) | `bg-secondary`/`bg-muted`/`bg-grey-700` #29292E | botão secundário, chips, hover de linha |
| shape-tertiary (grey-600) | `border-border`/`bg-accent` #323238 | bordas, hover em chips |
| grey-950 | `bg-sidebar` #09090A | menu lateral |
| text-title / text-base / text-support / placeholder | `text-grey-100` · `text-grey-200` · `text-muted-foreground` (grey-300) · grey-400 | título · corpo · apoio · placeholder |
| success / danger / warning (light, base, low) | `text-success` + `bg-success-low`, `text-danger-light` + `bg-danger-low`, `text-warning` + `bg-warning-low` | status |

- Nunca use hex solto em componentes; use os tokens acima.
- **Cores de patente**: escala `RANK_PALETTE` (`src/lib/rank-colors.ts`) — topo = ciano #00D9FF, descendo até azul escuro #3D52BD. Nova patente sugere a cor pela ordem (`suggestRankColor`). A cor fica salva em `Rank.color` (editável em Hierarquia).
- Ciano só em: botão principal, foco, item ativo, links, indicadores. Badges de status = fundo `*-low` + texto `*-light`.
- Separadores dentro de cards: `border-grey-700`. Inputs ficam em `bg-input` (grey-900) — dentro de card contrastam; na página use `bg-card`.

## Tipografia
- **Roboto** (texto) e **Fira Code** (código), via `next/font`.
- Escala Andromeda = Tailwind: xs 12 · sm 14 · base 16 · lg 18 · xl 20 · 2xl 24 · `text-[2rem]` 32.
- Line-height: `leading-shorter` (125%) em títulos, `leading-base` (160%) em texto (padrão do body).
- Pesos: 400 regular, 500 medium, 700 bold. Botões e títulos em **bold**.
- Título de página: `text-2xl md:text-[2rem] font-bold leading-shorter text-grey-100`. Rótulo de seção: `text-sm font-bold text-grey-200`. Sem caixa-alta.

## Espaçamento e raios
- Escala de 4px (Andromeda space = Tailwind). Valores usuais: 2 (8) · 3 (12) · 4 (16) · 5 (20) · 6 (24) · 8 (32) · 10 (40).
- Página: `px-4 py-6 md:px-8 md:py-8`; cabeçalho da página `mb-10`; entre seções `gap-10`; cards em grid `gap-4`.
- Card: `rounded-card` (20px) `bg-card`, padding `p-5`/`p-6`. Linhas de lista: `min-h-14 px-5 py-4`.
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

## Acessibilidade e mobile
- Alvos de toque ≥ 40px (44px quando possível no mobile). Funciona em 375px, sem rolagem horizontal.
- Contraste AA; foco visível; `aria-label` em botões só com ícone; textos em português.
- Estados vazios com ícone + frase + ação.

## Checklist
- [ ] Item no `nav.ts` (e breadcrumb correto)
- [ ] Título/descrição com `PageHeader`; seções com `GroupedList`
- [ ] Só tokens; ciano apenas em ação/ativo/foco
- [ ] Inputs 48px, botões bold, raios 12px/20px
- [ ] Vazio / carregando / erro tratados
- [ ] 375px ok; testes e2e do módulo atualizados
