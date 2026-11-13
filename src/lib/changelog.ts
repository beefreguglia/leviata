/**
 * Novidades do painel — escritas para os membros (não para programadores).
 * Para anunciar uma mudança: adicione uma entrada NO TOPO com um `id` novo e faça o deploy.
 * No deploy de produção o painel posta a entrada mais nova no canal do Discord
 * (DISCORD_WEBHOOK_NOVIDADES) — cada `id` é anunciado uma vez só. Não há página no painel.
 */
export type ChangelogEntry = {
  /** identificador único e estável (ex.: "2026-11-07-vendas") */
  id: string;
  /** data no formato AAAA-MM-DD */
  date: string;
  title: string;
  items: string[];
};

export const CHANGELOG: ChangelogEntry[] = [
  {
    id: "2026-11-13-ajustes-uso",
    date: "2026-11-13",
    title: "Painel mais fácil de usar",
    items: [
      "A **busca do Dossiê** ficou mais visível e ganhou o botão **Buscar**",
      "O navegador não sugere mais seus dados pessoais nos campos de nome, ID, passaporte e placa",
      "Toques no celular respondem mais rápido",
      "Quem usa teclado pode apertar **Tab** para pular o menu e ir direto ao conteúdo",
    ],
  },
  {
    id: "2026-11-09-radar",
    date: "2026-11-09",
    title: "Radar de inatividade e cards novos",
    items: [
      "A gerência agora vê quem está há **7 dias ou mais** sem entregar farm nem responder presença",
      "Quem avisou ausência e quem acabou de entrar não aparecem no radar",
      "Todas as telas ganharam o **novo visual de cards**",
    ],
  },
  {
    id: "2026-11-09-graficos-economia",
    date: "2026-11-09",
    title: "Gráficos na economia",
    items: [
      "**Metas:** veja o progresso de cada membro na semana e quantos bateram a meta nas últimas semanas",
      "**Vendas:** faturamento por semana, para facções e players, e os itens que mais renderam",
      "**Baú:** a gerência acompanha o saldo sujo e limpo dos últimos 30 dias",
    ],
  },
  {
    id: "2026-11-09-inicio-vidro",
    date: "2026-11-09",
    title: "Início de cara nova",
    items: [
      "Os cards do Início agora têm **visual de vidro** com brilho ciano",
      "Os números ficaram em destaque, com um ícone pequeno ao lado de cada nome",
    ],
  },
  {
    id: "2026-11-07-economia-metas",
    date: "2026-11-07",
    title: "Economia aberta para todos e metas mais justas",
    items: [
      "Recrutas, membros e veteranos agora **veem** farm, fabricação, baú, metas, encomendas e vendas (editar continua com as gerências)",
      "Todo mundo pode **entregar farm** no baú — a gerência confere e a entrega conta na sua meta",
      "Quem avisar ausência de **7 dias ou mais** fica dispensado da meta de farm daquela semana",
    ],
  },
  {
    id: "2026-11-07-setores",
    date: "2026-11-07",
    title: "Setores e gerências",
    items: [
      "Patentes agora são **Recruta → Membro → Veterano → Hierarquia**, puxadas dos cargos do Discord",
      "Cada membro tem um **setor**: Vanguarda (Ações), Propulsão (Corrida), Vigília (Investigativa) ou Comércio",
      "**Gerências** (G-Geral, G-Ação, G-Corrida, G-Investigativa, G-Comércio) liberam as ferramentas de cada área",
      "Em Hierarquia dá pra ver quem está em cada setor e quem gerencia; em Membros dá pra filtrar por setor",
    ],
  },
  {
    id: "2026-11-07-visual-vendas",
    date: "2026-11-07",
    title: "Cara nova da Leviatã, vendas e enquetes",
    items: [
      "Logo do dragão no menu e no login, ícone LVT na aba do navegador e ciano da marca em todo o painel",
      "Nova tipografia no clima de GTA: títulos grandes e rótulos condensados",
      "**Vendas** (Economia): registre o que a fac vendeu para outra facção ou para um player — sai do baú e o dinheiro entra na hora",
      "**Enquetes** no Mural: vote direto no aviso (um voto por membro, dá pra trocar)",
      "**Meu registro**: informe nome, número e ID da cidade",
      "Calculadora de fabricação em 3 passos: o que vai fazer → materiais → quantos",
      "Campos de dinheiro e telefone com máscara; mapa abre mostrando a cidade inteira e aproxima até 8×",
      "Painel funciona no celular (dá pra adicionar à tela inicial)",
    ],
  },
  {
    id: "2026-11-06-lancamento",
    date: "2026-11-06",
    title: "Painel da Leviatã no ar",
    items: [
      "Membros, hierarquia, regras, ausências e punições",
      "Lore, facções, guias de farm, fabricação, mural e lives",
      "Mapa com lugares marcados, perímetros, agenda de ações e corridas e escalações",
      "Baú, metas de farm e encomendas",
    ],
  },
];

/** Entradas ainda não anunciadas, da mais nova para a mais antiga. */
export function pendingAnnouncements(entries: ChangelogEntry[], announced: string[]) {
  const done = new Set(announced);
  return entries.filter((e) => !done.has(e.id));
}

/** Texto do embed do Discord (markdown do Discord); com a URL, o título vira link para o painel. */
export function changelogEmbed(entry: ChangelogEntry, panelUrl?: string) {
  const description = entry.items.map((i) => `• ${i}`).join("\n").slice(0, 3900);
  return { title: `🆕 ${entry.title}`, description, ...(panelUrl ? { url: panelUrl.replace(/\/$/, "") } : {}) };
}
