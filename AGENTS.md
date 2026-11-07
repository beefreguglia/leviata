<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

## Painel Leviata — convenções

- Frontend segue a skill `.claude/skills/leviata-ui` (Andromeda/Rocketseat com ciano + sidebar-08). Leia antes de mexer em UI.
- Ícones: Hugeicons via `@/components/icons` (não importe `lucide-react`). Tipografia: classes `type-*` (docs/TIPOGRAFIA.md).
- Server Actions: sempre `runAction()` + `assertPermission()` + `audit()`; páginas usam `requireViewer(perm)`.
- shadcn aqui é Base UI: use `render`, não `asChild`; navegação com cara de botão = `LinkButton`.
- Testes: `npm test` (unit + integração no banco de teste) e `npm run test:e2e` (Playwright). Cada módulo novo ganha `tests/integration/<modulo>.test.ts` e `e2e/<modulo>.spec.ts`.
- `cacheComponents` está desligado de propósito (painel todo autenticado).
- Depois de criar rotas, rode `npx next typegen` antes de `tsc`.

## Produção
- Guia completo: `DEPLOY.md`. Build da Vercel = `npm run vercel-build` (gera client + `prisma migrate deploy` + build).
- Migrações novas: gere com `npx prisma migrate diff --from-config-datasource --to-schema prisma/schema.prisma --script` numa pasta nova em `prisma/migrations/` (o `migrate dev` falha no banco sombra do Prisma Dev local).
- Telas de estado: `app/not-found.tsx` (404 geral), `(painel)/not-found.tsx` e `(painel)/error.tsx` (dentro do painel), `app/global-error.tsx`, `/sem-acesso` (403). Carregamento: `loading.tsx` com `components/layout/skeletons.tsx`.
- Ação que redireciona depois de salvar usa `redirectWithToast(path, "criado" | "salvo" | "apagado")` (`lib/flash.ts`) para o toast aparecer no destino.
- `seed-prod` só cria patentes e regras. Nunca rode `npm run db:seed` (cria usuários de teste) em produção.
- Uploads em produção vão direto ao Supabase por link assinado (`/api/uploads/sign` → PUT → `/api/uploads/finish`).
- Novidades: toda mudança que o membro percebe ganha uma entrada no topo de `src/lib/changelog.ts` (texto para membros, `id` novo). O build de produção posta a mais nova no Discord (`DISCORD_WEBHOOK_NOVIDADES`) via `scripts/announce-changelog.ts`; a página `/novidades` mostra todas.
