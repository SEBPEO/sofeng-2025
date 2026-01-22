import React, { useState } from 'react';
import type { Appointment } from '@/store/appointments/appointmentsApi';
import { Button } from '@/components';
import { useAppSelector } from '@/store/hooks';
import { useNavigate } from 'react-router-dom';
import styles from './AppointmentList.module.css';

interface AppointmentListProps {
  appointments: Appointment[];
  onReschedule?: (appointment: Appointment) => void;
  onCancel?: (appointment: Appointment) => void;
  onRespondReschedule?: (appointment: Appointment, accept: boolean) => void;
  loading?: boolean;
}

export const AppointmentList: React.FC<AppointmentListProps> = ({
  appointments,
  onReschedule,
  onCancel,
  onRespondReschedule,
  loading,
}) => {
  const navigate = useNavigate();
  const currentUser = useAppSelector((state) => state.users?.current);
  const isDoctor = currentUser?.role === 'doctor';
  
  // State for collapsible sections
  const [expandedSections, setExpandedSections] = useState<{
    [key: string]: boolean;
  }>({
    scheduled: true,
    completed: true,
    cancelled: true,
  });

  const toggleSection = (section: string) => {
    setExpandedSections((prev) => ({
      ...prev,
      [section]: !prev[section],
    }));
  };
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
      case 'pending_reschedule':
        return styles.statusPending;
      default:
        return '';
    }
  };

  const getStatusLabel = (status: string) => {
    return status
      .split('_')
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join(' ');
  };

  const groupAppointments = () => {
    const scheduled: Appointment[] = [];
    const completed: Appointment[] = [];
    const cancelled: Appointment[] = [];
    const now = new Date();

    appointments.forEach((appointment) => {
      const appointmentDate = new Date(appointment.appointment_datetime);
      const isPast = appointmentDate < now;

      // Check if appointment is actually cancelled (not just past date)
      if (appointment.status === 'cancelled') {
        cancelled.push(appointment);
      }
      // If appointment date has passed, treat it as completed
      else if (isPast) {
        completed.push(appointment);
      }
      // Otherwise it's scheduled (includes pending_reschedule)
      else {
        scheduled.push(appointment);
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
    const proposed = appointment.proposed_appointment_datetime
      ? formatDateTime(appointment.proposed_appointment_datetime)
      : null;
    
    // Show patient name if current user is a doctor, otherwise show doctor name
    const displayName = isDoctor
      ? `${appointment.patient.user.first_name} ${appointment.patient.user.last_name}`
      : `Dr. ${appointment.doctor.user.first_name} ${appointment.doctor.user.last_name}`;
    
    const subtitle = isDoctor
      ? 'Patient'
      : appointment.doctor.specialization;
    
    const isPast = new Date(appointment.appointment_datetime) < new Date();
    
    // Determine display status (completed if past date, otherwise use appointment status)
    const displayStatus = isPast && appointment.status !== 'cancelled' ? 'completed' : appointment.status;
    
    const canModify = appointment.status === 'scheduled' && !isPast && !isDoctor;
    const canDoctorReschedule = isDoctor && appointment.status === 'scheduled' && !isPast;
    const canDoctorCancel = isDoctor && appointment.status !== 'cancelled' && !isPast;
    const canStartSession = isDoctor && appointment.status === 'scheduled' && !isPast;
    const canViewSession = !isDoctor && appointment.status !== 'cancelled';
    const isPendingReschedule = appointment.status === 'pending_reschedule';

    return (
      <div key={appointment.appointment_id} className={styles.appointmentCard}>
        <div className={styles.appointmentHeader}>
          <div className={styles.appointmentInfo}>
            <h3 className={styles.doctorName}>{displayName}</h3>
            <p className={styles.specialization}>{subtitle}</p>
          </div>
          <span className={`${styles.statusBadge} ${getStatusColor(displayStatus)}`}>
            {getStatusLabel(displayStatus)}
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
          {isPendingReschedule && proposed && (
            <div className={styles.detailItem}>
              <span className={styles.detailLabel}>Proposed:</span>
              <span className={styles.detailValue}>
                {proposed.date} at {proposed.time}
              </span>
            </div>
          )}
          {isPendingReschedule && appointment.reschedule_note && (
            <div className={styles.detailItem}>
              <span className={styles.detailLabel}>Reschedule Note:</span>
              <span className={styles.detailValue}>{appointment.reschedule_note}</span>
            </div>
          )}
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
        {canDoctorReschedule && (
          <div className={styles.appointmentActions}>
            {onReschedule && (
              <Button
                variant="secondary"
                onClick={() => onReschedule(appointment)}
                className={styles.actionButton}
              >
                Request Reschedule
              </Button>
            )}
            {onCancel && (
              <Button
                variant="ghost"
                onClick={() => onCancel(appointment)}
                className={styles.actionButton}
              >
                Cancel Appointment
              </Button>
            )}
          </div>
        )}
        {isDoctor && isPendingReschedule && (
          <div className={styles.appointmentActions}>
            <div className={styles.pendingNote}>Reschedule requested, awaiting patient</div>
            {canDoctorCancel && onCancel && (
              <Button
                variant="ghost"
                onClick={() => onCancel(appointment)}
                className={styles.actionButton}
              >
                Cancel Appointment
              </Button>
            )}
          </div>
        )}
        {!isDoctor && isPendingReschedule && onRespondReschedule && (
          <div className={styles.appointmentActions}>
            <Button
              variant="secondary"
              onClick={() => onRespondReschedule(appointment, true)}
              className={styles.actionButton}
            >
              Accept
            </Button>
            <Button
              variant="ghost"
              onClick={() => onRespondReschedule(appointment, false)}
              className={styles.actionButton}
            >
              Decline
            </Button>
          </div>
        )}
        {canStartSession && (
          <div className={styles.appointmentActions}>
            <Button
              onClick={() => navigate(`/consultations/${appointment.appointment_id}`)}
              className={styles.actionButton}
            >
              Start Session
            </Button>
          </div>
        )}
        {canViewSession && (
          <div className={styles.appointmentActions}>
            <Button
              variant="secondary"
              onClick={() => navigate(`/consultations/${appointment.appointment_id}`)}
              className={styles.actionButton}
            >
              View Session
            </Button>
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

  const renderSection = (title: string, appointments: Appointment[], sectionKey: string) => {
    if (appointments.length === 0) return null;

    const isExpanded = expandedSections[sectionKey];
    const showMore = appointments.length > 5;
    const displayedAppointments = isExpanded ? appointments : appointments.slice(0, 5);

    return (
      <div key={sectionKey} className={styles.section}>
        <div className={styles.sectionHeader}>
          <h2 className={styles.sectionTitle}>
            {title} ({appointments.length})
          </h2>
          {showMore && (
            <button
              className={styles.toggleButton}
              onClick={() => toggleSection(sectionKey)}
              type="button"
            >
              {isExpanded ? '▲ Show less' : '▼ Show all'}
            </button>
          )}
        </div>
        <div className={styles.appointmentsGrid}>
          {displayedAppointments.map(renderAppointmentCard)}
        </div>
      </div>
    );
  };

  return (
    <div className={styles.container}>
      {renderSection('Upcoming Appointments', scheduled, 'scheduled')}
      {renderSection('Completed Appointments', completed, 'completed')}
      {renderSection('Cancelled Appointments', cancelled, 'cancelled')}
    </div>
  );
};

