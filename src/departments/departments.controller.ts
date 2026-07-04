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
import type { JwtPayload } from '../auth/interfaces/auth-user.interface';
import {
  assertCanManageDepartments,
  resolvePanelCompanyId,
  resolvePanelDepartmentScope,
} from '../common/tenant-scope';
import { DepartmentsService } from './departments.service';
import { CreateDepartmentDto } from './dto/create-department.dto';
import { DepartmentResponseDto } from './dto/department.response';
import { ListDepartmentsQueryDto } from './dto/list-departments.query.dto';
import { UpdateDepartmentDto } from './dto/update-department.dto';

@ApiTags('Departments')
@Controller('departments')
export class DepartmentsController {
  constructor(private readonly departmentsService: DepartmentsService) {}

  @ApiOperation({
    summary: 'Cria departamento na empresa do usuário autenticado',
  })
  @ApiBearerAuth()
  @ApiBody({ type: CreateDepartmentDto })
  @ApiOkResponse({ type: DepartmentResponseDto })
  @ApiUnauthorizedResponse({ description: 'Token inválido ou expirado' })
  @ApiBadRequestResponse({ description: 'Corpo inválido' })
  @UseGuards(JwtAuthGuard)
  @Post()
  create(
    @CurrentUser() user: JwtPayload,
    @Query('companyId') companyIdQuery: string | undefined,
    @Body() dto: CreateDepartmentDto,
  ) {
    assertCanManageDepartments(user);
    const companyId = resolvePanelCompanyId(user, companyIdQuery);
    return this.departmentsService.createByCompany(companyId, dto);
  }

  @ApiOperation({
    summary: 'Lista departamentos da empresa do usuário autenticado',
    description:
      'SECRETARIA vinculada a um departamento só recebe o próprio departamento.',
  })
  @ApiBearerAuth()
  @ApiOkResponse({ type: [DepartmentResponseDto] })
  @ApiUnauthorizedResponse({ description: 'Token inválido ou expirado' })
  @UseGuards(JwtAuthGuard)
  @Get()
  list(
    @CurrentUser() user: JwtPayload,
    @Query() query: ListDepartmentsQueryDto,
  ) {
    const companyId = resolvePanelCompanyId(user, query.companyId);
    const departmentScope = resolvePanelDepartmentScope(user);
    return this.departmentsService.findByCompany(
      companyId,
      query.status,
      departmentScope,
    );
  }

  @ApiOperation({
    summary: 'Atualiza departamento da empresa do usuário autenticado',
  })
  @ApiBearerAuth()
  @ApiBody({ type: UpdateDepartmentDto })
  @ApiOkResponse({ type: DepartmentResponseDto })
  @ApiUnauthorizedResponse({ description: 'Token inválido ou expirado' })
  @ApiNotFoundResponse({ description: 'Departamento não encontrado' })
  @ApiBadRequestResponse({ description: 'Corpo inválido' })
  @UseGuards(JwtAuthGuard)
  @Patch(':id')
  patch(
    @CurrentUser() user: JwtPayload,
    @Query('companyId') companyIdQuery: string | undefined,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateDepartmentDto,
  ) {
    assertCanManageDepartments(user);
    const companyId = resolvePanelCompanyId(user, companyIdQuery);
    return this.departmentsService.updateByCompany(companyId, id, dto);
  }

  @ApiOperation({
    summary: 'Exclui departamento da empresa do usuário autenticado',
  })
  @ApiBearerAuth()
  @ApiNoContentResponse({ description: 'Departamento excluído com sucesso' })
  @ApiUnauthorizedResponse({ description: 'Token inválido ou expirado' })
  @ApiNotFoundResponse({ description: 'Departamento não encontrado' })
  @ApiBadRequestResponse({
    description: 'Departamento com vínculos (tickets/usuários)',
  })
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.NO_CONTENT)
  @Delete(':id')
  async remove(
    @CurrentUser() user: JwtPayload,
    @Query('companyId') companyIdQuery: string | undefined,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    assertCanManageDepartments(user);
    const companyId = resolvePanelCompanyId(user, companyIdQuery);
    await this.departmentsService.deleteByCompany(companyId, id);
  }
}
