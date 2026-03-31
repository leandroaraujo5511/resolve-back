import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Department } from '../database/entities/department.entity';
import { Ticket } from '../database/entities/ticket.entity';
import { User } from '../database/entities/user.entity';
import { CreateDepartmentDto } from './dto/create-department.dto';
import { UpdateDepartmentDto } from './dto/update-department.dto';

@Injectable()
export class DepartmentsService {
  constructor(
    @InjectRepository(Department)
    private readonly departmentRepository: Repository<Department>,
    @InjectRepository(Ticket)
    private readonly ticketRepository: Repository<Ticket>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

  async findByCompany(
    companyId: string,
    status?: 'ativo' | 'inativo',
  ): Promise<Department[]> {
    return this.departmentRepository.find({
      where: status ? { companyId, status } : { companyId },
      order: { name: 'ASC' },
    });
  }

  async createByCompany(
    companyId: string,
    dto: CreateDepartmentDto,
  ): Promise<Department> {
    const name = dto.name.trim();
    const description = dto.description.trim();

    const exists = await this.departmentRepository.findOne({
      where: { companyId, name },
    });
    if (exists) {
      throw new BadRequestException('Já existe um departamento com este nome');
    }

    let icon: string | null = null;
    if (dto.icon !== undefined) {
      const t = dto.icon.trim();
      icon = t === '' ? null : t;
    }

    const department = this.departmentRepository.create({
      companyId,
      name,
      description,
      status: dto.status ?? 'ativo',
      icon,
    });
    return this.departmentRepository.save(department);
  }

  async updateByCompany(
    companyId: string,
    id: string,
    dto: UpdateDepartmentDto,
  ): Promise<Department> {
    if (
      dto.name === undefined &&
      dto.description === undefined &&
      dto.status === undefined &&
      dto.icon === undefined
    ) {
      throw new BadRequestException('Informe ao menos um campo para atualização');
    }

    const department = await this.departmentRepository.findOne({
      where: { id, companyId },
    });
    if (!department) {
      throw new NotFoundException('Departamento não encontrado');
    }

    if (dto.name !== undefined) {
      department.name = dto.name.trim();
    }
    if (dto.description !== undefined) {
      department.description = dto.description.trim();
    }
    if (dto.status !== undefined) {
      department.status = dto.status;
    }
    if (dto.icon !== undefined) {
      const t = dto.icon.trim();
      department.icon = t === '' ? null : t;
    }

    return this.departmentRepository.save(department);
  }

  async deleteByCompany(companyId: string, id: string): Promise<void> {
    const department = await this.departmentRepository.findOne({
      where: { id, companyId },
    });
    if (!department) {
      throw new NotFoundException('Departamento não encontrado');
    }

    const linkedTickets = await this.ticketRepository.count({
      where: { companyId, departmentId: id },
    });
    if (linkedTickets > 0) {
      throw new BadRequestException(
        'Não é possível excluir: existem chamados vinculados a este departamento',
      );
    }

    const linkedUsers = await this.userRepository.count({
      where: { companyId, departmentId: id },
    });
    if (linkedUsers > 0) {
      throw new BadRequestException(
        'Não é possível excluir: existem usuários vinculados a este departamento',
      );
    }

    await this.departmentRepository.delete({ id, companyId });
  }
}
