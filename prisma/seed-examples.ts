import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import type { PrismaClient } from "../src/generated/prisma/client";

/** Conteúdo de exemplo para ver o painel funcionando (só `npm run db:seed`, não nos testes). */
export async function seedExamples(db: PrismaClient) {
  const lider = await db.member.findFirst({ where: { rank: { name: "Líder" } } });
  const authorId = lider?.id;

  // Itens e receitas
  const item = async (name: string, unit = "un", isIllegal = false) =>
    db.item.upsert({ where: { name }, create: { name, unit, isIllegal }, update: {} });
  const metal = await item("Metal");
  const polvora = await item("Pólvora", "g", true);
  const capsula = await item("Cápsula");
  const peca = await item("Peça de arma", "un", true);
  const municao = await item("Munição 9mm", "un", true);
  const pistola = await item("Pistola", "un", true);

  const recipe = async (outputItemId: string, outputQty: number, minutes: number, location: string, inputs: [string, number][]) => {
    if (await db.recipe.findFirst({ where: { outputItemId } })) return;
    await db.recipe.create({
      data: { outputItemId, outputQty, minutes, location, inputs: { create: inputs.map(([itemId, quantity]) => ({ itemId, quantity })) } },
    });
  };
  await recipe(peca.id, 1, 3, "Galpão do porto", [[metal.id, 3]]);
  await recipe(pistola.id, 1, 10, "Galpão do porto", [[metal.id, 8], [peca.id, 2]]);
  await recipe(municao.id, 10, 5, "Galpão do porto", [[polvora.id, 20], [metal.id, 1], [capsula.id, 10]]);

  if (!(await db.farmGuide.count())) {
    await db.farmGuide.createMany({
      data: [
        {
          title: "Metal na reciclagem",
          itemId: metal.id,
          location: "Reciclagem de La Puerta",
          howTo: "1. Pegue o uniforme no vestiário.\n2. Separe o lixo nas esteiras.\n3. Troque os sacos por **metal** no balcão.",
          amountPerRun: 12,
          minutesPerRun: 6,
          risk: "BAIXO",
          requirements: "Nenhum",
          authorId,
        },
        {
          title: "Pólvora no paiol",
          itemId: polvora.id,
          location: "Paiol abandonado em Paleto",
          howTo: "Vá em grupo de 3+. A polícia costuma rondar depois das 22h.\n\n> Sempre com rota de fuga combinada.",
          amountPerRun: 40,
          minutesPerRun: 15,
          risk: "ALTO",
          requirements: "Furadeira, carro rápido",
          authorId,
        },
      ],
    });
  }

  // Facções
  const factions = [
    { name: "Família Leone", tag: "FL", color: "#c9a227", relation: "ALIADA" as const, kind: "Máfia", territory: "Vinewood Hills", leader: "Marco Leone" },
    { name: "Vagos", tag: "VG", color: "#e8c547", relation: "NEUTRA" as const, kind: "Gangue", territory: "El Burro Heights" },
    { name: "LSPD", tag: "LSPD", color: "#3b6fd6", relation: "TENSA" as const, kind: "Polícia", territory: "Mission Row" },
    { name: "Ballas", tag: "BL", color: "#8e44ad", relation: "INIMIGA" as const, kind: "Gangue", territory: "Grove Street, Davis", leader: "Big T" },
  ];
  for (const f of factions) {
    const created = await db.faction.upsert({ where: { name: f.name }, create: f, update: {} });
    if (f.name === "Ballas" && !(await db.factionEvent.count({ where: { factionId: created.id } }))) {
      await db.factionEvent.createMany({
        data: [
          { factionId: created.id, kind: "CONFLITO", title: "Emboscada na saída do farm de pólvora", happenedAt: new Date(Date.now() - 10 * 864e5), authorId },
          { factionId: created.id, kind: "RELACAO", title: "Relação: Tensa → Inimiga", happenedAt: new Date(Date.now() - 9 * 864e5), authorId },
        ],
      });
    }
  }

  // Lore
  if (!(await db.loreArticle.count())) {
    await db.loreArticle.createMany({
      data: [
        {
          slug: "a-chegada-da-leviata",
          title: "A chegada da Leviata",
          summary: "Como a Leviata se firmou no porto de Los Santos.",
          content: "## O começo\nTudo começou no **porto**, com três barcos e muita coragem.\n\n## Primeiros acordos\nA Família Leone foi a primeira a estender a mão.",
          category: "HISTORIA",
          happenedAt: new Date("2026-08-15T12:00:00-03:00"),
          tags: ["porto", "origem"],
          isPinned: true,
          authorId,
        },
        {
          slug: "a-noite-de-grove-street",
          title: "A noite de Grove Street",
          summary: "O tiroteio que mudou a relação com os Ballas.",
          content: "Depois da emboscada no paiol, a resposta veio em Grove Street.",
          category: "EVENTO",
          happenedAt: new Date("2026-10-27T23:00:00-03:00"),
          tags: ["ballas", "tiroteio"],
          authorId,
        },
      ],
    });
  }

  // Mural
  if (!(await db.notice.count())) {
    await db.notice.create({
      data: {
        title: "Reunião geral sábado às 20h",
        content: "Presença **obrigatória**. Pauta: metas de farm e a situação com os Ballas.\n\nQuem não puder, avise em **Ausências**.",
        priority: "IMPORTANTE",
        isPinned: true,
        authorId,
      },
    });
  }

  await seedOperations(db, authorId);
}

/** Fase 3: mapa de exemplo, marcadores, perímetro e eventos. */
async function seedOperations(db: PrismaClient, authorId: string | undefined) {
  // Mapa (imagem fictícia gravada no storage local de dev)
  if (!(await db.setting.findUnique({ where: { key: "mapa" } }))) {
    const key = "exemplos/mapa-exemplo.png";
    const root = process.env.UPLOAD_DIR || ".uploads";
    const bytes = await readFile(path.join("prisma", "assets", "mapa-exemplo.png"));
    await mkdir(path.join(root, "exemplos"), { recursive: true });
    await writeFile(path.join(root, key), bytes);
    const upload = await db.upload.upsert({
      where: { key },
      create: { key, name: "mapa-exemplo.png", mime: "image/png", size: bytes.length, uploaderId: authorId },
      update: {},
    });
    await db.setting.create({ data: { key: "mapa", value: { imageId: upload.id, width: 1600, height: 1200 } } });
  }

  if (!(await db.mapPin.count())) {
    const metal = await db.farmGuide.findFirst({ where: { title: "Metal na reciclagem" } });
    const ballas = await db.faction.findUnique({ where: { name: "Ballas" } });
    await db.mapPin.createMany({
      data: [
        { title: "Base da Leviata (porto)", category: "BASE", x: 520, y: 880, description: "Galpão 3. Entrada pelos fundos.", authorId },
        { title: "Reciclagem de La Puerta", category: "FARM", x: 760, y: 610, farmGuideId: metal?.id, authorId },
        { title: "Desmanche do canal", category: "DESMANCHE", x: 980, y: 760, description: "Só depois das 22h.", authorId },
        { title: "Banco Fleeca da praça", category: "ALVO", x: 1120, y: 420, authorId },
        { title: "Túnel de fuga", category: "FUGA", x: 1300, y: 520, description: "Sai na rodovia norte.", authorId },
        { title: "Território dos Ballas", category: "TERRITORIO", x: 1380, y: 900, factionId: ballas?.id, authorId },
      ],
    });
  }

  let fleeca = await db.perimeter.findFirst({ where: { target: "Banco Fleeca" } });
  if (!fleeca) {
    const pin = await db.mapPin.findFirst({ where: { title: "Banco Fleeca da praça" } });
    fleeca = await db.perimeter.create({
      data: {
        name: "Fleeca da praça — entrada pelos fundos",
        target: "Banco Fleeca",
        difficulty: "MEDIO",
        minMembers: 5,
        plan: "## Chegada\nDois carros pelos fundos, um de vigia na esquina.\n\n## Dentro\n- Negociador segura os reféns\n- Hacker abre o cofre (~3 min)",
        escapeRoutes: "- **Rota 1:** túnel norte → rodovia\n- **Rota 2:** canal → porto",
        pinId: pin?.id,
        authorId,
        roles: {
          create: [
            { name: "Piloto", quantity: 2, order: 0, notes: "Carros rápidos" },
            { name: "Negociador", quantity: 1, order: 1 },
            { name: "Hacker", quantity: 1, order: 2 },
            { name: "Contenção", quantity: 2, order: 3, notes: "Portas da frente" },
          ],
        },
      },
    });
  }

  if (!(await db.event.count())) {
    const at = (days: number, hour: number) => {
      const d = new Date();
      d.setUTCDate(d.getUTCDate() + days);
      d.setUTCHours(hour + 3, 0, 0, 0); // hora de Brasília
      return d;
    };
    const members = await db.member.findMany({ orderBy: { rpName: "asc" } });
    const byName = (n: string) => members.find((m) => m.rpName === n)?.id;

    const acao = await db.event.create({
      data: { title: "Fleeca da praça", kind: "ACAO", startsAt: at(1, 21), location: "Encontro no porto", perimeterId: fleeca.id, createdById: authorId },
    });
    await db.attendance.createMany({
      data: [
        { eventId: acao.id, memberId: byName("Dante Moretti")!, status: "VOU" as const },
        { eventId: acao.id, memberId: byName("Rafa Cardoso")!, status: "VOU" as const },
        { eventId: acao.id, memberId: byName("Léo Vieira")!, status: "TALVEZ" as const },
      ].filter((a) => a.memberId),
    });
    await db.lineupSlot.createMany({
      data: [
        { eventId: acao.id, role: "Piloto", order: 0, memberId: byName("Rafa Cardoso"), vehicle: "Sultan RS" },
        { eventId: acao.id, role: "Piloto", order: 1 },
        { eventId: acao.id, role: "Negociador", order: 2, memberId: byName("Dante Moretti") },
        { eventId: acao.id, role: "Hacker", order: 3 },
        { eventId: acao.id, role: "Contenção", order: 4 },
        { eventId: acao.id, role: "Contenção", order: 5 },
      ],
    });
    await db.event.createMany({
      data: [
        { title: "Corrida no aeroporto", kind: "CORRIDA", startsAt: at(3, 22), location: "Hangar 2", createdById: authorId },
        { title: "Reunião geral", kind: "REUNIAO", startsAt: at(5, 20), location: "Base do porto", createdById: authorId },
        { title: "Treino de tiro", kind: "TREINO", startsAt: at(8, 19), location: "Stand de Paleto", createdById: authorId },
      ],
    });
    const passada = await db.event.create({
      data: { title: "Joalheria Vangelico", kind: "ACAO", status: "CONCLUIDO", startsAt: at(-4, 21), createdById: authorId },
    });
    await db.eventReport.create({
      data: { eventId: passada.id, result: "PARCIAL", loot: "2 vitrines", money: 85000, casualties: 0, arrests: 1, notes: "Polícia chegou cedo. Nina foi presa na fuga.", authorId },
    });
  }
}
