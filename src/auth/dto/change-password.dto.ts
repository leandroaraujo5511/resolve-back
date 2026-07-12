import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, MaxLength, MinLength, Matches } from 'class-validator';

export class ChangePasswordDto {
  @ApiProperty({ description: 'Senha atual (provisória ou definitiva)' })
  @IsString()
  @MinLength(1)
  @MaxLength(120)
  currentPassword: string;

  @ApiProperty({
    description: 'Nova senha (mín. 8; maiúscula, minúscula e dígito)',
    minLength: 8,
    example: 'NovaSenha1',
  })
  @IsString()
  @MinLength(8)
  @MaxLength(120)
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).+$/, {
    message:
      'Nova senha deve conter ao menos uma letra maiúscula, uma minúscula e um dígito',
  })
  newPassword: string;
}
