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

  async sendToExpoToken(
    expoPushToken: string,
    title: string,
    body: string,
    data?: Record<string, string>,
  ): Promise<void> {
    if (!this.isLikelyExpoToken(expoPushToken)) {
      return;
    }

    const message: ExpoPushMessage = {
      to: expoPushToken.trim(),
      title,
      body,
      sound: 'default',
      data: data ?? {},
    };

    try {
      const res = await fetch('https://exp.host/--/api/v2/push/send', {
        method: 'POST',
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(message),
      });

      const json = (await res.json().catch(() => null)) as {
        data?: { status?: string; message?: string; details?: { error?: string } };
      } | null;

      if (!res.ok) {
        this.logger.warn(
          `Expo push HTTP ${res.status}: ${JSON.stringify(json ?? 'no body')}`,
        );
        return;
      }

      const err = json?.data?.details?.error ?? json?.data?.message;
      if (err && err !== 'ok') {
        this.logger.warn(`Expo push resposta: ${JSON.stringify(json)}`);
      }
    } catch (e) {
      this.logger.warn(`Falha ao enviar push Expo: ${(e as Error).message}`);
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
    if (!token) return;

    await this.sendToExpoToken(token, title, body, data);
  }
}
