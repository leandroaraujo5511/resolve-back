import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength } from 'class-validator';

export class CitizenExpoPushTokenDto {
  @ApiPropertyOptional({
    description:
      'Token retornado pelo Expo (ExponentPushToken[...]). Envie string vazia para remover.',
    example: 'ExponentPushToken[xxxxxxxxxxxxxxxxxxxxxx]',
  })
  @IsOptional()
  @IsString()
  @MaxLength(512)
  expoPushToken?: string;
}
