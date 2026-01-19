import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { PrismaClient, AppointmentStatus } from '@prisma/client';
import { CreateAppointmentDto } from './dto/create-appointment.dto';
import { UpdateAppointmentDto } from './dto/update-appointment.dto';
import { AppointmentResponseDto } from './dto/appointment-response.dto';
import { AvailabilityService } from '../availability/availability.service';
import { RequestRescheduleDto } from './dto/request-reschedule.dto';
import { NotificationsService } from '../notifications/notifications.service';
import { EmailService } from '../notifications/email.service';
import { AuditService } from '../audit/audit.service';

const prisma = new PrismaClient();

@Injectable()
export class AppointmentsService {
  private readonly logger = new Logger(AppointmentsService.name);

  constructor(
    private readonly availabilityService: AvailabilityService,
    private readonly notificationsService: NotificationsService,
    private readonly emailService: EmailService,
    private readonly auditService: AuditService,
  ) {}

  async create(
    patientId: number,
    createAppointmentDto: CreateAppointmentDto,
  ): Promise<AppointmentResponseDto> {
    const appointmentDateTime = new Date(createAppointmentDto.appointment_datetime);

    // Validate: No past dates
    if (appointmentDateTime < new Date()) {
      throw new BadRequestException('Cannot schedule appointments in the past');
    }

    // Get doctor's availability for this day
    const dateStr = appointmentDateTime.toISOString().split('T')[0];
    const availableSlots = await this.availabilityService.getAvailableSlots(
      createAppointmentDto.doctor_id,
      dateStr,
    );

    // Check if the requested time matches an available slot
    const duration = createAppointmentDto.duration_minutes || 30;

    // Compare by truncating to minutes (ignore seconds/milliseconds)
    const requestedTimeMinutes = new Date(
      Math.floor(appointmentDateTime.getTime() / 60000) * 60000,
    );

    const isValidSlot = availableSlots.some((slot) => {
      const slotStartMinutes = new Date(
        Math.floor(new Date(slot.start_time).getTime() / 60000) * 60000,
      );
      return (
        requestedTimeMinutes.getTime() === slotStartMinutes.getTime() &&
        slot.duration_minutes === duration
      );
    });

    if (!isValidSlot) {
      throw new BadRequestException(
        'The selected time slot is not available. Please choose from available time slots.',
      );
    }

    // Validate: Check for overlapping appointments
    const endTime = new Date(appointmentDateTime.getTime() + duration * 60000);

    // Find all non-cancelled appointments for this doctor
    const existingAppointments = await prisma.appointment.findMany({
      where: {
        doctor_id: createAppointmentDto.doctor_id,
        status: {
          not: 'cancelled',
        },
      },
    });

    // Check for overlaps: new appointment overlaps if it starts before existing ends AND ends after existing starts
    const overlapping = existingAppointments.some((existing) => {
      const existingEnd = new Date(
        existing.appointment_datetime.getTime() + (existing.duration_minutes || 30) * 60000,
      );
      return appointmentDateTime < existingEnd && endTime > existing.appointment_datetime;
    });

    if (overlapping) {
      throw new BadRequestException(
        'Doctor already has an appointment at this time. Please choose another time.',
      );
    }

    // Verify doctor exists
    const doctor = await prisma.doctorProfile.findUnique({
      where: { doctor_id: createAppointmentDto.doctor_id },
      include: { user: true },
    });

    if (!doctor) {
      throw new NotFoundException('Doctor not found');
    }

    // Get next appointment_id
    const maxAppointment = await prisma.appointment.findFirst({
      orderBy: { appointment_id: 'desc' },
    });
    const nextId = (maxAppointment?.appointment_id || 0) + 1;

    // Create appointment
    const appointment = await prisma.appointment.create({
      data: {
        appointment_id: nextId,
        doctor_id: createAppointmentDto.doctor_id,
        patient_id: patientId,
        appointment_datetime: appointmentDateTime,
        duration_minutes: duration,
        status: 'scheduled',
        notes: createAppointmentDto.notes,
        patient_consent_to_record: createAppointmentDto.patient_consent_to_record,
      },
      include: {
        doctor: {
          include: {
            user: true,
          },
        },
        patient: {
          include: {
            user: true,
          },
        },
      },
    });

    // Send appointment scheduled notifications
    // Wrap in try-catch so notification errors don't fail the appointment creation
    try {
      await this.sendAppointmentScheduledNotifications(appointment);
    } catch (error) {
      this.logger.error('Failed to send appointment scheduled notifications:', error);
      // Continue anyway - appointment is already created
    }

    // Log appointment creation
    try {
      const patientUserId = appointment.patient?.user?.user_id;
      if (patientUserId) {
        await this.auditService.logDataOperation(
          patientUserId,
          'CREATE',
          'Appointment',
          appointment.appointment_id.toString(),
          {
            doctor_id: appointment.doctor_id,
            appointment_datetime: appointment.appointment_datetime,
            duration_minutes: appointment.duration_minutes,
          },
        );
      }
    } catch (error) {
      this.logger.error('Failed to log appointment creation:', error);
    }

    return this.mapToResponseDto(appointment);
  }

  async findAll(patientId: number): Promise<AppointmentResponseDto[]> {
    const appointments = await prisma.appointment.findMany({
      where: {
        patient_id: patientId,
      },
      include: {
        doctor: {
          include: {
            user: true,
          },
        },
        patient: {
          include: {
            user: true,
          },
        },
      },
      orderBy: {
        appointment_datetime: 'asc',
      },
    });

    return appointments.map((appointment) => this.mapToResponseDto(appointment));
  }

  async findAllForDoctor(doctorId: number): Promise<AppointmentResponseDto[]> {
    const appointments = await prisma.appointment.findMany({
      where: {
        doctor_id: doctorId,
      },
      include: {
        doctor: {
          include: {
            user: true,
          },
        },
        patient: {
          include: {
            user: true,
          },
        },
      },
      orderBy: {
        appointment_datetime: 'asc',
      },
    });

    return appointments.map((appointment) => this.mapToResponseDto(appointment));
  }

  async findOne(appointmentId: number, patientId: number): Promise<AppointmentResponseDto> {
    const appointment = await prisma.appointment.findUnique({
      where: { appointment_id: appointmentId },
      include: {
        doctor: {
          include: {
            user: true,
          },
        },
        patient: {
          include: {
            user: true,
          },
        },
      },
    });

    if (!appointment) {
      throw new NotFoundException('Appointment not found');
    }

    if (appointment.patient_id !== patientId) {
      throw new ForbiddenException('You do not have access to this appointment');
    }

    return this.mapToResponseDto(appointment);
  }

  async update(
    appointmentId: number,
    patientId: number,
    updateAppointmentDto: UpdateAppointmentDto,
  ): Promise<AppointmentResponseDto> {
    const appointment = await prisma.appointment.findUnique({
      where: { appointment_id: appointmentId },
      include: {
        doctor: {
          include: {
            user: true,
          },
        },
        patient: {
          include: {
            user: true,
          },
        },
      },
    });

    if (!appointment) {
      throw new NotFoundException('Appointment not found');
    }

    if (appointment.patient_id !== patientId) {
      throw new ForbiddenException('You do not have access to this appointment');
    }

    if (appointment.status === 'cancelled') {
      throw new BadRequestException('Cannot reschedule a cancelled appointment');
    }

    if (appointment.status === 'completed') {
      throw new BadRequestException('Cannot reschedule a completed appointment');
    }

    const updateData: any = {};

    if (updateAppointmentDto.appointment_datetime) {
      const appointmentDateTime = new Date(updateAppointmentDto.appointment_datetime);

      // Validate: No past dates
      if (appointmentDateTime < new Date()) {
        throw new BadRequestException('Cannot reschedule to a past date');
      }

      // Get doctor's availability for this day
      const dateStr = appointmentDateTime.toISOString().split('T')[0];
      const availableSlots = await this.availabilityService.getAvailableSlots(
        appointment.doctor_id,
        dateStr,
      );

      // Check if the requested time matches an available slot
      const requestedTime = appointmentDateTime.toISOString();
      const duration = updateAppointmentDto.duration_minutes || appointment.duration_minutes || 30;
      const isValidSlot = availableSlots.some(
        (slot) => slot.start_time === requestedTime && slot.duration_minutes === duration,
      );

      if (!isValidSlot) {
        throw new BadRequestException(
          'The selected time slot is not available. Please choose from available time slots.',
        );
      }

      // Validate: Check for overlapping appointments (excluding current appointment)
      const endTime = new Date(appointmentDateTime.getTime() + duration * 60000);

      // Find all non-cancelled appointments for this doctor (excluding current)
      const existingAppointments = await prisma.appointment.findMany({
        where: {
          doctor_id: appointment.doctor_id,
          appointment_id: {
            not: appointmentId,
          },
          status: {
            not: 'cancelled',
          },
        },
      });

      // Check for overlaps: new appointment overlaps if it starts before existing ends AND ends after existing starts
      const overlapping = existingAppointments.some((existing) => {
        const existingEnd = new Date(
          existing.appointment_datetime.getTime() + (existing.duration_minutes || 30) * 60000,
        );
        return appointmentDateTime < existingEnd && endTime > existing.appointment_datetime;
      });

      if (overlapping) {
        throw new BadRequestException(
          'Doctor already has an appointment at this time. Please choose another time.',
        );
      }

      updateData.appointment_datetime = appointmentDateTime;
    }

    if (updateAppointmentDto.duration_minutes !== undefined) {
      updateData.duration_minutes = updateAppointmentDto.duration_minutes;
    }

    if (updateAppointmentDto.notes !== undefined) {
      updateData.notes = updateAppointmentDto.notes;
    }

    if (updateAppointmentDto.patient_consent_to_record !== undefined) {
      updateData.patient_consent_to_record = updateAppointmentDto.patient_consent_to_record;
    }

    const updatedAppointment = await prisma.appointment.update({
      where: { appointment_id: appointmentId },
      data: updateData,
      include: {
        doctor: {
          include: {
            user: true,
          },
        },
        patient: {
          include: {
            user: true,
          },
        },
      },
    });

    // Log appointment update
    try {
      const patientUserId = updatedAppointment.patient?.user?.user_id;
      if (patientUserId) {
        await this.auditService.logDataOperation(
          patientUserId,
          'UPDATE',
          'Appointment',
          appointmentId.toString(),
          updateData,
        );
      }
    } catch (error) {
      this.logger.error('Failed to log appointment update:', error);
    }

    return this.mapToResponseDto(updatedAppointment);
  }

  async cancel(
    appointmentId: number,
    actorPatientId?: number,
    actorDoctorId?: number,
  ): Promise<void> {
    const appointment = await prisma.appointment.findUnique({
      where: { appointment_id: appointmentId },
      include: { patient: { include: { user: true } } },
    });

    if (!appointment) {
      throw new NotFoundException('Appointment not found');
    }

    const isPatient = actorPatientId && appointment.patient_id === actorPatientId;
    const isDoctor = actorDoctorId && appointment.doctor_id === actorDoctorId;

    if (!isPatient && !isDoctor) {
      throw new ForbiddenException('You do not have access to this appointment');
    }

    if (appointment.status === 'cancelled') {
      throw new BadRequestException('Appointment is already cancelled');
    }

    if (appointment.status === 'completed') {
      throw new BadRequestException('Cannot cancel a completed appointment');
    }

    await prisma.appointment.update({
      where: { appointment_id: appointmentId },
      data: { status: 'cancelled' },
    });

    // Log appointment cancellation
    const userId = appointment.patient?.user?.user_id;
    if (userId) {
      try {
        await this.auditService.logDataOperation(
          userId,
          'DELETE',
          'Appointment',
          appointmentId.toString(),
          { reason: 'Appointment cancelled', cancelled_by: isPatient ? 'patient' : 'doctor' },
        );
      } catch (error) {
        this.logger.error('Failed to log appointment cancellation:', error);
      }
    }
  }

  async findAllDoctors() {
    const doctors = await prisma.doctorProfile.findMany({
      include: {
        user: {
          select: {
            user_id: true,
            first_name: true,
            last_name: true,
            email: true,
          },
        },
      },
    });

    return doctors.map((doctor) => ({
      doctor_id: doctor.doctor_id,
      user_id: doctor.user_id,
      specialization: doctor.specialization,
      experience_years: doctor.experience_years,
      clinic_address: doctor.clinic_address,
      contact_info: doctor.contact_info,
      working_hours: doctor.working_hours,
      user: doctor.user,
    }));
  }

  async getAvailableSlots(doctorId: number, date: string) {
    return this.availabilityService.getAvailableSlots(doctorId, date);
  }

  async requestReschedule(
    appointmentId: number,
    doctorId: string,
    requestRescheduleDto: RequestRescheduleDto,
  ): Promise<AppointmentResponseDto> {
    const appointment = await prisma.appointment.findUnique({
      where: { appointment_id: appointmentId },
      include: { doctor: { include: { user: true } }, patient: { include: { user: true } } },
    });

    if (!appointment) {
      throw new NotFoundException('Appointment not found');
    }

    if (appointment.doctor.user_id !== doctorId) {
      throw new ForbiddenException('Only the doctor can request a reschedule');
    }

    if (appointment.status === 'cancelled') {
      throw new BadRequestException('Cannot reschedule a cancelled appointment');
    }

    const proposedDateTime = new Date(requestRescheduleDto.proposed_appointment_datetime);
    if (proposedDateTime < new Date()) {
      throw new BadRequestException('Proposed appointment must be in the future');
    }

    // Validate the proposed time is available
    const proposedDate = proposedDateTime.toISOString().split('T')[0];
    const duration = appointment.duration_minutes || 30;
    const availableSlots = await this.availabilityService.getAvailableSlots(
      appointment.doctor_id,
      proposedDate,
    );

    const proposedTime = proposedDateTime.toISOString();
    const isValidSlot = availableSlots.some(
      (slot) => slot.start_time === proposedTime && slot.duration_minutes === duration,
    );

    if (!isValidSlot) {
      throw new BadRequestException('The proposed time slot is not available for the doctor.');
    }

    // Update appointment to pending_reschedule with proposed details
    const updated = await prisma.appointment.update({
      where: { appointment_id: appointmentId },
      data: {
        status: 'pending_reschedule',
        proposed_appointment_datetime: proposedDateTime,
        reschedule_note: requestRescheduleDto.reschedule_note || null,
      },
      include: { doctor: { include: { user: true } }, patient: { include: { user: true } } },
    });

    return this.mapToResponseDto(updated);
  }

  async respondReschedule(
    appointmentId: number,
    patientId: number,
    accept: boolean,
  ): Promise<AppointmentResponseDto> {
    const appointment = await prisma.appointment.findUnique({
      where: { appointment_id: appointmentId },
      include: { doctor: { include: { user: true } }, patient: { include: { user: true } } },
    });

    if (!appointment) {
      throw new NotFoundException('Appointment not found');
    }

    if (appointment.patient_id !== patientId) {
      throw new ForbiddenException('Only the patient can respond to a reschedule request');
    }

    if (appointment.status !== 'pending_reschedule') {
      throw new BadRequestException('Appointment is not pending a reschedule response');
    }

    if (accept) {
      // Accept: update appointment_datetime to proposed and change status to scheduled
      const updated = await prisma.appointment.update({
        where: { appointment_id: appointmentId },
        data: {
          appointment_datetime: appointment.proposed_appointment_datetime!,
          proposed_appointment_datetime: null,
          reschedule_note: null,
          status: 'scheduled',
        },
        include: { doctor: { include: { user: true } }, patient: { include: { user: true } } },
      });
      return this.mapToResponseDto(updated);
    } else {
      // Decline: revert to scheduled with original appointment_datetime, clear proposed
      const updated = await prisma.appointment.update({
        where: { appointment_id: appointmentId },
        data: {
          status: 'scheduled',
          proposed_appointment_datetime: null,
          reschedule_note: null,
        },
        include: { doctor: { include: { user: true } }, patient: { include: { user: true } } },
      });
      return this.mapToResponseDto(updated);
    }
  }

  private mapToResponseDto(appointment: any): AppointmentResponseDto {
    return {
      appointment_id: appointment.appointment_id,
      doctor_id: appointment.doctor_id,
      patient_id: appointment.patient_id,
      appointment_datetime: appointment.appointment_datetime,
      duration_minutes: appointment.duration_minutes,
      status: appointment.status,
      notes: appointment.notes,
      patient_consent_to_record: appointment.patient_consent_to_record,
      proposed_appointment_datetime: appointment.proposed_appointment_datetime,
      reschedule_note: appointment.reschedule_note,
      doctor: {
        doctor_id: appointment.doctor.doctor_id,
        user_id: appointment.doctor.user_id,
        specialization: appointment.doctor.specialization,
        experience_years: appointment.doctor.experience_years,
        clinic_address: appointment.doctor.clinic_address,
        contact_info: appointment.doctor.contact_info,
        working_hours: appointment.doctor.working_hours,
        user: {
          user_id: appointment.doctor.user.user_id,
          first_name: appointment.doctor.user.first_name,
          last_name: appointment.doctor.user.last_name,
          email: appointment.doctor.user.email,
        },
      },
      patient: {
        patient_id: appointment.patient.patient_id,
        user_id: appointment.patient.user_id,
        user: {
          user_id: appointment.patient.user.user_id,
          first_name: appointment.patient.user.first_name,
          last_name: appointment.patient.user.last_name,
          email: appointment.patient.user.email,
        },
      },
    };
  }

  private async sendAppointmentScheduledNotifications(appointment: any) {
    const doctorName = `Dr. ${appointment.doctor.user.first_name} ${appointment.doctor.user.last_name}`;
    const patientName = `${appointment.patient.user.first_name} ${appointment.patient.user.last_name}`;
    const appointmentDate = new Date(appointment.appointment_datetime);

    // Notify patient
    await this.notificationsService.createNotification(
      appointment.patient.user.user_id,
      'APPOINTMENT_SCHEDULED',
      'Appointment Scheduled',
      `Your appointment with ${doctorName} has been scheduled for ${appointmentDate.toLocaleString()}`,
      appointment.appointment_id.toString(),
    );

    await this.emailService.sendAppointmentScheduledNotification(
      appointment.patient.user.user_id,
      appointment.patient.user.email,
      patientName,
      appointmentDate,
      doctorName,
    );

    // Notify doctor
    await this.notificationsService.createNotification(
      appointment.doctor.user.user_id,
      'APPOINTMENT_SCHEDULED',
      'New Appointment',
      `New appointment scheduled with ${patientName} for ${appointmentDate.toLocaleString()}`,
      appointment.appointment_id.toString(),
    );

    await this.emailService.sendAppointmentScheduledNotification(
      appointment.doctor.user.user_id,
      appointment.doctor.user.email,
      doctorName,
      appointmentDate,
      patientName,
    );
  }
}
