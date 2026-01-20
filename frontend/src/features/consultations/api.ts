import apiClient from '@/store/apiClient';
import type { Appointment } from '@/store/appointments/appointmentsApi';

export interface Consultation {
  consultation_id: number;
  appointment_id: number;
  created_at: string | null;
  diagnosis?: string | null;
  treatment_plan?: string | null;
  recording?: string | null; // legacy latest
  recordings?: ConsultationRecording[];
  transcript?: string | null;
  AI_summary?: string | null;
  notes_approved_at?: string | null;
  notes_approved_by?: string | null;
  notes_locked?: boolean;
  notes_status?: 'DRAFT' | 'APPROVED' | 'FINAL';
  appointment: Appointment;
}

export interface ConsultationRecording {
  consultation_recording_id: number;
  consultation_id: number;
  file_path: string;
  created_at: string;
}

export async function startConsultation(appointmentId: number): Promise<Consultation> {
  const response = await apiClient.post<Consultation>('/consultations/start', {
    appointmentId,
  });
  return response.data;
}

export async function getConsultationByAppointment(
  appointmentId: number,
): Promise<Consultation | null> {
  const response = await apiClient.get<Consultation | null>(
    `/consultations/by-appointment/${appointmentId}`,
  );
  return response.data;
}

export async function uploadRecording(consultationId: number, file: File): Promise<Consultation> {
  const formData = new FormData();
  formData.append('file', file);

  const response = await apiClient.post<Consultation>(
    `/consultations/${consultationId}/recording`,
    formData,
    {
      headers: { 'Content-Type': 'multipart/form-data' },
    },
  );
  return response.data;
}

export interface DoctorOption {
  user_id: string;
  first_name: string;
  last_name: string;
  email: string;
  doctor_profile: {
    doctor_id: number;
    specialization?: string | null;
  };
}

export interface ConsultationNotes {
  transcript: string;
  summary: string;
}

export interface ConsultationActionItem {
  action_item_id: number;
  consultation_id: number;
  description: string;
  is_completed: boolean;
  created_at: string;
  updated_at: string;
}

export async function generateConsultationNotes(
  consultationId: number,
): Promise<ConsultationNotes> {
  const response = await apiClient.post<ConsultationNotes>(
    `/consultations/${consultationId}/generate-notes`,
  );
  return response.data;
}

export async function getDoctors(): Promise<DoctorOption[]> {
  const response = await apiClient.get<DoctorOption[]>(`/users/doctors`);
  return response.data;
}

export async function updateConsultationNotes(
  consultationId: number,
  notes: Partial<ConsultationNotes>,
): Promise<ConsultationNotes> {
  const response = await apiClient.put<ConsultationNotes>(
    `/consultations/${consultationId}/notes`,
    notes,
  );
  return response.data;
}

export interface ApproveNotesResponse {
  success: boolean;
  approvedAt: string;
  status: string;
}

export async function approveConsultationNotes(
  consultationId: number,
): Promise<ApproveNotesResponse> {
  const response = await apiClient.put<ApproveNotesResponse>(
    `/consultations/${consultationId}/approve-notes`,
  );
  return response.data;
}

export interface SharedConsultationNote {
  share_id: number;
  consultation_id: number;
  shared_by_doctor_id: number;
  shared_with_doctor_id: number;
  permissions: string;
  created_at: string;
  revoked_at?: string | null;
  consultation?: Consultation;
  shared_by?: {
    doctor_id: number;
    user: {
      user_id: string;
      first_name: string;
      last_name: string;
      email: string;
    };
  };
  shared_with?: {
    doctor_id: number;
    user: {
      user_id: string;
      first_name: string;
      last_name: string;
      email: string;
    };
  };
}

export async function shareConsultationNotes(
  consultationId: number,
  sharedWithDoctorId: number,
  permissions: string = 'read',
): Promise<{ success: boolean; shareId: number }> {
  const response = await apiClient.post<{ success: boolean; shareId: number }>(
    `/consultations/${consultationId}/share`,
    { sharedWithDoctorId, permissions },
  );
  return response.data;
}

export async function getSharedNotesWithMe(): Promise<SharedConsultationNote[]> {
  const response = await apiClient.get<SharedConsultationNote[]>('/consultations/shared-with-me');
  return response.data;
}

export async function getConsultationShares(
  consultationId: number,
): Promise<SharedConsultationNote[]> {
  const response = await apiClient.get<SharedConsultationNote[]>(
    `/consultations/${consultationId}/shares`,
  );
  return response.data;
}

export async function revokeConsultationShare(shareId: number): Promise<{ success: boolean }> {
  const response = await apiClient.delete<{ success: boolean }>(`/consultations/shares/${shareId}`);
  return response.data;
}

// Action Items API
export async function getActionItems(consultationId: number): Promise<ConsultationActionItem[]> {
  const response = await apiClient.get<ConsultationActionItem[]>(
    `/consultations/${consultationId}/action-items`,
  );
  return response.data;
}

export async function createActionItem(
  consultationId: number,
  description: string,
): Promise<ConsultationActionItem> {
  const response = await apiClient.post<ConsultationActionItem>(
    `/consultations/${consultationId}/action-items`,
    { description },
  );
  return response.data;
}

export async function updateActionItem(
  consultationId: number,
  actionItemId: number,
  updates: { description?: string; is_completed?: boolean },
): Promise<ConsultationActionItem> {
  const response = await apiClient.put<ConsultationActionItem>(
    `/consultations/${consultationId}/action-items/${actionItemId}`,
    updates,
  );
  return response.data;
}

export async function deleteActionItem(
  consultationId: number,
  actionItemId: number,
): Promise<void> {
  await apiClient.delete(`/consultations/${consultationId}/action-items/${actionItemId}`);
}
