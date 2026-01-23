import { IsString, IsBoolean, IsInt, IsOptional, Min, Max, Matches } from 'class-validator';

export class UpdateAvailabilityDto {
  @IsOptional()
  @IsString()
  @Matches(/^([0-1][0-9]|2[0-3]):[0-5][0-9]$/, {
    message: 'start_time must be in HH:mm format',
  })
  start_time?: string;

  @IsOptional()
  @IsString()
  @Matches(/^([0-1][0-9]|2[0-3]):[0-5][0-9]$/, {
    message: 'end_time must be in HH:mm format',
  })
  end_time?: string;

  @IsOptional()
  @IsInt()
  @Min(15)
  @Max(240)
  duration_minutes?: number;

  @IsOptional()
  @IsBoolean()
  is_available?: boolean;
}


