import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiTooManyRequestsResponse,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import type { Request } from 'express';
import { AuthService } from './auth.service';
import { PanelPasswordResetService } from './panel-password-reset.service';
import { LoginDto } from './dto/login.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { AllowPasswordChangePending } from '../common/decorators/allow-password-change-pending.decorator';
import type { JwtPayload } from './interfaces/auth-user.interface';
import {
  AuthUserResponseDto,
  LoginResponseDto,
  RefreshResponseDto,
} from './dto/auth-user.response';
import { RefreshTokenDto } from './dto/refresh-token.dto';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly panelPasswordResetService: PanelPasswordResetService,
  ) {}

  @ApiOperation({ summary: 'Login do painel (e-mail e senha)' })
  @ApiBody({ type: LoginDto })
  @ApiOkResponse({ type: LoginResponseDto })
  @ApiUnauthorizedResponse({ description: 'Credenciais inválidas' })
  @Post('login')
  login(@Body() loginDto: LoginDto) {
    return this.authService.login(loginDto);
  }

  @ApiOperation({
    summary: 'Solicitar recuperação de senha do painel',
    description:
      'Sempre retorna mensagem neutra. Envia e-mail com link se o usuário existir e estiver ativo.',
  })
  @ApiBody({ type: ForgotPasswordDto })
  @ApiOkResponse({
    schema: {
      example: {
        message:
          'Se o e-mail estiver cadastrado, você receberá instruções.',
      },
    },
  })
  @ApiTooManyRequestsResponse({ description: 'Rate limit excedido' })
  @HttpCode(HttpStatus.OK)
  @Post('forgot-password')
  forgotPassword(@Body() dto: ForgotPasswordDto, @Req() req: Request) {
    const forwarded = req.headers['x-forwarded-for'];
    const fromForwarded =
      typeof forwarded === 'string'
        ? forwarded.split(',')[0]?.trim()
        : Array.isArray(forwarded)
          ? forwarded[0]
          : undefined;
    const ip =
      fromForwarded ||
      req.ip ||
      req.socket?.remoteAddress ||
      null;
    return this.panelPasswordResetService.forgotPassword(dto, ip);
  }

  @ApiOperation({
    summary: 'Redefinir senha com token do e-mail',
  })
  @ApiBody({ type: ResetPasswordDto })
  @ApiOkResponse({
    schema: {
      example: {
        message: 'Senha redefinida com sucesso. Faça login com a nova senha.',
      },
    },
  })
  @HttpCode(HttpStatus.OK)
  @Post('reset-password')
  resetPassword(@Body() dto: ResetPasswordDto) {
    return this.panelPasswordResetService.resetPassword(dto);
  }

  @ApiOperation({
    summary: 'Renovar access token (refresh token)',
    description:
      'Envie o refreshToken do login. Retorna novo par access + refresh (rotação). Valida tokenVersion (R-11).',
  })
  @ApiBody({ type: RefreshTokenDto })
  @ApiOkResponse({ type: RefreshResponseDto })
  @ApiUnauthorizedResponse({ description: 'Refresh inválido ou expirado' })
  @HttpCode(HttpStatus.OK)
  @Post('refresh')
  refresh(@Body() dto: RefreshTokenDto) {
    return this.authService.refresh(dto.refreshToken);
  }

  @ApiOperation({ summary: 'Retorna usuário autenticado do painel' })
  @ApiBearerAuth()
  @ApiOkResponse({ type: AuthUserResponseDto })
  @ApiUnauthorizedResponse({ description: 'Token inválido ou expirado' })
  @AllowPasswordChangePending()
  @UseGuards(JwtAuthGuard)
  @Get('me')
  me(@CurrentUser() user: JwtPayload) {
    return this.authService.me(user.sub);
  }

  @ApiOperation({
    summary: 'Altera a própria senha',
    description:
      'Usado no primeiro acesso (mustChangePassword) e troca voluntária. Emite novos tokens e incrementa tokenVersion.',
  })
  @ApiBearerAuth()
  @ApiBody({ type: ChangePasswordDto })
  @ApiOkResponse({ type: LoginResponseDto })
  @ApiUnauthorizedResponse({ description: 'Token inválido ou expirado' })
  @AllowPasswordChangePending()
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  @Post('change-password')
  changePassword(
    @CurrentUser() user: JwtPayload,
    @Body() dto: ChangePasswordDto,
  ) {
    return this.authService.changePassword(user.sub, dto);
  }
}
