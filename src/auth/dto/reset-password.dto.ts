import { ApiProperty } from '@nestjs/swagger';
import { IsString, Matches, MaxLength, MinLength } from 'class-validator';

export class ResetPasswordDto {
  @ApiProperty({ description: 'Token recebido no link do e-mail' })
  @IsString()
  @MinLength(32)
  @MaxLength(128)
  token: string;

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
