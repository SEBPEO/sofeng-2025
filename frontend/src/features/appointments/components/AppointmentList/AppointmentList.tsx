import React from 'react';
import type { Appointment } from '@/store/appointments/appointmentsApi';
import { Button } from '@/components';
import styles from './AppointmentList.module.css';

interface AppointmentListProps {
  appointments: Appointment[];
  onReschedule?: (appointment: Appointment) => void;
  onCancel?: (appointment: Appointment) => void;
  loading?: boolean;
}

export const AppointmentList: React.FC<AppointmentListProps> = ({
  appointments,
  onReschedule,
  onCancel,
  loading,
}) => {
  const formatDateTime = (dateTimeString: string) => {
    const date = new Date(dateTimeString);
    return {
      date: date.toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      }),
      time: date.toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
      }),
    };
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'scheduled':
        return styles.statusScheduled;
      case 'completed':
        return styles.statusCompleted;
      case 'cancelled':
        return styles.statusCancelled;
      default:
        return '';
    }
  };

  const getStatusLabel = (status: string) => {
    return status.charAt(0).toUpperCase() + status.slice(1);
  };

  const groupAppointments = () => {
    const scheduled: Appointment[] = [];
    const completed: Appointment[] = [];
    const cancelled: Appointment[] = [];

    appointments.forEach((appointment) => {
      if (appointment.status === 'scheduled') {
        scheduled.push(appointment);
      } else if (appointment.status === 'completed') {
        completed.push(appointment);
      } else {
        cancelled.push(appointment);
      }
    });

    // Sort scheduled by date (upcoming first)
    scheduled.sort(
      (a, b) =>
        new Date(a.appointment_datetime).getTime() - new Date(b.appointment_datetime).getTime(),
    );

    // Sort completed and cancelled by date (recent first)
    completed.sort(
      (a, b) =>
        new Date(b.appointment_datetime).getTime() - new Date(a.appointment_datetime).getTime(),
    );
    cancelled.sort(
      (a, b) =>
        new Date(b.appointment_datetime).getTime() - new Date(a.appointment_datetime).getTime(),
    );

    return { scheduled, completed, cancelled };
  };

  const renderAppointmentCard = (appointment: Appointment) => {
    const { date, time } = formatDateTime(appointment.appointment_datetime);
    const doctorName = `${appointment.doctor.user.first_name} ${appointment.doctor.user.last_name}`;
    const isPast = new Date(appointment.appointment_datetime) < new Date();
    const canModify = appointment.status === 'scheduled' && !isPast;

    return (
      <div key={appointment.appointment_id} className={styles.appointmentCard}>
        <div className={styles.appointmentHeader}>
          <div className={styles.appointmentInfo}>
            <h3 className={styles.doctorName}>Dr. {doctorName}</h3>
            <p className={styles.specialization}>{appointment.doctor.specialization}</p>
          </div>
          <span className={`${styles.statusBadge} ${getStatusColor(appointment.status)}`}>
            {getStatusLabel(appointment.status)}
          </span>
        </div>

        <div className={styles.appointmentDetails}>
          <div className={styles.detailItem}>
            <span className={styles.detailLabel}>Date:</span>
            <span className={styles.detailValue}>{date}</span>
          </div>
          <div className={styles.detailItem}>
            <span className={styles.detailLabel}>Time:</span>
            <span className={styles.detailValue}>{time}</span>
          </div>
          <div className={styles.detailItem}>
            <span className={styles.detailLabel}>Duration:</span>
            <span className={styles.detailValue}>{appointment.duration_minutes || 30} minutes</span>
          </div>
          <div className={styles.detailItem}>
            <span className={styles.detailLabel}>Location:</span>
            <span className={styles.detailValue}>{appointment.doctor.clinic_address}</span>
          </div>
          {appointment.notes && (
            <div className={styles.detailItem}>
              <span className={styles.detailLabel}>Notes:</span>
              <span className={styles.detailValue}>{appointment.notes}</span>
            </div>
          )}
        </div>

        {canModify && (
          <div className={styles.appointmentActions}>
            {onReschedule && (
              <Button
                variant="secondary"
                onClick={() => onReschedule(appointment)}
                className={styles.actionButton}
              >
                Reschedule
              </Button>
            )}
            {onCancel && (
              <Button
                variant="ghost"
                onClick={() => onCancel(appointment)}
                className={styles.actionButton}
              >
                Cancel
              </Button>
            )}
          </div>
        )}
      </div>
    );
  };

  if (loading) {
    return <div className={styles.loading}>Loading appointments...</div>;
  }

  const { scheduled, completed, cancelled } = groupAppointments();

  if (appointments.length === 0) {
    return (
      <div className={styles.empty}>
        <p>No appointments found.</p>
        <p className={styles.emptySubtext}>Schedule your first appointment to get started.</p>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      {scheduled.length > 0 && (
        <div className={styles.section}>
          <h2 className={styles.sectionTitle}>Upcoming Appointments</h2>
          <div className={styles.appointmentsGrid}>{scheduled.map(renderAppointmentCard)}</div>
        </div>
      )}

      {completed.length > 0 && (
        <div className={styles.section}>
          <h2 className={styles.sectionTitle}>Completed Appointments</h2>
          <div className={styles.appointmentsGrid}>{completed.map(renderAppointmentCard)}</div>
        </div>
      )}

      {cancelled.length > 0 && (
        <div className={styles.section}>
          <h2 className={styles.sectionTitle}>Cancelled Appointments</h2>
          <div className={styles.appointmentsGrid}>{cancelled.map(renderAppointmentCard)}</div>
        </div>
      )}
    </div>
  );
};

