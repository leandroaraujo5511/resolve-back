import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import type { JwtPayload } from '../auth/interfaces/auth-user.interface';
import { City } from '../database/entities/city.entity';
import { Neighborhood } from '../database/entities/neighborhood.entity';
import { UserRole } from '../database/entities/user.entity';
import { CreateNeighborhoodDto } from './dto/create-neighborhood.dto';
import { UpdateNeighborhoodDto } from './dto/update-neighborhood.dto';
import { NeighborhoodPanelResponseDto } from './dto/neighborhood-panel.response.dto';

@Injectable()
export class NeighborhoodsService {
  constructor(
    @InjectRepository(Neighborhood)
    private readonly neighborhoodRepository: Repository<Neighborhood>,
    @InjectRepository(City)
    private readonly cityRepository: Repository<City>,
  ) {}

  private async assertCity(cityId: string): Promise<City> {
    const city = await this.cityRepository.findOne({ where: { id: cityId } });
    if (!city) {
      throw new NotFoundException('Município não encontrado');
    }
    return city;
  }

  private toPanel(n: Neighborhood): NeighborhoodPanelResponseDto {
    return {
      id: n.id,
      cityId: n.cityId,
      name: n.name,
      status: n.status,
      createdAt: n.createdAt,
    };
  }

  private assertTenantCityAccess(cityId: string, user: JwtPayload): void {
    if (user.role === UserRole.SUPER_ADMIN) {
      return;
    }
    if (!user.companyCityId) {
      throw new ForbiddenException(
        'Empresa sem município vinculado. Contate o super administrador.',
      );
    }
    if (user.companyCityId !== cityId) {
      throw new ForbiddenException('Sem permissão para este município');
    }
  }

  async findByCity(
    cityId: string,
    user: JwtPayload,
  ): Promise<NeighborhoodPanelResponseDto[]> {
    this.assertTenantCityAccess(cityId, user);
    await this.assertCity(cityId);
    const rows = await this.neighborhoodRepository.find({
      where: { cityId },
      order: { name: 'ASC' },
    });
    return rows.map((n) => this.toPanel(n));
  }

  async create(
    dto: CreateNeighborhoodDto,
    user: JwtPayload,
  ): Promise<NeighborhoodPanelResponseDto> {
    this.assertTenantCityAccess(dto.cityId, user);
    await this.assertCity(dto.cityId);
    const name = dto.name.trim();
    const dup = await this.neighborhoodRepository.findOne({
      where: { cityId: dto.cityId, name },
    });
    if (dup) {
      throw new BadRequestException(
        'Já existe bairro com este nome neste município',
      );
    }
    const row = this.neighborhoodRepository.create({
      cityId: dto.cityId,
      name,
      status: dto.status ?? 'ativo',
    });
    const saved = await this.neighborhoodRepository.save(row);
    return this.toPanel(saved);
  }

  async update(
    id: string,
    dto: UpdateNeighborhoodDto,
    user: JwtPayload,
  ): Promise<NeighborhoodPanelResponseDto> {
    const neighborhood = await this.neighborhoodRepository.findOne({
      where: { id },
    });
    if (!neighborhood) {
      throw new NotFoundException('Bairro não encontrado');
    }
    this.assertTenantCityAccess(neighborhood.cityId, user);
    if (dto.name === undefined && dto.status === undefined) {
      throw new BadRequestException('Informe ao menos um campo para atualizar');
    }
    if (dto.name !== undefined) {
      const name = dto.name.trim();
      const dup = await this.neighborhoodRepository.findOne({
        where: { cityId: neighborhood.cityId, name },
      });
      if (dup && dup.id !== neighborhood.id) {
        throw new BadRequestException(
          'Já existe outro bairro com este nome neste município',
        );
      }
      neighborhood.name = name;
    }
    if (dto.status !== undefined) neighborhood.status = dto.status;
    const saved = await this.neighborhoodRepository.save(neighborhood);
    return this.toPanel(saved);
  }

  async remove(id: string, user: JwtPayload): Promise<void> {
    const neighborhood = await this.neighborhoodRepository.findOne({
      where: { id },
    });
    if (!neighborhood) {
      throw new NotFoundException('Bairro não encontrado');
    }
    this.assertTenantCityAccess(neighborhood.cityId, user);
    await this.neighborhoodRepository.delete({ id });
  }
}
