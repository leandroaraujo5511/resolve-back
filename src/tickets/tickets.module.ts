import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Citizen } from '../database/entities/citizen.entity';
import { Department } from '../database/entities/department.entity';
import { Neighborhood } from '../database/entities/neighborhood.entity';
import { Ticket } from '../database/entities/ticket.entity';
import { TicketHistory } from '../database/entities/ticket-history.entity';
import { CitizenTicketsController } from './citizen-tickets.controller';
import { TicketsController } from './tickets.controller';
import { TicketsService } from './tickets.service';
import { PushModule } from '../push/push.module';

@Module({
  imports: [
    PushModule,
    TypeOrmModule.forFeature([
      Ticket,
      TicketHistory,
      Department,
      Citizen,
      Neighborhood,
    ]),
  ],
  controllers: [TicketsController, CitizenTicketsController],
  providers: [TicketsService],
  exports: [TicketsService],
})
export class TicketsModule {}
