import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiBody,
  ApiNoContentResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { AllowPasswordChangePending } from '../common/decorators/allow-password-change-pending.decorator';
import type { JwtPayload } from '../auth/interfaces/auth-user.interface';
import { UsersService } from './users.service';
import {
  AuthUserResponseDto,
  CreateUserResponseDto,
} from '../auth/dto/auth-user.response';
import { ListUsersQueryDto } from './dto/list-users.query.dto';
import { Roles } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';
import { UserRole } from '../database/entities/user.entity';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';

@ApiTags('Users')
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @ApiOperation({ summary: 'Retorna dados do usuário autenticado' })
  @ApiBearerAuth()
  @ApiOkResponse({ type: AuthUserResponseDto })
  @ApiUnauthorizedResponse({ description: 'Token inválido ou expirado' })
  @AllowPasswordChangePending()
  @UseGuards(JwtAuthGuard)
  @Get('me')
  me(@CurrentUser() user: JwtPayload) {
    return this.usersService.findAuthUserById(user.sub);
  }

  @ApiOperation({
    summary: 'Lista usuários (painel)',
    description:
      'ADMIN: apenas o tenant do JWT. SUPER_ADMIN: todos, ou filtre por `companyId`.',
  })
  @ApiBearerAuth()
  @ApiOkResponse({ type: [AuthUserResponseDto] })
  @ApiUnauthorizedResponse({ description: 'Token inválido ou expirado' })
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Get()
  list(
    @CurrentUser() user: JwtPayload,
    @Query() query: ListUsersQueryDto,
  ) {
    return this.usersService.findForPanel(user, query);
  }

  @ApiOperation({
    summary: 'Cria usuário no tenant (ADMIN)',
    description:
      'Opções sendWelcomeEmail e requirePasswordChange. Com boas-vindas, a senha é gerada e enviada por e-mail.',
  })
  @ApiBearerAuth()
  @ApiBody({ type: CreateUserDto })
  @ApiOkResponse({ type: CreateUserResponseDto })
  @ApiUnauthorizedResponse({ description: 'Token inválido ou expirado' })
  @ApiBadRequestResponse({ description: 'Dados inválidos' })
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Post()
  create(@CurrentUser() user: JwtPayload, @Body() dto: CreateUserDto) {
    return this.usersService.createForPanel(user, dto);
  }

  @ApiOperation({
    summary: 'Reenvia e-mail de boas-vindas com nova senha provisória',
  })
  @ApiBearerAuth()
  @ApiOkResponse({ type: CreateUserResponseDto })
  @ApiUnauthorizedResponse({ description: 'Token inválido ou expirado' })
  @ApiNotFoundResponse({ description: 'Usuário não encontrado' })
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Post(':id/resend-welcome')
  resendWelcome(
    @CurrentUser() user: JwtPayload,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.usersService.resendWelcomeForPanel(user, id);
  }

  @ApiOperation({
    summary: 'Atualiza usuário do tenant (ADMIN)',
  })
  @ApiBearerAuth()
  @ApiBody({ type: UpdateUserDto })
  @ApiOkResponse({ type: AuthUserResponseDto })
  @ApiUnauthorizedResponse({ description: 'Token inválido ou expirado' })
  @ApiBadRequestResponse({ description: 'Dados inválidos' })
  @ApiNotFoundResponse({ description: 'Usuário não encontrado' })
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Patch(':id')
  patch(
    @CurrentUser() user: JwtPayload,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateUserDto,
  ) {
    return this.usersService.updateForPanel(user, id, dto);
  }

  @ApiOperation({
    summary: 'Exclui usuário do tenant (ADMIN)',
  })
  @ApiBearerAuth()
  @ApiNoContentResponse({ description: 'Usuário excluído com sucesso' })
  @ApiUnauthorizedResponse({ description: 'Token inválido ou expirado' })
  @ApiBadRequestResponse({ description: 'Não pode excluir o próprio usuário' })
  @ApiNotFoundResponse({ description: 'Usuário não encontrado' })
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @HttpCode(HttpStatus.NO_CONTENT)
  @Delete(':id')
  async remove(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: JwtPayload,
  ) {
    await this.usersService.deleteForPanel(user, id, user.sub);
  }
}
