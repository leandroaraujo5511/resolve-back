import {
  HttpException,
  HttpStatus,
  Injectable,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { createHash, randomBytes } from 'crypto';
import { MoreThan, IsNull, Repository } from 'typeorm';
import { PasswordResetToken } from '../database/entities/password-reset-token.entity';
import { PasswordResetRequestLog } from '../database/entities/password-reset-request-log.entity';
import { UsersService } from '../users/users.service';
import { CommunicationGatewayService } from '../communication/communication-gateway.service';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import {
  buildPasswordResetEmailContent,
  resolvePanelBrand,
} from '../common/mail/panel-email-layout';

const NEUTRAL_MESSAGE =
  'Se o e-mail estiver cadastrado, você receberá instruções.';

@Injectable()
export class PanelPasswordResetService {
  private readonly logger = new Logger(PanelPasswordResetService.name);

  constructor(
    @InjectRepository(PasswordResetToken)
    private readonly tokenRepository: Repository<PasswordResetToken>,
    @InjectRepository(PasswordResetRequestLog)
    private readonly requestLogRepository: Repository<PasswordResetRequestLog>,
    private readonly usersService: UsersService,
    private readonly communicationGateway: CommunicationGatewayService,
    private readonly config: ConfigService,
  ) {}

  private hashToken(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }

  private maskEmail(email: string): string {
    const [local, domain] = email.split('@');
    if (!local || !domain) return '***';
    return `${local.slice(0, 2)}***@${domain}`;
  }

  private maxPerEmail(): number {
    return (
      Number.parseInt(
        String(
          this.config.get('PASSWORD_RESET_MAX_PER_EMAIL_PER_HOUR') ?? '5',
        ),
        10,
      ) || 5
    );
  }

  private maxPerIp(): number {
    return (
      Number.parseInt(
        String(this.config.get('PASSWORD_RESET_MAX_PER_IP_PER_HOUR') ?? '20'),
        10,
      ) || 20
    );
  }

  private expiresMinutes(): number {
    return (
      Number.parseInt(
        String(this.config.get('PASSWORD_RESET_EXPIRES_MINUTES') ?? '60'),
        10,
      ) || 60
    );
  }

  private async assertRateLimits(
    email: string,
    requestIp: string | null,
  ): Promise<void> {
    const since = new Date(Date.now() - 60 * 60 * 1000);
    const emailCount = await this.requestLogRepository.count({
      where: { email, createdAt: MoreThan(since) },
    });
    if (emailCount >= this.maxPerEmail()) {
      throw new HttpException(
        'Muitas tentativas. Tente novamente mais tarde.',
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }
    if (requestIp) {
      const ipCount = await this.requestLogRepository.count({
        where: { requestIp, createdAt: MoreThan(since) },
      });
      if (ipCount >= this.maxPerIp()) {
        throw new HttpException(
          'Muitas tentativas. Tente novamente mais tarde.',
          HttpStatus.TOO_MANY_REQUESTS,
        );
      }
    }
  }

  async forgotPassword(
    dto: ForgotPasswordDto,
    requestIp: string | null,
  ): Promise<{ message: string }> {
    const email = dto.email.trim().toLowerCase();
    await this.assertRateLimits(email, requestIp);

    await this.requestLogRepository.save(
      this.requestLogRepository.create({
        email,
        requestIp,
      }),
    );

    this.logger.log(
      `FORGOT_PASSWORD_REQUESTED email=${this.maskEmail(email)} ip=${requestIp ?? 'unknown'}`,
    );

    // Sempre resposta neutra a partir daqui (RN-021 / RN-029)
    try {
      const user = await this.usersService.findByEmail(email);
      if (!user || user.status !== 'ativo') {
        return { message: NEUTRAL_MESSAGE };
      }

      await this.tokenRepository.update(
        { userId: user.id, usedAt: IsNull() },
        { usedAt: new Date() },
      );
      const rawToken = randomBytes(32).toString('hex');
      const expiresAt = new Date(
        Date.now() + this.expiresMinutes() * 60 * 1000,
      );
      await this.tokenRepository.save(
        this.tokenRepository.create({
          userId: user.id,
          tokenHash: this.hashToken(rawToken),
          expiresAt,
          usedAt: null,
          requestIp,
        }),
      );

      const brand = resolvePanelBrand(this.config);
      const resetUrl = `${brand.panelUrl}/redefinir-senha?token=${encodeURIComponent(rawToken)}`;
      const validityLabel = `${this.expiresMinutes()} minutos`;
      const { subject, textBody, htmlBody } = buildPasswordResetEmailContent({
        brand,
        userName: user.name,
        userEmail: user.email,
        resetUrl,
        validityLabel,
      });

      if (!this.communicationGateway.isEnabled()) {
        this.logger.warn(
          `PASSWORD_RESET_EMAIL_FAILED userId=${user.id} reason=gateway_disabled`,
        );
        return { message: NEUTRAL_MESSAGE };
      }

      const { messageId } = await this.communicationGateway.sendEmail({
        to: user.email,
        subject,
        textBody,
        htmlBody,
      });
      this.logger.log(
        `PASSWORD_RESET_EMAIL_SENT userId=${user.id} gatewayMessageId=${messageId} email=${this.maskEmail(user.email)}`,
      );
    } catch (e) {
      this.logger.warn(
        `PASSWORD_RESET_EMAIL_FAILED email=${this.maskEmail(email)} error=${String(e)}`,
      );
    }

    return { message: NEUTRAL_MESSAGE };
  }

  async resetPassword(
    dto: ResetPasswordDto,
  ): Promise<{ message: string }> {
    const tokenHash = this.hashToken(dto.token.trim());
    const record = await this.tokenRepository.findOne({
      where: { tokenHash },
    });

    if (
      !record ||
      record.usedAt ||
      new Date(record.expiresAt).getTime() <= Date.now()
    ) {
      throw new HttpException(
        'Link de redefinição inválido ou expirado',
        HttpStatus.BAD_REQUEST,
      );
    }

    await this.usersService.applyPasswordReset(record.userId, dto.newPassword);

    record.usedAt = new Date();
    await this.tokenRepository.save(record);

    await this.tokenRepository.update(
      { userId: record.userId, usedAt: IsNull() },
      { usedAt: new Date() },
    );
    this.logger.log(`PASSWORD_RESET_COMPLETED userId=${record.userId}`);

    return { message: 'Senha redefinida com sucesso. Faça login com a nova senha.' };
  }
}
