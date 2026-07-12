import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UsersService } from './users.service';
import { UsersController } from './users.controller';
import { User } from '../database/entities/user.entity';
import { RolesGuard } from '../common/guards/roles.guard';
import { Department } from '../database/entities/department.entity';
import { SubDepartment } from '../database/entities/sub-department.entity';
import { CommunicationModule } from '../communication/communication.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([User, Department, SubDepartment]),
    CommunicationModule,
  ],
  providers: [UsersService, RolesGuard],
  controllers: [UsersController],
  exports: [UsersService],
})
export class UsersModule {}
