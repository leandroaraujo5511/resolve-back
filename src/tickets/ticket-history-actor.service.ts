import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, IsNull, Repository } from 'typeorm';
import { Citizen } from '../database/entities/citizen.entity';
import { TicketHistory } from '../database/entities/ticket-history.entity';
import { User } from '../database/entities/user.entity';
import type { HistoryActorSnapshot } from './ticket-history-actor';

@Injectable()
export class TicketHistoryActorService implements OnApplicationBootstrap {
  private readonly logger = new Logger(TicketHistoryActorService.name);

  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(Citizen)
    private readonly citizenRepository: Repository<Citizen>,
    @InjectRepository(TicketHistory)
    private readonly ticketHistoryRepository: Repository<TicketHistory>,
  ) {}

  async onApplicationBootstrap(): Promise<void> {
    try {
      const n = await this.backfillMissingActors();
      if (n > 0) {
        this.logger.log(`Backfill de autores no histórico: ${n} evento(s)`);
      }
    } catch (err) {
      this.logger.warn(
        `Backfill de autores no histórico falhou: ${
          err instanceof Error ? err.message : String(err)
        }`,
      );
    }
  }

  async forUser(userId: string): Promise<HistoryActorSnapshot> {
    const user = await this.userRepository.findOne({ where: { id: userId } });
    const name = user?.name?.trim() || 'Equipe municipal';
    return {
      actorType: 'USER',
      actorDisplayName: name,
      userId,
      citizenId: null,
    };
  }

  async forCitizen(citizenId: string): Promise<HistoryActorSnapshot> {
    const citizen = await this.citizenRepository.findOne({
      where: { id: citizenId },
    });
    const name = citizen?.name?.trim() || 'Cidadão (app)';
    return {
      actorType: 'CITIZEN',
      actorDisplayName: name,
      userId: null,
      citizenId,
    };
  }

  system(displayName = 'Sistema'): HistoryActorSnapshot {
    return {
      actorType: 'SYSTEM',
      actorDisplayName: displayName,
      userId: null,
      citizenId: null,
    };
  }

  /** Backfill best-effort para eventos legados sem snapshot (RN-096 / CA-051). */
  async backfillMissingActors(): Promise<number> {
    const pending = await this.ticketHistoryRepository.find({
      where: { actorDisplayName: IsNull() },
      take: 2000,
    });
    if (pending.length === 0) return 0;

    const userIds = [
      ...new Set(pending.map((h) => h.userId).filter(Boolean) as string[]),
    ];
    const citizenIds = [
      ...new Set(pending.map((h) => h.citizenId).filter(Boolean) as string[]),
    ];

    const users =
      userIds.length > 0
        ? await this.userRepository.find({ where: { id: In(userIds) } })
        : [];
    const citizens =
      citizenIds.length > 0
        ? await this.citizenRepository.find({ where: { id: In(citizenIds) } })
        : [];

    const userName = new Map(users.map((u) => [u.id, u.name?.trim() || '']));
    const citizenName = new Map(
      citizens.map((c) => [c.id, c.name?.trim() || '']),
    );

    for (const h of pending) {
      if (h.citizenId) {
        h.actorType = 'CITIZEN';
        h.actorDisplayName = citizenName.get(h.citizenId) || 'Cidadão (app)';
      } else if (h.userId) {
        h.actorType = 'USER';
        h.actorDisplayName = userName.get(h.userId) || 'Equipe municipal';
      } else {
        h.actorType = 'SYSTEM';
        h.actorDisplayName = 'Sistema';
      }
    }

    await this.ticketHistoryRepository.save(pending);
    return pending.length;
  }
}
