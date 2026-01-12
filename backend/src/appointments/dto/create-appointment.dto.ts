import { IsInt, IsDateString, IsOptional, IsString, Min, IsBoolean, Equals } from 'class-validator';

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

  @IsBoolean()
  @Equals(true, { message: 'Patient consent to recording is required' })
  patient_consent_to_record: boolean;
}
