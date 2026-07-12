import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Department } from '../database/entities/department.entity';
import { SubDepartment } from '../database/entities/sub-department.entity';
import { Ticket } from '../database/entities/ticket.entity';
import { User } from '../database/entities/user.entity';
import { DepartmentsController } from './departments.controller';
import { DepartmentsService } from './departments.service';
import { SubDepartmentsController } from './sub-departments.controller';
import { SubDepartmentsService } from './sub-departments.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([Department, SubDepartment, Ticket, User]),
  ],
  controllers: [DepartmentsController, SubDepartmentsController],
  providers: [DepartmentsService, SubDepartmentsService],
  exports: [DepartmentsService, SubDepartmentsService],
})
export class DepartmentsModule {}
