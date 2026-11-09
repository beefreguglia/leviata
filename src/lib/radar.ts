/** Radar de inatividade (puro, testável). */
export const RADAR_DAYS = 7;
const DAY_MS = 86400_000;

export type RadarMember = { id: string; joinedAt: Date };
export type RadarActivity = { lastFarm?: Date | null; lastAttendance?: Date | null };

/**
 * Quem está há `RADAR_DAYS` dias ou mais sem entregar farm nem responder presença, do mais parado para o menos.
 * Ausência ativa e quem entrou há pouco ficam de fora. Sem nenhuma atividade, conta desde a entrada.
 */
export function inactiveMembers<T extends RadarMember>(members: T[], activity: Map<string, RadarActivity>, absentIds: Set<string>, now: Date) {
  return members
    .flatMap((member) => {
      if (absentIds.has(member.id)) return [];
      const { lastFarm, lastAttendance } = activity.get(member.id) ?? {};
      const dates = [lastFarm, lastAttendance].filter((d): d is Date => d != null);
      const lastActivity = dates.length ? new Date(Math.max(...dates.map((d) => d.getTime()))) : null;
      const days = Math.floor((now.getTime() - (lastActivity ?? member.joinedAt).getTime()) / DAY_MS);
      return days >= RADAR_DAYS ? [{ member, lastActivity, days }] : [];
    })
    .sort((a, b) => b.days - a.days);
}
