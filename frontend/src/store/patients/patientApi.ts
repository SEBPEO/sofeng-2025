import apiClient from '../apiClient';
import { patientsResponseSchema, type Patient } from './patientSchema';

/**
* Fetch ALL patients in the system (for browsing/discovery)
 * Backend endpoint: GET /patients
 */
export async function getAllPatients(): Promise<Patient[]> {
  const { data } = await apiClient.get('/patients');
  return patientsResponseSchema.parse(data);
}

/**
 * Fetch patients assigned to the current doctor (My Patients)
 * Backend endpoint: GET /patients/my
 *
 * Security: Backend filters by authenticated doctor's ID from JWT.
 * Doctors only see their own assigned patients.
 */
export async function getMyPatients(): Promise<Patient[]> {
  const { data } = await apiClient.get('/patients/my');
  return patientsResponseSchema.parse(data);
}

/**
 * Assign a patient to the current doctor
 * Backend endpoint: POST /patients/:patientId/assign
 *
 * Security: Backend extracts doctor_id from JWT (not from request body)
 */
export async function assignPatient(patientId: number): Promise<Patient> {
  const { data } = await apiClient.post(`/patients/${patientId}/assign`);
  return data;
}

/**
 * Unassign a patient from the current doctor
 * Backend endpoint: DELETE /patients/:patientId/unassign
 */
export async function unassignPatient(
  patientId: number,
): Promise<{ success: boolean; patientId: number }> {
  const { data } = await apiClient.delete(`/patients/${patientId}/unassign`);
  return data;
}
