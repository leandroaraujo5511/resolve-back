import type { TicketHistoryActorType } from '../database/entities/ticket-history.entity';

export type { TicketHistoryActorType };

export type HistoryActorSnapshot = {
  actorType: TicketHistoryActorType;
  actorDisplayName: string;
  userId: string | null;
  citizenId: string | null;
};

export function fallbackActorDisplayName(input: {
  actorType?: TicketHistoryActorType | null;
  actorDisplayName?: string | null;
  userId?: string | null;
  citizenId?: string | null;
}): string {
  const name = input.actorDisplayName?.trim();
  if (name) return name;
  if (input.actorType === 'SYSTEM' || input.actorType === 'INTEGRATION') {
    return input.actorType === 'INTEGRATION' ? 'Integração' : 'Sistema';
  }
  if (input.citizenId) return 'Cidadão (app)';
  if (input.userId) return 'Equipe municipal';
  return 'Sistema';
}

export function inferActorType(input: {
  actorType?: TicketHistoryActorType | null;
  userId?: string | null;
  citizenId?: string | null;
}): TicketHistoryActorType {
  if (input.actorType) return input.actorType;
  if (input.citizenId) return 'CITIZEN';
  if (input.userId) return 'USER';
  return 'SYSTEM';
}
