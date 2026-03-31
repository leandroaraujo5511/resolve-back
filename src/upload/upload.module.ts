import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AuthModule } from '../auth/auth.module';
import { UploadAuthGuard } from './guards/upload-auth.guard';
import { UploadController } from './upload.controller';
import { UploadService } from './upload.service';

@Module({
  imports: [ConfigModule, AuthModule],
  controllers: [UploadController],
  providers: [UploadService, UploadAuthGuard],
})
export class UploadModule {}
