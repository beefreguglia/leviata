import "server-only";
import { z } from "zod";
import { db } from "@/lib/db";
import { weeklyGoals } from "@/lib/goals";
import { inFactionWhere } from "@/lib/members";
import { endOfDayBRT, fmtDate, fmtDateTime, startOfDayBRT, toDateInputBRT, toDateTimeInputBRT } from "@/lib/dates";
import { DIARY_KIND, EVENT_KIND, FACTION_RELATION, MEMBER_STATUS, NOTICE_PRIORITY } from "@/lib/labels";
import { DIARY_KINDS, NOTICE_PRIORITIES } from "@/lib/schemas/content";
import { EVENT_KINDS } from "@/lib/schemas/ops";
import type { Permission } from "@/lib/permissions";
import type { Viewer } from "@/lib/session";
import type { ToolSpec } from "./providers";

/** Ações que o membro confirma no chat (cada uma chama a mesma ação do formulário). */
export const ASSISTANT_ACTIONS = ["diario.registrar", "ausencia.avisar", "farm.entregar", "mural.publicar", "agenda.criar"] as const;
export type AssistantActionKey = (typeof ASSISTANT_ACTIONS)[number];

/** Cartão de confirmação que aparece no chat. Nada é salvo antes do membro confirmar. */
export type PendingAction = {
  id: string;
  action: AssistantActionKey;
  title: string;
  lines: string[];
  /** campos do formulário, exatamente como a tela mandaria */
  fields: Record<string, string>;
};

type Base<S extends z.ZodType> = { name: string; description: string; perm: Permission; schema: S };
type ReadTool<S extends z.ZodType = z.ZodType> = Base<S> & { kind: "read"; run: (viewer: Viewer, args: z.infer<S>) => Promise<unknown> };
type WriteTool<S extends z.ZodType = z.ZodType> = Base<S> & {
  kind: "write";
  prepare: (viewer: Viewer, args: z.infer<S>) => Promise<Omit<PendingAction, "id">>;
};
export type AssistantTool = ReadTool | WriteTool;

const read = <S extends z.ZodType>(t: Omit<ReadTool<S>, "kind">) => ({ ...t, kind: "read" as const }) as unknown as AssistantTool;
const write = <S extends z.ZodType>(t: Omit<WriteTool<S>, "kind">) => ({ ...t, kind: "write" as const }) as unknown as AssistantTool;

/** "2026-11-24T20:30" → "24/11/2026 às 20:30"; "2026-11-24" → "24/11/2026" */
const br = (v: string) => {
  const [d, t] = v.split("T");
  return `${d.split("-").reverse().join("/")}${t ? ` às ${t}` : ""}`;
};

const DAY = /^\d{4}-\d{2}-\d{2}$/;
const DATETIME = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/;
const day = (desc: string) => z.string().regex(DAY).describe(`${desc} (AAAA-MM-DD)`);
const when = (desc: string) => z.string().regex(DATETIME).describe(`${desc} (AAAA-MM-DDTHH:mm, horário de Brasília)`);

async function findFaction(name: string | undefined) {
  if (!name) return null;
  return db.faction.findFirst({
    where: { OR: [{ name: { equals: name, mode: "insensitive" } }, { tag: { equals: name, mode: "insensitive" } }, { name: { contains: name, mode: "insensitive" } }] },
    select: { id: true, name: true },
  });
}

export const TOOLS: AssistantTool[] = [
  // ---------------- consultas ----------------
  read({
    name: "ver_agenda",
    description: "Lista os próximos eventos da agenda (ações, corridas, reuniões, treinos) e a presença do próprio membro.",
    perm: "agenda.ver",
    schema: z.object({}),
    async run(viewer) {
      const events = await db.event.findMany({
        where: { status: "AGENDADO", startsAt: { gte: new Date(Date.now() - 3 * 3600_000) } },
        include: { attendances: { where: { memberId: viewer.member?.id ?? "-" }, select: { status: true } } },
        orderBy: { startsAt: "asc" },
        take: 10,
      });
      return events.map((e) => ({
        titulo: e.title,
        tipo: EVENT_KIND[e.kind].label,
        quando: fmtDateTime(e.startsAt),
        local: e.location,
        minha_presenca: e.attendances[0]?.status ?? "não respondeu",
        link: `/agenda/${e.id}`,
      }));
    },
  }),
  read({
    name: "ver_diario",
    description: "Mostra o que foi registrado no diário da cidade em um dia.",
    perm: "diario.ver",
    schema: z.object({ dia: day("Dia; se omitido, hoje").optional() }),
    async run(_viewer, { dia }) {
      const d = dia ?? toDateInputBRT(new Date());
      const entries = await db.diaryEntry.findMany({
        where: { happenedAt: { gte: startOfDayBRT(d), lte: endOfDayBRT(d) } },
        include: { faction: { select: { name: true } }, author: { select: { rpName: true } } },
        orderBy: { happenedAt: "asc" },
        take: 30,
      });
      return {
        dia: d,
        registros: entries.map((e) => ({
          hora: fmtDateTime(e.happenedAt).slice(-5),
          tipo: DIARY_KIND[e.kind].label,
          titulo: e.title,
          faccao: e.faction?.name,
          detalhes: e.content?.slice(0, 400),
          por: e.author?.rpName,
        })),
        link: `/diario?dia=${d}`,
      };
    },
  }),
  read({
    name: "minhas_metas",
    description: "Progresso das metas de farm da semana do próprio membro (quanto entregou e quanto falta).",
    perm: "metas.ver",
    schema: z.object({}),
    async run(viewer) {
      if (!viewer.member) return { erro: "Sem ficha de membro" };
      const { items, rows, to } = await weeklyGoals(new Date(), viewer.member.id);
      const row = rows[0];
      if (!row) return { aviso: "Você não está com status ativo, então não tem meta nesta semana." };
      return {
        semana_termina: fmtDate(new Date(to.getTime() - 1)),
        dispensado: row.exempt,
        itens: row.cells.flatMap((c) => {
          if (!c.applicable) return [];
          const item = items.find((i) => i.id === c.itemId);
          return [{ item: item?.name, entregue: c.done, meta: c.target, falta: c.missing }];
        }),
        link: "/metas",
      };
    },
  }),
  read({
    name: "ver_mural",
    description: "Avisos ativos do mural da liderança.",
    perm: "mural.ver",
    schema: z.object({}),
    async run() {
      const now = new Date();
      const notices = await db.notice.findMany({
        where: { OR: [{ expiresAt: null }, { expiresAt: { gte: now } }] },
        orderBy: [{ isPinned: "desc" }, { createdAt: "desc" }],
        take: 8,
      });
      return notices.map((n) => ({ titulo: n.title, prioridade: NOTICE_PRIORITY[n.priority].label, fixado: n.isPinned, publicado: fmtDate(n.createdAt), texto: n.content.slice(0, 500) }));
    },
  }),
  read({
    name: "listar_faccoes",
    description: "Facções da cidade com a relação com a Leviatã, 01 (líder), 02 (vice) e território.",
    perm: "faccoes.ver",
    schema: z.object({}),
    async run() {
      const factions = await db.faction.findMany({ where: { isActive: true }, orderBy: { name: "asc" }, take: 40 });
      return factions.map((f) => ({
        nome: f.name,
        sigla: f.tag,
        relacao: FACTION_RELATION[f.relation].label,
        lider_01: f.leader,
        vice_02: f.viceLeader,
        territorio: f.territory,
        link: `/faccoes/${f.id}`,
      }));
    },
  }),
  read({
    name: "buscar_membro",
    description: "Procura membros da fac pelo nome de RP ou passaporte.",
    perm: "membros.ver",
    schema: z.object({ busca: z.string().min(2).max(60).describe("Parte do nome ou o passaporte") }),
    async run(_viewer, { busca }) {
      const members = await db.member.findMany({
        where: { ...inFactionWhere, OR: [{ rpName: { contains: busca, mode: "insensitive" } }, { passport: busca }] },
        include: { rank: true, sector: true },
        orderBy: { rpName: "asc" },
        take: 8,
      });
      return members.map((m) => ({
        nome: m.rpName,
        patente: m.rank?.name,
        setor: m.sector?.name,
        status: MEMBER_STATUS[m.status].label,
        passaporte: m.passport,
        telefone: m.phone,
        link: `/membros/${m.id}`,
      }));
    },
  }),
  read({
    name: "listar_itens",
    description: "Nomes dos itens cadastrados (para entregar farm com o nome certo).",
    perm: "bau.ver",
    schema: z.object({}),
    async run() {
      return (await db.item.findMany({ select: { name: true }, orderBy: { name: "asc" } })).map((i) => i.name);
    },
  }),

  // ---------------- ações (só preparam; o membro confirma) ----------------
  write({
    name: "registrar_diario",
    description: "Prepara um registro no diário da cidade (o que aconteceu). O membro confirma no chat antes de salvar.",
    perm: "diario.criar",
    schema: z.object({
      titulo: z.string().min(3).max(160).describe("O que aconteceu, numa frase"),
      tipo: z.enum(DIARY_KINDS).describe("ACAO, CONFLITO, POLICIA, NEGOCIO, EVENTO ou OUTRO"),
      quando: when("Quando aconteceu; se omitido, agora").optional(),
      faccao: z.string().max(60).optional().describe("Nome ou sigla da facção envolvida, se houver"),
      detalhes: z.string().max(4000).optional(),
    }),
    async prepare(_viewer, a) {
      const faction = await findFaction(a.faccao);
      const at = a.quando ?? toDateTimeInputBRT(new Date());
      return {
        action: "diario.registrar",
        title: "Registrar no diário",
        lines: [
          a.titulo,
          `${DIARY_KIND[a.tipo].label} · ${br(at)}`,
          ...(a.faccao ? [faction ? `Facção: ${faction.name}` : `Facção "${a.faccao}" não encontrada (vai sem facção)`] : []),
          ...(a.detalhes ? [a.detalhes] : []),
        ],
        fields: { title: a.titulo, kind: a.tipo, happenedAt: at, factionId: faction?.id ?? "", content: a.detalhes ?? "" },
      };
    },
  }),
  write({
    name: "avisar_ausencia",
    description: "Prepara o aviso de ausência do próprio membro (início, volta e motivo). O membro confirma antes de enviar.",
    perm: "ausencias.criar",
    schema: z.object({ inicio: day("Primeiro dia fora"), volta: day("Dia da volta"), motivo: z.string().min(3).max(500) }),
    async prepare(_viewer, a) {
      return {
        action: "ausencia.avisar",
        title: "Avisar ausência",
        lines: [`De ${br(a.inicio)} até ${br(a.volta)}`, a.motivo],
        fields: { startsAt: a.inicio, endsAt: a.volta, reason: a.motivo },
      };
    },
  }),
  write({
    name: "entregar_farm",
    description: "Prepara a entrega de farm do próprio membro no baú (conta na meta). Use o nome exato do item; se não souber, chame listar_itens.",
    perm: "bau.ver",
    schema: z.object({ item: z.string().min(1).max(80), quantidade: z.number().int().positive().max(1_000_000), observacao: z.string().max(200).optional() }),
    async prepare(_viewer, a) {
      const item = await db.item.findFirst({
        where: { OR: [{ name: { equals: a.item, mode: "insensitive" } }, { name: { contains: a.item, mode: "insensitive" } }] },
        select: { id: true, name: true },
      });
      if (!item) throw new Error(`Item "${a.item}" não existe. Use listar_itens para ver os nomes.`);
      return {
        action: "farm.entregar",
        title: "Entregar farm no baú",
        lines: [`${a.quantidade.toLocaleString("pt-BR")}× ${item.name}`, ...(a.observacao ? [a.observacao] : [])],
        fields: { itemId: item.id, quantity: String(a.quantidade), reason: a.observacao ?? "" },
      };
    },
  }),
  write({
    name: "publicar_aviso",
    description: "Prepara um aviso no mural (título, texto em markdown e prioridade). Não envia no Discord. O membro confirma antes de publicar.",
    perm: "mural.criar",
    schema: z.object({
      titulo: z.string().min(3).max(120),
      texto: z.string().min(1).max(5000),
      prioridade: z.enum(NOTICE_PRIORITIES).optional().describe("NORMAL, IMPORTANTE ou URGENTE"),
    }),
    async prepare(_viewer, a) {
      const p = a.prioridade ?? "NORMAL";
      return {
        action: "mural.publicar",
        title: "Publicar aviso no mural",
        lines: [`${a.titulo} · ${NOTICE_PRIORITY[p].label}`, a.texto],
        fields: { title: a.titulo, content: a.texto, priority: p },
      };
    },
  }),
  write({
    name: "agendar_evento",
    description: "Prepara um evento na agenda (ação, corrida, reunião, treino ou evento). Não avisa no Discord. O membro confirma antes de salvar.",
    perm: "agenda.criar",
    schema: z.object({
      titulo: z.string().min(3).max(120),
      tipo: z.enum(EVENT_KINDS).describe("ACAO, CORRIDA, REUNIAO, TREINO ou EVENTO"),
      inicio: when("Começo"),
      local: z.string().max(200).optional(),
      descricao: z.string().max(4000).optional(),
    }),
    async prepare(_viewer, a) {
      return {
        action: "agenda.criar",
        title: "Agendar na agenda",
        lines: [`${a.titulo} · ${EVENT_KIND[a.tipo].label}`, br(a.inicio), ...(a.local ? [`Local: ${a.local}`] : []), ...(a.descricao ? [a.descricao] : [])],
        fields: { title: a.titulo, kind: a.tipo, startsAt: a.inicio, location: a.local ?? "", description: a.descricao ?? "" },
      };
    },
  }),
];

/** Ferramentas que este membro pode usar. */
export function toolsFor(viewer: Pick<Viewer, "can">) {
  return TOOLS.filter((t) => viewer.can(t.perm));
}

export function toolSpecs(tools: AssistantTool[]): ToolSpec[] {
  return tools.map((t) => {
    const { $schema: _s, ...parameters } = z.toJSONSchema(t.schema, { target: "draft-7" }) as Record<string, unknown>;
    void _s;
    return { type: "function", function: { name: t.name, description: t.description, parameters } };
  });
}
