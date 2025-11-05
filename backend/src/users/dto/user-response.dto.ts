import { Role, Gender } from '@prisma/client';

export class DoctorProfileDto {
  doctor_id: number;
  user_id: string;
  specialization: string;
  experience_years: number | null;
  clinic_address: string;
  contact_info: string | null;
  working_hours: string | null;
}

export class PatientProfileDto {
  patient_id: number;
  user_id: string;
  date_of_birth: Date | null;
  emergency_contact: string | null;
  conditions: string | null;
  medications: string | null;
  allergy: string | null;
}

export class UserResponseDto {
  user_id: string;
  first_name: string;
  last_name: string;
  gender: Gender;
  email: string;
  role: Role;
  createdAt: Date;
  lastLogin: Date | null;
  profileCompleted: boolean;
  doctor_profile?: DoctorProfileDto | null;
  patient_profile?: PatientProfileDto | null;
}
