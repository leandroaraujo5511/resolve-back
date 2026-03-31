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
  ApiBearerAuth,
  ApiBody,
  ApiNoContentResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import type { JwtPayload } from '../auth/interfaces/auth-user.interface';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { UserRole } from '../database/entities/user.entity';
import { Roles } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';
import { NeighborhoodsService } from './neighborhoods.service';
import { CreateNeighborhoodDto } from './dto/create-neighborhood.dto';
import { UpdateNeighborhoodDto } from './dto/update-neighborhood.dto';
import { NeighborhoodPanelResponseDto } from './dto/neighborhood-panel.response.dto';
import { ListNeighborhoodsQueryDto } from './dto/list-neighborhoods.query.dto';

@ApiTags('Neighborhoods (painel)')
@Controller('neighborhoods')
export class NeighborhoodsController {
  constructor(private readonly neighborhoodsService: NeighborhoodsService) {}

  @ApiOperation({ summary: 'Lista bairros de um município' })
  @ApiBearerAuth()
  @ApiOkResponse({ type: [NeighborhoodPanelResponseDto] })
  @ApiUnauthorizedResponse()
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Get()
  list(
    @Query() query: ListNeighborhoodsQueryDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.neighborhoodsService.findByCity(query.cityId, user!);
  }

  @ApiOperation({ summary: 'Cria bairro' })
  @ApiBearerAuth()
  @ApiBody({ type: CreateNeighborhoodDto })
  @ApiOkResponse({ type: NeighborhoodPanelResponseDto })
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Post()
  create(
    @Body() dto: CreateNeighborhoodDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.neighborhoodsService.create(dto, user!);
  }

  @ApiOperation({ summary: 'Atualiza bairro' })
  @ApiBearerAuth()
  @ApiBody({ type: UpdateNeighborhoodDto })
  @ApiOkResponse({ type: NeighborhoodPanelResponseDto })
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Patch(':id')
  patch(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateNeighborhoodDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.neighborhoodsService.update(id, dto, user!);
  }

  @ApiOperation({ summary: 'Remove bairro' })
  @ApiBearerAuth()
  @ApiNoContentResponse()
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @HttpCode(HttpStatus.NO_CONTENT)
  @Delete(':id')
  async remove(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: JwtPayload,
  ) {
    await this.neighborhoodsService.remove(id, user!);
  }
}
