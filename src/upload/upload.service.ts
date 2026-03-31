import { GetObjectCommand, PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import {
  BadRequestException,
  Injectable,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { randomUUID } from 'crypto';
import { basename } from 'path';
import { UserRole } from '../database/entities/user.entity';
import type { UploadAuthContext } from './guards/upload-auth.guard';
import type { PresignUploadDto } from './dto/presign-upload.dto';
import type { PresignUploadResponseDto } from './dto/presign-upload.dto';
import type { PresignGetResponseDto } from './dto/presign-upload.dto';

@Injectable()
export class UploadService {
  private client: S3Client | null = null;

  constructor(private readonly config: ConfigService) {}

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

    if (!this.client) {
      this.client = new S3Client({
        region: 'auto',
        endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
        credentials: {
          accessKeyId,
          secretAccessKey,
        },
      });
    }

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

    const key =
      actor.kind === 'staff'
        ? `uploads/${staffTenantId}/panel/${unique}-${safeName}`
        : `uploads/${actor.payload.companyId}/cities/${actor.payload.cityId}/${unique}-${safeName}`;

    if (
      !dto.contentType.startsWith('image/') &&
      !dto.contentType.startsWith('video/') &&
      !dto.contentType.startsWith('application/pdf')
    ) {
      throw new BadRequestException(
        'Tipo de arquivo não permitido (use image/*, video/* ou application/pdf)',
      );
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

    const url = await getSignedUrl(this.client, command, { expiresIn });

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
      const allowedPrefix = `uploads/${actor.payload.companyId}/cities/${actor.payload.cityId}/`;
      if (!normalized.startsWith(allowedPrefix)) {
        throw new BadRequestException('Arquivo não pertence ao seu município');
      }
    }

    if (!this.client) {
      this.client = new S3Client({
        region: 'auto',
        endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
        credentials: {
          accessKeyId,
          secretAccessKey,
        },
      });
    }

    const expiresIn =
      Number.parseInt(
        String(this.config.get('R2_PRESIGN_EXPIRES') ?? '300'),
        10,
      ) || 300;

    const command = new GetObjectCommand({
      Bucket: bucket,
      Key: normalized,
    });

    const url = await getSignedUrl(this.client, command, { expiresIn });

    return {
      url,
      key: normalized,
      bucket,
      expiresIn,
      method: 'GET',
    };
  }
}
