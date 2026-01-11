import { useState, useEffect } from 'react';
import {
  getAppointments,
  createAppointment,
  updateAppointment,
  cancelAppointment,
  requestReschedule,
  respondReschedule,
  type Appointment,
  type CreateAppointmentDto,
  type UpdateAppointmentDto,
  type RequestRescheduleDto,
} from '@/store/appointments/appointmentsApi';
import { AppointmentList } from '../../components/AppointmentList';
import { AppointmentForm, type AppointmentFormData } from '../../components/AppointmentForm';
import { Button } from '@/components';
import { useAppSelector } from '@/store/hooks';
import styles from './Appointments.module.css';

export const Appointments = () => {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingAppointment, setEditingAppointment] = useState<Appointment | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  // Get current user to determine role
  const currentUser = useAppSelector((state) => state.users?.current);
  const isDoctor = currentUser?.role === 'doctor';

  useEffect(() => {
    loadAppointments();
  }, []);

  const loadAppointments = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await getAppointments();
      setAppointments(data);
    } catch (err: any) {
      console.error('Failed to load appointments:', err);
      setError(err.response?.data?.message || 'Failed to load appointments');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateAppointment = async (formData: AppointmentFormData) => {
    try {
      setError(null);
      // Convert local datetime to ISO string
      const appointmentDateTime = new Date(formData.appointment_datetime).toISOString();
      const createDto: CreateAppointmentDto = {
        doctor_id: formData.doctor_id!,
        appointment_datetime: appointmentDateTime,
        duration_minutes: formData.duration_minutes,
        notes: formData.notes,
        patient_consent_to_record: formData.patient_consent_to_record,
      };
      await createAppointment(createDto);
      await loadAppointments();
      setShowForm(false);
    } catch (err: any) {
      console.error('Failed to create appointment:', err);
      setError(err.response?.data?.message || 'Failed to create appointment');
      throw err;
    }
  };

  const handleReschedule = (appointment: Appointment) => {
    setEditingAppointment(appointment);
    setShowForm(true);
  };

  const handleUpdateAppointment = async (formData: AppointmentFormData) => {
    if (!editingAppointment) return;

    try {
      setError(null);
      // Convert local datetime to ISO string
      const appointmentDateTime = formData.appointment_datetime
        ? new Date(formData.appointment_datetime).toISOString()
        : undefined;
      if (isDoctor) {
        if (!appointmentDateTime) {
          setError('Please select a new date and time to request a reschedule.');
          return;
        }
        const reqDto: RequestRescheduleDto = {
          proposed_appointment_datetime: appointmentDateTime!,
          reschedule_note: formData.notes,
        };
        await requestReschedule(editingAppointment.appointment_id, reqDto);
      } else {
        const updateDto: UpdateAppointmentDto = {
          appointment_datetime: appointmentDateTime,
          duration_minutes: formData.duration_minutes,
          notes: formData.notes,
          patient_consent_to_record: formData.patient_consent_to_record,
        };
        await updateAppointment(editingAppointment.appointment_id, updateDto);
      }
      await loadAppointments();
      setShowForm(false);
      setEditingAppointment(null);
    } catch (err: any) {
      console.error('Failed to update appointment:', err);
      setError(err.response?.data?.message || 'Failed to reschedule appointment');
      throw err;
    }
  };

  const handleCancel = async (appointment: Appointment) => {
    if (!window.confirm('Are you sure you want to cancel this appointment?')) {
      return;
    }

    try {
      setError(null);
      await cancelAppointment(appointment.appointment_id);
      await loadAppointments();
    } catch (err: any) {
      console.error('Failed to cancel appointment:', err);
      setError(err.response?.data?.message || 'Failed to cancel appointment');
    }
  };

  const handleNewAppointment = () => {
    setEditingAppointment(null);
    setShowForm(true);
  };

  const handleRespondReschedule = async (appointment: Appointment, accept: boolean) => {
    try {
      setError(null);
      await respondReschedule(appointment.appointment_id, accept);
      await loadAppointments();
    } catch (err: any) {
      console.error('Failed to respond to reschedule:', err);
      setError(err.response?.data?.message || 'Failed to respond to reschedule');
    }
  };

  const handleCancelForm = () => {
    setShowForm(false);
    setEditingAppointment(null);
    setError(null);
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1 className={styles.title}>
          {isDoctor ? 'Patient Appointments' : 'My Appointments'}
        </h1>
        {!showForm && !isDoctor && (
          <Button onClick={handleNewAppointment}>Schedule New Appointment</Button>
        )}
      </div>

      {error && <div className={styles.error}>{error}</div>}

      {showForm ? (
        <div className={styles.formContainer}>
          <h2 className={styles.formTitle}>
            {editingAppointment ? 'Reschedule Appointment' : 'Schedule New Appointment'}
          </h2>
          <AppointmentForm
            onSubmit={editingAppointment ? handleUpdateAppointment : handleCreateAppointment}
            initialData={
              editingAppointment
                ? {
                    doctor_id: editingAppointment.doctor_id,
                    appointment_datetime: editingAppointment.appointment_datetime,
                    duration_minutes: editingAppointment.duration_minutes || 30,
                    notes: editingAppointment.notes || '',
                    patient_consent_to_record: editingAppointment.patient_consent_to_record,
                  }
                : undefined
            }
            submitLabel={editingAppointment ? 'Reschedule Appointment' : 'Schedule Appointment'}
            onCancel={handleCancelForm}
            isReschedule={!!editingAppointment}
          />
        </div>
      ) : (
        <AppointmentList
          appointments={appointments}
          onReschedule={handleReschedule}
          onCancel={handleCancel}
          onRespondReschedule={handleRespondReschedule}
          loading={loading}
        />
      )}
    </div>
  );
};

