import { AppointmentStatus } from '@prisma/client';

export class DoctorInfoDto {
  doctor_id: number;
  user_id: string;
  specialization: string;
  experience_years: number | null;
  clinic_address: string;
  contact_info: string | null;
  working_hours: string | null;
  user: {
    user_id: string;
    first_name: string;
    last_name: string;
    email: string;
  };
}

export class PatientInfoDto {
  patient_id: number;
  user_id: string;
  user: {
    user_id: string;
    first_name: string;
    last_name: string;
    email: string;
  };
}

export class AppointmentResponseDto {
  appointment_id: number;
  doctor_id: number;
  patient_id: number;
  appointment_datetime: Date;
  duration_minutes: number | null;
  status: AppointmentStatus;
  notes: string | null;
  patient_consent_to_record: boolean;
  proposed_appointment_datetime?: Date | null;
  reschedule_note?: string | null;
  doctor: DoctorInfoDto;
  patient: PatientInfoDto;
}
