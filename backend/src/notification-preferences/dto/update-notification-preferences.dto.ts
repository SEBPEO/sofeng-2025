import { IsBoolean, IsInt, IsOptional, Min } from 'class-validator';

export class UpdateNotificationPreferencesDto {
  @IsOptional()
  @IsBoolean()
  email_enabled?: boolean;

  @IsOptional()
  @IsBoolean()
  email_unread_messages?: boolean;

  @IsOptional()
  @IsBoolean()
  email_appointments?: boolean;

  @IsOptional()
  @IsBoolean()
  push_enabled?: boolean;

  @IsOptional()
  @IsBoolean()
  push_messages?: boolean;

  @IsOptional()
  @IsBoolean()
  push_appointments?: boolean;

  @IsOptional()
  @IsBoolean()
  in_app_enabled?: boolean;

  @IsOptional()
  @IsBoolean()
  in_app_messages?: boolean;

  @IsOptional()
  @IsBoolean()
  in_app_appointments?: boolean;

  @IsOptional()
  @IsInt()
  @Min(1)
  reminder_time_1?: number; // in minutes

  @IsOptional()
  @IsInt()
  @Min(1)
  reminder_time_2?: number; // in minutes
}
