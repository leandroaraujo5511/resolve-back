import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Citizen } from '../database/entities/citizen.entity';
import { ExpoPushService } from './expo-push.service';

@Module({
  imports: [TypeOrmModule.forFeature([Citizen])],
  providers: [ExpoPushService],
  exports: [ExpoPushService],
})
export class PushModule {}
