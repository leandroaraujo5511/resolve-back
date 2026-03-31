import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Brackets, In, Repository } from 'typeorm';
import type { CitizenJwtPayload } from '../auth/interfaces/citizen-jwt.interface';
import { Citizen } from '../database/entities/citizen.entity';
import { Department } from '../database/entities/department.entity';
import { Neighborhood } from '../database/entities/neighborhood.entity';
import { Ticket } from '../database/entities/ticket.entity';
import { TicketHistory } from '../database/entities/ticket-history.entity';
import { TicketPriority, TicketStatus } from '../database/entities/ticket.enums';
import { AddTicketHistoryDto } from './dto/add-ticket-history.dto';
import { CreateCitizenTicketDto } from './dto/create-citizen-ticket.dto';
import { CitizenTicketRespondDto } from './dto/citizen-ticket-respond.dto';
import { ListTicketsQueryDto } from './dto/list-tickets.query.dto';
import { PatchTicketDto } from './dto/patch-ticket.dto';
import {
  PaginatedTicketsResponseDto,
  TicketHistoryResponseDto,
  TicketResponseDto,
} from './dto/ticket.response.dto';
import { ExpoPushService } from '../push/expo-push.service';

const TICKET_STATUS_PT: Record<TicketStatus, string> = {
  [TicketStatus.ABERTO]: 'Aberto',
  [TicketStatus.EM_ANALISE]: 'Em análise',
  [TicketStatus.EM_ANDAMENTO]: 'Em andamento',
  [TicketStatus.AGUARDANDO_USUARIO]: 'Aguardando você',
  [TicketStatus.RESOLVIDO]: 'Resolvido',
  [TicketStatus.CANCELADO]: 'Cancelado',
};

@Injectable()
export class TicketsService {
  constructor(
    @InjectRepository(Ticket)
    private readonly ticketRepository: Repository<Ticket>,
    @InjectRepository(TicketHistory)
    private readonly ticketHistoryRepository: Repository<TicketHistory>,
    @InjectRepository(Department)
    private readonly departmentRepository: Repository<Department>,
    @InjectRepository(Citizen)
    private readonly citizenRepository: Repository<Citizen>,
    @InjectRepository(Neighborhood)
    private readonly neighborhoodRepository: Repository<Neighborhood>,
    private readonly expoPushService: ExpoPushService,
  ) {}

  private truncate(text: string, max: number): string {
    const t = text.trim();
    if (t.length <= max) return t;
    return `${t.slice(0, max - 1)}…`;
  }

  async findAllPaginated(
    companyId: string,
    query: ListTicketsQueryDto,
  ): Promise<PaginatedTicketsResponseDto> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 10;

    const qb = this.ticketRepository
      .createQueryBuilder('t')
      .where('t.companyId = :companyId', { companyId });

    if (query.status) {
      qb.andWhere('t.status = :status', { status: query.status });
    }
    if (query.departmentId) {
      qb.andWhere('t.departmentId = :departmentId', {
        departmentId: query.departmentId,
      });
    }
    if (query.priority) {
      qb.andWhere('t.priority = :priority', { priority: query.priority });
    }
    if (query.search?.trim()) {
      const term = `%${query.search.trim()}%`;
      qb.andWhere(
        '(LOWER(t.title) LIKE LOWER(:term) OR LOWER(t.protocol) LIKE LOWER(:term) OR LOWER(t.citizenName) LIKE LOWER(:term))',
        { term },
      );
    }

    const total = await qb.clone().getCount();

    const slice = await qb
      .orderBy('t.createdAt', 'DESC')
      .skip((page - 1) * limit)
      .take(limit)
      .getMany();

    const ids = slice.map((t) => t.id);
    if (ids.length === 0) {
      return { data: [], total, page, limit };
    }

    const withHistory = await this.ticketRepository.find({
      where: { id: In(ids) },
      relations: ['history'],
    });

    const byId = new Map(withHistory.map((t) => [t.id, t]));
    const ordered = ids
      .map((id) => byId.get(id))
      .filter((t): t is Ticket => t != null);

    return {
      data: ordered.map((t) => this.toResponseDto(t)),
      total,
      page,
      limit,
    };
  }

  async findOneByCompany(companyId: string, id: string): Promise<TicketResponseDto> {
    const ticket = await this.ticketRepository.findOne({
      where: { id, companyId },
      relations: ['history'],
    });

    if (!ticket) {
      throw new NotFoundException('Chamado não encontrado');
    }

    return this.toResponseDto(ticket);
  }

  async findMineForCitizen(
    citizen: CitizenJwtPayload,
    query: ListTicketsQueryDto,
  ): Promise<PaginatedTicketsResponseDto> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 10;

    const qb = this.ticketRepository
      .createQueryBuilder('t')
      .where('t.companyId = :companyId', { companyId: citizen.companyId })
      .andWhere(
        new Brackets((b) => {
          b.where('t.citizenId = :cid', { cid: citizen.sub }).orWhere(
            '(t.citizenId IS NULL AND t.citizenPhone = :phone)',
            { phone: citizen.phone },
          );
        }),
      );

    if (query.status) {
      qb.andWhere('t.status = :status', { status: query.status });
    }
    if (query.departmentId) {
      qb.andWhere('t.departmentId = :departmentId', {
        departmentId: query.departmentId,
      });
    }
    if (query.priority) {
      qb.andWhere('t.priority = :priority', { priority: query.priority });
    }
    if (query.search?.trim()) {
      const term = `%${query.search.trim()}%`;
      qb.andWhere(
        '(LOWER(t.title) LIKE LOWER(:term) OR LOWER(t.protocol) LIKE LOWER(:term))',
        { term },
      );
    }

    const total = await qb.clone().getCount();

    const slice = await qb
      .orderBy('t.createdAt', 'DESC')
      .skip((page - 1) * limit)
      .take(limit)
      .getMany();

    const ids = slice.map((t) => t.id);
    if (ids.length === 0) {
      return { data: [], total, page, limit };
    }

    const withHistory = await this.ticketRepository.find({
      where: { id: In(ids) },
      relations: ['history'],
    });

    const byId = new Map(withHistory.map((t) => [t.id, t]));
    const ordered = ids
      .map((id) => byId.get(id))
      .filter((t): t is Ticket => t != null);

    return {
      data: ordered.map((t) => this.toCitizenResponseDto(t)),
      total,
      page,
      limit,
    };
  }

  async findOneForCitizen(
    citizen: CitizenJwtPayload,
    id: string,
  ): Promise<TicketResponseDto> {
    const ticket = await this.ticketRepository.findOne({
      where: { id, companyId: citizen.companyId },
      relations: ['history'],
    });

    if (!ticket) {
      throw new NotFoundException('Chamado não encontrado');
    }

    const allowed =
      ticket.citizenId === citizen.sub ||
      (ticket.citizenId == null && ticket.citizenPhone === citizen.phone);

    if (!allowed) {
      throw new NotFoundException('Chamado não encontrado');
    }

    return this.toCitizenResponseDto(ticket);
  }

  /** Resposta do cidadão quando o chamado está em "Aguardando usuário". */
  async citizenRespondWhenWaiting(
    citizen: CitizenJwtPayload,
    ticketId: string,
    dto: CitizenTicketRespondDto,
  ): Promise<TicketResponseDto> {
    const commentText = dto.comment?.trim() ?? '';
    const newKeys = (dto.attachments ?? []).map((k) => k.trim()).filter(Boolean);

    if (!commentText && newKeys.length === 0) {
      throw new BadRequestException(
        'Informe um comentário e/ou ao menos um anexo.',
      );
    }

    const ticket = await this.ticketRepository.findOne({
      where: { id: ticketId, companyId: citizen.companyId },
      relations: ['history'],
    });

    if (!ticket) {
      throw new NotFoundException('Chamado não encontrado');
    }

    const allowed =
      ticket.citizenId === citizen.sub ||
      (ticket.citizenId == null && ticket.citizenPhone === citizen.phone);

    if (!allowed) {
      throw new NotFoundException('Chamado não encontrado');
    }

    if (ticket.status !== TicketStatus.AGUARDANDO_USUARIO) {
      throw new BadRequestException(
        'Só é possível enviar resposta quando o status for Aguardando usuário.',
      );
    }

    const existing = ticket.attachments ?? [];
    const merged = [...existing];
    for (const key of newKeys) {
      if (!merged.includes(key)) {
        merged.push(key);
      }
    }
    ticket.attachments = merged;
    ticket.status = TicketStatus.EM_ANDAMENTO;

    const segments: string[] = [];
    if (commentText) {
      segments.push(commentText);
    }
    if (newKeys.length > 0) {
      segments.push(`${newKeys.length} novo(s) anexo(s) enviado(s).`);
    }

    await this.ticketRepository.save(ticket);

    const hist = this.ticketHistoryRepository.create({
      ticketId: ticket.id,
      userId: null,
      citizenId: citizen.sub,
      status: TicketStatus.EM_ANDAMENTO,
      comment: segments.join('\n\n'),
      isInternal: false,
    });
    await this.ticketHistoryRepository.save(hist);

    return this.findOneForCitizen(citizen, ticketId);
  }

  async createFromCitizen(
    citizen: CitizenJwtPayload,
    dto: CreateCitizenTicketDto,
  ): Promise<TicketResponseDto> {
    const person = await this.citizenRepository.findOne({
      where: { id: citizen.sub, companyId: citizen.companyId },
    });

    if (!person) {
      throw new NotFoundException('Cidadão não encontrado');
    }

    if (person.cityId !== citizen.cityId) {
      throw new BadRequestException('Inconsistência de cidade no token');
    }

    await this.ensureDepartmentForCitizenCity(
      citizen.companyId,
      citizen.cityId,
      dto.departmentId,
    );

    let neighborhood: Neighborhood | null = null;
    if (dto.neighborhoodId) {
      neighborhood = await this.neighborhoodRepository.findOne({
        where: { id: dto.neighborhoodId, cityId: citizen.cityId, status: 'ativo' },
      });
      if (!neighborhood) {
        throw new BadRequestException('Bairro inválido para o seu município');
      }
    }

    let location = dto.location?.trim();
    if (!location) {
      const parts: string[] = [];
      if (neighborhood) {
        parts.push(neighborhood.name);
      }
      if (dto.addressLine?.trim()) {
        parts.push(dto.addressLine.trim());
      }
      location = parts.join(' — ') || 'Localização não informada';
    }

    const protocol = await this.generateNextProtocol(citizen.companyId);

    const ticket = this.ticketRepository.create({
      companyId: citizen.companyId,
      cityId: citizen.cityId,
      citizenId: citizen.sub,
      departmentId: dto.departmentId,
      protocol,
      title: dto.title,
      shortDescription: dto.shortDescription,
      detailedDescription: dto.detailedDescription,
      status: TicketStatus.ABERTO,
      priority: dto.priority ?? TicketPriority.MEDIA,
      citizenName: person.name,
      citizenPhone: person.phone,
      location,
      neighborhoodId: dto.neighborhoodId ?? null,
      addressLine: dto.addressLine?.trim() ?? null,
      addressComplement: dto.addressComplement?.trim() ?? null,
      latitude: dto.latitude ?? null,
      longitude: dto.longitude ?? null,
      attachments: dto.attachments ?? [],
    });

    const saved = await this.ticketRepository.save(ticket);

    const hist = this.ticketHistoryRepository.create({
      ticketId: saved.id,
      userId: null,
      citizenId: citizen.sub,
      status: TicketStatus.ABERTO,
      comment: 'Chamado aberto pelo cidadão via aplicativo.',
      isInternal: false,
    });
    await this.ticketHistoryRepository.save(hist);

    return this.findOneForCitizen(citizen, saved.id);
  }

  async patchTicket(
    companyId: string,
    ticketId: string,
    dto: PatchTicketDto,
    userId: string,
  ): Promise<TicketResponseDto> {
    if (
      dto.status === undefined &&
      dto.departmentId === undefined &&
      dto.priority === undefined
    ) {
      throw new BadRequestException(
        'Informe ao menos status, departmentId ou priority',
      );
    }

    const ticket = await this.ticketRepository.findOne({
      where: { id: ticketId, companyId },
    });

    if (!ticket) {
      throw new NotFoundException('Chamado não encontrado');
    }

    if (dto.departmentId !== undefined) {
      await this.ensureDepartmentInCompany(companyId, dto.departmentId);
    }

    const parts: string[] = [];
    let changed = false;
    let statusChanged = false;
    let deptChanged = false;
    let priorityChanged = false;

    if (dto.status !== undefined && dto.status !== ticket.status) {
      parts.push(`Status alterado de ${ticket.status} para ${dto.status}`);
      ticket.status = dto.status;
      changed = true;
      statusChanged = true;
    }

    if (
      dto.departmentId !== undefined &&
      dto.departmentId !== ticket.departmentId
    ) {
      parts.push('Departamento do chamado atualizado');
      ticket.departmentId = dto.departmentId;
      changed = true;
      deptChanged = true;
    }

    if (dto.priority !== undefined && dto.priority !== ticket.priority) {
      parts.push(
        `Prioridade alterada de ${ticket.priority} para ${dto.priority}`,
      );
      ticket.priority = dto.priority;
      changed = true;
      priorityChanged = true;
    }

    if (!changed) {
      return this.findOneByCompany(companyId, ticketId);
    }

    await this.ticketRepository.save(ticket);

    const hist = this.ticketHistoryRepository.create({
      ticketId: ticket.id,
      userId,
      citizenId: null,
      status: ticket.status,
      comment: parts.join('. '),
      isInternal: false,
    });
    await this.ticketHistoryRepository.save(hist);

    if (ticket.citizenId) {
      let body = '';
      if (statusChanged && ticket.status === TicketStatus.RESOLVIDO) {
        body = 'Seu chamado foi finalizado (resolvido).';
      } else if (statusChanged) {
        body = `Status atualizado para ${TICKET_STATUS_PT[ticket.status]}.`;
      }
      if (deptChanged) {
        body = body
          ? `${body} O departamento do chamado foi atualizado.`
          : 'O departamento do chamado foi atualizado.';
      }
      if (priorityChanged) {
        body = body
          ? `${body} A prioridade do chamado foi atualizada.`
          : 'A prioridade do seu chamado foi atualizada.';
      }
      if (body) {
        void this.expoPushService.notifyCitizen(
          ticket.citizenId,
          `Chamado ${ticket.protocol}`,
          body,
          { ticketId: ticket.id },
        );
      }
    }

    return this.findOneByCompany(companyId, ticketId);
  }

  async addHistory(
    companyId: string,
    ticketId: string,
    dto: AddTicketHistoryDto,
    userId: string,
  ): Promise<TicketResponseDto> {
    const ticket = await this.ticketRepository.findOne({
      where: { id: ticketId, companyId },
    });

    if (!ticket) {
      throw new NotFoundException('Chamado não encontrado');
    }

    const newStatus = dto.status ?? ticket.status;
    const statusChanged =
      dto.status !== undefined && dto.status !== ticket.status;

    if (statusChanged) {
      ticket.status = dto.status!;
    }

    const hist = this.ticketHistoryRepository.create({
      ticketId: ticket.id,
      userId,
      citizenId: null,
      status: newStatus,
      comment: dto.comment,
      isInternal: dto.isInternal ?? false,
    });
    await this.ticketHistoryRepository.save(hist);

    if (statusChanged) {
      await this.ticketRepository.save(ticket);
    }

    const internal = dto.isInternal ?? false;
    if (!internal && ticket.citizenId) {
      const effectiveStatus = ticket.status;
      let body: string;

      if (statusChanged && effectiveStatus === TicketStatus.RESOLVIDO) {
        body = 'Seu chamado foi finalizado (resolvido).';
        if (dto.comment?.trim()) {
          body += ` ${this.truncate(dto.comment, 100)}`;
        }
      } else if (statusChanged) {
        body = `Status atualizado para ${TICKET_STATUS_PT[effectiveStatus]}.`;
        if (dto.comment?.trim()) {
          body += ` ${this.truncate(dto.comment, 100)}`;
        }
      } else if (dto.comment?.trim()) {
        body = `Novo comentário: ${this.truncate(dto.comment, 160)}`;
      } else {
        body = 'Seu chamado recebeu uma nova atualização.';
      }

      void this.expoPushService.notifyCitizen(
        ticket.citizenId,
        `Chamado ${ticket.protocol}`,
        body,
        { ticketId: ticket.id },
      );
    }

    return this.findOneByCompany(companyId, ticketId);
  }

  private async ensureDepartmentInCompany(
    companyId: string,
    departmentId: string,
  ): Promise<void> {
    const dept = await this.departmentRepository.findOne({
      where: { id: departmentId, companyId },
    });
    if (!dept) {
      throw new BadRequestException(
        'Departamento inválido ou não pertence à sua empresa',
      );
    }
  }

  private async ensureDepartmentForCitizenCity(
    companyId: string,
    citizenCityId: string,
    departmentId: string,
  ): Promise<void> {
    const dept = await this.departmentRepository.findOne({
      where: { id: departmentId, companyId, status: 'ativo' },
    });
    if (!dept) {
      throw new BadRequestException(
        'Departamento inválido ou não pertence à sua empresa',
      );
    }
    if (
      dept.visibleOnlyInCityId &&
      dept.visibleOnlyInCityId !== citizenCityId
    ) {
      throw new BadRequestException(
        'Este tipo de chamado não está disponível para o seu município',
      );
    }
  }

  /** Próximo protocolo único por empresa e ano civil (YYYY-000001). */
  async generateNextProtocol(companyId: string): Promise<string> {
    const year = new Date().getFullYear();
    const prefix = `${year}-`;
    const row = await this.ticketRepository
      .createQueryBuilder('t')
      .select('t.protocol', 'protocol')
      .where('t.companyId = :companyId', { companyId })
      .andWhere('t.protocol LIKE :pattern', { pattern: `${prefix}%` })
      .orderBy('t.protocol', 'DESC')
      .limit(1)
      .getRawOne<{ protocol: string }>();

    let next = 1;
    if (row?.protocol) {
      const suffix = row.protocol.slice(prefix.length);
      const n = parseInt(suffix, 10);
      if (!Number.isNaN(n)) {
        next = n + 1;
      }
    }

    return `${prefix}${String(next).padStart(6, '0')}`;
  }

  private sortHistory(ticket: Ticket): TicketHistory[] {
    const list = ticket.history ?? [];
    return [...list].sort(
      (a, b) => a.createdAt.getTime() - b.createdAt.getTime(),
    );
  }

  private toCitizenResponseDto(ticket: Ticket): TicketResponseDto {
    const visibleHistory = this.sortHistory(ticket).filter((h) => !h.isInternal);
    const synthetic = { ...ticket, history: visibleHistory } as Ticket;
    return this.toResponseDto(synthetic);
  }

  private toResponseDto(ticket: Ticket): TicketResponseDto {
    const history = this.sortHistory(ticket).map(
      (h): TicketHistoryResponseDto => ({
        id: h.id,
        status: h.status,
        comment: h.comment,
        createdAt: h.createdAt,
        userId: h.userId ?? undefined,
        citizenId: h.citizenId ?? undefined,
        isInternal: h.isInternal,
      }),
    );

    return {
      id: ticket.id,
      companyId: ticket.companyId,
      cityId: ticket.cityId,
      citizenId: ticket.citizenId,
      neighborhoodId: ticket.neighborhoodId,
      addressLine: ticket.addressLine,
      addressComplement: ticket.addressComplement,
      latitude: ticket.latitude,
      longitude: ticket.longitude,
      protocol: ticket.protocol,
      title: ticket.title,
      shortDescription: ticket.shortDescription,
      detailedDescription: ticket.detailedDescription,
      departmentId: ticket.departmentId,
      status: ticket.status,
      priority: ticket.priority,
      citizenName: ticket.citizenName,
      citizenPhone: ticket.citizenPhone,
      location: ticket.location,
      attachments: ticket.attachments ?? [],
      history,
      createdAt: ticket.createdAt,
      updatedAt: ticket.updatedAt,
    };
  }
}
