<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

## Painel Leviata — convenções

- Frontend segue a skill `.claude/skills/leviata-ui` (Andromeda/Rocketseat com ciano + sidebar-08). Leia antes de mexer em UI.
- Server Actions: sempre `runAction()` + `assertPermission()` + `audit()`; páginas usam `requireViewer(perm)`.
- shadcn aqui é Base UI: use `render`, não `asChild`; navegação com cara de botão = `LinkButton`.
- Testes: `npm test` (unit + integração no banco de teste) e `npm run test:e2e` (Playwright). Cada módulo novo ganha `tests/integration/<modulo>.test.ts` e `e2e/<modulo>.spec.ts`.
- `cacheComponents` está desligado de propósito (painel todo autenticado).
- Depois de criar rotas, rode `npx next typegen` antes de `tsc`.
