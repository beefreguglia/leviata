# Colocando o Painel Leviata no ar

Tempo estimado: **20–30 minutos**. Tudo nos planos grátis.

```
Navegador ──► Vercel (site, São Paulo) ──► Supabase (banco + imagens, São Paulo)
                     │
                     └─► Discord (login + webhooks)
```

Você vai precisar de contas no **GitHub**, **Supabase**, **Vercel** e acesso de administrador ao **servidor do Discord** da Leviata.

---

## 1. GitHub — subir o código

1. Crie um repositório **privado** em <https://github.com/new> (ex.: `leviata-painel`). Não marque README/.gitignore.
2. No terminal, dentro da pasta do projeto:

```bash
git checkout main
git merge feat/painel-fases-1-a-3     # traz tudo para o main
git remote add origin https://github.com/SEU-USUARIO/leviata-painel.git
git push -u origin main
```

> O arquivo `.env` **não** vai para o GitHub (está no `.gitignore`). Nunca coloque chaves no código.

---

## 2. Supabase — banco e imagens

1. Crie um projeto em <https://supabase.com/dashboard> → **New project**.
   - **Region:** South America (São Paulo).
   - Guarde a **senha do banco**.
2. **Connect** (botão no topo do projeto) → aba **ORMs/Connection string**:
   - **Transaction pooler** (porta **6543**) → vai ser o `DATABASE_URL`.
   - **Session pooler** (porta **5432**) → vai ser o `DIRECT_URL`.
   - Troque `[YOUR-PASSWORD]` pela senha do banco nas duas.
3. **Project Settings → API**: copie a **Project URL** (`SUPABASE_URL`) e a chave **service_role** (`SUPABASE_SERVICE_ROLE_KEY`).
   > A `service_role` é secreta: só no `.env`/Vercel, nunca no navegador ou no GitHub.
4. No seu terminal, crie as tabelas, as patentes/regras iniciais e o bucket de imagens:

```bash
export DATABASE_URL="(transaction pooler, porta 6543)"
export DIRECT_URL="(session pooler, porta 5432)"
export SUPABASE_URL="https://xxxx.supabase.co"
export SUPABASE_SERVICE_ROLE_KEY="(service_role)"

npx prisma migrate deploy     # cria as tabelas
npm run db:seed:prod          # patentes e regras iniciais (SEM usuários de teste)
npm run setup:storage         # bucket privado "leviata" (só imagens, até 8 MB)
```

---

## 3. Discord — login e avisos

1. <https://discord.com/developers/applications> → **New Application** → nome "Painel Leviata".
2. **OAuth2**: copie **Client ID** e **Client Secret** (Reset Secret).
3. **OAuth2 → Redirects → Add Redirect**:
   `https://SEU-PROJETO.vercel.app/api/auth/callback/discord`
   (você descobre a URL exata no passo 4; volte aqui e ajuste. Se usar domínio próprio, adicione ele também.)
4. No app do Discord: **Configurações → Avançado → Modo desenvolvedor** ligado.
   - Botão direito no servidor da Leviata → **Copiar ID do servidor** → `DISCORD_GUILD_ID`.
   - Botão direito no **seu** nome → **Copiar ID do usuário** → vai no `BOOTSTRAP_ADMIN_DISCORD_IDS`.
5. Webhooks (opcional, mas recomendado): em cada canal → **Editar canal → Integrações → Webhooks → Novo webhook → Copiar URL**:
   - canal de avisos → `DISCORD_WEBHOOK_AVISOS`
   - canal de ações → `DISCORD_WEBHOOK_ACOES`
   - canal de lives → `DISCORD_WEBHOOK_LIVES`

---

## 4. Vercel — publicar

1. <https://vercel.com/new> → **Import** o repositório do GitHub.
2. Framework: **Next.js** (detectado sozinho). Não mude o comando de build — o projeto usa `vercel-build`, que já roda as migrações.
3. **Environment Variables** (cole uma por uma):

| Variável | Valor |
| --- | --- |
| `DATABASE_URL` | Transaction pooler (6543) |
| `DIRECT_URL` | Session pooler (5432) |
| `DATABASE_POOL_MAX` | `3` |
| `AUTH_SECRET` | gere com `npx auth secret` (ou `openssl rand -base64 32`) |
| `AUTH_URL` | `https://SEU-PROJETO.vercel.app` |
| `AUTH_DISCORD_ID` / `AUTH_DISCORD_SECRET` | do passo 3 |
| `DISCORD_GUILD_ID` | do passo 3 |
| `BOOTSTRAP_ADMIN_DISCORD_IDS` | seu Discord ID (e de outro líder, separados por vírgula) |
| `SUPABASE_URL` / `SUPABASE_SERVICE_ROLE_KEY` | do passo 2 |
| `SUPABASE_BUCKET` | `leviata` |
| `DISCORD_WEBHOOK_AVISOS` / `_ACOES` / `_LIVES` | do passo 3 (opcionais) |
| `CRON_SECRET` | gere com `openssl rand -hex 24` |
| `TWITCH_CLIENT_ID` / `TWITCH_CLIENT_SECRET` / `YOUTUBE_API_KEY` | opcionais (lives) |

> **Não** crie `AUTH_DEV_LOGIN` na Vercel. (Mesmo se criar, o login de teste é desligado em produção.)

4. **Deploy**. Quando terminar, confira o redirect do Discord (passo 3.3) com a URL final.
5. Abra `https://SEU-PROJETO.vercel.app/api/health` — precisa mostrar `"ok": true`. Se não, a lista `problems` diz o que falta.

---

## 5. Primeiro acesso

1. Entre no painel com o Discord. Como seu ID está em `BOOTSTRAP_ADMIN_DISCORD_IDS`, você entra como **Líder**.
2. **Hierarquia** → edite cada patente: nome, cor e o **ID do cargo do Discord** (Configurações do servidor → Cargos → botão direito → Copiar ID).
3. Peça para alguém de cada cargo entrar e confira se a patente veio certa.
4. Na Vercel, **apague o valor** de `BOOTSTRAP_ADMIN_DISCORD_IDS` e faça **Redeploy**. A partir daqui, o cargo do Discord manda.
5. **Mapa** → "Enviar imagem do mapa". Depois é só ir preenchendo regras, lore, facções, farm…

---

## 6. Lives automáticas (opcional)

A Vercel grátis só roda tarefas agendadas 1× por dia. O painel já atualiza as lives quando alguém abre o Início ou "Ao vivo"; para atualizar sempre (e mandar o aviso "entrou ao vivo" no Discord):

1. Crie uma conta em <https://cron-job.org>.
2. Novo cron a cada **5 minutos**:
   - URL: `https://SEU-PROJETO.vercel.app/api/cron/streams`
   - Header: `Authorization: Bearer (seu CRON_SECRET)`

---

## 7. Domínio próprio (opcional)

Vercel → projeto → **Settings → Domains** → adicione (ex.: `painel.leviata.gg`). Depois atualize `AUTH_URL` e adicione o novo redirect no Discord.

---

## Problemas comuns

| Sintoma | Causa provável |
| --- | --- |
| "Você precisa estar no servidor do Discord" | Conta não está no servidor ou `DISCORD_GUILD_ID` errado |
| Login volta para a tela de login com erro | Redirect do Discord diferente da URL do site / `AUTH_URL` errado |
| Entra mas cai em "Acesso restrito" | O cargo da pessoa não está ligado a nenhuma patente (Hierarquia) |
| Imagens não enviam | `SUPABASE_*` ausente ou bucket não criado (`npm run setup:storage`) |
| Build falha em `prisma migrate deploy` | `DIRECT_URL` ausente ou com a senha errada |
| `/api/health` com `"database": false` | `DATABASE_URL` errado ou projeto Supabase pausado (projetos grátis pausam após 7 dias sem uso — reative no painel do Supabase) |

## Atualizações futuras

Todo `git push` no `main` publica sozinho. Mudanças no banco viram uma migração em `prisma/migrations` e são aplicadas no deploy.
