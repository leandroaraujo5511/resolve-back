import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RolesGuard } from '../common/guards/roles.guard';
import { Citizen } from '../database/entities/citizen.entity';
import { Feedback } from '../database/entities/feedback.entity';
import { FeedbacksController } from './feedbacks.controller';
import { FeedbacksService } from './feedbacks.service';

@Module({
  imports: [TypeOrmModule.forFeature([Feedback, Citizen])],
  controllers: [FeedbacksController],
  providers: [FeedbacksService, RolesGuard],
  exports: [FeedbacksService],
})
export class FeedbacksModule {}
