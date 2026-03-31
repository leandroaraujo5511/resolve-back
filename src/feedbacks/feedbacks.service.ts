import { Injectable, UnauthorizedException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Citizen } from '../database/entities/citizen.entity';
import { Feedback } from '../database/entities/feedback.entity';
import type { CitizenJwtPayload } from '../auth/interfaces/citizen-jwt.interface';
import { CreateFeedbackCitizenDto } from './dto/create-feedback-citizen.dto';
import { ListFeedbacksQueryDto } from './dto/list-feedbacks.query.dto';
import {
  FeedbackResponseDto,
  PaginatedFeedbacksResponseDto,
} from './dto/feedback.response.dto';

@Injectable()
export class FeedbacksService {
  constructor(
    @InjectRepository(Feedback)
    private readonly feedbackRepository: Repository<Feedback>,
    @InjectRepository(Citizen)
    private readonly citizenRepository: Repository<Citizen>,
  ) {}

  /**
   * Cria feedback **somente** na cidade vinculada ao cadastro do cidadão (banco).
   * `cityId`/`companyId` do body não são usados (DTO sem esses campos).
   */
  async createFromCitizen(
    jwtPayload: CitizenJwtPayload,
    dto: CreateFeedbackCitizenDto,
  ): Promise<FeedbackResponseDto> {
    const citizen = await this.citizenRepository.findOne({
      where: { id: jwtPayload.sub },
      relations: ['city'],
    });

    if (!citizen) {
      throw new UnauthorizedException('Cidadão não encontrado');
    }

    if (
      citizen.companyId !== jwtPayload.companyId ||
      citizen.cityId !== jwtPayload.cityId
    ) {
      throw new UnauthorizedException(
        'Sessão desatualizada em relação ao cadastro. Faça login novamente.',
      );
    }

    const row = this.feedbackRepository.create({
      companyId: citizen.companyId,
      cityId: citizen.cityId,
      citizenId: citizen.id,
      citizenName: dto.citizenName?.trim() || citizen.name,
      type: dto.type,
      description: dto.description.trim(),
      attachments: dto.attachments ?? [],
    });

    const saved = await this.feedbackRepository.save(row);
    return this.toDto(saved, citizen.city?.name, citizen.avatarKey);
  }

  async findAllForCompany(
    companyId: string,
    query: ListFeedbacksQueryDto,
  ): Promise<PaginatedFeedbacksResponseDto> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;

    const qb = this.feedbackRepository
      .createQueryBuilder('f')
      .leftJoinAndSelect('f.city', 'city')
      .leftJoinAndSelect('f.citizen', 'citizen')
      .where('f.companyId = :companyId', { companyId })
      .orderBy('f.createdAt', 'DESC');

    if (query.cityId) {
      qb.andWhere('f.cityId = :cityId', { cityId: query.cityId });
    }
    if (query.type) {
      qb.andWhere('f.type = :type', { type: query.type });
    }

    const total = await qb.clone().getCount();
    const rows = await qb
      .skip((page - 1) * limit)
      .take(limit)
      .getMany();

    return {
      data: rows.map((f) => this.toDto(f, f.city?.name)),
      total,
      page,
      limit,
    };
  }

  private toDto(
    f: Feedback,
    cityName?: string,
    avatarKeyOverride?: string | null,
  ): FeedbackResponseDto {
    return {
      id: f.id,
      companyId: f.companyId,
      cityId: f.cityId,
      cityName,
      citizenId: f.citizenId,
      citizenName: f.citizenName,
      citizenAvatarKey:
        avatarKeyOverride !== undefined
          ? avatarKeyOverride
          : (f.citizen?.avatarKey ?? null),
      type: f.type,
      description: f.description,
      attachments: f.attachments ?? [],
      createdAt: f.createdAt,
    };
  }
}
