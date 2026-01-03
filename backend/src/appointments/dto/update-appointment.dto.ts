import { IsDateString, IsOptional, IsString, IsInt, Min } from 'class-validator';

export class UpdateAppointmentDto {
  @IsOptional()
  @IsDateString()
  appointment_datetime?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  duration_minutes?: number;

  @IsOptional()
  @IsString()
  notes?: string;
}
