import apiClient from '../apiClient';
import { userSchema, type User } from './userSchema';

/**
 * Fetch the current user using the JWT stored by the client.
 * Backend endpoint: GET /users/me
 */
export async function getUserByJwt(): Promise<User> {
  const { data } = await apiClient.get('/users/me');
  return userSchema.parse(data);
}

export interface UpdateProfilePayload {
  first_name?: string;
  last_name?: string;
  gender?: 'male' | 'female';
  role?: 'doctor' | 'patient';
  // Doctor fields
  specialization?: string;
  experience_years?: number;
  clinic_address?: string;
  contact_info?: string;
  working_hours?: string;
  // Patient fields
  date_of_birth?: string;
  emergency_contact?: string;
  conditions?: string;
  medications?: string;
  allergy?: string;
}

/**
 * Update the current user's profile
 * Backend endpoint: PATCH /users/me
 */
export async function updateUserProfile(payload: UpdateProfilePayload): Promise<User> {
  const { data } = await apiClient.patch('/users/me', payload);
  return userSchema.parse(data);
}
