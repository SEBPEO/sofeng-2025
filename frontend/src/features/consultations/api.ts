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
