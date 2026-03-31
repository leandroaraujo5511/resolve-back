import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { UsersService } from '../users/users.service';
import { LoginDto } from './dto/login.dto';
import { AuthUser, JwtPayload } from './interfaces/auth-user.interface';

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
  ) {}

  async login(loginDto: LoginDto): Promise<{ user: AuthUser; token: string }> {
    const user = await this.usersService.findByEmail(loginDto.email);
    if (!user) {
      throw new UnauthorizedException('Credenciais inválidas');
    }

    const isPasswordValid = await bcrypt.compare(
      loginDto.password,
      user.passwordHash,
    );
    if (!isPasswordValid) {
      throw new UnauthorizedException('Credenciais inválidas');
    }

    const companyCityId = user.company?.cityId ?? null;

    const authUser: AuthUser = {
      id: user.id,
      companyId: user.companyId ?? null,
      companyCityId,
      name: user.name,
      email: user.email,
      phone: user.phone,
      role: user.role,
      status: user.status,
      departmentId: user.departmentId,
    };

    const payload: JwtPayload = {
      sub: user.id,
      companyId: user.companyId ?? null,
      companyCityId,
      email: user.email,
      role: user.role,
    };

    return {
      user: authUser,
      token: await this.jwtService.signAsync(payload),
    };
  }

  async me(userId: string): Promise<AuthUser> {
    const authUser = await this.usersService.findAuthUserById(userId);
    if (!authUser) {
      throw new UnauthorizedException('Usuário não encontrado');
    }
    return authUser;
  }
}
