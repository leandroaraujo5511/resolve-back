import { Body, Controller, Get, Post, Query, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { CurrentUploadUser } from './decorators/current-upload-user.decorator';
import {
  PresignUploadDto,
  PresignGetResponseDto,
  PresignUploadResponseDto,
} from './dto/presign-upload.dto';
import { UploadAuthGuard } from './guards/upload-auth.guard';
import type { UploadAuthContext } from './guards/upload-auth.guard';
import { UploadService } from './upload.service';

@ApiTags('Upload')
@Controller('upload')
export class UploadController {
  constructor(private readonly uploadService: UploadService) {}

  @ApiOperation({
    summary: 'Gera URL assinada (PUT) no Cloudflare R2',
    description:
      'Aceita JWT do painel ou do app cidadão. Após o PUT, use a `key` (ou URL pública, se configurada) em `attachments` do chamado.',
  })
  @ApiBearerAuth()
  @ApiBody({ type: PresignUploadDto })
  @ApiOkResponse({ type: PresignUploadResponseDto })
  @ApiUnauthorizedResponse({ description: 'Token inválido' })
  @UseGuards(UploadAuthGuard)
  @Post('presign')
  presign(
    @CurrentUploadUser() user: UploadAuthContext,
    @Body() dto: PresignUploadDto,
  ) {
    return this.uploadService.createPresignedPut(user, dto);
  }

  @ApiOperation({
    summary: 'Gera URL assinada (GET) no Cloudflare R2',
    description:
      'Aceita JWT do painel ou do app cidadão. Para cidadão, a key deve pertencer ao seu município.',
  })
  @ApiBearerAuth()
  @ApiOkResponse({ type: PresignGetResponseDto })
  @ApiUnauthorizedResponse({ description: 'Token inválido' })
  @UseGuards(UploadAuthGuard)
  @Get('presign-get')
  presignGet(
    @CurrentUploadUser() user: UploadAuthContext,
    @Query('key') key: string,
  ) {
    return this.uploadService.createPresignedGet(user, key);
  }
}
