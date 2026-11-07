import type {
  AttendanceStatus, EventKind, EventResult, EventStatus, MapPinCategory,
  AbsenceStatus, FactionEventKind, FactionRelation, LoreCategory, MemberStatus, NoticePriority, Risk, StreamPlatform,
} from "@/generated/prisma/client";

export const MEMBER_STATUS: Record<MemberStatus, { label: string; className: string }> = {
  ATIVO: { label: "Ativo", className: "bg-success-low text-success" },
  INATIVO: { label: "Inativo", className: "bg-grey-700 text-grey-300" },
  AFASTADO: { label: "Afastado", className: "bg-warning-low text-warning" },
  EXPULSO: { label: "Expulso", className: "bg-danger-low text-danger-light" },
};

export const ABSENT_BADGE = { label: "Ausente", className: "bg-warning-low text-warning" };

export const ABSENCE_STATUS: Record<AbsenceStatus, { label: string; className: string }> = {
  PENDENTE: { label: "Pendente", className: "bg-warning-low text-warning" },
  APROVADA: { label: "Aprovada", className: "bg-success-low text-success" },
  RECUSADA: { label: "Recusada", className: "bg-danger-low text-danger-light" },
  CANCELADA: { label: "Cancelada", className: "bg-grey-700 text-grey-300" },
};

/** Presença mostrada como bolinha no avatar (ausência ativa tem prioridade sobre o status). */
export type Presence = "ATIVO" | "AUSENTE" | "AFASTADO" | "INATIVO" | "EXPULSO";

export const PRESENCE: Record<Presence, { label: string; dot: string }> = {
  ATIVO: { label: "Ativo", dot: "bg-success" },
  AUSENTE: { label: "Ausente", dot: "bg-warning" },
  AFASTADO: { label: "Afastado", dot: "bg-danger-light" },
  INATIVO: { label: "Inativo", dot: "bg-grey-400" },
  EXPULSO: { label: "Expulso", dot: "bg-grey-600" },
};

export function presenceOf(status: MemberStatus, absentNow: boolean): Presence {
  if (status === "ATIVO" && absentNow) return "AUSENTE";
  return status;
}

// ---------------- Fase 2 ----------------

export const LORE_CATEGORY: Record<LoreCategory, { label: string; className: string }> = {
  HISTORIA: { label: "História", className: "bg-grey-600 text-grey-100" },
  EVENTO: { label: "Evento", className: "bg-cyan-low text-cyan-light" },
  PERSONAGEM: { label: "Personagem", className: "bg-[#1a1f45] text-[#9aa8ff]" },
  LUGAR: { label: "Lugar", className: "bg-success-low text-success" },
  ALIANCA: { label: "Aliança", className: "bg-warning-low text-warning" },
};

/** Relação com a Leviatã: verde (aliada) → vermelho (guerra). */
export const FACTION_RELATION: Record<FactionRelation, { label: string; className: string; dot: string }> = {
  ALIADA: { label: "Aliada", className: "bg-success-low text-success", dot: "bg-success" },
  NEUTRA: { label: "Neutra", className: "bg-grey-600 text-grey-100", dot: "bg-grey-400" },
  TENSA: { label: "Tensa", className: "bg-warning-low text-warning", dot: "bg-warning" },
  INIMIGA: { label: "Inimiga", className: "bg-danger-low text-danger-light", dot: "bg-danger-light" },
  GUERRA: { label: "Em guerra", className: "bg-danger-base text-white", dot: "bg-danger-base" },
};

export const FACTION_EVENT_KIND: Record<FactionEventKind, { label: string }> = {
  ACORDO: { label: "Acordo" },
  CONFLITO: { label: "Conflito" },
  TRAICAO: { label: "Traição" },
  NEGOCIO: { label: "Negócio" },
  RELACAO: { label: "Mudança de relação" },
  OUTRO: { label: "Outro" },
};

export const RISK: Record<Risk, { label: string; className: string }> = {
  BAIXO: { label: "Risco baixo", className: "bg-success-low text-success" },
  MEDIO: { label: "Risco médio", className: "bg-warning-low text-warning" },
  ALTO: { label: "Risco alto", className: "bg-danger-low text-danger-light" },
};

export const NOTICE_PRIORITY: Record<NoticePriority, { label: string; className: string; bar: string }> = {
  NORMAL: { label: "Normal", className: "bg-grey-600 text-grey-100", bar: "bg-grey-600" },
  IMPORTANTE: { label: "Importante", className: "bg-warning-low text-warning", bar: "bg-warning" },
  URGENTE: { label: "Urgente", className: "bg-danger-low text-danger-light", bar: "bg-danger-light" },
};

export const STREAM_PLATFORM: Record<StreamPlatform, { label: string; className: string }> = {
  TWITCH: { label: "Twitch", className: "bg-[#2a1a45] text-[#bf94ff]" },
  KICK: { label: "Kick", className: "bg-[#0f2a12] text-[#53fc18]" },
  YOUTUBE: { label: "YouTube", className: "bg-danger-low text-danger-light" },
};

// ---------------- Fase 3 ----------------

/** Cor de cada categoria de marcador (hex usado também no mapa Leaflet). */
export const PIN_CATEGORY: Record<MapPinCategory, { label: string; color: string }> = {
  BASE: { label: "Base", color: "#06d4ec" },
  FARM: { label: "Farm", color: "#04d361" },
  DESMANCHE: { label: "Desmanche", color: "#fba94c" },
  LAVAGEM: { label: "Lavagem", color: "#c4c4cc" },
  LOJA: { label: "Loja", color: "#6a80ff" },
  FUGA: { label: "Rota de fuga", color: "#5cf0fa" },
  ESCONDERIJO: { label: "Esconderijo", color: "#9aa8ff" },
  TERRITORIO: { label: "Território", color: "#eb8a1d" },
  ALVO: { label: "Alvo de ação", color: "#f75a68" },
  OUTRO: { label: "Outro", color: "#8d8d99" },
};

export const EVENT_KIND: Record<EventKind, { label: string; className: string; dot: string }> = {
  ACAO: { label: "Ação", className: "bg-danger-low text-danger-light", dot: "bg-danger-light" },
  CORRIDA: { label: "Corrida", className: "bg-cyan-low text-cyan-light", dot: "bg-primary" },
  REUNIAO: { label: "Reunião", className: "bg-grey-600 text-grey-100", dot: "bg-grey-300" },
  TREINO: { label: "Treino", className: "bg-success-low text-success", dot: "bg-success" },
  EVENTO: { label: "Evento", className: "bg-warning-low text-warning", dot: "bg-warning" },
};

export const EVENT_STATUS: Record<EventStatus, { label: string; className: string }> = {
  AGENDADO: { label: "Agendado", className: "bg-cyan-low text-cyan-light" },
  CONCLUIDO: { label: "Concluído", className: "bg-success-low text-success" },
  CANCELADO: { label: "Cancelado", className: "bg-grey-600 text-grey-300" },
};

export const ATTENDANCE: Record<AttendanceStatus, { label: string; className: string }> = {
  VOU: { label: "Vou", className: "bg-success-low text-success" },
  TALVEZ: { label: "Talvez", className: "bg-warning-low text-warning" },
  NAO_VOU: { label: "Não vou", className: "bg-danger-low text-danger-light" },
};

export const EVENT_RESULT: Record<EventResult, { label: string; className: string }> = {
  SUCESSO: { label: "Sucesso", className: "bg-success-low text-success" },
  PARCIAL: { label: "Parcial", className: "bg-warning-low text-warning" },
  FALHA: { label: "Falhou", className: "bg-danger-low text-danger-light" },
};

// ---------------- Fase 4 ----------------
export const VAULT_ASSET = {
  DINHEIRO_SUJO: { label: "Dinheiro sujo", short: "Sujo" },
  DINHEIRO_LIMPO: { label: "Dinheiro limpo", short: "Limpo" },
  ITEM: { label: "Item", short: "Item" },
} as const;

export const VAULT_STATUS = {
  PENDENTE: { label: "Pendente", className: "bg-warning-low text-warning" },
  CONFIRMADA: { label: "Confirmada", className: "bg-success-low text-success" },
  ESTORNADA: { label: "Estornada", className: "bg-grey-600 text-grey-300" },
} as const;

export const ORDER_STATUS = {
  ABERTA: { label: "Aberta", className: "bg-grey-600 text-grey-100" },
  PRODUCAO: { label: "Em produção", className: "bg-cyan-low text-cyan-light" },
  PRONTA: { label: "Pronta", className: "bg-warning-low text-warning" },
  ENTREGUE: { label: "Entregue", className: "bg-success-low text-success" },
  CANCELADA: { label: "Cancelada", className: "bg-grey-700 text-grey-400" },
} as const;

export const PUNISHMENT_KIND = {
  ADVERTENCIA: { label: "Advertência", className: "bg-warning-low text-warning" },
  MULTA: { label: "Multa", className: "bg-warning-low text-warning" },
  SUSPENSAO: { label: "Suspensão", className: "bg-danger-low text-danger-light" },
  REBAIXAMENTO: { label: "Rebaixamento", className: "bg-danger-low text-danger-light" },
  EXPULSAO: { label: "Expulsão", className: "bg-danger-base text-white" },
} as const;

export const PUNISHMENT_STATUS = {
  ATIVA: { label: "Ativa", className: "bg-danger-low text-danger-light" },
  CUMPRIDA: { label: "Cumprida", className: "bg-success-low text-success" },
  REVOGADA: { label: "Revogada", className: "bg-grey-600 text-grey-300" },
} as const;
