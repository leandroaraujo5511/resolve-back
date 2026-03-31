import { ForbiddenException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import type { Repository } from 'typeorm';
import { AppIssue } from '../database/entities/app-issue.entity';
import type { CitizenJwtPayload } from '../auth/interfaces/citizen-jwt.interface';
import type { JwtPayload } from '../auth/interfaces/auth-user.interface';
import { UserRole } from '../database/entities/user.entity';
import { CreateAppIssueDto } from './dto/create-app-issue.dto';
import type { ListAppIssuesQueryDto } from './dto/list-app-issues.query.dto';

@Injectable()
export class AppIssuesService {
  constructor(
    @InjectRepository(AppIssue)
    private readonly repo: Repository<AppIssue>,
  ) {}

  async createFromCitizen(
    citizen: CitizenJwtPayload,
    dto: CreateAppIssueDto,
  ): Promise<AppIssue> {
    const issue = this.repo.create({
      companyId: citizen.companyId,
      cityId: citizen.cityId,
      citizenId: citizen.sub,
      citizenName: dto.citizenName?.trim() || null,
      citizenPhone: dto.citizenPhone?.trim() || citizen.phone?.trim() || null,
      description: dto.description.trim(),
      appVersion: dto.appVersion?.trim() || null,
      deviceInfo: dto.deviceInfo?.trim() || null,
      attachments: dto.attachments ?? [],
    });
    return this.repo.save(issue);
  }

  async findAllForCompany(
    user: JwtPayload,
    companyId: string,
    query: ListAppIssuesQueryDto,
  ): Promise<{ data: AppIssue[]; total: number; page: number; limit: number }> {
    if (user.role !== UserRole.SUPER_ADMIN) {
      throw new ForbiddenException(
        'Somente SUPER_ADMIN pode visualizar problemas do app.',
      );
    }

    const page = query.page ?? 1;
    const limit = query.limit ?? 50;

    const qb = this.repo
      .createQueryBuilder('issue')
      .where('issue.companyId = :companyId', { companyId })
      .orderBy('issue.createdAt', 'DESC')
      .skip((page - 1) * limit)
      .take(limit);

    const [data, total] = await qb.getManyAndCount();
    return { data, total, page, limit };
  }
}

