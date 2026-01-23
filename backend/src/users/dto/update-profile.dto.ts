import { IsString, IsEmail, IsEnum, IsOptional, IsDateString, IsInt, Min } from 'class-validator';
import { Role, Gender } from '@prisma/client';

export class UpdateProfileDto {
  @IsString()
  @IsOptional()
  first_name?: string;

  @IsString()
  @IsOptional()
  last_name?: string;

  @IsEnum(Gender)
  @IsOptional()
  gender?: Gender;

  @IsEnum(Role)
  @IsOptional()
  role?: Role;

  // Doctor-specific fields
  @IsString()
  @IsOptional()
  specialization?: string;

  @IsInt()
  @Min(0)
  @IsOptional()
  experience_years?: number;

  @IsString()
  @IsOptional()
  clinic_address?: string;

  @IsString()
  @IsOptional()
  contact_info?: string;

  @IsString()
  @IsOptional()
  working_hours?: string;

  // Patient-specific fields
  @IsDateString()
  @IsOptional()
  date_of_birth?: string;

  @IsString()
  @IsOptional()
  emergency_contact?: string;

  @IsString()
  @IsOptional()
  conditions?: string;

  @IsString()
  @IsOptional()
  medications?: string;

  @IsString()
  @IsOptional()
  allergy?: string;
}
