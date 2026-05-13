import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import * as bcrypt from 'bcrypt';
import { randomInt } from 'crypto';
import { Repository } from 'typeorm';
import { CitizenOtp } from '../database/entities/citizen-otp.entity';
import { Citizen } from '../database/entities/citizen.entity';
import { City } from '../database/entities/city.entity';
import { Company } from '../database/entities/company.entity';
import { CitizenLoginDto } from './dto/citizen-login.dto';
import { CitizenPasswordLoginDto } from './dto/citizen-password-login.dto';
import { CitizenRegisterDto } from './dto/citizen-register.dto';
import { CitizenSendOtpDto } from './dto/citizen-send-otp.dto';
import { CitizenUpdateProfileDto } from './dto/citizen-update-profile.dto';
import { CitizenPasswordResetCompleteDto } from './dto/citizen-password-reset-complete.dto';
import { CitizenPhoneRecoveryDto } from './dto/citizen-phone-recovery.dto';
import type { CitizenMeResponseDto } from './dto/citizen-me.response.dto';
import type { CitizenJwtPayload } from './interfaces/citizen-jwt.interface';
import { CommunicationGatewayService } from '../communication/communication-gateway.service';
import { Feedback } from '../database/entities/feedback.entity';
import { Ticket } from '../database/entities/ticket.entity';
import { CitizenDeleteAccountDto } from './dto/citizen-delete-account.dto';

@Injectable()
export class CitizenAuthService {
  private readonly logger = new Logger(CitizenAuthService.name);

  constructor(
    @InjectRepository(Citizen)
    private readonly citizenRepository: Repository<Citizen>,
    @InjectRepository(City)
    private readonly cityRepository: Repository<City>,
    @InjectRepository(Company)
    private readonly companyRepository: Repository<Company>,
    @InjectRepository(CitizenOtp)
    private readonly otpRepository: Repository<CitizenOtp>,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly communicationGateway: CommunicationGatewayService,
  ) {}

  private normalizePhone(phone: string): string {
    return phone.replace(/\D/g, '');
  }

  private birthDateToYyyyMmDd(value: string | Date | null | undefined): string | null {
    if (value == null) return null;
    if (typeof value === 'string') {
      return value.length >= 10 ? value.slice(0, 10) : value;
    }
    const d = value;
    const y = d.getUTCFullYear();
    const m = String(d.getUTCMonth() + 1).padStart(2, '0');
    const day = String(d.getUTCDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  }

  private getCitizenJwtSecret(): string {
    const base = this.configService.get<string>('JWT_SECRET', 'resolve-secret');
    return this.configService.get<string>('JWT_CITIZEN_SECRET', `${base}-citizen`);
  }

  private getCitizenJwtExpires(): string {
    return this.configService.get<string>('JWT_CITIZEN_EXPIRES_IN', '7d');
  }

  private getCitizenPwdResetJwtExpires(): string {
    return this.configService.get<string>(
      'JWT_CITIZEN_PWD_RESET_EXPIRES_IN',
      '15m',
    );
  }

  private assertReasonableBirthDate(isoDate: string): void {
    const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(isoDate);
    if (!m) {
      throw new BadRequestException('Data de nascimento inválida');
    }
    const y = Number(m[1]);
    const mo = Number(m[2]);
    const d = Number(m[3]);
    const dt = new Date(Date.UTC(y, mo - 1, d));
    if (
      dt.getUTCFullYear() !== y ||
      dt.getUTCMonth() !== mo - 1 ||
      dt.getUTCDate() !== d
    ) {
      throw new BadRequestException('Data de nascimento inválida');
    }
    const today = new Date();
    const todayUtc = Date.UTC(
      today.getUTCFullYear(),
      today.getUTCMonth(),
      today.getUTCDate(),
    );
    if (dt.getTime() > todayUtc) {
      throw new BadRequestException('Data de nascimento não pode ser futura');
    }
    const minBirth = Date.UTC(
      today.getUTCFullYear() - 120,
      today.getUTCMonth(),
      today.getUTCDate(),
    );
    if (dt.getTime() < minBirth) {
      throw new BadRequestException('Data de nascimento inválida');
    }
  }

  private async issueCitizenJwt(citizen: Citizen): Promise<string> {
    return this.jwtService.signAsync(
      {
        sub: citizen.id,
        companyId: citizen.companyId,
        cityId: citizen.cityId,
        phone: citizen.phone,
        typ: 'citizen',
      },
      {
        secret: this.getCitizenJwtSecret(),
        expiresIn: this.getCitizenJwtExpires() as never,
      },
    );
  }

  private async issuePasswordResetJwt(citizenId: string): Promise<string> {
    return this.jwtService.signAsync(
      {
        sub: citizenId,
        typ: 'citizen_pwd_reset',
      },
      {
        secret: this.getCitizenJwtSecret(),
        expiresIn: this.getCitizenPwdResetJwtExpires() as never,
      },
    );
  }

  /**
   * Consome o OTP (gateway WhatsApp ou tabela local) para o telefone informado.
   * Não carrega o cidadão; o chamador deve garantir que o telefone está cadastrado.
   */
  private async consumeCitizenOtp(phone: string, code: string): Promise<void> {
    if (this.communicationGateway.isEnabled()) {
      const destination =
        this.communicationGateway.formatWhatsAppDestination(phone);
      const result = await this.communicationGateway.verifyOtp(
        destination,
        code,
      );
      if (!result.valid) {
        const msg =
          result.reason === 'expired'
            ? 'Código expirado. Solicite um novo código pelo WhatsApp.'
            : result.reason === 'max_attempts_exceeded'
              ? 'Muitas tentativas incorretas. Solicite um novo código.'
              : result.reason === 'already_used'
                ? 'Este código já foi utilizado. Solicite um novo.'
                : 'Código inválido.';
        throw new UnauthorizedException(msg);
      }
      await this.otpRepository.delete({ phone });
      return;
    }

    const otpRow = await this.otpRepository.findOne({ where: { phone } });
    if (!otpRow || otpRow.expiresAt.getTime() < Date.now()) {
      if (otpRow) {
        await this.otpRepository.delete({ phone });
      }
      throw new UnauthorizedException(
        'Código expirado ou inexistente. Solicite um novo código.',
      );
    }

    const match = await bcrypt.compare(code, otpRow.codeHash);
    if (!match) {
      throw new UnauthorizedException('Código inválido');
    }

    await this.otpRepository.delete({ phone });
  }

  async register(dto: CitizenRegisterDto): Promise<{ message: string }> {
    const phone = this.normalizePhone(dto.phone);
    const city = await this.cityRepository.findOne({
      where: { id: dto.cityId, status: 'ativo' },
    });
    if (!city) {
      throw new BadRequestException('Cidade inválida ou inativa');
    }

    const company = await this.companyRepository.findOne({
      where: { id: dto.companyId, status: 'ativo' },
    });
    if (!company) {
      throw new BadRequestException('Órgão inválido ou inativo');
    }

    const exists = await this.citizenRepository.findOne({ where: { phone } });
    if (exists) {
      throw new ConflictException('Este número já está cadastrado');
    }

    let birth: string | null = null;
    if (dto.birthDate) {
      this.assertReasonableBirthDate(dto.birthDate);
      birth = dto.birthDate;
    }

    const passwordHash = await bcrypt.hash(dto.password, 10);
    const citizen = this.citizenRepository.create({
      companyId: company.id,
      cityId: city.id,
      phone,
      name: dto.name.trim(),
      birthDate: birth,
      passwordHash,
    });
    await this.citizenRepository.save(citizen);

    return { message: 'Cadastro realizado com sucesso' };
  }

  async sendOtp(
    dto: CitizenSendOtpDto,
  ): Promise<{ message: string; devCode?: string }> {
    const phone = this.normalizePhone(dto.phone);
    const citizen = await this.citizenRepository.findOne({ where: { phone } });
    if (!citizen) {
      throw new NotFoundException(
        'Celular não cadastrado. Faça o cadastro primeiro.',
      );
    }

    if (this.communicationGateway.isEnabled()) {
      const destination = this.communicationGateway.formatWhatsAppDestination(
        phone,
      );
      await this.communicationGateway.sendOtpWhatsApp(destination);
      await this.otpRepository.delete({ phone });
      return {
        message:
          'Enviamos um código de 6 dígitos para o WhatsApp cadastrado. Verifique suas mensagens.',
      };
    }

    const code = String(randomInt(0, 1_000_000)).padStart(6, '0');
    const codeHash = await bcrypt.hash(code, 10);
    const minutes = Number(
      this.configService.get<string>('OTP_EXPIRES_MINUTES', '10'),
    );
    const expiresAt = new Date(Date.now() + minutes * 60_000);

    await this.otpRepository.save(
      this.otpRepository.create({ phone, codeHash, expiresAt }),
    );

    if (
      this.configService.get<string>('OTP_LOG_CODE_IN_CONSOLE', 'true') ===
      'true'
    ) {
      this.logger.warn(
        `[OTP cidadão] telefone ${phone} → código ${code} (expira em ${minutes} min)`,
      );
    }

    const out: { message: string; devCode?: string } = {
      message:
        'Se configurado, o código foi enviado por SMS. Em desenvolvimento, verifique o log do servidor.',
    };

    if (
      this.configService.get<string>('OTP_RETURN_CODE_IN_RESPONSE', 'false') ===
      'true'
    ) {
      out.devCode = code;
    }

    return out;
  }

  async login(
    dto: CitizenLoginDto,
  ): Promise<{ user: CitizenMeResponseDto; token: string }> {
    const phone = this.normalizePhone(dto.phone);
    const citizen = await this.citizenRepository.findOne({
      where: { phone },
      relations: ['city'],
    });
    if (!citizen) {
      throw new UnauthorizedException('Credenciais inválidas');
    }

    await this.consumeCitizenOtp(phone, dto.code);

    const token = await this.issueCitizenJwt(citizen);

    return {
      user: this.toMeDto(citizen),
      token,
    };
  }

  /**
   * Valida o código enviado ao WhatsApp (mesmo fluxo do login) e retorna JWT
   * de uso único para concluir a redefinição de senha.
   */
  async verifyPasswordResetCode(
    dto: CitizenLoginDto,
  ): Promise<{ resetToken: string }> {
    const phone = this.normalizePhone(dto.phone);
    const citizen = await this.citizenRepository.findOne({
      where: { phone },
    });
    if (!citizen) {
      throw new UnauthorizedException('Código inválido ou expirado.');
    }

    await this.consumeCitizenOtp(phone, dto.code);

    const resetToken = await this.issuePasswordResetJwt(citizen.id);
    return { resetToken };
  }

  async completePasswordReset(
    dto: CitizenPasswordResetCompleteDto,
  ): Promise<{ message: string }> {
    let payload: { sub: string; typ?: string };
    try {
      payload = await this.jwtService.verifyAsync<{
        sub: string;
        typ?: string;
      }>(dto.resetToken, { secret: this.getCitizenJwtSecret() });
    } catch {
      throw new UnauthorizedException(
        'Link de recuperação inválido ou expirado. Solicite um novo código.',
      );
    }
    if (payload.typ !== 'citizen_pwd_reset') {
      throw new UnauthorizedException(
        'Link de recuperação inválido ou expirado. Solicite um novo código.',
      );
    }

    const citizen = await this.citizenRepository.findOne({
      where: { id: payload.sub },
    });
    if (!citizen) {
      throw new UnauthorizedException(
        'Link de recuperação inválido ou expirado. Solicite um novo código.',
      );
    }

    citizen.passwordHash = await bcrypt.hash(dto.newPassword, 10);
    await this.citizenRepository.save(citizen);

    return { message: 'Senha alterada com sucesso. Faça login com a nova senha.' };
  }

  async recoverPhone(dto: CitizenPhoneRecoveryDto): Promise<{ message: string }> {
    const oldPhone = this.normalizePhone(dto.oldPhone);
    const newPhone = this.normalizePhone(dto.newPhone);

    if (oldPhone === newPhone) {
      throw new BadRequestException('O novo número deve ser diferente do antigo.');
    }

    const citizen = await this.citizenRepository.findOne({
      where: { phone: oldPhone },
    });
    if (!citizen) {
      throw new BadRequestException(
        'Os dados informados não conferem com o cadastro.',
      );
    }

    const storedBirth = this.birthDateToYyyyMmDd(citizen.birthDate);
    if (storedBirth) {
      if (!dto.birthDate || dto.birthDate !== storedBirth) {
        throw new BadRequestException(
          'Os dados informados não conferem com o cadastro.',
        );
      }
      this.assertReasonableBirthDate(dto.birthDate);
    } else {
      if (!dto.password?.trim()) {
        throw new BadRequestException(
          'Informe sua senha atual para confirmar sua identidade (seu cadastro não possui data de nascimento).',
        );
      }
      const pwdOk = await bcrypt.compare(dto.password, citizen.passwordHash);
      if (!pwdOk) {
        throw new BadRequestException(
          'Os dados informados não conferem com o cadastro.',
        );
      }
    }

    const taken = await this.citizenRepository.findOne({
      where: { phone: newPhone },
    });
    if (taken) {
      throw new ConflictException('Este número já está cadastrado');
    }

    citizen.phone = newPhone;
    await this.citizenRepository.save(citizen);

    return {
      message:
        'Telefone atualizado com sucesso. Use o novo número para entrar no app.',
    };
  }

  async loginWithPassword(
    dto: CitizenPasswordLoginDto,
  ): Promise<{ user: CitizenMeResponseDto; token: string }> {
    const phone = this.normalizePhone(dto.phone);
    const citizen = await this.citizenRepository.findOne({
      where: { phone },
      relations: ['city'],
    });
    if (!citizen) {
      throw new UnauthorizedException('Credenciais inválidas');
    }

    const match = await bcrypt.compare(dto.password, citizen.passwordHash);
    if (!match) {
      throw new UnauthorizedException('Credenciais inválidas');
    }

    const token = await this.issueCitizenJwt(citizen);

    return {
      user: this.toMeDto(citizen),
      token,
    };
  }

  /**
   * Perfil + JWT renovado (mesma validade a partir de agora).
   * Permite sessão deslizante no app enquanto o usuário usar antes do fim do prazo.
   */
  async me(citizenId: string): Promise<{ user: CitizenMeResponseDto; token: string }> {
    const citizen = await this.citizenRepository.findOne({
      where: { id: citizenId },
      relations: ['city'],
    });
    if (!citizen) {
      throw new UnauthorizedException('Sessão inválida');
    }
    const user = this.toMeDto(citizen);
    const token = await this.issueCitizenJwt(citizen);
    return { user, token };
  }

  async updateProfile(
    jwtPayload: CitizenJwtPayload,
    dto: CitizenUpdateProfileDto,
  ): Promise<{ user: CitizenMeResponseDto; token?: string }> {
    const citizen = await this.citizenRepository.findOne({
      where: { id: jwtPayload.sub },
      relations: ['city'],
    });
    if (!citizen || citizen.companyId !== jwtPayload.companyId) {
      throw new UnauthorizedException('Sessão inválida');
    }

    let changed = false;
    let phoneChanged = false;

    if (dto.name !== undefined) {
      const n = dto.name.trim();
      if (n.length < 2) {
        throw new BadRequestException('Nome inválido');
      }
      if (n !== citizen.name) {
        citizen.name = n;
        changed = true;
      }
    }

    if (dto.phone !== undefined) {
      const phone = this.normalizePhone(dto.phone);
      if (phone !== citizen.phone) {
        const taken = await this.citizenRepository.findOne({
          where: { phone },
        });
        if (taken && taken.id !== citizen.id) {
          throw new ConflictException('Este telefone já está em uso');
        }
        citizen.phone = phone;
        changed = true;
        phoneChanged = true;
      }
    }

    if (dto.avatarKey !== undefined) {
      const next =
        dto.avatarKey === null || String(dto.avatarKey).trim() === ''
          ? null
          : String(dto.avatarKey).trim();
      if (next !== citizen.avatarKey) {
        citizen.avatarKey = next;
        changed = true;
      }
    }

    if (changed) {
      await this.citizenRepository.save(citizen);
    }

    const user = this.toMeDto(citizen);

    if (!phoneChanged) {
      return { user };
    }

    const token = await this.issueCitizenJwt(citizen);

    return { user, token };
  }

  async deleteAccount(
    jwtPayload: CitizenJwtPayload,
    dto: CitizenDeleteAccountDto,
  ): Promise<{ message: string }> {
    const citizen = await this.citizenRepository.findOne({
      where: { id: jwtPayload.sub },
    });
    if (!citizen || citizen.companyId !== jwtPayload.companyId) {
      throw new UnauthorizedException('Sessão inválida');
    }

    const pwdOk = await bcrypt.compare(dto.password, citizen.passwordHash);
    if (!pwdOk) {
      throw new UnauthorizedException('Senha incorreta.');
    }

    const id = citizen.id;
    const phone = citizen.phone;

    await this.citizenRepository.manager.transaction(async (trx) => {
      await trx.delete(Feedback, { citizenId: id });
      await trx.update(
        Ticket,
        { citizenId: id },
        {
          citizenId: null,
          citizenName: 'Conta encerrada',
          citizenPhone: '0000000000',
        },
      );
      await trx.delete(CitizenOtp, { phone });
      await trx.delete(Citizen, { id });
    });

    return { message: 'Sua conta foi excluída permanentemente.' };
  }

  async registerExpoPushToken(
    citizenId: string,
    expoPushToken?: string,
  ): Promise<{ ok: true }> {
    const citizen = await this.citizenRepository.findOne({
      where: { id: citizenId },
    });
    if (!citizen) {
      throw new UnauthorizedException('Sessão inválida');
    }
    if (expoPushToken === undefined) {
      return { ok: true };
    }
    const trimmed = expoPushToken.trim();
    citizen.expoPushToken = trimmed === '' ? null : trimmed;
    await this.citizenRepository.save(citizen);
    return { ok: true };
  }

  private toMeDto(citizen: Citizen): CitizenMeResponseDto {
    return {
      id: citizen.id,
      companyId: citizen.companyId,
      phone: citizen.phone,
      name: citizen.name,
      cityId: citizen.cityId,
      cityName: citizen.city?.name,
      birthDate: this.birthDateToYyyyMmDd(citizen.birthDate) ?? undefined,
      avatarKey: citizen.avatarKey,
    };
  }
}
