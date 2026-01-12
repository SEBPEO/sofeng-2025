import { IsDateString, IsOptional, IsString } from 'class-validator';

export class RequestRescheduleDto {
  @IsDateString()
  proposed_appointment_datetime: string;

  @IsOptional()
  @IsString()
  reschedule_note?: string;
}
