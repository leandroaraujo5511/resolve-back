import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
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
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { JwtPayload } from '../auth/interfaces/auth-user.interface';
import {
  resolvePanelCompanyId,
  resolvePanelDataScope,
} from '../common/tenant-scope';
import {
  RegisterTicketAttachmentsDto,
  TicketAttachmentResponseDto,
} from './dto/ticket-attachment.dto';
import { TicketAttachmentsService } from './ticket-attachments.service';

@ApiTags('Ticket attachments')
@Controller('tickets')
export class TicketAttachmentsController {
  constructor(
    private readonly ticketAttachmentsService: TicketAttachmentsService,
  ) {}

  @ApiOperation({ summary: 'Lista anexos ativos do chamado' })
  @ApiBearerAuth()
  @ApiOkResponse({ type: [TicketAttachmentResponseDto] })
  @UseGuards(JwtAuthGuard)
  @Get(':id/attachments')
  list(
    @CurrentUser() user: JwtPayload,
    @Query('companyId') companyIdQuery: string | undefined,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    const companyId = resolvePanelCompanyId(user, companyIdQuery);
    const scope = resolvePanelDataScope(user);
    return this.ticketAttachmentsService.listForStaff(
      companyId,
      id,
      scope,
    );
  }

  @ApiOperation({
    summary: 'Registra anexos após upload (presign PUT)',
    description:
      'Envia metadados/keys já enviadas ao R2. Limites: batch, tamanho e total por ticket.',
  })
  @ApiBearerAuth()
  @ApiBody({ type: RegisterTicketAttachmentsDto })
  @ApiOkResponse({ type: [TicketAttachmentResponseDto] })
  @UseGuards(JwtAuthGuard)
  @Post(':id/attachments')
  register(
    @CurrentUser() user: JwtPayload,
    @Query('companyId') companyIdQuery: string | undefined,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: RegisterTicketAttachmentsDto,
  ) {
    const companyId = resolvePanelCompanyId(user, companyIdQuery);
    const scope = resolvePanelDataScope(user);
    return this.ticketAttachmentsService.registerForStaff(
      companyId,
      id,
      dto.items,
      user,
      scope,
    );
  }

  @ApiOperation({
    summary: 'Remove anexo (soft-delete de metadados)',
  })
  @ApiBearerAuth()
  @ApiNoContentResponse()
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.NO_CONTENT)
  @Delete(':id/attachments/:attachmentId')
  async remove(
    @CurrentUser() user: JwtPayload,
    @Query('companyId') companyIdQuery: string | undefined,
    @Query('reason') reason: string | undefined,
    @Param('id', ParseUUIDPipe) id: string,
    @Param('attachmentId', ParseUUIDPipe) attachmentId: string,
  ) {
    const companyId = resolvePanelCompanyId(user, companyIdQuery);
    const scope = resolvePanelDataScope(user);
    await this.ticketAttachmentsService.removeForStaff(
      companyId,
      id,
      attachmentId,
      user,
      scope,
      reason,
    );
  }
}
