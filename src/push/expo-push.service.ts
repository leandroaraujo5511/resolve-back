import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Citizen } from '../database/entities/citizen.entity';

type ExpoPushMessage = {
  to: string;
  title: string;
  body: string;
  sound?: 'default' | null;
  data?: Record<string, string>;
  priority?: 'default' | 'normal' | 'high';
  channelId?: string;
  android?: {
    channelId?: string;
    priority?: 'default' | 'normal' | 'high';
    /** Segundos até a mensagem expirar no FCM se o dispositivo estiver offline */
    ttl?: number;
  };
};

type ExpoPushTicket =
  | { status: 'ok'; id?: string }
  | {
      status: 'error';
      message?: string;
      details?: { error?: string };
    };

@Injectable()
export class ExpoPushService {
  private readonly logger = new Logger(ExpoPushService.name);

  constructor(
    @InjectRepository(Citizen)
    private readonly citizenRepository: Repository<Citizen>,
  ) {}

  private isLikelyExpoToken(token: string): boolean {
    const t = token.trim();
    return (
      t.startsWith('ExponentPushToken[') ||
      t.startsWith('ExpoPushToken[') ||
      t.length > 40
    );
  }

  private parseExpoTickets(json: unknown): ExpoPushTicket[] {
    if (!json || typeof json !== 'object') return [];
    const data = (json as { data?: unknown }).data;
    if (Array.isArray(data)) {
      return data as ExpoPushTicket[];
    }
    if (data && typeof data === 'object') {
      return [data as ExpoPushTicket];
    }
    return [];
  }

  async sendToExpoToken(
    expoPushToken: string,
    title: string,
    body: string,
    data?: Record<string, string>,
  ): Promise<boolean> {
    if (!this.isLikelyExpoToken(expoPushToken)) {
      this.logger.warn('Token push ignorado: formato inválido');
      return false;
    }

    const dataPayload: Record<string, string> = {};
    if (data) {
      for (const [k, v] of Object.entries(data)) {
        dataPayload[k] = v === undefined || v === null ? '' : String(v);
      }
    }

    const message: ExpoPushMessage = {
      to: expoPushToken.trim(),
      title,
      body,
      sound: 'default',
      data: dataPayload,
      priority: 'high',
      channelId: 'default',
      android: {
        channelId: 'default',
        priority: 'high',
        ttl: 86_400,
      },
    };

    try {
      const res = await fetch('https://exp.host/--/api/v2/push/send', {
        method: 'POST',
        headers: {
          Accept: 'application/json',
          'Accept-encoding': 'gzip, deflate',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify([message]),
      });

      const json: unknown = await res.json().catch(() => null);
      const tickets = this.parseExpoTickets(json);

      if (!res.ok) {
        this.logger.warn(
          `Expo push HTTP ${res.status}: ${JSON.stringify(json ?? 'no body')}`,
        );
        return false;
      }

      for (const ticket of tickets) {
        if (ticket.status === 'error') {
          const code = ticket.details?.error ?? ticket.message ?? 'unknown';
          this.logger.warn(
            `Expo push falhou (${code}): ${JSON.stringify(ticket)}`,
          );
          if (
            code === 'DeviceNotRegistered' ||
            code === 'InvalidCredentials'
          ) {
            return false;
          }
        }
      }

      return tickets.some((t) => t.status === 'ok');
    } catch (e) {
      this.logger.warn(`Falha ao enviar push Expo: ${(e as Error).message}`);
      return false;
    }
  }

  async notifyCitizen(
    citizenId: string | null | undefined,
    title: string,
    body: string,
    data?: Record<string, string>,
  ): Promise<void> {
    if (!citizenId) return;

    const citizen = await this.citizenRepository.findOne({
      where: { id: citizenId },
      select: ['id', 'expoPushToken'],
    });

    const token = citizen?.expoPushToken;
    if (!token) {
      this.logger.debug(
        `Push não enviado: cidadão ${citizenId} sem expoPushToken`,
      );
      return;
    }

    const ok = await this.sendToExpoToken(token, title, body, data);
    if (!ok) {
      this.logger.warn(
        `Push não entregue para cidadão ${citizenId} (verifique credenciais EAS / token no banco)`,
      );
    }
  }
}
