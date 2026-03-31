import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import type { CitizenJwtPayload } from '../auth/interfaces/citizen-jwt.interface';
import { Department } from '../database/entities/department.entity';
import { Neighborhood } from '../database/entities/neighborhood.entity';
import { NeighborhoodItemDto, TicketCategoryItemDto } from './dto/catalog-item.dto';

@Injectable()
export class CatalogsService {
  constructor(
    @InjectRepository(Department)
    private readonly departmentRepository: Repository<Department>,
    @InjectRepository(Neighborhood)
    private readonly neighborhoodRepository: Repository<Neighborhood>,
  ) {}

  async listTicketCategories(
    citizen: CitizenJwtPayload,
  ): Promise<TicketCategoryItemDto[]> {
    const rows = await this.departmentRepository.find({
      where: { companyId: citizen.companyId, status: 'ativo' },
      order: { name: 'ASC' },
    });

    return rows
      .filter(
        (d) =>
          !d.visibleOnlyInCityId ||
          d.visibleOnlyInCityId === citizen.cityId,
      )
      .map((d) => ({
        id: d.id,
        name: d.name,
        description: d.description,
        icon: d.icon,
      }));
  }

  async listNeighborhoods(
    citizen: CitizenJwtPayload,
  ): Promise<NeighborhoodItemDto[]> {
    const rows = await this.neighborhoodRepository.find({
      where: { cityId: citizen.cityId, status: 'ativo' },
      order: { name: 'ASC' },
    });

    return rows.map((n) => ({ id: n.id, name: n.name }));
  }
}
