import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { UsersService } from '../users/users.service';
import { LoginDto } from './dto/login.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
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
    subDepartmentId?: string | null;
    mustChangePassword?: boolean;
  }): JwtPayload {
    return {
      sub: user.id,
      companyId: user.companyId ?? null,
      companyCityId: user.companyCityId,
      email: user.email,
      role: user.role,
      departmentId: user.departmentId ?? null,
      subDepartmentId: user.subDepartmentId ?? null,
      mustChangePassword: Boolean(user.mustChangePassword),
    };
  }

  private async signAccessToken(payload: JwtPayload): Promise<string> {
    const secret = this.config.get<string>('JWT_SECRET', 'resolve-secret');
    return this.jwtService.signAsync(payload, {
      secret,
      expiresIn: this.getAccessExpires() as never,
    });
  }

  private async signRefreshToken(
    userId: string,
    tokenVersion: number,
  ): Promise<string> {
    return this.jwtService.signAsync(
      {
        sub: userId,
        typ: 'refresh' as const,
        tv: tokenVersion,
      },
      {
        secret: this.getRefreshSecret(),
        expiresIn: this.getRefreshExpires() as never,
      },
    );
  }

  private async issueTokenPair(authUser: AuthUser): Promise<{
    user: AuthUser;
    token: string;
    refreshToken: string;
  }> {
    const tokenVersion = await this.usersService.getTokenVersion(authUser.id);
    const payload = this.buildAccessPayload({
      id: authUser.id,
      companyId: authUser.companyId,
      companyCityId: authUser.companyCityId ?? null,
      email: authUser.email,
      role: authUser.role,
      departmentId: authUser.departmentId,
      subDepartmentId: authUser.subDepartmentId,
      mustChangePassword: authUser.mustChangePassword,
    });

    const [token, refreshToken] = await Promise.all([
      this.signAccessToken(payload),
      this.signRefreshToken(authUser.id, tokenVersion),
    ]);

    return { user: authUser, token, refreshToken };
  }

  async login(loginDto: LoginDto): Promise<{
    user: AuthUser;
    token: string;
    refreshToken: string;
  }> {
    const user = await this.usersService.findByEmail(loginDto.email);
    if (!user || user.status !== 'ativo') {
      throw new UnauthorizedException('Credenciais inv?lidas');
    }

    const isPasswordValid = await bcrypt.compare(
      loginDto.password,
      user.passwordHash,
    );
    if (!isPasswordValid) {
      throw new UnauthorizedException('Credenciais inv?lidas');
    }

    const authUser = this.usersService.toAuthUserPublic(user);
    return this.issueTokenPair(authUser);
  }

  async refresh(
    refreshToken: string,
  ): Promise<{ token: string; refreshToken: string }> {
    let sub: string;
    let tv: number | undefined;
    try {
      const decoded = await this.jwtService.verifyAsync<{
        sub: string;
        typ?: string;
        tv?: number;
      }>(refreshToken, { secret: this.getRefreshSecret() });
      if (decoded.typ !== 'refresh') {
        throw new UnauthorizedException('Token inv?lido');
      }
      sub = decoded.sub;
      tv = decoded.tv;
    } catch {
      throw new UnauthorizedException('Refresh token inv?lido ou expirado');
    }

    const authUser = await this.usersService.findAuthUserById(sub);
    if (!authUser || authUser.status !== 'ativo') {
      throw new UnauthorizedException('Usu?rio inv?lido ou inativo');
    }

    const currentVersion = await this.usersService.getTokenVersion(sub);
    // Tokens sem `tv` (legado) s? aceitos se version atual for 0
    if (tv === undefined) {
      if (currentVersion !== 0) {
        throw new UnauthorizedException('Refresh token inv?lido ou expirado');
      }
    } else if (tv !== currentVersion) {
      throw new UnauthorizedException('Refresh token inv?lido ou expirado');
    }

    const payload = this.buildAccessPayload({
      id: authUser.id,
      companyId: authUser.companyId,
      companyCityId: authUser.companyCityId ?? null,
      email: authUser.email,
      role: authUser.role,
      departmentId: authUser.departmentId,
      subDepartmentId: authUser.subDepartmentId,
      mustChangePassword: authUser.mustChangePassword,
    });

    const [token, newRefresh] = await Promise.all([
      this.signAccessToken(payload),
      this.signRefreshToken(authUser.id, currentVersion),
    ]);

    return { token, refreshToken: newRefresh };
  }

  async me(userId: string): Promise<AuthUser> {
    const authUser = await this.usersService.findAuthUserById(userId);
    if (!authUser) {
      throw new UnauthorizedException('Usu?rio n?o encontrado');
    }
    return authUser;
  }

  async changePassword(
    userId: string,
    dto: ChangePasswordDto,
  ): Promise<{ user: AuthUser; token: string; refreshToken: string }> {
    await this.usersService.changeOwnPassword(
      userId,
      dto.currentPassword,
      dto.newPassword,
    );
    const authUser = await this.usersService.findAuthUserById(userId);
    if (!authUser) {
      throw new UnauthorizedException('Usu?rio n?o encontrado');
    }
    return this.issueTokenPair(authUser);
  }
}
