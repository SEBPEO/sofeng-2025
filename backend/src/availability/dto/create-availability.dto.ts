import { IsInt, IsString, IsBoolean, IsOptional, Min, Max, Matches } from 'class-validator';

export class CreateAvailabilityDto {
  @IsInt()
  @Min(0)
  @Max(6)
  day_of_week: number; // 0-6 for Sunday-Saturday

  @IsString()
  @Matches(/^([0-1][0-9]|2[0-3]):[0-5][0-9]$/, {
    message: 'start_time must be in HH:mm format',
  })
  start_time: string; // Format "HH:mm"

  @IsString()
  @Matches(/^([0-1][0-9]|2[0-3]):[0-5][0-9]$/, {
    message: 'end_time must be in HH:mm format',
  })
  end_time: string; // Format "HH:mm"

  @IsInt()
  @Min(15)
  @Max(240)
  duration_minutes: number; // Default appointment duration

  @IsBoolean()
  @IsOptional()
  is_available?: boolean;
}

