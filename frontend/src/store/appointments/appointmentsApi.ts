import apiClient from '../apiClient';

export interface Doctor {
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

export interface Appointment {
  appointment_id: number;
  doctor_id: number;
  patient_id: number;
  appointment_datetime: string;
  duration_minutes: number | null;
  status: 'scheduled' | 'completed' | 'cancelled';
  notes: string | null;
  doctor: {
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
  };
  patient: {
    patient_id: number;
    user_id: string;
    user: {
      user_id: string;
      first_name: string;
      last_name: string;
      email: string;
    };
  };
}

export interface CreateAppointmentDto {
  doctor_id: number;
  appointment_datetime: string;
  duration_minutes?: number;
  notes?: string;
}

export interface UpdateAppointmentDto {
  appointment_datetime?: string;
  duration_minutes?: number;
  notes?: string;
}

export async function getDoctors(): Promise<Doctor[]> {
  const response = await apiClient.get<Doctor[]>('/appointments/doctors');
  return response.data;
}

export async function getAppointments(): Promise<Appointment[]> {
  const response = await apiClient.get<Appointment[]>('/appointments');
  return response.data;
}

export async function getAppointment(id: number): Promise<Appointment> {
  const response = await apiClient.get<Appointment>(`/appointments/${id}`);
  return response.data;
}

export async function createAppointment(data: CreateAppointmentDto): Promise<Appointment> {
  const response = await apiClient.post<Appointment>('/appointments', data);
  return response.data;
}

export async function updateAppointment(
  id: number,
  data: UpdateAppointmentDto,
): Promise<Appointment> {
  const response = await apiClient.patch<Appointment>(`/appointments/${id}`, data);
  return response.data;
}

export async function cancelAppointment(id: number): Promise<void> {
  await apiClient.delete(`/appointments/${id}`);
}

export interface Availability {
  availability_id: number;
  doctor_id: number;
  day_of_week: number;
  start_time: string;
  end_time: string;
  duration_minutes: number;
  is_available: boolean;
}

export interface TimeSlot {
  start_time: string;
  end_time: string;
  duration_minutes: number;
}

export async function getDoctorAvailability(doctorId: number): Promise<Availability[]> {
  const response = await apiClient.get<Availability[]>(`/availability/doctor/${doctorId}`);
  return response.data;
}

export async function getAvailableSlots(
  doctorId: number,
  date: string,
): Promise<TimeSlot[]> {
  const response = await apiClient.get<TimeSlot[]>(
    `/appointments/doctors/${doctorId}/available-slots?date=${date}`,
  );
  return response.data;
}
