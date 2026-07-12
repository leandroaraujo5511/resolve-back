import {
  BadGatewayException,
  HttpException,
  HttpStatus,
  Injectable,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

/** Integração com o Gateway de Comunicação (WhatsApp / e-mail). OpenAPI: /openapi.json */

@Injectable()
export class CommunicationGatewayService {
  private readonly logger = new Logger(CommunicationGatewayService.name);

  constructor(private readonly config: ConfigService) {}

  isEnabled(): boolean {
    const base = this.config
      .get<string>('COMMUNICATION_GATEWAY_BASE_URL', '')
      ?.trim();
    const key = this.config
      .get<string>('COMMUNICATION_GATEWAY_API_KEY', '')
      ?.trim();
    return Boolean(base && key);
  }

  private baseUrl(): string {
    const u = this.config
      .get<string>('COMMUNICATION_GATEWAY_BASE_URL', '')
      .trim()
      .replace(/\/+$/, '');
    if (!u) {
      throw new Error('COMMUNICATION_GATEWAY_BASE_URL não configurada');
    }
    return u;
  }

  private headers(): Record<string, string> {
    const key = this.config
      .get<string>('COMMUNICATION_GATEWAY_API_KEY', '')
      .trim();
    return {
      'Content-Type': 'application/json',
      'X-API-Key': key,
    };
  }

  /**
   * Número no formato internacional (ex.: 5511987654321).
   * Prefixo configurável (padrão 55) se o cadastro tiver só DDD+número.
   */
  formatWhatsAppDestination(phoneDigits: string): string {
    const digits = phoneDigits.replace(/\D/g, '');
    const cc = (
      this.config.get<string>('COMMUNICATION_GATEWAY_WHATSAPP_CC', '55') || '55'
    ).replace(/\D/g, '');
    if (digits.startsWith(cc)) return digits;
    return `${cc}${digits}`;
  }

  /**
   * Variáveis extras para o template de OTP (o gateway injeta o código em {{code}} e {{otp}}).
   * JSON em COMMUNICATION_GATEWAY_OTP_TEMPLATE_VARIABLES_JSON; inválido ou vazio → {}.
   */
  private parseOtpTemplateVariablesJson(): Record<string, string> {
    const raw = this.config
      .get<string>('COMMUNICATION_GATEWAY_OTP_TEMPLATE_VARIABLES_JSON', '')
      ?.trim();
    if (!raw) {
      return {};
    }
    try {
      const parsed = JSON.parse(raw) as unknown;
      if (parsed == null || typeof parsed !== 'object' || Array.isArray(parsed)) {
        return {};
      }
      const out: Record<string, string> = {};
      for (const [k, v] of Object.entries(parsed)) {
        out[k] = v == null ? '' : String(v);
      }
      return out;
    } catch {
      this.logger.warn(
        'COMMUNICATION_GATEWAY_OTP_TEMPLATE_VARIABLES_JSON inválido; usando variables vazio',
      );
      return {};
    }
  }

  /**
   * Enfileira OTP de 6 dígitos por WhatsApp (validade no gateway).
   * Com COMMUNICATION_GATEWAY_OTP_WHATSAPP_TEMPLATE, envia template_name + variables
   * ({{code}} e {{otp}} são preenchidos pelo worker — ver OpenAPI /messages/send-otp).
   */
  async sendOtpWhatsApp(destination: string): Promise<void> {
    const url = `${this.baseUrl()}/messages/send-otp`;
    const templateName = this.config
      .get<string>('COMMUNICATION_GATEWAY_OTP_WHATSAPP_TEMPLATE', '')
      ?.trim();

    const payload: Record<string, unknown> = {
      destination,
      channel: 'whatsapp',
    };

    if (templateName) {
      payload.template_name = templateName;
      payload.variables = this.parseOtpTemplateVariablesJson();
    }

    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: this.headers(),
        body: JSON.stringify(payload),
      });

      if (res.status === 429) {
        throw new HttpException(
          'Limite de envios atingido. Tente novamente em instantes.',
          HttpStatus.TOO_MANY_REQUESTS,
        );
      }

      if (!res.ok) {
        const text = await res.text().catch(() => '');
        this.logger.warn(`Gateway send-otp HTTP ${res.status}: ${text}`);
        throw new BadGatewayException(
          'Falha ao solicitar envio do código. Tente novamente.',
        );
      }
    } catch (e) {
      if (e instanceof HttpException || e instanceof BadGatewayException) {
        throw e;
      }
      this.logger.error(`Gateway send-otp rede: ${String(e)}`);
      throw new ServiceUnavailableException(
        'Serviço de WhatsApp indisponível. Tente novamente mais tarde.',
      );
    }
  }

  /**
   * Enfileira e-mail via gateway (`POST /messages/send-email`).
   * Resposta 202 = aceito na fila (não garante entrega SMTP).
   */
  async sendEmail(input: {
    to: string;
    subject: string;
    textBody: string;
    htmlBody?: string;
  }): Promise<{ messageId: string }> {
    if (!this.isEnabled()) {
      throw new ServiceUnavailableException(
        'Gateway de comunicação não configurado',
      );
    }

    const url = `${this.baseUrl()}/messages/send-email`;
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: this.headers(),
        body: JSON.stringify({
          to: input.to.trim(),
          subject: input.subject,
          text_body: input.textBody,
          html_body: input.htmlBody ?? undefined,
        }),
      });

      if (res.status === 429) {
        throw new HttpException(
          'Limite de envios atingido. Tente novamente em instantes.',
          HttpStatus.TOO_MANY_REQUESTS,
        );
      }

      if (!res.ok) {
        const text = await res.text().catch(() => '');
        this.logger.warn(`Gateway send-email HTTP ${res.status}: ${text}`);
        throw new BadGatewayException(
          'Falha ao enfileirar e-mail. Tente novamente.',
        );
      }

      const data = (await res.json()) as { id?: string };
      if (!data.id) {
        throw new BadGatewayException(
          'Gateway não retornou id da mensagem de e-mail',
        );
      }
      return { messageId: data.id };
    } catch (e) {
      if (e instanceof HttpException || e instanceof BadGatewayException) {
        throw e;
      }
      this.logger.error(`Gateway send-email rede: ${String(e)}`);
      throw new ServiceUnavailableException(
        'Serviço de e-mail indisponível. Tente novamente mais tarde.',
      );
    }
  }

  /** Valida código junto ao gateway (deve ser o mesmo `destination` usado no send-otp). */
  async verifyOtp(
    destination: string,
    code: string,
  ): Promise<{ valid: boolean; reason?: string }> {
    const url = `${this.baseUrl()}/messages/verify-otp`;
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: this.headers(),
        body: JSON.stringify({
          destination,
          code: code.replace(/\D/g, '').slice(0, 6),
        }),
      });

      if (!res.ok) {
        const text = await res.text().catch(() => '');
        this.logger.warn(`Gateway verify-otp HTTP ${res.status}: ${text}`);
        throw new BadGatewayException(
          'Falha ao validar código. Tente novamente.',
        );
      }

      return (await res.json()) as { valid: boolean; reason?: string };
    } catch (e) {
      if (e instanceof BadGatewayException) {
        throw e;
      }
      this.logger.error(`Gateway verify-otp rede: ${String(e)}`);
      throw new ServiceUnavailableException(
        'Serviço de validação indisponível. Tente novamente.',
      );
    }
  }
}
