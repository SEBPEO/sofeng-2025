import apiClient from '../apiClient';
import { patientsResponseSchema, type Patient } from './patientSchema';

/**
 * Fetch patients assigned to the current doctor.
 * Backend endpoint: GET /patients
 *
 * Security: Backend will filter by authenticated doctor's ID from JWT.
 * Doctors only see their own patients.
 */
export async function getDoctorPatients(): Promise<Patient[]> {
  const { data } = await apiClient.get('/patients');
  return patientsResponseSchema.parse(data);
}
