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

export interface AccountDeletionRequest {
  request_id: number;
  status: string;
  requested_at: Date;
  message: string;
}

export interface DataExportRequest {
  request_id: number;
  status: string;
  requested_at: Date;
  message: string;
}

/**
 * Request account deletion
 * Backend endpoint: POST /users/request-deletion
 */
export async function requestAccountDeletion(reason?: string): Promise<AccountDeletionRequest> {
  const { data } = await apiClient.post('/users/request-deletion', { reason });
  return data;
}

/**
 * Request data export
 * Backend endpoint: POST /users/request-export
 */
export async function requestDataExport(): Promise<DataExportRequest> {
  const { data } = await apiClient.post('/users/request-export');
  return data;
}

/**
 * Export user data as JSON
 * Backend endpoint: GET /users/export-data
 */
export async function getUserDataExport(): Promise<any> {
  const { data } = await apiClient.get('/users/export-data');
  return data;
}

// Privacy requests: list + cancel
export interface PrivacyRequestsResponse {
  deletionRequests: Array<{
    request_id: number;
    status: string;
    requested_at: string;
    processed_at?: string | null;
    reason?: string | null;
  }>;
  exportRequests: Array<{
    request_id: number;
    status: string;
    requested_at: string;
    completed_at?: string | null;
    export_file_path?: string | null;
  }>;
}

export async function getPrivacyRequests(): Promise<PrivacyRequestsResponse> {
  const { data } = await apiClient.get('/users/privacy-requests');
  return data;
}

export async function cancelDeletionRequest(id: number): Promise<{ success: boolean }> {
  const { data } = await apiClient.delete(`/users/privacy-requests/deletion/${id}`);
  return data;
}

export async function cancelExportRequest(id: number): Promise<{ success: boolean }> {
  const { data } = await apiClient.delete(`/users/privacy-requests/export/${id}`);
  return data;
}

export async function approveDeletionRequest(
  id: number,
): Promise<{ success: boolean; message: string }> {
  const { data } = await apiClient.post(`/users/privacy-requests/deletion/${id}/approve`);
  return data;
}

export async function approveExportRequest(
  id: number,
): Promise<{ success: boolean; message: string }> {
  const { data } = await apiClient.post(`/users/privacy-requests/export/${id}/approve`);
  return data;
}
