import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from '../auth/auth.module';
import { Ticket } from '../database/entities/ticket.entity';
import { TicketAttachment } from '../database/entities/ticket-attachment.entity';
import { UploadAuthGuard } from './guards/upload-auth.guard';
import { UploadController } from './upload.controller';
import { UploadService } from './upload.service';

@Module({
  imports: [
    ConfigModule,
    AuthModule,
    TypeOrmModule.forFeature([Ticket, TicketAttachment]),
  ],
  controllers: [UploadController],
  providers: [UploadService, UploadAuthGuard],
})
export class UploadModule {}
