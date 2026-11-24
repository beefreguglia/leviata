import { PERMISSION_AREAS, type AreaDef, type CrudOp, type Permission } from "@/lib/permissions";
import type { Viewer } from "@/lib/session";

/** O que cada área do painel faz, em uma ou duas frases, e onde fica. Vai para o assistente explicar o painel. */
export const AREA_GUIDE: Record<string, { href: string; text: string }> = {
  membros: { href: "/membros", text: "Lista da fac com patente, setor, passaporte e contato. Na ficha dá para ver o histórico, promover, mudar setor e desligar." },
  hierarquia: { href: "/hierarquia", text: "Patentes, setores e gerências. No Editar de cada cargo fica a tabela de permissões (Ver, Criar, Editar, Apagar)." },
  patentes: { href: "/hierarquia", text: "Criar, editar e apagar patentes (aba Patentes em Hierarquia)." },
  setores: { href: "/hierarquia", text: "Criar, editar e apagar setores (aba Setores em Hierarquia)." },
  gerencias: { href: "/hierarquia", text: "Criar e editar gerências e dar gerência a membros (Hierarquia)." },
  ausencias: { href: "/ausencias", text: "Avisar que vai ficar fora (início, volta e motivo). A gerência aprova; ausência longa dispensa a meta de farm da semana." },
  punicoes: { href: "/punicoes", text: "Advertências e punições aplicadas, marcar como cumprida e revogar." },
  agenda: { href: "/agenda", text: "Ações, corridas, reuniões e treinos marcados. Cada evento tem presença (Vou, Talvez, Não vou), escalação e relatório." },
  escalacoes: { href: "/escalacoes", text: "Quem foi escalado para cada evento e em que função." },
  perimetros: { href: "/perimetros", text: "Planos de perímetro das ações, com o desenho no mapa." },
  mapa: { href: "/mapa", text: "Mapa da cidade com os lugares marcados pela fac." },
  farm: { href: "/farm", text: "Guias de farm: onde e como pegar cada matéria-prima." },
  fabricacao: { href: "/fabricacao", text: "Itens, receitas e calculadoras de quanto material é preciso para fabricar." },
  bau: { href: "/bau", text: "Baú da fac. Todo membro entrega o farm por aqui (conta na meta). A gerência registra movimentações, confere entregas e vê o saldo." },
  metas: { href: "/metas", text: "Metas de farm da semana por item e o progresso de cada membro (a semana vira na segunda)." },
  encomendas: { href: "/encomendas", text: "Pedidos de outras facções ou clientes, do aberto até o entregue." },
  vendas: { href: "/vendas", text: "Vendas registradas, com comprador, itens e valores." },
  lore: { href: "/lore", text: "Artigos da história da Leviatã e da cidade." },
  diario: { href: "/diario", text: "Diário da cidade: o que aconteceu em cada dia (ações, conflitos, polícia, negócios, eventos), com hora e facção envolvida." },
  faccoes: { href: "/faccoes", text: "Outras facções da cidade: relação com a Leviatã, 01 e 02, território e histórico." },
  dossie: { href: "/dossie", text: "Fichas de pessoas de fora: apelidos, placas, vínculos e anotações." },
  mural: { href: "/mural", text: "Avisos da liderança (alguns com enquete) e flyers." },
  assistente: { href: "", text: "Este chat." },
  lives: { href: "/lives", text: "Quem da fac está em live agora (Twitch, Kick, YouTube). Cada membro cadastra até 3 canais." },
  regras: { href: "/regras", text: "Regras e estatuto da Leviatã." },
  auditoria: { href: "/auditoria", text: "Registro de tudo que foi feito no painel e por quem." },
};

/** "Diário (/diario) — pode: ver, criar. O que é: …" para cada área que o membro alcança. */
export function guideFor(viewer: Pick<Viewer, "can">) {
  const lines: string[] = [];
  for (const group of PERMISSION_AREAS) {
    for (const area of group.areas as readonly AreaDef[]) {
      if (area.key === "assistente") continue;
      const ops = (Object.keys(area.ops) as CrudOp[]).filter((op) => viewer.can(`${area.key}.${op}` as Permission));
      const extras = Object.entries(area.extras ?? {}).filter(([k]) => viewer.can(k as Permission));
      if (ops.length === 0 && extras.length === 0) continue;
      const g = AREA_GUIDE[area.key];
      const can = [...ops.map((op) => area.ops[op]!), ...extras.map(([, d]) => d)].join("; ");
      lines.push(`- ${area.label}${g?.href ? ` (${g.href})` : ""}: ${g?.text ?? ""} Este membro pode: ${can}.`);
    }
  }
  return lines.join("\n");
}
