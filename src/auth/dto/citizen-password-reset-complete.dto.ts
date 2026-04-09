import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, MinLength } from 'class-validator';

export class CitizenPasswordResetCompleteDto {
  @ApiProperty({
    description: 'JWT retornado em POST /auth/citizen/password-reset/verify-code',
  })
  @IsString()
  @IsNotEmpty()
  resetToken: string;

  @ApiProperty({ example: 'novaSenha123', minLength: 6 })
  @IsString()
  @MinLength(6)
  newPassword: string;
}
