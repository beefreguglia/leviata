# Painel Leviata

Painel interno da Leviata (GTA RP · Cidade dos Anjos).

| Fase | Módulos | Status |
| --- | --- | --- |
| 1 · Base | Login Discord, membros, hierarquia, regras, ausências, auditoria | ✅ |
| 2 · Conteúdo | Lore, facções, farm, fabricação (calculadoras), mural & flyers, lives, upload de imagens | ✅ |
| 3 · Operações | Mapa com marcadores, perímetros, agenda (presença + relatório), escalações | ✅ |
| 4 · Gestão | Baú (sujo/limpo/itens, entregas conferidas), metas semanais de farm, encomendas, punições | ✅ |
| 5 · Deploy | Vercel + Supabase — passo a passo em [DEPLOY.md](DEPLOY.md) | ✅ pronto para publicar |

**Stack:** Next.js 16 · TypeScript · Tailwind v4 · shadcn/ui (Base UI, sidebar-08) · design system Andromeda (ciano) · motion · Prisma 7 + PostgreSQL · Auth.js (Discord)

## Rodar localmente

```bash
npm install
cp .env.example .env          # e gere AUTH_SECRET com: npx auth secret
npm run db:start              # sobe um Postgres local (Prisma Dev)
npx prisma migrate dev        # cria as tabelas
npm run db:seed               # patentes, usuários de teste, regras e conteúdo de exemplo (mapa, facções, agenda…)
npm run dev                   # http://localhost:3000
```

> `npm run db:start` mostra a URL `postgres://…` (TCP). Ela deve estar em `DATABASE_URL` no `.env`.

Com `AUTH_DEV_LOGIN="true"` a tela de login mostra botões para entrar como Líder/Gerente/Soldado/Recruta de teste, sem Discord. Isso é desligado automaticamente em produção.

## Testes

Três camadas, todas em português e organizadas por módulo:

| Camada | Ferramenta | Onde | O que cobre |
| --- | --- | --- | --- |
| Unitários | Vitest | `tests/unit/` | permissões, datas (fuso de Brasília), validações dos formulários, Discord API/webhook, menu |
| Integração | Vitest + Postgres de teste | `tests/integration/` | Server Actions de cada módulo e login do Discord rodando de verdade no banco (permissões, regras de negócio, auditoria) |
| E2E | Playwright | `e2e/` | o painel no navegador: login, menu (desktop e celular), início, membros, hierarquia, regras, ausências, auditoria |

Primeira vez:

```bash
npm run test:db:start      # sobe o Postgres de teste (separado do de dev)
npm run test:db:migrate    # cria as tabelas nele
npx playwright install chromium
```

> Confira se a porta mostrada pelo `test:db:start` bate com `DATABASE_URL` em `.env.test`.
> No Ubuntu 26.04 o Playwright ainda não reconhece o sistema: use
> `PLAYWRIGHT_HOST_PLATFORM_OVERRIDE=ubuntu24.04-x64 npx playwright install chromium`.

Rodar:

```bash
npm test              # unitários + integração
npm run test:unit     # só unitários (não precisa de banco)
npm run test:cov      # com relatório de cobertura
npm run test:e2e      # navegador (sobe um servidor próprio na porta 3100)
npm run test:all      # tudo
```

Os testes de integração e e2e **apagam e recriam** o banco de teste — nunca aponte `.env.test` para o banco de dev ou produção.
O e2e usa os usuários de teste do seed (Líder, Gerente, Soldado, Recruta) e roda em sequência porque compartilha o banco.

## Configurar o login com Discord

1. Acesse <https://discord.com/developers/applications> → **New Application** ("Painel Leviata").
2. **OAuth2** → copie **Client ID** e **Client Secret** para `AUTH_DISCORD_ID` / `AUTH_DISCORD_SECRET`.
3. **OAuth2 → Redirects**: adicione `http://localhost:3000/api/auth/callback/discord` (e depois a URL de produção).
4. No Discord, ative **Configurações → Avançado → Modo desenvolvedor**.
5. Botão direito no servidor da Leviata → **Copiar ID** → `DISCORD_GUILD_ID`.
6. No painel, em **Hierarquia**, edite cada patente e cole o **ID do cargo** do Discord correspondente (Configurações do servidor → Cargos → botão direito → Copiar ID).
7. (Opcional) Webhook do canal de avisos: Editar canal → Integrações → Webhooks → copiar URL → `DISCORD_WEBHOOK_AVISOS`.

Como funciona: no login o painel confere se a pessoa está no servidor e pega os cargos dela. A patente mais alta mapeada vira a patente no painel (e a ficha de membro é criada na primeira vez). Quem não está no servidor é barrado; quem não tem cargo mapeado cai em "Acesso restrito".

## Integrações opcionais (.env)

| Variável | Para quê |
| --- | --- |
| `DISCORD_WEBHOOK_AVISOS` | Avisos do mural, ausências e (se os abaixo estiverem vazios) ações e lives |
| `DISCORD_WEBHOOK_ACOES` | Novos eventos, escalações publicadas, cancelamentos |
| `DISCORD_WEBHOOK_LIVES` | "Fulano entrou ao vivo" |
| `AUTH_URL` | URL pública do painel (ex.: `https://leviata.vercel.app`) — usada nos links das mensagens do Discord |
| `TWITCH_CLIENT_ID` / `TWITCH_CLIENT_SECRET` | Status de live da Twitch ([dev.twitch.tv/console/apps](https://dev.twitch.tv/console/apps)) |
| `YOUTUBE_API_KEY` | Status de live do YouTube (YouTube Data API v3) — Kick funciona sem chave |
| `CRON_SECRET` | Protege `/api/cron/streams` (para um cron externo atualizar as lives) |
| `SUPABASE_URL` / `SUPABASE_SERVICE_ROLE_KEY` / `SUPABASE_BUCKET` | Imagens em produção (bucket **privado**). Sem isso, ficam em `.uploads/` |

## Permissões

Cada patente tem uma lista de permissões (editável em **Hierarquia**): `painel.ver`, `economia.ver` (farm, fabricação, baú, metas, encomendas), `membros.gerenciar`, `hierarquia.gerenciar`, `regras.editar`, `conteudo.editar` (lore, facções, farm, fabricação, mural, mapa, lives), `operacoes.gerenciar` (agenda, escalações, perímetros), `financeiro.gerenciar` (baú, metas, encomendas — inclui ver a economia), `punicoes.gerenciar`, `ausencias.gerenciar` (inclui ver as ausências dos outros), `auditoria.ver` e `admin` (tudo).

Padrão:

| Patente | Pode |
| --- | --- |
| Líder, Sub-líder | tudo |
| Gerente | cria e edita operações, economia, cidade e comunicação. **Não** vê ausências dos outros, não pune, não edita regras, não vê auditoria nem cadastra membros |
| Soldado, Recruta | só veem cidade, comunicação, operações, membros, hierarquia e regras; registram a própria ausência e votam nas enquetes |

Ficha sem patente (quem entrou pelo Discord e ainda não foi promovido) só faz o **registro** (nome, número e ID) e lê as regras públicas.

**Desenvolvedor:** IDs em `DEVELOPER_DISCORD_IDS` têm acesso total, mas a ficha continua mostrando a patente cadastrada (ex.: Recruta).

## Personalizar

- **Cores:** `src/app/globals.css` → bloco "Tema Leviata" (`--primary` é o ciano da fac).
- **Logo:** `src/components/layout/logo.tsx` (marca provisória).
- **Regras de UI (Andromeda + ciano):** `.claude/skills/leviata-ui/SKILL.md`.
- **Menu lateral (shadcn sidebar-08):** itens em `src/components/layout/nav.ts`.

## Estrutura

```
prisma/                 schema, migrations, seed
src/auth.ts             Auth.js (Discord + login de teste)
src/proxy.ts            redireciona para /login sem sessão
src/lib/                db, session/permissões, discord, auditoria, datas
src/components/         ui (shadcn), layout, forms, motion
src/app/(painel)/       módulos: dashboard, membros, hierarquia, regras, ausencias, auditoria
```
Cada módulo: `page.tsx` + `actions.ts` (Server Actions com `assertPermission()` e `audit()`).
