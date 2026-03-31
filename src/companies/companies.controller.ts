import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBadRequestResponse,
  ApiBody,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { JwtPayload } from '../auth/interfaces/auth-user.interface';
import { UserRole } from '../database/entities/user.entity';
import { Roles } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';
import { CompaniesService } from './companies.service';
import { CompanyResponseDto } from './dto/company.response';
import { CreateCompanyDto } from './dto/create-company.dto';
import { UpdateCompanyDto } from './dto/update-company.dto';
import { CompanyPanelResponseDto } from './dto/company-panel.response.dto';

@ApiTags('Companies')
@Controller('companies')
export class CompaniesController {
  constructor(private readonly companiesService: CompaniesService) {}

  @ApiOperation({
    summary: 'Retorna empresa/tenant do usuário autenticado',
    description: 'Indisponível para super admin (sem tenant fixo).',
  })
  @ApiBearerAuth()
  @ApiOkResponse({ type: CompanyResponseDto })
  @ApiUnauthorizedResponse({ description: 'Token inválido ou expirado' })
  @ApiNotFoundResponse({ description: 'Empresa não encontrada' })
  @ApiBadRequestResponse({
    description: 'Super admin deve usar GET /companies (lista)',
  })
  @UseGuards(JwtAuthGuard)
  @Get('me')
  me(@CurrentUser() user: JwtPayload) {
    if (user.role === UserRole.SUPER_ADMIN) {
      throw new BadRequestException(
        'Super administrador não possui empresa vinculada. Use GET /companies para listar os tenants.',
      );
    }
    const id = user.companyId;
    if (!id) {
      throw new BadRequestException('Usuário sem empresa');
    }
    return this.companiesService.findByIdOrFail(id);
  }

  @ApiOperation({ summary: 'Lista todos os tenants (super admin)' })
  @ApiBearerAuth()
  @ApiOkResponse({ type: [CompanyPanelResponseDto] })
  @Roles(UserRole.SUPER_ADMIN)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Get()
  listAll() {
    return this.companiesService.findAll();
  }

  @ApiOperation({ summary: 'Cria tenant (super admin)' })
  @ApiBearerAuth()
  @ApiBody({ type: CreateCompanyDto })
  @ApiOkResponse({ type: CompanyPanelResponseDto })
  @Roles(UserRole.SUPER_ADMIN)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Post()
  create(@Body() dto: CreateCompanyDto) {
    return this.companiesService.create(dto);
  }

  @ApiOperation({ summary: 'Atualiza tenant (super admin)' })
  @ApiBearerAuth()
  @ApiBody({ type: UpdateCompanyDto })
  @ApiOkResponse({ type: CompanyPanelResponseDto })
  @Roles(UserRole.SUPER_ADMIN)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Patch(':id')
  patch(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateCompanyDto,
  ) {
    return this.companiesService.update(id, dto);
  }
}
