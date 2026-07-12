import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { TicketAttachment } from '../database/entities/ticket-attachment.entity';
import { Ticket } from '../database/entities/ticket.entity';
import { TicketHistory } from '../database/entities/ticket-history.entity';
import { UserRole } from '../database/entities/user.entity';
import type { PanelDataScope } from '../common/tenant-scope';
import { assertTicketInDataScope } from '../common/tenant-scope';
import type { JwtPayload } from '../auth/interfaces/auth-user.interface';
import { TicketHistoryActorService } from './ticket-history-actor.service';
import {
  RegisterTicketAttachmentItemDto,
  TicketAttachmentResponseDto,
} from './dto/ticket-attachment.dto';

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
export class TicketAttachmentsService {
  constructor(
    @InjectRepository(TicketAttachment)
    private readonly attachmentRepository: Repository<TicketAttachment>,
    @InjectRepository(Ticket)
    private readonly ticketRepository: Repository<Ticket>,
    @InjectRepository(TicketHistory)
    private readonly ticketHistoryRepository: Repository<TicketHistory>,
    private readonly config: ConfigService,
    private readonly historyActors: TicketHistoryActorService,
  ) {}

  private maxFileBytes(): number {
    return (
      Number.parseInt(
        String(this.config.get('ATTACHMENT_MAX_FILE_BYTES') ?? '10485760'),
        10,
      ) || 10_485_760
    );
  }

  private maxPerBatch(): number {
    return (
      Number.parseInt(
        String(this.config.get('ATTACHMENT_MAX_PER_BATCH') ?? '5'),
        10,
      ) || 5
    );
  }

  private maxPerTicket(): number {
    return (
      Number.parseInt(
        String(this.config.get('ATTACHMENT_MAX_PER_TICKET') ?? '20'),
        10,
      ) || 20
    );
  }

  private maxTotalBytes(): number {
    return (
      Number.parseInt(
        String(this.config.get('ATTACHMENT_MAX_TOTAL_BYTES') ?? '104857600'),
        10,
      ) || 104_857_600
    );
  }

  assertAllowedContentType(contentType: string, fileName: string): void {
    const ct = contentType.trim().toLowerCase();
    const ok =
      ct.startsWith('image/') ||
      ct.startsWith('video/') ||
      ct === 'application/pdf';
    if (!ok) {
      throw new BadRequestException(
        'Tipo de arquivo não permitido (use image/*, video/* ou application/pdf)',
      );
    }
    const ext = fileName.split('.').pop()?.toLowerCase() ?? '';
    if (ext && BLOCKED_EXTENSIONS.has(ext)) {
      throw new BadRequestException(
        `Extensão .${ext} não é permitida por segurança`,
      );
    }
  }

  private toDto(row: TicketAttachment): TicketAttachmentResponseDto {
    return {
      id: row.id,
      ticketId: row.ticketId,
      companyId: row.companyId,
      storageKey: row.storageKey,
      originalFileName: row.originalFileName,
      contentType: row.contentType,
      sizeBytes: Number(row.sizeBytes) || 0,
      uploadedByUserId: row.uploadedByUserId,
      uploadedByCitizenId: row.uploadedByCitizenId,
      status: row.status,
      createdAt: row.createdAt,
      removedAt: row.removedAt,
    };
  }

  private async loadTicketForStaff(
    companyId: string,
    ticketId: string,
    scope?: PanelDataScope | null,
  ): Promise<Ticket> {
    const ticket = await this.ticketRepository.findOne({
      where: { id: ticketId, companyId },
    });
    if (!ticket) {
      throw new NotFoundException('Chamado não encontrado');
    }
    assertTicketInDataScope(ticket, scope);
    return ticket;
  }

  private fileNameFromKey(key: string): string {
    const base = key.split('/').pop() ?? 'arquivo';
    const withoutUuid = base.replace(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}-/i,
      '',
    );
    return withoutUuid || base;
  }

  private guessContentType(fileName: string): string {
    const ext = fileName.split('.').pop()?.toLowerCase() ?? '';
    if (['jpg', 'jpeg'].includes(ext)) return 'image/jpeg';
    if (ext === 'png') return 'image/png';
    if (ext === 'gif') return 'image/gif';
    if (ext === 'webp') return 'image/webp';
    if (ext === 'mp4') return 'video/mp4';
    if (ext === 'webm') return 'video/webm';
    if (ext === 'pdf') return 'application/pdf';
    return 'application/octet-stream';
  }

  /** Importa keys do jsonb legado que ainda não têm linha em ticket_attachments. */
  async syncLegacyKeys(ticket: Ticket): Promise<void> {
    const keys = (ticket.attachments ?? []).filter(Boolean);
    if (keys.length === 0) return;

    const existing = await this.attachmentRepository.find({
      where: { ticketId: ticket.id, storageKey: In(keys) },
    });
    const have = new Set(existing.map((e) => e.storageKey));
    const missing = keys.filter((k) => !have.has(k));
    if (missing.length === 0) return;

    const rows = missing.map((storageKey) => {
      const originalFileName = this.fileNameFromKey(storageKey);
      return this.attachmentRepository.create({
        companyId: ticket.companyId,
        ticketId: ticket.id,
        storageKey,
        originalFileName,
        contentType: this.guessContentType(originalFileName),
        sizeBytes: '0',
        uploadedByUserId: null,
        uploadedByCitizenId: ticket.citizenId,
        status: 'ativo',
        removedAt: null,
        removedByUserId: null,
        removalReason: null,
      });
    });
    await this.attachmentRepository.save(rows);
  }

  /**
   * Garante linhas de metadados para keys enviadas pelo cidadão (create/respond).
   */
  async syncCitizenKeys(
    ticket: Ticket,
    keys: string[],
    citizenId: string,
  ): Promise<void> {
    const unique = [...new Set(keys.filter(Boolean))];
    if (unique.length === 0) return;

    const existing = await this.attachmentRepository.find({
      where: { ticketId: ticket.id, storageKey: In(unique) },
    });
    const have = new Set(existing.map((e) => e.storageKey));
    const missing = unique.filter((k) => !have.has(k));
    if (missing.length === 0) return;

    const rows = missing.map((storageKey) => {
      const originalFileName = this.fileNameFromKey(storageKey);
      return this.attachmentRepository.create({
        companyId: ticket.companyId,
        ticketId: ticket.id,
        storageKey,
        originalFileName,
        contentType: this.guessContentType(originalFileName),
        sizeBytes: '0',
        uploadedByUserId: null,
        uploadedByCitizenId: citizenId,
        status: 'ativo',
        removedAt: null,
        removedByUserId: null,
        removalReason: null,
      });
    });
    await this.attachmentRepository.save(rows);
  }

  async listForStaff(
    companyId: string,
    ticketId: string,
    scope?: PanelDataScope | null,
  ): Promise<TicketAttachmentResponseDto[]> {
    const ticket = await this.loadTicketForStaff(
      companyId,
      ticketId,
      scope,
    );
    await this.syncLegacyKeys(ticket);

    const rows = await this.attachmentRepository.find({
      where: { ticketId, companyId, status: 'ativo' },
      order: { createdAt: 'ASC' },
    });
    return rows.map((r) => this.toDto(r));
  }

  async registerForStaff(
    companyId: string,
    ticketId: string,
    items: RegisterTicketAttachmentItemDto[],
    user: JwtPayload,
    scope?: PanelDataScope | null,
  ): Promise<TicketAttachmentResponseDto[]> {
    if (items.length > this.maxPerBatch()) {
      throw new BadRequestException(
        `Máximo de ${this.maxPerBatch()} anexos por envio`,
      );
    }

    const ticket = await this.loadTicketForStaff(
      companyId,
      ticketId,
      scope,
    );
    await this.syncLegacyKeys(ticket);

    const active = await this.attachmentRepository.find({
      where: { ticketId, companyId, status: 'ativo' },
    });
    if (active.length + items.length > this.maxPerTicket()) {
      throw new BadRequestException(
        `Limite de ${this.maxPerTicket()} anexos por chamado`,
      );
    }

    let totalBytes = active.reduce((s, a) => s + (Number(a.sizeBytes) || 0), 0);
    const maxFile = this.maxFileBytes();
    const maxTotal = this.maxTotalBytes();
    const tenantPrefix = `uploads/${companyId}/`;

    const created: TicketAttachment[] = [];
    for (const item of items) {
      this.assertAllowedContentType(item.contentType, item.originalFileName);
      if (item.sizeBytes > maxFile) {
        throw new BadRequestException(
          `Arquivo "${item.originalFileName}" excede o limite de ${Math.round(maxFile / (1024 * 1024))} MB`,
        );
      }
      totalBytes += item.sizeBytes;
      if (totalBytes > maxTotal) {
        throw new BadRequestException(
          `Volume total de anexos do chamado excede ${Math.round(maxTotal / (1024 * 1024))} MB`,
        );
      }

      const key = item.storageKey.trim().replace(/^\/+/, '');
      if (!key.startsWith(tenantPrefix)) {
        throw new BadRequestException('Key de armazenamento inválida para o tenant');
      }
      if (
        !key.includes(`/tickets/${ticketId}/`) &&
        !key.includes('/panel/') &&
        !key.includes('/cities/')
      ) {
        throw new BadRequestException(
          'Key de armazenamento não corresponde a um upload válido',
        );
      }

      const dup = await this.attachmentRepository.findOne({
        where: { ticketId, storageKey: key },
      });
      if (dup && dup.status === 'ativo') {
        throw new BadRequestException('Anexo já registrado neste chamado');
      }
      if (dup && dup.status === 'removido') {
        dup.status = 'ativo';
        dup.originalFileName = item.originalFileName.trim();
        dup.contentType = item.contentType.trim();
        dup.sizeBytes = String(item.sizeBytes);
        dup.uploadedByUserId = user.sub;
        dup.uploadedByCitizenId = null;
        dup.removedAt = null;
        dup.removedByUserId = null;
        dup.removalReason = null;
        created.push(await this.attachmentRepository.save(dup));
        continue;
      }

      const row = this.attachmentRepository.create({
        companyId,
        ticketId,
        storageKey: key,
        originalFileName: item.originalFileName.trim(),
        contentType: item.contentType.trim(),
        sizeBytes: String(item.sizeBytes),
        uploadedByUserId: user.sub,
        uploadedByCitizenId: null,
        status: 'ativo',
        removedAt: null,
        removedByUserId: null,
        removalReason: null,
      });
      created.push(await this.attachmentRepository.save(row));
    }

    const keys = new Set([...(ticket.attachments ?? []), ...created.map((c) => c.storageKey)]);
    ticket.attachments = [...keys];
    await this.ticketRepository.save(ticket);

    const names = created.map((c) => c.originalFileName).join(', ');
    const actor = await this.historyActors.forUser(user.sub);
    const hist = this.ticketHistoryRepository.create({
      ticketId: ticket.id,
      userId: actor.userId,
      citizenId: actor.citizenId,
      actorType: actor.actorType,
      actorDisplayName: actor.actorDisplayName,
      status: ticket.status,
      comment: `Anexo(s) adicionado(s): ${names}`,
      isInternal: false,
    });
    await this.ticketHistoryRepository.save(hist);

    return created.map((r) => this.toDto(r));
  }

  async removeForStaff(
    companyId: string,
    ticketId: string,
    attachmentId: string,
    user: JwtPayload,
    scope?: PanelDataScope | null,
    reason?: string,
  ): Promise<void> {
    const ticket = await this.loadTicketForStaff(
      companyId,
      ticketId,
      scope,
    );

    const row = await this.attachmentRepository.findOne({
      where: { id: attachmentId, ticketId, companyId },
    });
    if (!row || row.status !== 'ativo') {
      throw new NotFoundException('Anexo não encontrado');
    }

    const isAdmin =
      user.role === UserRole.ADMIN || user.role === UserRole.SUPER_ADMIN;
    const isAuthor = row.uploadedByUserId === user.sub;
    if (!isAdmin && !isAuthor && user.role !== UserRole.SECRETARIA) {
      throw new ForbiddenException('Sem permissão para remover este anexo');
    }
    // SECRETARIA: precisa ter acesso ao ticket (já validado pelo escopo) e ser autor OU admin path above
    if (user.role === UserRole.SECRETARIA && !isAuthor && !isAdmin) {
      // permite remoção por qualquer SECRETARIA com acesso ao ticket (escopo ok)
      // alinhado à operação do atendimento municipal
    }

    row.status = 'removido';
    row.removedAt = new Date();
    row.removedByUserId = user.sub;
    row.removalReason = reason?.trim() || null;
    await this.attachmentRepository.save(row);

    ticket.attachments = (ticket.attachments ?? []).filter(
      (k) => k !== row.storageKey,
    );
    await this.ticketRepository.save(ticket);

    const actor = await this.historyActors.forUser(user.sub);
    const hist = this.ticketHistoryRepository.create({
      ticketId: ticket.id,
      userId: actor.userId,
      citizenId: actor.citizenId,
      actorType: actor.actorType,
      actorDisplayName: actor.actorDisplayName,
      status: ticket.status,
      comment: `Anexo removido: ${row.originalFileName}`,
      isInternal: true,
    });
    await this.ticketHistoryRepository.save(hist);
  }

  async isActiveKeyForCitizenTicket(
    companyId: string,
    citizenId: string,
    storageKey: string,
  ): Promise<boolean> {
    const row = await this.attachmentRepository.findOne({
      where: {
        companyId,
        storageKey,
        status: 'ativo',
      },
      relations: ['ticket'],
    });
    if (!row?.ticket) return false;
    return (
      row.ticket.citizenId === citizenId ||
      (row.ticket.citizenId == null && false)
    );
  }

  async findActiveByKey(
    companyId: string,
    storageKey: string,
  ): Promise<TicketAttachment | null> {
    return this.attachmentRepository.findOne({
      where: { companyId, storageKey, status: 'ativo' },
    });
  }
}
