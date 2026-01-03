import { IsInt, IsDateString, IsOptional, IsString, Min } from 'class-validator';

export class CreateAppointmentDto {
  @IsInt()
  doctor_id: number;

  @IsDateString()
  appointment_datetime: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  duration_minutes?: number;

  @IsOptional()
  @IsString()
  notes?: string;
}
