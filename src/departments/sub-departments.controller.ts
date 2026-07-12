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
} from '../common/tenant-scope';
import {
  CreateSubDepartmentDto,
  ReorderSubDepartmentsDto,
  SubDepartmentResponseDto,
  UpdateSubDepartmentDto,
} from './dto/sub-department.dto';
import { SubDepartmentsService } from './sub-departments.service';

@ApiTags('Sub-departments')
@Controller()
export class SubDepartmentsController {
  constructor(private readonly subDepartmentsService: SubDepartmentsService) {}

  @ApiOperation({ summary: 'Lista subdepartamentos de um departamento' })
  @ApiBearerAuth()
  @ApiOkResponse({ type: [SubDepartmentResponseDto] })
  @ApiUnauthorizedResponse()
  @UseGuards(JwtAuthGuard)
  @Get('departments/:departmentId/sub-departments')
  list(
    @CurrentUser() user: JwtPayload,
    @Query('companyId') companyIdQuery: string | undefined,
    @Query('status') status: 'ativo' | 'inativo' | undefined,
    @Param('departmentId', ParseUUIDPipe) departmentId: string,
  ) {
    const companyId = resolvePanelCompanyId(user, companyIdQuery);
    return this.subDepartmentsService.listByDepartment(
      companyId,
      departmentId,
      status,
    );
  }

  @ApiOperation({ summary: 'Cria subdepartamento' })
  @ApiBearerAuth()
  @ApiBody({ type: CreateSubDepartmentDto })
  @ApiOkResponse({ type: SubDepartmentResponseDto })
  @ApiUnauthorizedResponse()
  @ApiBadRequestResponse()
  @UseGuards(JwtAuthGuard)
  @Post('departments/:departmentId/sub-departments')
  create(
    @CurrentUser() user: JwtPayload,
    @Query('companyId') companyIdQuery: string | undefined,
    @Param('departmentId', ParseUUIDPipe) departmentId: string,
    @Body() dto: CreateSubDepartmentDto,
  ) {
    assertCanManageDepartments(user);
    const companyId = resolvePanelCompanyId(user, companyIdQuery);
    return this.subDepartmentsService.create(companyId, departmentId, dto);
  }

  @ApiOperation({ summary: 'Reordena subdepartamentos do departamento' })
  @ApiBearerAuth()
  @ApiBody({ type: ReorderSubDepartmentsDto })
  @ApiOkResponse({ type: [SubDepartmentResponseDto] })
  @UseGuards(JwtAuthGuard)
  @Patch('departments/:departmentId/sub-departments/reorder')
  reorder(
    @CurrentUser() user: JwtPayload,
    @Query('companyId') companyIdQuery: string | undefined,
    @Param('departmentId', ParseUUIDPipe) departmentId: string,
    @Body() dto: ReorderSubDepartmentsDto,
  ) {
    assertCanManageDepartments(user);
    const companyId = resolvePanelCompanyId(user, companyIdQuery);
    return this.subDepartmentsService.reorder(
      companyId,
      departmentId,
      dto.orderedIds,
    );
  }

  @ApiOperation({ summary: 'Atualiza subdepartamento' })
  @ApiBearerAuth()
  @ApiBody({ type: UpdateSubDepartmentDto })
  @ApiOkResponse({ type: SubDepartmentResponseDto })
  @ApiNotFoundResponse()
  @UseGuards(JwtAuthGuard)
  @Patch('sub-departments/:id')
  patch(
    @CurrentUser() user: JwtPayload,
    @Query('companyId') companyIdQuery: string | undefined,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateSubDepartmentDto,
  ) {
    assertCanManageDepartments(user);
    const companyId = resolvePanelCompanyId(user, companyIdQuery);
    return this.subDepartmentsService.update(companyId, id, dto);
  }

  @ApiOperation({ summary: 'Exclui subdepartamento (bloqueado se houver tickets)' })
  @ApiBearerAuth()
  @ApiNoContentResponse()
  @ApiBadRequestResponse({
    description: 'Há tickets vinculados — inative em vez de excluir',
  })
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.NO_CONTENT)
  @Delete('sub-departments/:id')
  async remove(
    @CurrentUser() user: JwtPayload,
    @Query('companyId') companyIdQuery: string | undefined,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    assertCanManageDepartments(user);
    const companyId = resolvePanelCompanyId(user, companyIdQuery);
    await this.subDepartmentsService.delete(companyId, id);
  }
}
