import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CompaniesService } from './companies.service';
import { CompaniesController } from './companies.controller';
import { PublicCompaniesController } from './public-companies.controller';
import { Company } from '../database/entities/company.entity';
import { City } from '../database/entities/city.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Company, City])],
  providers: [CompaniesService],
  controllers: [CompaniesController, PublicCompaniesController],
})
export class CompaniesModule {}
