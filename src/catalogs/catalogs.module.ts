import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Department } from '../database/entities/department.entity';
import { Neighborhood } from '../database/entities/neighborhood.entity';
import { DepartmentsModule } from '../departments/departments.module';
import { CatalogsController } from './catalogs.controller';
import { CatalogsService } from './catalogs.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([Department, Neighborhood]),
    DepartmentsModule,
  ],
  controllers: [CatalogsController],
  providers: [CatalogsService],
})
export class CatalogsModule {}
