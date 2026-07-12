import { Module } from '@nestjs/common';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { SupportController } from './support/support.controller';
import { CommonModule } from './common/common.module';
import { DatabaseModule } from './database/database.module';
import { UsersModule } from './users/users.module';
import { AuthModule } from './auth/auth.module';
import { CompaniesModule } from './companies/companies.module';
import { DepartmentsModule } from './departments/departments.module';
import { TicketsModule } from './tickets/tickets.module';
import { CitiesModule } from './cities/cities.module';
import { NeighborhoodsModule } from './neighborhoods/neighborhoods.module';
import { FeedbacksModule } from './feedbacks/feedbacks.module';
import { CatalogsModule } from './catalogs/catalogs.module';
import { UploadModule } from './upload/upload.module';
import { ReportsModule } from './reports/reports.module';
import { AppIssuesModule } from './app-issues/app-issues.module';
import { PasswordChangeRequiredInterceptor } from './common/interceptors/password-change-required.interceptor';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    CommonModule,
    DatabaseModule,
    UsersModule,
    AuthModule,
    CompaniesModule,
    DepartmentsModule,
    TicketsModule,
    CitiesModule,
    NeighborhoodsModule,
    FeedbacksModule,
    CatalogsModule,
    UploadModule,
    ReportsModule,
    AppIssuesModule,
  ],
  controllers: [AppController, SupportController],
  providers: [
    AppService,
    {
      provide: APP_INTERCEPTOR,
      useClass: PasswordChangeRequiredInterceptor,
    },
  ],
})
export class AppModule {}
