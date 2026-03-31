import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CitizenJwtAuthGuard } from '../auth/guards/citizen-jwt-auth.guard';
import { CurrentCitizen } from '../auth/decorators/current-citizen.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { CitizenJwtPayload } from '../auth/interfaces/citizen-jwt.interface';
import type { JwtPayload } from '../auth/interfaces/auth-user.interface';
import { resolvePanelCompanyId } from '../common/tenant-scope';
import { CreateFeedbackCitizenDto } from './dto/create-feedback-citizen.dto';
import { ListFeedbacksQueryDto } from './dto/list-feedbacks.query.dto';
import {
  FeedbackResponseDto,
  PaginatedFeedbacksResponseDto,
} from './dto/feedback.response.dto';
import { FeedbacksService } from './feedbacks.service';

@ApiTags('Feedbacks')
@Controller('feedbacks')
export class FeedbacksController {
  constructor(private readonly feedbacksService: FeedbacksService) {}

  @ApiOperation({
    summary: 'Enviar feedback (app cidadão)',
    description:
      'O feedback é sempre associado à **cidade do cadastro** do cidadão. Não é possível enviar para outra cidade (não há `cityId` no corpo).',
  })
  @ApiBearerAuth()
  @ApiCreatedResponse({ type: FeedbackResponseDto })
  @ApiUnauthorizedResponse({ description: 'Token cidadão inválido ou sessão inconsistente' })
  @UseGuards(CitizenJwtAuthGuard)
  @HttpCode(HttpStatus.CREATED)
  @Post()
  createCitizen(
    @CurrentCitizen() citizen: CitizenJwtPayload,
    @Body() dto: CreateFeedbackCitizenDto,
  ) {
    return this.feedbacksService.createFromCitizen(citizen, dto);
  }

  @ApiOperation({
    summary: 'Listar feedbacks (painel)',
    description:
      'Escopo pelo tenant do token. Opcional: filtrar por `cityId` (município) e `type`.',
  })
  @ApiBearerAuth()
  @ApiOkResponse({ type: PaginatedFeedbacksResponseDto })
  @ApiUnauthorizedResponse({ description: 'Token do painel inválido' })
  @UseGuards(JwtAuthGuard)
  @Get()
  listStaff(
    @CurrentUser() user: JwtPayload,
    @Query() query: ListFeedbacksQueryDto,
  ) {
    const companyId = resolvePanelCompanyId(user, query.companyId);
    return this.feedbacksService.findAllForCompany(companyId, query);
  }
}
