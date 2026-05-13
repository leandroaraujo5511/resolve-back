import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, MinLength } from 'class-validator';

export class CitizenDeleteAccountDto {
  @ApiProperty({
    example: 'senhaAtual123',
    description: 'Senha atual da conta (confirmação antes de excluir permanentemente).',
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(6)
  password: string;
}
