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
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { UserRole } from '../database/entities/user.entity';
import { Roles } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { JwtPayload } from '../auth/interfaces/auth-user.interface';
import { CitiesService } from './cities.service';
import { CreateCityDto } from './dto/create-city.dto';
import { UpdateCityDto } from './dto/update-city.dto';
import { CityPanelResponseDto } from './dto/city-panel.response.dto';

@ApiTags('Cities (painel)')
@Controller('cities')
export class PanelCitiesController {
  constructor(private readonly citiesService: CitiesService) {}

  @ApiOperation({
    summary: 'Lista todos os municípios (catálogo global)',
  })
  @ApiBearerAuth()
  @ApiOkResponse({ type: [CityPanelResponseDto] })
  @ApiUnauthorizedResponse()
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Get()
  list(@CurrentUser() user: JwtPayload) {
    return this.citiesService.findPanelForJwtUser(user!);
  }

  @ApiOperation({ summary: 'Cria município no catálogo global (somente super admin)' })
  @ApiBearerAuth()
  @ApiBody({ type: CreateCityDto })
  @ApiOkResponse({ type: CityPanelResponseDto })
  @Roles(UserRole.SUPER_ADMIN)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Post()
  create(@Body() dto: CreateCityDto) {
    return this.citiesService.createPanel(dto);
  }

  @ApiOperation({ summary: 'Atualiza município no catálogo global (somente super admin)' })
  @ApiBearerAuth()
  @ApiBody({ type: UpdateCityDto })
  @ApiOkResponse({ type: CityPanelResponseDto })
  @Roles(UserRole.SUPER_ADMIN)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Patch(':id')
  patch(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateCityDto) {
    return this.citiesService.updatePanel(id, dto);
  }

  @ApiOperation({
    summary:
      'Remove município do catálogo — super admin; bairros em cascata se sem vínculos',
  })
  @ApiBearerAuth()
  @ApiOkResponse({ description: 'Sem conteúdo' })
  @Roles(UserRole.SUPER_ADMIN)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @HttpCode(HttpStatus.NO_CONTENT)
  @Delete(':id')
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.citiesService.removePanel(id);
  }
}
