import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { Department } from '../database/entities/department.entity';
import { SubDepartment } from '../database/entities/sub-department.entity';
import { Ticket } from '../database/entities/ticket.entity';
import {
  CreateSubDepartmentDto,
  UpdateSubDepartmentDto,
} from './dto/sub-department.dto';

@Injectable()
export class SubDepartmentsService {
  constructor(
    @InjectRepository(SubDepartment)
    private readonly subDepartmentRepository: Repository<SubDepartment>,
    @InjectRepository(Department)
    private readonly departmentRepository: Repository<Department>,
    @InjectRepository(Ticket)
    private readonly ticketRepository: Repository<Ticket>,
  ) {}

  private async assertDepartment(
    companyId: string,
    departmentId: string,
  ): Promise<Department> {
    const dept = await this.departmentRepository.findOne({
      where: { id: departmentId, companyId },
    });
    if (!dept) {
      throw new NotFoundException('Departamento não encontrado');
    }
    return dept;
  }

  async listByDepartment(
    companyId: string,
    departmentId: string,
    status?: 'ativo' | 'inativo',
  ): Promise<SubDepartment[]> {
    await this.assertDepartment(companyId, departmentId);
    return this.subDepartmentRepository.find({
      where: {
        companyId,
        departmentId,
        ...(status ? { status } : {}),
      },
      order: { sortOrder: 'ASC', name: 'ASC' },
    });
  }

  async create(
    companyId: string,
    departmentId: string,
    dto: CreateSubDepartmentDto,
  ): Promise<SubDepartment> {
    await this.assertDepartment(companyId, departmentId);
    const name = dto.name.trim();
    const exists = await this.subDepartmentRepository.findOne({
      where: { departmentId, name },
    });
    if (exists) {
      throw new BadRequestException(
        'Já existe um subdepartamento com este nome neste departamento',
      );
    }

    let sortOrder = dto.sortOrder;
    if (sortOrder === undefined) {
      const max = await this.subDepartmentRepository
        .createQueryBuilder('s')
        .select('MAX(s.sortOrder)', 'max')
        .where('s.departmentId = :departmentId', { departmentId })
        .getRawOne<{ max: number | null }>();
      sortOrder = (max?.max ?? -1) + 1;
    }

    const row = this.subDepartmentRepository.create({
      companyId,
      departmentId,
      name,
      status: dto.status ?? 'ativo',
      sortOrder,
    });
    return this.subDepartmentRepository.save(row);
  }

  async update(
    companyId: string,
    id: string,
    dto: UpdateSubDepartmentDto,
  ): Promise<SubDepartment> {
    const row = await this.subDepartmentRepository.findOne({
      where: { id, companyId },
    });
    if (!row) {
      throw new NotFoundException('Subdepartamento não encontrado');
    }
    if (
      dto.name === undefined &&
      dto.status === undefined &&
      dto.sortOrder === undefined
    ) {
      throw new BadRequestException('Informe ao menos um campo para atualizar');
    }
    if (dto.name !== undefined) {
      const name = dto.name.trim();
      const conflict = await this.subDepartmentRepository.findOne({
        where: { departmentId: row.departmentId, name },
      });
      if (conflict && conflict.id !== row.id) {
        throw new BadRequestException(
          'Já existe um subdepartamento com este nome neste departamento',
        );
      }
      row.name = name;
    }
    if (dto.status !== undefined) row.status = dto.status;
    if (dto.sortOrder !== undefined) row.sortOrder = dto.sortOrder;
    return this.subDepartmentRepository.save(row);
  }

  async reorder(
    companyId: string,
    departmentId: string,
    orderedIds: string[],
  ): Promise<SubDepartment[]> {
    await this.assertDepartment(companyId, departmentId);
    const existing = await this.subDepartmentRepository.find({
      where: { companyId, departmentId },
    });
    if (orderedIds.length !== existing.length) {
      throw new BadRequestException(
        'A lista de ordenação deve incluir todos os subdepartamentos',
      );
    }
    const idSet = new Set(existing.map((e) => e.id));
    for (const id of orderedIds) {
      if (!idSet.has(id)) {
        throw new BadRequestException(
          'Lista de ordenação contém id inválido para este departamento',
        );
      }
    }
    for (let i = 0; i < orderedIds.length; i += 1) {
      await this.subDepartmentRepository.update(
        { id: orderedIds[i]! },
        { sortOrder: i },
      );
    }
    return this.listByDepartment(companyId, departmentId);
  }

  async delete(companyId: string, id: string): Promise<void> {
    const row = await this.subDepartmentRepository.findOne({
      where: { id, companyId },
    });
    if (!row) {
      throw new NotFoundException('Subdepartamento não encontrado');
    }
    const ticketCount = await this.ticketRepository.count({
      where: { subDepartmentId: id },
    });
    if (ticketCount > 0) {
      throw new BadRequestException(
        'Não é possível excluir: há chamados vinculados. Inative o subdepartamento.',
      );
    }
    await this.subDepartmentRepository.delete({ id });
  }

  async assertOptionalForDepartment(
    companyId: string,
    departmentId: string,
    subDepartmentId: string | null | undefined,
  ): Promise<string | null> {
    if (!subDepartmentId) {
      return null;
    }
    const sub = await this.subDepartmentRepository.findOne({
      where: {
        id: subDepartmentId,
        companyId,
        departmentId,
        status: 'ativo',
      },
    });
    if (!sub) {
      throw new BadRequestException(
        'Subdepartamento inválido para este departamento',
      );
    }
    return sub.id;
  }

  /**
   * RN-047a: se o destino tiver subdepts ativos, exige seleção;
   * senão, força null (ignora valor enviado).
   */
  async resolveForTransfer(
    companyId: string,
    departmentId: string,
    subDepartmentId: string | null | undefined,
  ): Promise<{ subDepartmentId: string | null; subDepartmentName: string | null }> {
    const active = await this.listByDepartment(
      companyId,
      departmentId,
      'ativo',
    );
    if (active.length === 0) {
      return { subDepartmentId: null, subDepartmentName: null };
    }
    if (!subDepartmentId) {
      throw new BadRequestException(
        'Selecione um subdepartamento para o departamento de destino',
      );
    }
    const sub = active.find((s) => s.id === subDepartmentId);
    if (!sub) {
      throw new BadRequestException(
        'Subdepartamento inválido para este departamento',
      );
    }
    return { subDepartmentId: sub.id, subDepartmentName: sub.name };
  }

  async listActiveByDepartmentIds(
    companyId: string,
    departmentIds: string[],
  ): Promise<SubDepartment[]> {
    if (departmentIds.length === 0) return [];
    return this.subDepartmentRepository.find({
      where: {
        companyId,
        departmentId: In(departmentIds),
        status: 'ativo',
      },
      order: { sortOrder: 'ASC', name: 'ASC' },
    });
  }

  async findNameById(
    companyId: string,
    id: string | null | undefined,
  ): Promise<string | null> {
    if (!id) return null;
    const row = await this.subDepartmentRepository.findOne({
      where: { id, companyId },
    });
    return row?.name ?? null;
  }
}
