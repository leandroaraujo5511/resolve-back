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
import type { CitizenMeResponseDto } from './dto/citizen-me.response.dto';
import type { CitizenJwtPayload } from './interfaces/citizen-jwt.interface';

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
  ) {}

  private normalizePhone(phone: string): string {
    return phone.replace(/\D/g, '');
  }

  private getCitizenJwtSecret(): string {
    const base = this.configService.get<string>('JWT_SECRET', 'resolve-secret');
    return this.configService.get<string>('JWT_CITIZEN_SECRET', `${base}-citizen`);
  }

  private getCitizenJwtExpires(): string {
    return this.configService.get<string>('JWT_CITIZEN_EXPIRES_IN', '7d');
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

    const passwordHash = await bcrypt.hash(dto.password, 10);
    const citizen = this.citizenRepository.create({
      companyId: company.id,
      cityId: city.id,
      phone,
      name: dto.name.trim(),
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

    const otpRow = await this.otpRepository.findOne({ where: { phone } });
    if (!otpRow || otpRow.expiresAt.getTime() < Date.now()) {
      if (otpRow) {
        await this.otpRepository.delete({ phone });
      }
      throw new UnauthorizedException(
        'Código expirado ou inexistente. Solicite um novo código.',
      );
    }

    const match = await bcrypt.compare(dto.code, otpRow.codeHash);
    if (!match) {
      throw new UnauthorizedException('Código inválido');
    }

    await this.otpRepository.delete({ phone });

    const token = await this.jwtService.signAsync(
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

    return {
      user: this.toMeDto(citizen),
      token,
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

    const token = await this.jwtService.signAsync(
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

    return {
      user: this.toMeDto(citizen),
      token,
    };
  }

  async me(citizenId: string): Promise<CitizenMeResponseDto> {
    const citizen = await this.citizenRepository.findOne({
      where: { id: citizenId },
      relations: ['city'],
    });
    if (!citizen) {
      throw new UnauthorizedException('Sessão inválida');
    }
    return this.toMeDto(citizen);
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

    const token = await this.jwtService.signAsync(
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

    return { user, token };
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
      avatarKey: citizen.avatarKey,
    };
  }
}
