import { IsString, IsBoolean, IsOptional } from 'class-validator';

export class UpdateActionItemDto {
  @IsString()
  @IsOptional()
  description?: string;

  @IsBoolean()
  @IsOptional()
  is_completed?: boolean;
}
