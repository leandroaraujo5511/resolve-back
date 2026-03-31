import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { CitizenAuthController } from './citizen-auth.controller';
import { CitizenAuthService } from './citizen-auth.service';
import { UsersModule } from '../users/users.module';
import { CitizenOtp } from '../database/entities/citizen-otp.entity';
import { Citizen } from '../database/entities/citizen.entity';
import { City } from '../database/entities/city.entity';
import { Company } from '../database/entities/company.entity';
import { CitizenJwtStrategy } from './strategies/citizen-jwt.strategy';
import { JwtStrategy } from './strategies/jwt.strategy';

@Module({
  imports: [
    ConfigModule,
    UsersModule,
    TypeOrmModule.forFeature([Citizen, City, CitizenOtp, Company]),
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.get<string>('JWT_SECRET', 'resolve-secret'),
        signOptions: {
          expiresIn: config.get<string>('JWT_EXPIRES_IN', '1d') as never,
        },
      }),
    }),
  ],
  controllers: [AuthController, CitizenAuthController],
  exports: [AuthService, CitizenAuthService, JwtModule],
  providers: [AuthService, CitizenAuthService, JwtStrategy, CitizenJwtStrategy],
})
export class AuthModule {}
