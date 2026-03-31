import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { City } from '../database/entities/city.entity';
import { Company } from '../database/entities/company.entity';
import { CreateCompanyDto } from './dto/create-company.dto';
import { UpdateCompanyDto } from './dto/update-company.dto';

@Injectable()
export class CompaniesService {
  constructor(
    @InjectRepository(Company)
    private readonly companyRepository: Repository<Company>,
    @InjectRepository(City)
    private readonly cityRepository: Repository<City>,
  ) {}

  private async assertCityIdOptional(
    cityId: string | null | undefined,
  ): Promise<void> {
    if (cityId === undefined || cityId === null || cityId.trim() === '') {
      return;
    }
    const c = await this.cityRepository.findOne({ where: { id: cityId } });
    if (!c) {
      throw new BadRequestException('Município inválido');
    }
  }

  async findAll(): Promise<Company[]> {
    return this.companyRepository.find({ order: { name: 'ASC' } });
  }

  /** Catálogo para cadastro cidadão (sem autenticação). */
  async findAllActivePublic(): Promise<
    Pick<Company, 'id' | 'name' | 'slug'>[]
  > {
    return this.companyRepository.find({
      where: { status: 'ativo' },
      select: ['id', 'name', 'slug'],
      order: { name: 'ASC' },
    });
  }

  async findByIdOrFail(companyId: string): Promise<Company> {
    const company = await this.companyRepository.findOne({
      where: { id: companyId },
    });

    if (!company) {
      throw new NotFoundException('Empresa não encontrada');
    }

    return company;
  }

  async create(dto: CreateCompanyDto): Promise<Company> {
    const slug = dto.slug.trim().toLowerCase();
    const name = dto.name.trim();
    const slugTaken = await this.companyRepository.findOne({ where: { slug } });
    if (slugTaken) {
      throw new BadRequestException('Já existe empresa com este slug');
    }
    const cityIdRaw = dto.cityId?.trim();
    if (cityIdRaw) {
      await this.assertCityIdOptional(cityIdRaw);
    }
    const row = this.companyRepository.create({
      name,
      slug,
      document: dto.document?.trim(),
      status: dto.status ?? 'ativo',
      cityId: cityIdRaw || null,
    });
    return this.companyRepository.save(row);
  }

  async update(id: string, dto: UpdateCompanyDto): Promise<Company> {
    const company = await this.findByIdOrFail(id);

    if (dto.slug !== undefined) {
      const slug = dto.slug.trim().toLowerCase();
      const conflict = await this.companyRepository.findOne({ where: { slug } });
      if (conflict && conflict.id !== company.id) {
        throw new BadRequestException('Já existe empresa com este slug');
      }
      company.slug = slug;
    }
    if (dto.name !== undefined) company.name = dto.name.trim();
    if (dto.document !== undefined) {
      company.document = dto.document.trim() || undefined;
    }
    if (dto.status !== undefined) company.status = dto.status;
    if (dto.cityId !== undefined) {
      if (
        dto.cityId === null ||
        (typeof dto.cityId === 'string' && dto.cityId.trim() === '')
      ) {
        company.cityId = null;
      } else {
        const tid = dto.cityId.trim();
        await this.assertCityIdOptional(tid);
        company.cityId = tid;
      }
    }

    return this.companyRepository.save(company);
  }
}
