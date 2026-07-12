import { GetObjectCommand, PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import {
  BadRequestException,
  Injectable,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { randomUUID } from 'crypto';
import { basename } from 'path';
import { Repository } from 'typeorm';
import { Ticket } from '../database/entities/ticket.entity';
import { TicketAttachment } from '../database/entities/ticket-attachment.entity';
import { UserRole } from '../database/entities/user.entity';
import type { UploadAuthContext } from './guards/upload-auth.guard';
import type { PresignUploadDto } from './dto/presign-upload.dto';
import type { PresignUploadResponseDto } from './dto/presign-upload.dto';
import type { PresignGetResponseDto } from './dto/presign-upload.dto';

const BLOCKED_EXTENSIONS = new Set([
  'exe',
  'bat',
  'cmd',
  'com',
  'scr',
  'msi',
  'dll',
  'sh',
  'ps1',
  'vbs',
  'js',
  'jar',
  'apk',
]);

@Injectable()
export class UploadService {
  private client: S3Client | null = null;

  constructor(
    private readonly config: ConfigService,
    @InjectRepository(Ticket)
    private readonly ticketRepository: Repository<Ticket>,
    @InjectRepository(TicketAttachment)
    private readonly attachmentRepository: Repository<TicketAttachment>,
  ) {}

  private maxFileBytes(): number {
    return (
      Number.parseInt(
        String(this.config.get('ATTACHMENT_MAX_FILE_BYTES') ?? '10485760'),
        10,
      ) || 10_485_760
    );
  }

  private assertAllowedFile(filename: string, contentType: string): void {
    const ct = contentType.trim().toLowerCase();
    if (
      !ct.startsWith('image/') &&
      !ct.startsWith('video/') &&
      ct !== 'application/pdf'
    ) {
      throw new BadRequestException(
        'Tipo de arquivo não permitido (use image/*, video/* ou application/pdf)',
      );
    }
    const ext = filename.split('.').pop()?.toLowerCase() ?? '';
    if (ext && BLOCKED_EXTENSIONS.has(ext)) {
      throw new BadRequestException(
        `Extensão .${ext} não é permitida por segurança`,
      );
    }
  }

  private ensureClient(
    accountId: string,
    accessKeyId: string,
    secretAccessKey: string,
  ): S3Client {
    if (!this.client) {
      this.client = new S3Client({
        region: 'auto',
        endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
        credentials: {
          accessKeyId,
          secretAccessKey,
        },
        // AWS SDK >= 3.729 adiciona CRC32 na URL assinada; o browser PUT
        // não envia o header e o upload falha (403). Desliga checksums
        // automáticos para presign compatível com o painel/app.
        requestChecksumCalculation: 'WHEN_REQUIRED',
        responseChecksumValidation: 'WHEN_REQUIRED',
      });
    }
    return this.client;
  }

  async createPresignedPut(
    actor: UploadAuthContext,
    dto: PresignUploadDto,
  ): Promise<PresignUploadResponseDto> {
    const accountId = this.config.get<string>('R2_ACCOUNT_ID');
    const accessKeyId = this.config.get<string>('R2_ACCESS_KEY_ID');
    const secretAccessKey = this.config.get<string>('R2_SECRET_ACCESS_KEY');
    const bucket = this.config.get<string>('R2_BUCKET');

    if (!accountId || !accessKeyId || !secretAccessKey || !bucket) {
      throw new ServiceUnavailableException(
        'Upload não configurado: defina R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY e R2_BUCKET',
      );
    }

    this.assertAllowedFile(dto.filename, dto.contentType);

    const maxFile = this.maxFileBytes();
    if (dto.sizeBytes != null && dto.sizeBytes > maxFile) {
      throw new BadRequestException(
        `Arquivo excede o limite de ${Math.round(maxFile / (1024 * 1024))} MB`,
      );
    }

    const client = this.ensureClient(accountId, accessKeyId, secretAccessKey);

    const safeName =
      basename(dto.filename).replace(/[^a-zA-Z0-9._-]/g, '_') || 'file';
    const unique = randomUUID();

    let staffTenantId: string;
    if (actor.kind === 'staff') {
      if (actor.payload.role === UserRole.SUPER_ADMIN) {
        if (!dto.companyId?.trim()) {
          throw new BadRequestException(
            'Informe companyId no corpo para upload (super administrador)',
          );
        }
        staffTenantId = dto.companyId.trim();
      } else {
        staffTenantId = actor.payload.companyId as string;
      }
    } else {
      staffTenantId = actor.payload.companyId;
    }

    let key: string;
    if (actor.kind === 'staff' && dto.ticketId) {
      const ticket = await this.ticketRepository.findOne({
        where: { id: dto.ticketId, companyId: staffTenantId },
      });
      if (!ticket) {
        throw new BadRequestException('Chamado inválido para upload');
      }
      if (actor.payload.role === UserRole.SECRETARIA) {
        if (
          actor.payload.departmentId &&
          ticket.departmentId !== actor.payload.departmentId
        ) {
          throw new BadRequestException(
            'Sem permissão para anexar neste chamado',
          );
        }
        if (
          actor.payload.subDepartmentId &&
          ticket.subDepartmentId != null &&
          ticket.subDepartmentId !== actor.payload.subDepartmentId
        ) {
          throw new BadRequestException(
            'Sem permissão para anexar neste chamado',
          );
        }
      }
      key = `uploads/${staffTenantId}/tickets/${dto.ticketId}/${unique}-${safeName}`;
    } else if (actor.kind === 'staff') {
      key = `uploads/${staffTenantId}/panel/${unique}-${safeName}`;
    } else {
      key = `uploads/${actor.payload.companyId}/cities/${actor.payload.cityId}/${unique}-${safeName}`;
    }

    const expiresIn =
      Number.parseInt(
        String(this.config.get('R2_PRESIGN_EXPIRES') ?? '300'),
        10,
      ) || 300;
    const command = new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      ContentType: dto.contentType,
    });

    const url = await getSignedUrl(client, command, { expiresIn });

    return {
      url,
      key,
      bucket,
      expiresIn,
      method: 'PUT',
    };
  }

  async createPresignedGet(
    actor: UploadAuthContext,
    key: string,
  ): Promise<PresignGetResponseDto> {
    const accountId = this.config.get<string>('R2_ACCOUNT_ID');
    const accessKeyId = this.config.get<string>('R2_ACCESS_KEY_ID');
    const secretAccessKey = this.config.get<string>('R2_SECRET_ACCESS_KEY');
    const bucket = this.config.get<string>('R2_BUCKET');

    if (!accountId || !accessKeyId || !secretAccessKey || !bucket) {
      throw new ServiceUnavailableException(
        'Upload não configurado: defina R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY e R2_BUCKET',
      );
    }

    if (!key?.trim()) {
      throw new BadRequestException('Informe a key do arquivo');
    }
    const normalized = key.trim().replace(/^\/+/, '');

    // Soft-deleted attachments must not get signed URLs (DV-10)
    const meta = await this.attachmentRepository.findOne({
      where: { storageKey: normalized },
    });
    if (meta && meta.status === 'removido') {
      throw new BadRequestException('Anexo removido');
    }

    if (actor.kind === 'staff' && actor.payload.role === UserRole.SUPER_ADMIN) {
      if (!normalized.startsWith('uploads/')) {
        throw new BadRequestException('Key inválida');
      }
    } else if (actor.kind === 'staff') {
      const basePrefix = `uploads/${actor.payload.companyId}/`;
      if (!normalized.startsWith(basePrefix)) {
        throw new BadRequestException('Arquivo não pertence ao seu tenant');
      }
    }

    if (actor.kind === 'citizen') {
      if (!normalized.startsWith(`uploads/${actor.payload.companyId}/`)) {
        throw new BadRequestException('Arquivo não pertence ao seu tenant');
      }
      const cityPrefix = `uploads/${actor.payload.companyId}/cities/${actor.payload.cityId}/`;
      const ticketPrefix = `uploads/${actor.payload.companyId}/tickets/`;
      const panelPrefix = `uploads/${actor.payload.companyId}/panel/`;

      if (normalized.startsWith(cityPrefix)) {
        // ok — upload do próprio município
      } else if (
        normalized.startsWith(ticketPrefix) ||
        normalized.startsWith(panelPrefix)
      ) {
        const linked = await this.attachmentRepository.findOne({
          where: {
            companyId: actor.payload.companyId,
            storageKey: normalized,
            status: 'ativo',
          },
          relations: ['ticket'],
        });
        const ticket = linked?.ticket;
        const allowed =
          ticket &&
          (ticket.citizenId === actor.payload.sub ||
            (ticket.citizenId == null &&
              ticket.citizenPhone === actor.payload.phone));
        if (!allowed) {
          throw new BadRequestException(
            'Arquivo não pertence aos seus chamados',
          );
        }
      } else {
        throw new BadRequestException('Arquivo não pertence ao seu município');
      }
    }

    const client = this.ensureClient(accountId, accessKeyId, secretAccessKey);

    const expiresIn =
      Number.parseInt(
        String(this.config.get('R2_PRESIGN_EXPIRES') ?? '300'),
        10,
      ) || 300;

    const command = new GetObjectCommand({
      Bucket: bucket,
      Key: normalized,
    });

    const url = await getSignedUrl(client, command, { expiresIn });

    return {
      url,
      key: normalized,
      bucket,
      expiresIn,
      method: 'GET',
    };
  }
}
