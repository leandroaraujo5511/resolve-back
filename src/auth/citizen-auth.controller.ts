import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { CitizenAuthService } from './citizen-auth.service';
import { CurrentCitizen } from './decorators/current-citizen.decorator';
import { CitizenJwtAuthGuard } from './guards/citizen-jwt-auth.guard';
import type { CitizenJwtPayload } from './interfaces/citizen-jwt.interface';
import { CitizenLoginDto } from './dto/citizen-login.dto';
import { CitizenPasswordLoginDto } from './dto/citizen-password-login.dto';
import { CitizenRegisterDto } from './dto/citizen-register.dto';
import { CitizenSendOtpDto } from './dto/citizen-send-otp.dto';
import {
  CitizenLoginResponseDto,
  CitizenMeResponseDto,
} from './dto/citizen-me.response.dto';
import { CitizenExpoPushTokenDto } from './dto/citizen-expo-push-token.dto';
import { CitizenUpdateProfileDto } from './dto/citizen-update-profile.dto';

@ApiTags('Auth — Cidadão')
@Controller('auth/citizen')
export class CitizenAuthController {
  constructor(private readonly citizenAuthService: CitizenAuthService) {}

  @ApiOperation({
    summary: 'Cadastro do cidadão (telefone, nome, senha, município)',
  })
  @ApiBody({ type: CitizenRegisterDto })
  @ApiCreatedResponse({
    schema: {
      example: { message: 'Cadastro realizado com sucesso' },
    },
  })
  @ApiConflictResponse({ description: 'Telefone já cadastrado' })
  @HttpCode(HttpStatus.CREATED)
  @Post('register')
  register(@Body() dto: CitizenRegisterDto) {
    return this.citizenAuthService.register(dto);
  }

  @ApiOperation({
    summary: 'Solicita código OTP (6 dígitos) para login',
    description:
      'Em desenvolvimento o código aparece no log do servidor (OTP_LOG_CODE_IN_CONSOLE).',
  })
  @ApiBody({ type: CitizenSendOtpDto })
  @ApiOkResponse({
    schema: {
      example: {
        message: '...',
        devCode: '123456',
      },
    },
  })
  @ApiNotFoundResponse({ description: 'Celular não cadastrado' })
  @Post('otp/send')
  sendOtp(@Body() dto: CitizenSendOtpDto) {
    return this.citizenAuthService.sendOtp(dto);
  }

  @ApiOperation({ summary: 'Login com telefone + código OTP' })
  @ApiBody({ type: CitizenLoginDto })
  @ApiOkResponse({ type: CitizenLoginResponseDto })
  @ApiUnauthorizedResponse({ description: 'Código inválido ou expirado' })
  @Post('login')
  login(@Body() dto: CitizenLoginDto) {
    return this.citizenAuthService.login(dto);
  }

  @ApiOperation({ summary: 'Login com telefone + senha' })
  @ApiBody({ type: CitizenPasswordLoginDto })
  @ApiOkResponse({ type: CitizenLoginResponseDto })
  @ApiUnauthorizedResponse({ description: 'Telefone ou senha inválidos' })
  @Post('login/password')
  loginWithPassword(@Body() dto: CitizenPasswordLoginDto) {
    return this.citizenAuthService.loginWithPassword(dto);
  }

  @ApiOperation({ summary: 'Perfil do cidadão autenticado' })
  @ApiBearerAuth()
  @ApiOkResponse({ type: CitizenMeResponseDto })
  @ApiUnauthorizedResponse({ description: 'Token cidadão inválido' })
  @UseGuards(CitizenJwtAuthGuard)
  @Get('me')
  me(@CurrentCitizen() citizen: CitizenJwtPayload) {
    return this.citizenAuthService.me(citizen.sub);
  }

  @ApiOperation({
    summary: 'Atualizar perfil (nome, telefone, foto)',
    description:
      'O município (cityId) não pode ser alterado por esta rota. Se o telefone mudar, a resposta pode incluir um novo JWT.',
  })
  @ApiBearerAuth()
  @ApiBody({ type: CitizenUpdateProfileDto })
  @ApiOkResponse({
    description:
      'Retorna { user, token? }. O campo token só vem quando o telefone foi alterado (novo JWT).',
  })
  @ApiConflictResponse({ description: 'Telefone já em uso por outra conta' })
  @ApiUnauthorizedResponse({ description: 'Token cidadão inválido' })
  @UseGuards(CitizenJwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  @Patch('me')
  updateMe(
    @CurrentCitizen() citizen: CitizenJwtPayload,
    @Body() dto: CitizenUpdateProfileDto,
  ) {
    return this.citizenAuthService.updateProfile(citizen, dto);
  }

  @ApiOperation({
    summary: 'Registrar token de push (Expo)',
    description:
      'Associa o token ao cidadão logado. Envie string vazio para remover o token.',
  })
  @ApiBearerAuth()
  @ApiOkResponse({ schema: { example: { ok: true } } })
  @ApiUnauthorizedResponse({ description: 'Token cidadão inválido' })
  @UseGuards(CitizenJwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  @Post('push-token')
  registerPushToken(
    @CurrentCitizen() citizen: CitizenJwtPayload,
    @Body() dto: CitizenExpoPushTokenDto,
  ) {
    return this.citizenAuthService.registerExpoPushToken(
      citizen.sub,
      dto.expoPushToken,
    );
  }
}
