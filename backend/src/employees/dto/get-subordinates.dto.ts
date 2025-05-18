import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsNumber, IsOptional, Min } from 'class-validator';

export class GetSubordinatesDto {
  @ApiProperty({ description: 'Employee ID', example: 1 })
  @IsNumber()
  @Min(1)
  @Type(() => Number)
  id: number;

  @ApiPropertyOptional({
    description: 'Maximum depth of hierarchy to retrieve',
    example: 3,
    default: -1,
  })
  @IsOptional()
  @IsNumber()
  @Min(-1)
  @Type(() => Number)
  depth?: number = -1; // -1 means retrieve all levels

  @ApiPropertyOptional({
    description: 'Page number for pagination',
    example: 1,
    default: 1,
  })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Type(() => Number)
  page?: number = 1;

  @ApiPropertyOptional({
    description: 'Items per page for pagination',
    example: 10,
    default: 10,
  })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Type(() => Number)
  limit?: number = 10;
}
