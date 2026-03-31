import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Citizen } from '../database/entities/citizen.entity';
import type { JwtPayload } from '../auth/interfaces/auth-user.interface';
import { City } from '../database/entities/city.entity';
import { UserRole } from '../database/entities/user.entity';
import { Feedback } from '../database/entities/feedback.entity';
import { Ticket } from '../database/entities/ticket.entity';
import { BRAZIL_STATE_NAMES } from './brazil-states';
import { CityPublicResponseDto } from './dto/city-public.response.dto';
import { CityStateOptionDto } from './dto/city-state-option.dto';
import { CreateCityDto } from './dto/create-city.dto';
import { UpdateCityDto } from './dto/update-city.dto';
import { CityPanelResponseDto } from './dto/city-panel.response.dto';

@Injectable()
export class CitiesService {
  constructor(
    @InjectRepository(City)
    private readonly cityRepository: Repository<City>,
    @InjectRepository(Citizen)
    private readonly citizenRepository: Repository<Citizen>,
    @InjectRepository(Ticket)
    private readonly ticketRepository: Repository<Ticket>,
    @InjectRepository(Feedback)
    private readonly feedbackRepository: Repository<Feedback>,
  ) {}

  /** UFs que possuem ao menos um município ativo no sistema. */
  async findActiveStateOptions(): Promise<CityStateOptionDto[]> {
    const raw = await this.cityRepository
      .createQueryBuilder('c')
      .select('DISTINCT c.stateUf', 'uf')
      .where('c.status = :status', { status: 'ativo' })
      .orderBy('c.stateUf', 'ASC')
      .getRawMany<{ uf: string }>();

    return raw.map((r) => ({
      uf: r.uf,
      name: BRAZIL_STATE_NAMES[r.uf] ?? r.uf,
    }));
  }

  async findAllActive(stateUf?: string): Promise<CityPublicResponseDto[]> {
    const where: { status: 'ativo'; stateUf?: string } = { status: 'ativo' };
    if (stateUf) {
      where.stateUf = stateUf.toUpperCase();
    }
    const cities = await this.cityRepository.find({
      where,
      order: { name: 'ASC' },
    });
    return cities.map((c) => ({
      id: c.id,
      name: c.name,
      stateUf: c.stateUf,
    }));
  }

  private toPanel(c: City): CityPanelResponseDto {
    return {
      id: c.id,
      name: c.name,
      stateUf: c.stateUf,
      status: c.status,
      createdAt: c.createdAt,
    };
  }

  async findPanelAll(): Promise<CityPanelResponseDto[]> {
    const cities = await this.cityRepository.find({
      order: { name: 'ASC' },
    });
    return cities.map((c) => this.toPanel(c));
  }

  /** Painel: super admin vê o catálogo; demais papéis só o município da empresa. */
  async findPanelForJwtUser(user: JwtPayload): Promise<CityPanelResponseDto[]> {
    if (user.role === UserRole.SUPER_ADMIN) {
      return this.findPanelAll();
    }
    if (!user.companyCityId) {
      return [];
    }
    const city = await this.cityRepository.findOne({
      where: { id: user.companyCityId },
    });
    return city ? [this.toPanel(city)] : [];
  }

  async createPanel(dto: CreateCityDto): Promise<CityPanelResponseDto> {
    const name = dto.name.trim();
    const stateUf = dto.stateUf.trim().toUpperCase();
    const dup = await this.cityRepository.findOne({
      where: { name, stateUf },
    });
    if (dup) {
      throw new BadRequestException(
        'Já existe município com este nome e UF no catálogo',
      );
    }
    const row = this.cityRepository.create({
      name,
      stateUf,
      status: dto.status ?? 'ativo',
    });
    const saved = await this.cityRepository.save(row);
    return this.toPanel(saved);
  }

  async updatePanel(
    id: string,
    dto: UpdateCityDto,
  ): Promise<CityPanelResponseDto> {
    const city = await this.cityRepository.findOne({ where: { id } });
    if (!city) {
      throw new NotFoundException('Município não encontrado');
    }
    if (
      dto.name === undefined &&
      dto.stateUf === undefined &&
      dto.status === undefined
    ) {
      throw new BadRequestException('Informe ao menos um campo para atualizar');
    }
    if (dto.name !== undefined) city.name = dto.name.trim();
    if (dto.stateUf !== undefined) {
      city.stateUf = dto.stateUf.trim().toUpperCase();
    }
    if (dto.status !== undefined) city.status = dto.status;

    const conflict = await this.cityRepository.findOne({
      where: {
        name: city.name,
        stateUf: city.stateUf,
      },
    });
    if (conflict && conflict.id !== city.id) {
      throw new BadRequestException(
        'Já existe outro município com este nome e UF no catálogo',
      );
    }

    const saved = await this.cityRepository.save(city);
    return this.toPanel(saved);
  }

  async removePanel(id: string): Promise<void> {
    const city = await this.cityRepository.findOne({ where: { id } });
    if (!city) {
      throw new NotFoundException('Município não encontrado');
    }
    const [citizens, tickets, feedbacks] = await Promise.all([
      this.citizenRepository.count({ where: { cityId: id } }),
      this.ticketRepository.count({ where: { cityId: id } }),
      this.feedbackRepository.count({ where: { cityId: id } }),
    ]);
    if (citizens > 0 || tickets > 0 || feedbacks > 0) {
      throw new ConflictException(
        'Não é possível excluir: existem cidadãos, chamados ou feedbacks vinculados a este município.',
      );
    }
    await this.cityRepository.delete({ id });
  }
}
