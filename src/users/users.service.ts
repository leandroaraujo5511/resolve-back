import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { FindOptionsWhere, Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { Department } from '../database/entities/department.entity';
import { User, UserRole } from '../database/entities/user.entity';
import { AuthUser, JwtPayload } from '../auth/interfaces/auth-user.interface';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { ListUsersQueryDto } from './dto/list-users.query.dto';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(Department)
    private readonly departmentRepository: Repository<Department>,
  ) {}

  findByEmail(email: string): Promise<User | null> {
    return this.userRepository.findOne({
      where: { email },
      relations: { company: true },
    });
  }

  findById(id: string): Promise<User | null> {
    return this.userRepository.findOne({ where: { id } });
  }

  async findAuthUserById(id: string): Promise<AuthUser | null> {
    const user = await this.userRepository.findOne({
      where: { id },
      relations: { company: true },
    });
    if (!user) {
      return null;
    }

    return this.toAuthUser(user);
  }

  async findForPanel(
    jwtUser: JwtPayload,
    filters: ListUsersQueryDto,
  ): Promise<AuthUser[]> {
    if (jwtUser.role === UserRole.SUPER_ADMIN) {
      const where: FindOptionsWhere<User> = {};
      if (filters.companyId) {
        where.companyId = filters.companyId;
      }
      if (filters.departmentId) {
        where.departmentId = filters.departmentId;
      }
      if (filters.status) {
        where.status = filters.status;
      }
      const users = await this.userRepository.find({
        where,
        relations: { company: true },
        order: { name: 'ASC' },
      });
      return users.map((u) => this.toAuthUser(u));
    }
    if (!jwtUser.companyId) {
      throw new ForbiddenException('Usuário sem vínculo de empresa');
    }
    return this.findByCompany(jwtUser.companyId, {
      departmentId: filters.departmentId,
      status: filters.status,
    });
  }

  async findByCompany(
    companyId: string,
    filters?: { departmentId?: string; status?: 'ativo' | 'inativo' },
  ): Promise<AuthUser[]> {
    const where: FindOptionsWhere<User> = { companyId };
    if (filters?.departmentId) {
      where.departmentId = filters.departmentId;
    }
    if (filters?.status) {
      where.status = filters.status;
    }

    const users = await this.userRepository.find({
      where,
      relations: { company: true },
      order: { name: 'ASC' },
    });

    return users.map((u) => this.toAuthUser(u));
  }

  async createForPanel(jwtUser: JwtPayload, dto: CreateUserDto): Promise<AuthUser> {
    let targetCompanyId: string;
    if (jwtUser.role === UserRole.SUPER_ADMIN) {
      if (!dto.companyId?.trim()) {
        throw new BadRequestException(
          'Informe companyId para vincular o usuário a uma empresa',
        );
      }
      targetCompanyId = dto.companyId.trim();
    } else {
      if (!jwtUser.companyId) {
        throw new ForbiddenException('Usuário sem vínculo de empresa');
      }
      targetCompanyId = jwtUser.companyId;
    }
    const { companyId: _c, ...rest } = dto;
    return this.createByCompany(targetCompanyId, rest);
  }

  async createByCompany(
    companyId: string,
    dto: Omit<CreateUserDto, 'companyId'>,
  ): Promise<AuthUser> {
    const email = dto.email.trim().toLowerCase();
    const exists = await this.userRepository.findOne({ where: { email } });
    if (exists) {
      throw new BadRequestException('Já existe usuário com este e-mail');
    }

    if (dto.departmentId) {
      await this.assertDepartment(companyId, dto.departmentId);
    }

    const passwordHash = await bcrypt.hash(dto.password, 10);
    const user = this.userRepository.create({
      companyId,
      name: dto.name.trim(),
      email,
      phone: dto.phone.trim(),
      passwordHash,
      role: dto.role ?? UserRole.SECRETARIA,
      departmentId: dto.departmentId,
      status: dto.status ?? 'ativo',
    });
    const saved = await this.userRepository.save(user);
    return this.toAuthUser(
      (await this.userRepository.findOne({
        where: { id: saved.id },
        relations: { company: true },
      }))!,
    );
  }

  async updateForPanel(
    jwtUser: JwtPayload,
    id: string,
    dto: UpdateUserDto,
  ): Promise<AuthUser> {
    const user = await this.userRepository.findOne({ where: { id } });
    if (!user) {
      throw new NotFoundException('Usuário não encontrado');
    }
    if (jwtUser.role === UserRole.ADMIN) {
      if (user.companyId !== jwtUser.companyId) {
        throw new NotFoundException('Usuário não encontrado');
      }
    }
    if (
      user.role === UserRole.SUPER_ADMIN &&
      jwtUser.role !== UserRole.SUPER_ADMIN
    ) {
      throw new ForbiddenException('Sem permissão para alterar este usuário');
    }

    const companyId = user.companyId ?? undefined;
    await this.applyUserUpdates(user, dto, companyId);
    const saved = await this.userRepository.save(user);
    return this.toAuthUser(
      (await this.userRepository.findOne({
        where: { id: saved.id },
        relations: { company: true },
      }))!,
    );
  }

  private async applyUserUpdates(
    user: User,
    dto: UpdateUserDto,
    tenantCompanyId: string | undefined,
  ): Promise<void> {
    if (
      dto.name === undefined &&
      dto.email === undefined &&
      dto.phone === undefined &&
      dto.password === undefined &&
      dto.role === undefined &&
      dto.departmentId === undefined &&
      dto.status === undefined
    ) {
      throw new BadRequestException(
        'Informe ao menos um campo para atualização',
      );
    }

    if (dto.email !== undefined) {
      const email = dto.email.trim().toLowerCase();
      const conflict = await this.userRepository.findOne({ where: { email } });
      if (conflict && conflict.id !== user.id) {
        throw new BadRequestException('Já existe usuário com este e-mail');
      }
      user.email = email;
    }
    if (dto.name !== undefined) user.name = dto.name.trim();
    if (dto.phone !== undefined) user.phone = dto.phone.trim();
    if (dto.role !== undefined) user.role = dto.role;
    if (dto.status !== undefined) user.status = dto.status;
    if (dto.departmentId !== undefined) {
      if (dto.departmentId) {
        if (!tenantCompanyId) {
          throw new BadRequestException(
            'Usuário sem empresa não pode ter departamento',
          );
        }
        await this.assertDepartment(tenantCompanyId, dto.departmentId);
        user.departmentId = dto.departmentId;
      } else {
        user.departmentId = undefined;
      }
    }
    if (dto.password !== undefined && dto.password.trim()) {
      user.passwordHash = await bcrypt.hash(dto.password, 10);
    }
  }

  async deleteForPanel(
    jwtUser: JwtPayload,
    id: string,
    currentUserId: string,
  ): Promise<void> {
    const user = await this.userRepository.findOne({ where: { id } });
    if (!user) {
      throw new NotFoundException('Usuário não encontrado');
    }
    if (jwtUser.role === UserRole.ADMIN) {
      if (user.companyId !== jwtUser.companyId) {
        throw new NotFoundException('Usuário não encontrado');
      }
    }
    if (
      user.role === UserRole.SUPER_ADMIN &&
      jwtUser.role !== UserRole.SUPER_ADMIN
    ) {
      throw new ForbiddenException('Sem permissão para excluir este usuário');
    }
    if (user.id === currentUserId) {
      throw new BadRequestException('Você não pode excluir seu próprio usuário');
    }
    if (user.role === UserRole.SUPER_ADMIN) {
      const count = await this.userRepository.count({
        where: { role: UserRole.SUPER_ADMIN },
      });
      if (count <= 1) {
        throw new BadRequestException(
          'Não é possível excluir o último super administrador',
        );
      }
    }
    await this.userRepository.delete({ id });
  }

  private async assertDepartment(
    companyId: string,
    departmentId: string,
  ): Promise<void> {
    const department = await this.departmentRepository.findOne({
      where: { id: departmentId, companyId },
    });
    if (!department) {
      throw new BadRequestException('Departamento inválido para este tenant');
    }
  }

  private toAuthUser(user: User): AuthUser {
    return {
      id: user.id,
      companyId: user.companyId ?? null,
      companyCityId: user.company?.cityId ?? null,
      name: user.name,
      email: user.email,
      phone: user.phone,
      role: user.role,
      status: user.status,
      departmentId: user.departmentId,
    };
  }
}
