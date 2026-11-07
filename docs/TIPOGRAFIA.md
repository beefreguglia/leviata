# Manual de tipografia — Painel Leviatã

A tipografia segue o clima de GTA RP: **títulos condensados em caixa alta** (como as telas de missão e de carregamento do GTA V), **texto limpo de interface de jogo** e um **toque grafitado** que conversa com o logo do dragão. Tudo em fontes livres do Google Fonts, carregadas pelo `next/font` (sem pedir nada a servidor externo no navegador).

## As 5 famílias

| Papel | Fonte | Por quê | Onde |
| --- | --- | --- | --- |
| **Título** | **Bebas Neue** | Condensada, sempre maiúscula, impacto de pôster/HUD — é a cara de "MISSION PASSED" sem copiar a fonte do jogo | Títulos de página, títulos dentro de regras/lore, números grandes |
| **Texto** | **Barlow** | Grotesca de interface, levemente "técnica" (estilo GPS/celular do jogo), muito legível em tela escura | Parágrafos, listas, botões, campos |
| **Rótulo** | **Barlow Condensed** (600, maiúscula, espaçada) | Mesmo DNA do texto, mas compacta como os rótulos do HUD | Cabeçalhos de seção, selos de status, patentes, datas curtas |
| **Destaque** | **Permanent Marker** | Traço de pincel/grafite — conversa com o logo e as pichações da cidade | Só pontos de personalidade (ex.: o nome na saudação do Início). Nunca em blocos de texto |
| **Código** | **Fira Code** | Monoespaçada legível | IDs, passaportes, códigos de erro, valores técnicos |

> Pricedown (a fonte do logo do GTA) é proprietária e marca registrada do jogo: **não usar**. Bebas Neue entrega o mesmo impacto com licença livre (OFL).

## Escala (classes prontas)

Use sempre as classes `type-*` (definidas em `src/app/globals.css`). Elas já trazem família, tamanho, altura de linha, espaçamento e caixa; a **cor** fica por conta de quem usa.

| Classe | Fonte | Tamanho (celular → ≥768px) | Linha | Espaço entre letras | Caixa | Uso |
| --- | --- | --- | --- | --- | --- | --- |
| `type-display` | Bebas Neue | 48px → 64px | 0.95 | 0.02em | MAIÚSCULA | Capa, telas especiais (raro) |
| `type-h1` | Bebas Neue | 36px → 44px | 1.0 | 0.02em | MAIÚSCULA | Título da página (1 por tela) |
| `type-h2` | Barlow Condensed 600 | 15px | 1.2 | 0.08em | MAIÚSCULA | Cabeçalho de seção/lista (`GroupedList`) |
| `type-h3` | Barlow 600 | 18px | 1.3 | — | normal | Título de card/item |
| `type-body` | Barlow 400 | 16px | 1.6 | — | normal | Texto corrido (padrão do site) |
| `type-small` | Barlow 400 | 14px | 1.5 | — | normal | Descrições, metadados |
| `type-caption` | Barlow 500 | 12px | 1.4 | — | normal | Dicas de campo, notas de rodapé |
| `type-label` | Barlow Condensed 600 | 13px | 1.2 | 0.06em | MAIÚSCULA | Selos, datas curtas, rótulos de menu |
| `type-stat` | Bebas Neue | 40px | 1.0 | 0.02em | — (números) | Números grandes: saldo, contadores |
| `type-accent` | Permanent Marker | herda | 1.2 | 0.01em | normal | Destaque de personalidade |
| `type-code` | Fira Code | 0.875em | herda | — | — | IDs e códigos no meio do texto |

Utilitários soltos (quando precisar compor): `font-display`, `font-label`, `font-accent`, `font-sans` (Barlow), `font-mono`.

## Regras

1. **Um `type-h1` por tela**, sempre via `PageHeader` (ou o título da ficha/evento).
2. **Bebas Neue só em caixa alta e de 24px para cima.** Em tamanho pequeno ela perde leitura — abaixo disso use `type-label`.
3. **Texto corrido é sempre Barlow.** Nada de Bebas ou Marker em parágrafos, botões ou campos.
4. **Permanent Marker no máximo uma vez por tela**, em poucas palavras, em ciano claro (`text-cyan-light`). Ela é tempero, não ingrediente.
5. **Números que se comparam** (dinheiro, quantidades, horários em lista) usam `tabular-nums` — `type-stat` já inclui.
6. **Rótulos em caixa alta** usam `type-label` (já com espaçamento). Não escreva o texto em maiúscula no código: a classe faz isso, e leitores de tela continuam lendo normal.
7. **Contraste:** título `text-grey-100`, texto `text-grey-200`, secundário `text-muted-foreground` (grey-300). Ciano (`text-cyan-light`) só para links e destaques.
8. **Markdown** (regras, lore, guias): `## Título` vira Bebas com a barrinha ciano; `### Subtítulo` vira Barlow 600.
9. **Acentos:** todas as fontes carregam `latin-ext` (ã, ç, ê…) — confira títulos novos com acento no navegador.

## Exemplos

```tsx
<h1 className="type-h1 text-grey-100">Baú</h1>
<h2 className="type-h2 text-grey-300">Estoque de itens</h2>
<span className="type-stat text-grey-100">R$ 250.000</span>
<StatusBadge label="Aprovada" … />            // já usa type-label
<p className="type-small text-muted-foreground">Atualizado há 5 min</p>
<span className="type-accent text-cyan-light">Dante</span>
<code className="type-code">#1024</code>
```

## Onde mexer

- Fontes carregadas: `src/app/layout.tsx` (`next/font/google`, variáveis `--font-*-face`).
- Tokens e classes: `src/app/globals.css` (`@theme` → `--font-display/label/accent`; `@utility type-*`).
- Regras para quem programa a interface: `.claude/skills/leviata-ui/SKILL.md`.
