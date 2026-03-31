import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppIssue } from '../database/entities/app-issue.entity';
import { AppIssuesController } from './app-issues.controller';
import { AppIssuesService } from './app-issues.service';

@Module({
  imports: [TypeOrmModule.forFeature([AppIssue])],
  controllers: [AppIssuesController],
  providers: [AppIssuesService],
})
export class AppIssuesModule {}

