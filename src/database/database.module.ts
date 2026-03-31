import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Company } from './entities/company.entity';
import { User } from './entities/user.entity';
import { Department } from './entities/department.entity';
import { Ticket } from './entities/ticket.entity';
import { TicketHistory } from './entities/ticket-history.entity';
import { City } from './entities/city.entity';
import { Citizen } from './entities/citizen.entity';
import { CitizenOtp } from './entities/citizen-otp.entity';
import { Feedback } from './entities/feedback.entity';
import { Neighborhood } from './entities/neighborhood.entity';
import { AppIssue } from './entities/app-issue.entity';
import { DatabaseSeedService } from './database.seed.service';

@Module({
  imports: [
    ConfigModule,
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        type: 'postgres' as const,
        host: config.get<string>('DB_HOST', 'localhost'),
        port: config.get<number>('DB_PORT', 5432),
        username: config.get<string>('DB_USERNAME', 'postgres'),
        password: config.get<string>('DB_PASSWORD', 'postgres'),
        database: config.get<string>('DB_NAME', 'resolve'),
        entities: [
          Company,
          User,
          Department,
          Ticket,
          TicketHistory,
          City,
          Citizen,
          CitizenOtp,
          Feedback,
          Neighborhood,
          AppIssue,
        ],
        synchronize: config.get<string>('DB_SYNC', 'true') === 'true',
      }),
    }),
    TypeOrmModule.forFeature([
      Company,
      User,
      Department,
      Ticket,
      TicketHistory,
      City,
      Citizen,
      CitizenOtp,
      Feedback,
      Neighborhood,
      AppIssue,
    ]),
  ],
  providers: [DatabaseSeedService],
})
export class DatabaseModule {}
