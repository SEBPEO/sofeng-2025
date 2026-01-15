import { IsString, IsOptional } from 'class-validator';

export class UpdateNotesDto {
  @IsString()
  @IsOptional()
  summary?: string;

  @IsString()
  @IsOptional()
  transcript?: string;
}
