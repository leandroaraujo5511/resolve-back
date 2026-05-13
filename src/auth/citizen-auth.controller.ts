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
import { CitizenPasswordResetCompleteDto } from './dto/citizen-password-reset-complete.dto';
import { CitizenPhoneRecoveryDto } from './dto/citizen-phone-recovery.dto';
import { CitizenDeleteAccountDto } from './dto/citizen-delete-account.dto';

@ApiTags('Auth — Cidadão')
@Controller('auth/citizen')
export class CitizenAuthController {
  constructor(private readonly citizenAuthService: CitizenAuthService) {}

  @ApiOperation({
    summary: 'Cadastro do cidadão (telefone, nome, senha, município)',
    description:
      'Data de nascimento é opcional. Quando informada, deve estar no formato AAAA-MM-DD.',
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
      'Com COMMUNICATION_GATEWAY_* configurado, o código é enviado por WhatsApp via gateway. ' +
      'Sem gateway, o código fica no log (OTP_LOG_CODE_IN_CONSOLE) e opcionalmente na resposta (OTP_RETURN_CODE_IN_RESPONSE).',
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

  @ApiOperation({
    summary: 'Recuperação de senha — validar código do WhatsApp',
    description:
      'Use o mesmo código enviado por POST /auth/citizen/otp/send para este telefone. ' +
      'Retorna um resetToken (JWT) para POST /auth/citizen/password-reset/complete.',
  })
  @ApiBody({ type: CitizenLoginDto })
  @ApiOkResponse({
    schema: { example: { resetToken: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...' } },
  })
  @ApiUnauthorizedResponse({ description: 'Código inválido ou expirado' })
  @HttpCode(HttpStatus.OK)
  @Post('password-reset/verify-code')
  verifyPasswordResetCode(@Body() dto: CitizenLoginDto) {
    return this.citizenAuthService.verifyPasswordResetCode(dto);
  }

  @ApiOperation({
    summary: 'Recuperação de senha — definir nova senha',
    description: 'Envie o resetToken obtido em password-reset/verify-code.',
  })
  @ApiBody({ type: CitizenPasswordResetCompleteDto })
  @ApiOkResponse({
    schema: { example: { message: 'Senha alterada com sucesso...' } },
  })
  @ApiUnauthorizedResponse({ description: 'Token de recuperação inválido ou expirado' })
  @HttpCode(HttpStatus.OK)
  @Post('password-reset/complete')
  completePasswordReset(@Body() dto: CitizenPasswordResetCompleteDto) {
    return this.citizenAuthService.completePasswordReset(dto);
  }

  @ApiOperation({
    summary: 'Mudou de WhatsApp — atualizar telefone',
    description:
      'Se o cadastro tiver data de nascimento, envie-a (igual ao cadastro). ' +
      'Se não tiver data no cadastro, envie a senha atual em `password` para confirmar identidade.',
  })
  @ApiBody({ type: CitizenPhoneRecoveryDto })
  @ApiOkResponse({
    schema: { example: { message: 'Telefone atualizado...' } },
  })
  @ApiConflictResponse({ description: 'Novo número já cadastrado' })
  @HttpCode(HttpStatus.OK)
  @Post('phone-recovery')
  recoverPhone(@Body() dto: CitizenPhoneRecoveryDto) {
    return this.citizenAuthService.recoverPhone(dto);
  }

  @ApiOperation({
    summary: 'Perfil do cidadão autenticado',
    description:
      'Retorna o perfil e um JWT novo (renovação deslizante). Guarde o token no cliente.',
  })
  @ApiBearerAuth()
  @ApiOkResponse({ type: CitizenLoginResponseDto })
  @ApiUnauthorizedResponse({ description: 'Token cidadão inválido ou expirado' })
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

  @ApiOperation({
    summary: 'Excluir conta permanentemente',
    description:
      'Exige a senha atual. Remove a conta, apaga sugestões (feedbacks) do cidadão e desvincula chamados, mantendo-os no município com dados anonimizados.',
  })
  @ApiBody({ type: CitizenDeleteAccountDto })
  @ApiBearerAuth()
  @ApiOkResponse({ schema: { example: { message: 'Sua conta foi excluída permanentemente.' } } })
  @ApiUnauthorizedResponse({ description: 'Token inválido ou senha incorreta' })
  @UseGuards(CitizenJwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  @Post('account/delete')
  deleteAccount(
    @CurrentCitizen() citizen: CitizenJwtPayload,
    @Body() dto: CitizenDeleteAccountDto,
  ) {
    return this.citizenAuthService.deleteAccount(citizen, dto);
  }
}
