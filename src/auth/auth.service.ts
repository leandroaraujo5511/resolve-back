import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
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
    private readonly config: ConfigService,
  ) {}

  private getRefreshSecret(): string {
    return this.config.get<string>(
      'JWT_REFRESH_SECRET',
      this.config.get<string>('JWT_SECRET', 'resolve-secret'),
    );
  }

  private getAccessExpires(): string {
    return this.config.get<string>('JWT_ACCESS_EXPIRES_IN', '15m');
  }

  private getRefreshExpires(): string {
    return this.config.get<string>('JWT_REFRESH_EXPIRES_IN', '7d');
  }

  private buildAccessPayload(user: {
    id: string;
    companyId: string | null | undefined;
    companyCityId: string | null;
    email: string;
    role: JwtPayload['role'];
    departmentId?: string | null;
  }): JwtPayload {
    return {
      sub: user.id,
      companyId: user.companyId ?? null,
      companyCityId: user.companyCityId,
      email: user.email,
      role: user.role,
      departmentId: user.departmentId ?? null,
    };
  }

  private async signAccessToken(payload: JwtPayload): Promise<string> {
    const secret = this.config.get<string>('JWT_SECRET', 'resolve-secret');
    return this.jwtService.signAsync(payload, {
      secret,
      expiresIn: this.getAccessExpires() as never,
    });
  }

  private async signRefreshToken(userId: string): Promise<string> {
    return this.jwtService.signAsync(
      { sub: userId, typ: 'refresh' as const },
      {
        secret: this.getRefreshSecret(),
        expiresIn: this.getRefreshExpires() as never,
      },
    );
  }

  async login(loginDto: LoginDto): Promise<{
    user: AuthUser;
    token: string;
    refreshToken: string;
  }> {
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

    const payload = this.buildAccessPayload({
      id: user.id,
      companyId: user.companyId,
      companyCityId,
      email: user.email,
      role: user.role,
      departmentId: user.departmentId,
    });

    const [token, refreshToken] = await Promise.all([
      this.signAccessToken(payload),
      this.signRefreshToken(user.id),
    ]);

    return {
      user: authUser,
      token,
      refreshToken,
    };
  }

  async refresh(
    refreshToken: string,
  ): Promise<{ token: string; refreshToken: string }> {
    let sub: string;
    try {
      const decoded = await this.jwtService.verifyAsync<{
        sub: string;
        typ?: string;
      }>(refreshToken, { secret: this.getRefreshSecret() });
      if (decoded.typ !== 'refresh') {
        throw new UnauthorizedException('Token inválido');
      }
      sub = decoded.sub;
    } catch {
      throw new UnauthorizedException('Refresh token inválido ou expirado');
    }

    const authUser = await this.usersService.findAuthUserById(sub);
    if (!authUser || authUser.status !== 'ativo') {
      throw new UnauthorizedException('Usuário inválido ou inativo');
    }

    const payload = this.buildAccessPayload({
      id: authUser.id,
      companyId: authUser.companyId,
      companyCityId: authUser.companyCityId ?? null,
      email: authUser.email,
      role: authUser.role,
      departmentId: authUser.departmentId,
    });

    const [token, newRefresh] = await Promise.all([
      this.signAccessToken(payload),
      this.signRefreshToken(authUser.id),
    ]);

    return { token, refreshToken: newRefresh };
  }

  async me(userId: string): Promise<AuthUser> {
    const authUser = await this.usersService.findAuthUserById(userId);
    if (!authUser) {
      throw new UnauthorizedException('Usuário não encontrado');
    }
    return authUser;
  }
}
