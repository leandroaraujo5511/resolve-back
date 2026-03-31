import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, SelectQueryBuilder } from 'typeorm';
import { Citizen } from '../database/entities/citizen.entity';
import { Department } from '../database/entities/department.entity';
import { Feedback } from '../database/entities/feedback.entity';
import { Ticket } from '../database/entities/ticket.entity';
import { TicketStatus } from '../database/entities/ticket.enums';
import { User } from '../database/entities/user.entity';
import { ReportsQueryDto } from './dto/reports-query.dto';

const EXPORT_ROW_CAP = 15_000;

interface DateRange {
  from?: Date;
  to?: Date;
}

@Injectable()
export class ReportsService {
  constructor(
    @InjectRepository(Ticket)
    private readonly ticketRepo: Repository<Ticket>,
    @InjectRepository(Feedback)
    private readonly feedbackRepo: Repository<Feedback>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    @InjectRepository(Citizen)
    private readonly citizenRepo: Repository<Citizen>,
    @InjectRepository(Department)
    private readonly departmentRepo: Repository<Department>,
  ) {}

  private parseRange(query: ReportsQueryDto): DateRange {
    let from: Date | undefined;
    let to: Date | undefined;
    if (query.dateFrom?.trim()) {
      const d = new Date(query.dateFrom.trim());
      if (!Number.isNaN(d.getTime())) {
        d.setUTCHours(0, 0, 0, 0);
        from = d;
      }
    }
    if (query.dateTo?.trim()) {
      const d = new Date(query.dateTo.trim());
      if (!Number.isNaN(d.getTime())) {
        d.setUTCHours(23, 59, 59, 999);
        to = d;
      }
    }
    return { from, to };
  }

  /**
   * Série temporal: intervalo explícito do filtro ou últimos 90 dias (UTC).
   */
  private seriesWindow(range: DateRange): { from: Date; to: Date } {
    const now = new Date();
    if (range.from && range.to) return { from: range.from, to: range.to };
    if (range.from && !range.to) {
      const to = new Date(now);
      to.setUTCHours(23, 59, 59, 999);
      return { from: range.from, to };
    }
    if (!range.from && range.to) {
      const from = new Date(range.to);
      from.setUTCDate(from.getUTCDate() - 89);
      from.setUTCHours(0, 0, 0, 0);
      return { from, to: range.to };
    }
    const to = new Date(now);
    to.setUTCHours(23, 59, 59, 999);
    const from = new Date(to);
    from.setUTCDate(from.getUTCDate() - 89);
    from.setUTCHours(0, 0, 0, 0);
    return { from, to };
  }

  private applyTicketCreatedFilter(
    qb: SelectQueryBuilder<Ticket>,
    companyId: string,
    cityId: string | undefined,
    range: DateRange,
  ): void {
    qb.where('t.companyId = :companyId', { companyId });
    if (cityId) qb.andWhere('t.cityId = :cityId', { cityId });
    if (range.from)
      qb.andWhere('t.createdAt >= :dFrom', { dFrom: range.from });
    if (range.to) qb.andWhere('t.createdAt <= :dTo', { dTo: range.to });
  }

  private applyTicketScope(
    qb: SelectQueryBuilder<Ticket>,
    companyId: string,
    cityId: string | undefined,
    range: DateRange,
    dateColumn: 'createdAt' | 'updatedAt',
  ): void {
    qb.where('t.companyId = :companyId', { companyId });
    if (cityId) qb.andWhere('t.cityId = :cityId', { cityId });
    if (range.from)
      qb.andWhere(`t.${dateColumn} >= :dFrom`, { dFrom: range.from });
    if (range.to) qb.andWhere(`t.${dateColumn} <= :dTo`, { dTo: range.to });
  }

  private applyFeedbackScope(
    qb: SelectQueryBuilder<Feedback>,
    companyId: string,
    cityId: string | undefined,
    range: DateRange,
  ): void {
    qb.where('f.companyId = :companyId', { companyId });
    if (cityId) qb.andWhere('f.cityId = :cityId', { cityId });
    if (range.from)
      qb.andWhere('f.createdAt >= :dFrom', { dFrom: range.from });
    if (range.to) qb.andWhere('f.createdAt <= :dTo', { dTo: range.to });
  }

  async getDashboard(companyId: string, query: ReportsQueryDto) {
    const range = this.parseRange(query);
    const cityId = query.cityId?.trim() || undefined;
    const series = this.seriesWindow(range);

    const ticketsTotal = await this.ticketCount(
      companyId,
      cityId,
      range,
      'createdAt',
    );

    const openQb = this.ticketRepo.createQueryBuilder('t');
    this.applyTicketCreatedFilter(openQb, companyId, cityId, range);
    openQb.andWhere('t.status NOT IN (:...closed)', {
      closed: [TicketStatus.RESOLVIDO, TicketStatus.CANCELADO],
    });
    const ticketsOpen = await openQb.getCount();

    const resolvedQb = this.ticketRepo.createQueryBuilder('t');
    this.applyTicketCreatedFilter(resolvedQb, companyId, cityId, range);
    resolvedQb.andWhere('t.status = :st', { st: TicketStatus.RESOLVIDO });
    const ticketsResolved = await resolvedQb.getCount();

    const cancelledQb = this.ticketRepo.createQueryBuilder('t');
    this.applyTicketCreatedFilter(cancelledQb, companyId, cityId, range);
    cancelledQb.andWhere('t.status = :st', { st: TicketStatus.CANCELADO });
    const ticketsCancelled = await cancelledQb.getCount();

    const resolvedInPeriodQb = this.ticketRepo.createQueryBuilder('t');
    resolvedInPeriodQb
      .where('t.companyId = :companyId', { companyId })
      .andWhere('t.status = :st', { st: TicketStatus.RESOLVIDO });
    if (cityId)
      resolvedInPeriodQb.andWhere('t.cityId = :cityId', { cityId });
    if (range.from)
      resolvedInPeriodQb.andWhere('t.updatedAt >= :dFrom', {
        dFrom: range.from,
      });
    if (range.to)
      resolvedInPeriodQb.andWhere('t.updatedAt <= :dTo', { dTo: range.to });
    const ticketsResolvedInPeriod = await resolvedInPeriodQb.getCount();

    const fbQb = this.feedbackRepo.createQueryBuilder('f');
    this.applyFeedbackScope(fbQb, companyId, cityId, range);
    const feedbacksTotal = await fbQb.getCount();

    const citizenQb = this.citizenRepo.createQueryBuilder('c');
    citizenQb.where('c.companyId = :companyId', { companyId });
    if (cityId) citizenQb.andWhere('c.cityId = :cityId', { cityId });
    if (range.from)
      citizenQb.andWhere('c.createdAt >= :dFrom', { dFrom: range.from });
    if (range.to) citizenQb.andWhere('c.createdAt <= :dTo', { dTo: range.to });
    const citizensTotal = await citizenQb.getCount();

    const staffTotal = await this.userRepo.count({
      where: { companyId },
    });

    const departmentsActive = await this.departmentRepo.count({
      where: { companyId, status: 'ativo' },
    });

    const avgQb = this.ticketRepo
      .createQueryBuilder('t')
      .select(
        'AVG(EXTRACT(EPOCH FROM (t."updatedAt" - t."createdAt")) / 86400)',
        'avgDays',
      )
      .where('t.companyId = :companyId', { companyId })
      .andWhere('t.status = :st', { st: TicketStatus.RESOLVIDO });
    if (cityId) avgQb.andWhere('t.cityId = :cityId', { cityId });
    if (range.from)
      avgQb.andWhere('t.updatedAt >= :dFrom', { dFrom: range.from });
    if (range.to) avgQb.andWhere('t.updatedAt <= :dTo', { dTo: range.to });
    const avgRow = await avgQb.getRawOne<{ avgDays: string | null }>();

    const avgResolutionDays =
      avgRow?.avgDays != null ? Number(avgRow.avgDays) : null;

    const [
      ticketsByStatus,
      ticketsByPriority,
      ticketsByDepartment,
      ticketsByCity,
      ticketsByNeighborhood,
      ticketsCreatedDaily,
      ticketsResolvedDaily,
      feedbacksByType,
      feedbacksDaily,
      citizensByCity,
      usersByRole,
      usersByDepartment,
    ] = await Promise.all([
      this.ticketsGroupByStatus(companyId, cityId, range),
      this.ticketsGroupByPriority(companyId, cityId, range),
      this.ticketsGroupByDepartment(companyId, cityId, range),
      this.ticketsGroupByCity(companyId, cityId, range),
      this.ticketsGroupByNeighborhood(companyId, cityId, range),
      this.ticketsDailySeries(
        companyId,
        cityId,
        series,
        'createdAt',
      ),
      this.ticketsResolvedDailySeries(companyId, cityId, series),
      this.feedbacksGroupByType(companyId, cityId, range),
      this.feedbacksDailySeries(companyId, cityId, series),
      this.citizensGroupByCity(companyId, cityId, range),
      this.usersGroupByRole(companyId),
      this.usersGroupByDepartment(companyId),
    ]);

    return {
      filters: {
        companyId,
        cityId: cityId ?? null,
        dateFrom: query.dateFrom?.trim() || null,
        dateTo: query.dateTo?.trim() || null,
      },
      seriesWindow: {
        dateFrom: series.from.toISOString().slice(0, 10),
        dateTo: series.to.toISOString().slice(0, 10),
      },
      overview: {
        ticketsTotal,
        ticketsOpen,
        ticketsResolved,
        ticketsCancelled,
        ticketsResolvedInPeriod,
        feedbacksTotal,
        citizensTotal,
        staffUsersTotal: staffTotal,
        departmentsActive,
        avgResolutionDays:
          avgResolutionDays != null && !Number.isNaN(avgResolutionDays)
            ? Math.round(avgResolutionDays * 100) / 100
            : null,
      },
      ticketsByStatus,
      ticketsByPriority,
      ticketsByDepartment,
      ticketsByCity,
      ticketsByNeighborhood,
      ticketsCreatedDaily,
      ticketsResolvedDaily,
      feedbacksByType,
      feedbacksDaily,
      citizensByCity,
      usersByRole,
      usersByDepartment,
    };
  }

  private async ticketCount(
    companyId: string,
    cityId: string | undefined,
    range: DateRange,
    col: 'createdAt' | 'updatedAt',
  ): Promise<number> {
    const qb = this.ticketRepo.createQueryBuilder('t');
    this.applyTicketScope(qb, companyId, cityId, range, col);
    return qb.getCount();
  }

  private async ticketsGroupByStatus(
    companyId: string,
    cityId: string | undefined,
    range: DateRange,
  ) {
    const qb = this.ticketRepo
      .createQueryBuilder('t')
      .select('t.status', 'status')
      .addSelect('COUNT(*)', 'count')
      .where('t.companyId = :companyId', { companyId });
    if (cityId) qb.andWhere('t.cityId = :cityId', { cityId });
    if (range.from)
      qb.andWhere('t.createdAt >= :dFrom', { dFrom: range.from });
    if (range.to) qb.andWhere('t.createdAt <= :dTo', { dTo: range.to });
    qb.groupBy('t.status').orderBy('count', 'DESC');
    const rows = await qb.getRawMany<{ status: string; count: string }>();
    return rows.map((r) => ({
      status: r.status,
      count: Number(r.count),
    }));
  }

  private async ticketsGroupByPriority(
    companyId: string,
    cityId: string | undefined,
    range: DateRange,
  ) {
    const qb = this.ticketRepo
      .createQueryBuilder('t')
      .select('t.priority', 'priority')
      .addSelect('COUNT(*)', 'count')
      .where('t.companyId = :companyId', { companyId });
    if (cityId) qb.andWhere('t.cityId = :cityId', { cityId });
    if (range.from)
      qb.andWhere('t.createdAt >= :dFrom', { dFrom: range.from });
    if (range.to) qb.andWhere('t.createdAt <= :dTo', { dTo: range.to });
    qb.groupBy('t.priority').orderBy('count', 'DESC');
    const rows = await qb.getRawMany<{ priority: string; count: string }>();
    return rows.map((r) => ({
      priority: r.priority,
      count: Number(r.count),
    }));
  }

  private async ticketsGroupByDepartment(
    companyId: string,
    cityId: string | undefined,
    range: DateRange,
  ) {
    const qb = this.ticketRepo
      .createQueryBuilder('t')
      .innerJoin('t.department', 'd')
      .select('t.departmentId', 'departmentId')
      .addSelect('d.name', 'departmentName')
      .addSelect('COUNT(*)', 'count')
      .where('t.companyId = :companyId', { companyId });
    if (cityId) qb.andWhere('t.cityId = :cityId', { cityId });
    if (range.from)
      qb.andWhere('t.createdAt >= :dFrom', { dFrom: range.from });
    if (range.to) qb.andWhere('t.createdAt <= :dTo', { dTo: range.to });
    qb.groupBy('t.departmentId')
      .addGroupBy('d.name')
      .orderBy('count', 'DESC');
    const rows = await qb.getRawMany<{
      departmentId: string;
      departmentName: string;
      count: string;
    }>();
    return rows.map((r) => ({
      departmentId: r.departmentId,
      departmentName: r.departmentName,
      count: Number(r.count),
    }));
  }

  private async ticketsGroupByCity(
    companyId: string,
    cityId: string | undefined,
    range: DateRange,
  ) {
    const qb = this.ticketRepo
      .createQueryBuilder('t')
      .leftJoin('t.city', 'c')
      .select('t.cityId', 'cityId')
      .addSelect('c.name', 'cityName')
      .addSelect('COUNT(*)', 'count')
      .where('t.companyId = :companyId', { companyId });
    if (cityId) qb.andWhere('t.cityId = :cityId', { cityId });
    if (range.from)
      qb.andWhere('t.createdAt >= :dFrom', { dFrom: range.from });
    if (range.to) qb.andWhere('t.createdAt <= :dTo', { dTo: range.to });
    qb.groupBy('t.cityId').addGroupBy('c.name').orderBy('count', 'DESC');
    const rows = await qb.getRawMany<{
      cityId: string | null;
      cityName: string | null;
      count: string;
    }>();
    return rows.map((r) => ({
      cityId: r.cityId,
      cityName: r.cityName ?? '—',
      count: Number(r.count),
    }));
  }

  private async ticketsGroupByNeighborhood(
    companyId: string,
    cityId: string | undefined,
    range: DateRange,
  ) {
    const qb = this.ticketRepo
      .createQueryBuilder('t')
      .leftJoin('t.neighborhood', 'n')
      .select('t.neighborhoodId', 'neighborhoodId')
      .addSelect('n.name', 'neighborhoodName')
      .addSelect('COUNT(*)', 'count')
      .where('t.companyId = :companyId', { companyId });
    if (cityId) qb.andWhere('t.cityId = :cityId', { cityId });
    if (range.from)
      qb.andWhere('t.createdAt >= :dFrom', { dFrom: range.from });
    if (range.to) qb.andWhere('t.createdAt <= :dTo', { dTo: range.to });
    qb.groupBy('t.neighborhoodId')
      .addGroupBy('n.name')
      .orderBy('count', 'DESC');
    const rows = await qb.getRawMany<{
      neighborhoodId: string | null;
      neighborhoodName: string | null;
      count: string;
    }>();
    return rows.map((r) => ({
      neighborhoodId: r.neighborhoodId,
      neighborhoodName: r.neighborhoodName ?? 'Sem bairro',
      count: Number(r.count),
    }));
  }

  private async ticketsDailySeries(
    companyId: string,
    cityId: string | undefined,
    window: { from: Date; to: Date },
    column: 'createdAt' | 'updatedAt',
  ) {
    const qb = this.ticketRepo
      .createQueryBuilder('t')
      .select(`to_char(t."${column}", 'YYYY-MM-DD')`, 'date')
      .addSelect('COUNT(*)', 'count')
      .where('t.companyId = :companyId', { companyId })
      .andWhere(`t.${column} >= :wFrom`, { wFrom: window.from })
      .andWhere(`t.${column} <= :wTo`, { wTo: window.to });
    if (cityId) qb.andWhere('t.cityId = :cityId', { cityId });
    qb
      .groupBy(`to_char(t."${column}", 'YYYY-MM-DD')`)
      .orderBy('date', 'ASC');
    const rows = await qb.getRawMany<{ date: string; count: string }>();
    return rows.map((r) => ({ date: r.date, count: Number(r.count) }));
  }

  private async ticketsResolvedDailySeries(
    companyId: string,
    cityId: string | undefined,
    window: { from: Date; to: Date },
  ) {
    const qb = this.ticketRepo
      .createQueryBuilder('t')
      .select(`to_char(t."updatedAt", 'YYYY-MM-DD')`, 'date')
      .addSelect('COUNT(*)', 'count')
      .where('t.companyId = :companyId', { companyId })
      .andWhere('t.status = :st', { st: TicketStatus.RESOLVIDO })
      .andWhere('t.updatedAt >= :wFrom', { wFrom: window.from })
      .andWhere('t.updatedAt <= :wTo', { wTo: window.to });
    if (cityId) qb.andWhere('t.cityId = :cityId', { cityId });
    qb
      .groupBy(`to_char(t."updatedAt", 'YYYY-MM-DD')`)
      .orderBy('date', 'ASC');
    const rows = await qb.getRawMany<{ date: string; count: string }>();
    return rows.map((r) => ({ date: r.date, count: Number(r.count) }));
  }

  private async feedbacksGroupByType(
    companyId: string,
    cityId: string | undefined,
    range: DateRange,
  ) {
    const qb = this.feedbackRepo
      .createQueryBuilder('f')
      .select('f.type', 'type')
      .addSelect('COUNT(*)', 'count')
      .where('f.companyId = :companyId', { companyId });
    if (cityId) qb.andWhere('f.cityId = :cityId', { cityId });
    if (range.from)
      qb.andWhere('f.createdAt >= :dFrom', { dFrom: range.from });
    if (range.to) qb.andWhere('f.createdAt <= :dTo', { dTo: range.to });
    qb.groupBy('f.type').orderBy('count', 'DESC');
    const rows = await qb.getRawMany<{ type: string; count: string }>();
    return rows.map((r) => ({ type: r.type, count: Number(r.count) }));
  }

  private async feedbacksDailySeries(
    companyId: string,
    cityId: string | undefined,
    window: { from: Date; to: Date },
  ) {
    const qb = this.feedbackRepo
      .createQueryBuilder('f')
      .select(`to_char(f."createdAt", 'YYYY-MM-DD')`, 'date')
      .addSelect('COUNT(*)', 'count')
      .where('f.companyId = :companyId', { companyId })
      .andWhere('f.createdAt >= :wFrom', { wFrom: window.from })
      .andWhere('f.createdAt <= :wTo', { wTo: window.to });
    if (cityId) qb.andWhere('f.cityId = :cityId', { cityId });
    qb
      .groupBy(`to_char(f."createdAt", 'YYYY-MM-DD')`)
      .orderBy('date', 'ASC');
    const rows = await qb.getRawMany<{ date: string; count: string }>();
    return rows.map((r) => ({ date: r.date, count: Number(r.count) }));
  }

  private async citizensGroupByCity(
    companyId: string,
    cityId: string | undefined,
    range: DateRange,
  ) {
    const qb = this.citizenRepo
      .createQueryBuilder('c')
      .innerJoin('c.city', 'city')
      .select('c.cityId', 'cityId')
      .addSelect('city.name', 'cityName')
      .addSelect('COUNT(*)', 'count')
      .where('c.companyId = :companyId', { companyId });
    if (cityId) qb.andWhere('c.cityId = :cityId', { cityId });
    if (range.from)
      qb.andWhere('c.createdAt >= :dFrom', { dFrom: range.from });
    if (range.to) qb.andWhere('c.createdAt <= :dTo', { dTo: range.to });
    qb.groupBy('c.cityId')
      .addGroupBy('city.name')
      .orderBy('count', 'DESC');
    const rows = await qb.getRawMany<{
      cityId: string;
      cityName: string;
      count: string;
    }>();
    return rows.map((r) => ({
      cityId: r.cityId,
      cityName: r.cityName,
      count: Number(r.count),
    }));
  }

  private async usersGroupByRole(companyId: string) {
    const rows = await this.userRepo
      .createQueryBuilder('u')
      .select('u.role', 'role')
      .addSelect('COUNT(*)', 'count')
      .where('u.companyId = :companyId', { companyId })
      .groupBy('u.role')
      .orderBy('count', 'DESC')
      .getRawMany<{ role: string; count: string }>();
    return rows.map((r) => ({
      role: r.role,
      count: Number(r.count),
    }));
  }

  private async usersGroupByDepartment(companyId: string) {
    const rows = await this.userRepo
      .createQueryBuilder('u')
      .leftJoin('u.department', 'd')
      .select('u.departmentId', 'departmentId')
      .addSelect('d.name', 'departmentName')
      .addSelect('COUNT(*)', 'count')
      .where('u.companyId = :companyId', { companyId })
      .groupBy('u.departmentId')
      .addGroupBy('d.name')
      .orderBy('count', 'DESC')
      .getRawMany<{
        departmentId: string | null;
        departmentName: string | null;
        count: string;
      }>();
    return rows.map((r) => ({
      departmentId: r.departmentId,
      departmentName: r.departmentName ?? 'Sem departamento',
      count: Number(r.count),
    }));
  }

  async exportTicketsFlat(companyId: string, query: ReportsQueryDto) {
    const range = this.parseRange(query);
    const cityId = query.cityId?.trim() || undefined;
    const qb = this.ticketRepo
      .createQueryBuilder('t')
      .leftJoin('t.department', 'd')
      .leftJoin('t.city', 'c')
      .leftJoin('t.neighborhood', 'n')
      .select('t.id', 'id')
      .addSelect('t.protocol', 'protocol')
      .addSelect('t.title', 'title')
      .addSelect('t.status', 'status')
      .addSelect('t.priority', 'priority')
      .addSelect('t.citizenName', 'citizenName')
      .addSelect('t.citizenPhone', 'citizenPhone')
      .addSelect('t.location', 'location')
      .addSelect('t.createdAt', 'createdAt')
      .addSelect('t.updatedAt', 'updatedAt')
      .addSelect('d.name', 'departmentName')
      .addSelect('c.name', 'cityName')
      .addSelect('n.name', 'neighborhoodName')
      .where('t.companyId = :companyId', { companyId })
      .orderBy('t.createdAt', 'DESC')
      .take(EXPORT_ROW_CAP);
    if (cityId) qb.andWhere('t.cityId = :cityId', { cityId });
    if (range.from)
      qb.andWhere('t.createdAt >= :dFrom', { dFrom: range.from });
    if (range.to) qb.andWhere('t.createdAt <= :dTo', { dTo: range.to });
    const rows = await qb.getRawMany<{
      id: string;
      protocol: string;
      title: string;
      status: string;
      priority: string;
      citizenName: string;
      citizenPhone: string;
      location: string;
      createdAt: Date;
      updatedAt: Date;
      departmentName: string | null;
      cityName: string | null;
      neighborhoodName: string | null;
    }>();
    return {
      rowCap: EXPORT_ROW_CAP,
      rows: rows.map((r) => ({
        id: r.id,
        protocol: r.protocol,
        title: r.title,
        status: r.status,
        priority: r.priority,
        citizenName: r.citizenName,
        citizenPhone: r.citizenPhone,
        location: r.location,
        departmentName: r.departmentName ?? '',
        cityName: r.cityName ?? '',
        neighborhoodName: r.neighborhoodName ?? '',
        createdAt:
          r.createdAt instanceof Date
            ? r.createdAt.toISOString()
            : String(r.createdAt),
        updatedAt:
          r.updatedAt instanceof Date
            ? r.updatedAt.toISOString()
            : String(r.updatedAt),
      })),
    };
  }

  async exportFeedbacksFlat(companyId: string, query: ReportsQueryDto) {
    const range = this.parseRange(query);
    const cityId = query.cityId?.trim() || undefined;
    const qb = this.feedbackRepo
      .createQueryBuilder('f')
      .leftJoin('f.city', 'c')
      .select('f.id', 'id')
      .addSelect('f.citizenName', 'citizenName')
      .addSelect('f.type', 'type')
      .addSelect('f.description', 'description')
      .addSelect('f.createdAt', 'createdAt')
      .addSelect('c.name', 'cityName')
      .where('f.companyId = :companyId', { companyId })
      .orderBy('f.createdAt', 'DESC')
      .take(EXPORT_ROW_CAP);
    if (cityId) qb.andWhere('f.cityId = :cityId', { cityId });
    if (range.from)
      qb.andWhere('f.createdAt >= :dFrom', { dFrom: range.from });
    if (range.to) qb.andWhere('f.createdAt <= :dTo', { dTo: range.to });
    const rows = await qb.getRawMany<{
      id: string;
      citizenName: string;
      type: string;
      description: string;
      createdAt: Date;
      cityName: string | null;
    }>();
    return {
      rowCap: EXPORT_ROW_CAP,
      rows: rows.map((r) => ({
        id: r.id,
        citizenName: r.citizenName,
        type: r.type,
        description: r.description,
        cityName: r.cityName ?? '',
        createdAt:
          r.createdAt instanceof Date
            ? r.createdAt.toISOString()
            : String(r.createdAt),
      })),
    };
  }

  async exportCitizensFlat(companyId: string, query: ReportsQueryDto) {
    const range = this.parseRange(query);
    const cityId = query.cityId?.trim() || undefined;
    const qb = this.citizenRepo
      .createQueryBuilder('c')
      .innerJoin('c.city', 'city')
      .select('c.id', 'id')
      .addSelect('c.name', 'name')
      .addSelect('c.phone', 'phone')
      .addSelect('c.createdAt', 'createdAt')
      .addSelect('city.name', 'cityName')
      .where('c.companyId = :companyId', { companyId })
      .orderBy('c.createdAt', 'DESC')
      .take(EXPORT_ROW_CAP);
    if (cityId) qb.andWhere('c.cityId = :cityId', { cityId });
    if (range.from)
      qb.andWhere('c.createdAt >= :dFrom', { dFrom: range.from });
    if (range.to) qb.andWhere('c.createdAt <= :dTo', { dTo: range.to });
    const rows = await qb.getRawMany<{
      id: string;
      name: string;
      phone: string;
      createdAt: Date;
      cityName: string;
    }>();
    return {
      rowCap: EXPORT_ROW_CAP,
      rows: rows.map((r) => ({
        id: r.id,
        name: r.name,
        phone: r.phone,
        cityName: r.cityName,
        createdAt:
          r.createdAt instanceof Date
            ? r.createdAt.toISOString()
            : String(r.createdAt),
      })),
    };
  }
}
