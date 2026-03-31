import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Citizen } from '../database/entities/citizen.entity';
import { City } from '../database/entities/city.entity';
import { Feedback } from '../database/entities/feedback.entity';
import { Ticket } from '../database/entities/ticket.entity';
import { CitiesService } from './cities.service';
import { PublicCitiesController } from './public-cities.controller';
import { PanelCitiesController } from './panel-cities.controller';

@Module({
  imports: [TypeOrmModule.forFeature([City, Citizen, Ticket, Feedback])],
  controllers: [PublicCitiesController, PanelCitiesController],
  providers: [CitiesService],
  exports: [CitiesService],
})
export class CitiesModule {}
