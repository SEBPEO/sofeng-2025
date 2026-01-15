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

export async function uploadRecording(
  consultationId: number,
  file: File,
): Promise<Consultation> {
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

// Action Items API
export async function getActionItems(
  consultationId: number,
): Promise<ConsultationActionItem[]> {
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