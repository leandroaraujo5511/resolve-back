import { Module } from '@nestjs/common';
import { CommunicationGatewayService } from './communication-gateway.service';

@Module({
  providers: [CommunicationGatewayService],
  exports: [CommunicationGatewayService],
})
export class CommunicationModule {}
