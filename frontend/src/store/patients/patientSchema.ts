import { z } from 'zod';

/**
 * Patient schema matching backend PatientProfile + User data
 */
export const patientSchema = z.object({
  patient_id: z.number(),
  user_id: z.string(),
  date_of_birth: z.string().nullable(),
  emergency_contact: z.string().nullable(),
  conditions: z.string().nullable(),
  medications: z.string().nullable(),
  allergy: z.string().nullable(),
  // User info
  first_name: z.string(),
  last_name: z.string(),
  email: z.string(),
  gender: z.enum(['male', 'female']),
});

export type Patient = z.infer<typeof patientSchema>;

/**
 * API response for GET /patients (doctor's patients)
 */
export const patientsResponseSchema = z.array(patientSchema);

export type PatientsResponse = z.infer<typeof patientsResponseSchema>;
