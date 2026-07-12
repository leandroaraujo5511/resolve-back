import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Citizen } from '../database/entities/citizen.entity';
import { Department } from '../database/entities/department.entity';
import { Neighborhood } from '../database/entities/neighborhood.entity';
import { Ticket } from '../database/entities/ticket.entity';
import { TicketAttachment } from '../database/entities/ticket-attachment.entity';
import { TicketHistory } from '../database/entities/ticket-history.entity';
import { User } from '../database/entities/user.entity';
import { DepartmentsModule } from '../departments/departments.module';
import { CitizenTicketsController } from './citizen-tickets.controller';
import { TicketAttachmentsController } from './ticket-attachments.controller';
import { TicketAttachmentsService } from './ticket-attachments.service';
import { TicketHistoryActorService } from './ticket-history-actor.service';
import { TicketsController } from './tickets.controller';
import { TicketsService } from './tickets.service';
import { PushModule } from '../push/push.module';

@Module({
  imports: [
    PushModule,
    DepartmentsModule,
    TypeOrmModule.forFeature([
      Ticket,
      TicketHistory,
      TicketAttachment,
      Department,
      Citizen,
      Neighborhood,
      User,
    ]),
  ],
  controllers: [
    TicketsController,
    CitizenTicketsController,
    TicketAttachmentsController,
  ],
  providers: [
    TicketsService,
    TicketAttachmentsService,
    TicketHistoryActorService,
  ],
  exports: [
    TicketsService,
    TicketAttachmentsService,
    TicketHistoryActorService,
  ],
})
export class TicketsModule {}
