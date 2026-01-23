import { z } from 'zod';

export const doctorProfileSchema = z.object({
  doctor_id: z.number(),
  user_id: z.string(),
  specialization: z.string(),
  experience_years: z.number().nullable(),
  clinic_address: z.string(),
  contact_info: z.string().nullable(),
  working_hours: z.string().nullable(),
});

export const patientProfileSchema = z.object({
  patient_id: z.number(),
  user_id: z.string(),
  date_of_birth: z.string().nullable(),
  emergency_contact: z.string().nullable(),
  conditions: z.string().nullable(),
  medications: z.string().nullable(),
  allergy: z.string().nullable(),
});

export const userSchema = z.object({
  id: z.string().optional(),
  user_id: z.string().optional(),
  name: z.string().optional(),
  first_name: z.string().optional(),
  last_name: z.string().optional(),
  email: z.string().email().optional(),
  gender: z.enum(['male', 'female']).optional(),
  role: z.enum(['doctor', 'patient']).optional(),
  createdAt: z.string().optional(),
  lastLogin: z.string().nullable().optional(),
  profileCompleted: z.boolean().optional(),
  doctor_profile: doctorProfileSchema.nullable().optional(),
  patient_profile: patientProfileSchema.nullable().optional(),
});

export const usersSchema = z.array(userSchema);

export type DoctorProfile = z.infer<typeof doctorProfileSchema>;
export type PatientProfile = z.infer<typeof patientProfileSchema>;
export type User = z.infer<typeof userSchema>;
export type Users = z.infer<typeof usersSchema>;
