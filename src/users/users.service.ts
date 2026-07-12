import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { FindOptionsWhere, Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { Department } from '../database/entities/department.entity';
import { SubDepartment } from '../database/entities/sub-department.entity';
import { User, UserRole } from '../database/entities/user.entity';
import {
  AuthUser,
  CreateUserResult,
  EmailDeliveryStatus,
  JwtPayload,
} from '../auth/interfaces/auth-user.interface';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { ListUsersQueryDto } from './dto/list-users.query.dto';
import { CommunicationGatewayService } from '../communication/communication-gateway.service';
import { generateProvisionalPassword } from '../common/utils/generate-provisional-password';
import {
  buildWelcomeEmailContent,
  resolvePanelBrand,
} from '../common/mail/panel-email-layout';

@Injectable()
export class UsersService {
  private readonly logger = new Logger(UsersService.name);

  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(Department)
    private readonly departmentRepository: Repository<Department>,
    @InjectRepository(SubDepartment)
    private readonly subDepartmentRepository: Repository<SubDepartment>,
    private readonly communicationGateway: CommunicationGatewayService,
    private readonly config: ConfigService,
  ) {}

  findByEmail(email: string): Promise<User | null> {
    return this.userRepository.findOne({
      where: { email: email.trim().toLowerCase() },
      relations: { company: true },
    });
  }

  findById(id: string): Promise<User | null> {
    return this.userRepository.findOne({ where: { id } });
  }

  async getTokenVersion(userId: string): Promise<number> {
    const user = await this.userRepository.findOne({
      where: { id: userId },
      select: { id: true, tokenVersion: true },
    });
    return user?.tokenVersion ?? 0;
  }

  async findAuthUserById(id: string): Promise<AuthUser | null> {
    const user = await this.userRepository.findOne({
      where: { id },
      relations: { company: true },
    });
    if (!user) {
      return null;
    }

    return this.toAuthUserPublic(user);
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
      return users.map((u) => this.toAuthUserPublic(u));
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

    return users.map((u) => this.toAuthUserPublic(u));
  }

  async createForPanel(
    jwtUser: JwtPayload,
    dto: CreateUserDto,
  ): Promise<CreateUserResult> {
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
  ): Promise<CreateUserResult> {
    const email = dto.email.trim().toLowerCase();
    const exists = await this.userRepository.findOne({ where: { email } });
    if (exists) {
      throw new BadRequestException('Já existe usuário com este e-mail');
    }

    if (dto.departmentId) {
      await this.assertDepartment(companyId, dto.departmentId);
    }
    if (dto.subDepartmentId) {
      if (!dto.departmentId) {
        throw new BadRequestException(
          'Informe o departamento ao vincular um subdepartamento',
        );
      }
      await this.assertSubDepartment(
        companyId,
        dto.departmentId,
        dto.subDepartmentId,
      );
    }

    const sendWelcome = dto.sendWelcomeEmail === true;
    const requireChange =
      dto.requirePasswordChange ?? (sendWelcome ? true : false);

    let plainPassword: string;
    if (sendWelcome) {
      plainPassword = generateProvisionalPassword(12);
    } else {
      const pwd = dto.password?.trim();
      if (!pwd || pwd.length < 6) {
        throw new BadRequestException(
          'Informe a senha (mínimo 6 caracteres) ou marque o envio de e-mail de boas-vindas',
        );
      }
      plainPassword = pwd;
    }

    const passwordHash = await bcrypt.hash(plainPassword, 10);
    const user = this.userRepository.create({
      companyId,
      name: dto.name.trim(),
      email,
      phone: dto.phone.trim(),
      passwordHash,
      role: dto.role ?? UserRole.SECRETARIA,
      departmentId: dto.departmentId,
      subDepartmentId: dto.subDepartmentId ?? null,
      status: dto.status ?? 'ativo',
      mustChangePassword: requireChange,
      passwordChangedAt: null,
      welcomeEmailSentAt: null,
      tokenVersion: 0,
    });
    const saved = await this.userRepository.save(user);

    let emailDeliveryStatus: EmailDeliveryStatus = 'skipped';
    if (sendWelcome) {
      emailDeliveryStatus = await this.dispatchWelcomeEmail(
        saved,
        plainPassword,
        requireChange,
      );
      if (emailDeliveryStatus === 'sent') {
        saved.welcomeEmailSentAt = new Date();
        await this.userRepository.save(saved);
      }
    }

    const auth = this.toAuthUserPublic(
      (await this.userRepository.findOne({
        where: { id: saved.id },
        relations: { company: true },
      }))!,
    );

    return { ...auth, emailDeliveryStatus };
  }

  async resendWelcomeForPanel(
    jwtUser: JwtPayload,
    id: string,
  ): Promise<CreateUserResult> {
    const user = await this.userRepository.findOne({
      where: { id },
      relations: { company: true },
    });
    if (!user) {
      throw new NotFoundException('Usuário não encontrado');
    }
    this.assertCanManageUser(jwtUser, user);

    const plainPassword = generateProvisionalPassword(12);
    user.passwordHash = await bcrypt.hash(plainPassword, 10);
    user.mustChangePassword = true;
    user.tokenVersion = (user.tokenVersion ?? 0) + 1;
    await this.userRepository.save(user);

    const emailDeliveryStatus = await this.dispatchWelcomeEmail(
      user,
      plainPassword,
      true,
    );
    if (emailDeliveryStatus === 'sent') {
      user.welcomeEmailSentAt = new Date();
      await this.userRepository.save(user);
    }

    const auth = this.toAuthUserPublic(
      (await this.userRepository.findOne({
        where: { id: user.id },
        relations: { company: true },
      }))!,
    );
    return { ...auth, emailDeliveryStatus };
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
    this.assertCanManageUser(jwtUser, user);

    const companyId = user.companyId ?? undefined;
    await this.applyUserUpdates(user, dto, companyId);
    const saved = await this.userRepository.save(user);
    return this.toAuthUserPublic(
      (await this.userRepository.findOne({
        where: { id: saved.id },
        relations: { company: true },
      }))!,
    );
  }

  async changeOwnPassword(
    userId: string,
    currentPassword: string,
    newPassword: string,
  ): Promise<void> {
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('Usuário não encontrado');
    }

    const ok = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!ok) {
      throw new BadRequestException('Senha atual incorreta');
    }

    if (currentPassword === newPassword) {
      throw new BadRequestException(
        'A nova senha deve ser diferente da senha atual',
      );
    }

    user.passwordHash = await bcrypt.hash(newPassword, 10);
    user.mustChangePassword = false;
    user.passwordChangedAt = new Date();
    user.tokenVersion = (user.tokenVersion ?? 0) + 1;
    await this.userRepository.save(user);

    this.logger.log(
      `PASSWORD_CHANGED userId=${user.id} reason=first_login_or_voluntary`,
    );
  }

  /** Redefinição via link (forgot-password). Revoga refresh (tokenVersion++). */
  async applyPasswordReset(userId: string, newPassword: string): Promise<void> {
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('Usuário não encontrado');
    }
    if (user.status !== 'ativo') {
      throw new BadRequestException('Usuário inválido ou inativo');
    }

    user.passwordHash = await bcrypt.hash(newPassword, 10);
    user.mustChangePassword = false;
    user.passwordChangedAt = new Date();
    user.tokenVersion = (user.tokenVersion ?? 0) + 1;
    await this.userRepository.save(user);

    this.logger.log(`PASSWORD_CHANGED userId=${user.id} reason=reset`);
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
      dto.subDepartmentId === undefined &&
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

    const departmentChanging = dto.departmentId !== undefined;
    const previousDepartmentId = user.departmentId;
    if (departmentChanging) {
      if (dto.departmentId) {
        if (!tenantCompanyId) {
          throw new BadRequestException(
            'Usuário sem empresa não pode ter departamento',
          );
        }
        await this.assertDepartment(tenantCompanyId, dto.departmentId);
        user.departmentId = dto.departmentId;
        if (
          dto.departmentId !== previousDepartmentId &&
          dto.subDepartmentId === undefined
        ) {
          user.subDepartmentId = null;
        }
      } else {
        user.departmentId = undefined;
        user.subDepartmentId = null;
      }
    }

    if (dto.subDepartmentId !== undefined) {
      if (dto.subDepartmentId === null || dto.subDepartmentId === '') {
        user.subDepartmentId = null;
      } else {
        const deptId = user.departmentId;
        if (!deptId) {
          throw new BadRequestException(
            'Informe o departamento ao vincular um subdepartamento',
          );
        }
        if (!tenantCompanyId) {
          throw new BadRequestException(
            'Usuário sem empresa não pode ter subdepartamento',
          );
        }
        await this.assertSubDepartment(
          tenantCompanyId,
          deptId,
          dto.subDepartmentId,
        );
        user.subDepartmentId = dto.subDepartmentId;
      }
    }

    if (dto.password !== undefined && dto.password.trim()) {
      user.passwordHash = await bcrypt.hash(dto.password, 10);
      user.tokenVersion = (user.tokenVersion ?? 0) + 1;
      user.passwordChangedAt = new Date();
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
    this.assertCanManageUser(jwtUser, user);
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

  private assertCanManageUser(jwtUser: JwtPayload, user: User): void {
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
  }

  private async dispatchWelcomeEmail(
    user: User,
    plainPassword: string,
    requireChange: boolean,
  ): Promise<EmailDeliveryStatus> {
    const brand = resolvePanelBrand(this.config);
    const { subject, textBody, htmlBody } = buildWelcomeEmailContent({
      brand,
      userName: user.name,
      userEmail: user.email,
      provisionalPassword: plainPassword,
      requireChange,
    });

    try {
      if (!this.communicationGateway.isEnabled()) {
        this.logger.warn(
          `WELCOME_EMAIL_FAILED userId=${user.id} reason=gateway_disabled`,
        );
        return 'failed';
      }
      const { messageId } = await this.communicationGateway.sendEmail({
        to: user.email,
        subject,
        textBody,
        htmlBody,
      });
      this.logger.log(
        `WELCOME_EMAIL_SENT userId=${user.id} gatewayMessageId=${messageId} email=${maskEmail(user.email)}`,
      );
      return 'sent';
    } catch (e) {
      this.logger.warn(
        `WELCOME_EMAIL_FAILED userId=${user.id} email=${maskEmail(user.email)} error=${String(e)}`,
      );
      return 'failed';
    }
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

  private async assertSubDepartment(
    companyId: string,
    departmentId: string,
    subDepartmentId: string,
  ): Promise<void> {
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
        'Subdepartamento inválido, inativo ou de outro departamento',
      );
    }
  }

  /** Expõe mapeamento AuthUser (usado também pelo AuthService). */
  toAuthUserPublic(user: User): AuthUser {
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
      subDepartmentId: user.subDepartmentId ?? null,
      mustChangePassword: Boolean(user.mustChangePassword),
    };
  }
}

function maskEmail(email: string): string {
  const [local, domain] = email.split('@');
  if (!local || !domain) return '***';
  const visible = local.slice(0, 2);
  return `${visible}***@${domain}`;
}
