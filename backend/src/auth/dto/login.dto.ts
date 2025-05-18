import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class LoginDto {
  @ApiProperty({ description: 'Username', example: 'admin' })
  @IsNotEmpty()
  @IsString()
  username: string;

  @ApiProperty({ description: 'Password', example: 'admin' })
  @IsNotEmpty()
  @IsString()
  password: string;
}
