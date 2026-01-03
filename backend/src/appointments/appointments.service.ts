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
import { GoogleCalendarService } from './google-calendar.service';
import { AvailabilityService } from '../availability/availability.service';

const prisma = new PrismaClient();

@Injectable()
export class AppointmentsService {
  private readonly logger = new Logger(AppointmentsService.name);

  constructor(
    private readonly googleCalendarService: GoogleCalendarService,
    private readonly availabilityService: AvailabilityService,
  ) {}

  async create(
    patientId: number,
    createAppointmentDto: CreateAppointmentDto,
    userEmail: string,
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
    const requestedTime = appointmentDateTime.toISOString();
    const duration = createAppointmentDto.duration_minutes || 30;
    const requestedEndTime = new Date(
      appointmentDateTime.getTime() + duration * 60000,
    ).toISOString();

    const isValidSlot = availableSlots.some(
      (slot) => slot.start_time === requestedTime && slot.duration_minutes === duration,
    );

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

    // Sync to Google Calendar
    try {
      const eventId = await this.googleCalendarService.createEvent(appointment, doctor, userEmail);
      if (eventId) {
        await prisma.appointment.update({
          where: { appointment_id: appointment.appointment_id },
          data: { google_calendar_event_id: eventId },
        });
        appointment.google_calendar_event_id = eventId;
      }
    } catch (error) {
      this.logger.error('Failed to sync appointment to Google Calendar', error);
      // Continue even if calendar sync fails
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
    userEmail: string,
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

    // Sync to Google Calendar
    if (updateAppointmentDto.appointment_datetime && appointment.google_calendar_event_id) {
      try {
        await this.googleCalendarService.updateEvent(
          appointment.google_calendar_event_id,
          updatedAppointment,
          userEmail,
        );
      } catch (error) {
        this.logger.error('Failed to update appointment in Google Calendar', error);
        // Continue even if calendar sync fails
      }
    }

    return this.mapToResponseDto(updatedAppointment);
  }

  async cancel(appointmentId: number, patientId: number, userEmail: string): Promise<void> {
    const appointment = await prisma.appointment.findUnique({
      where: { appointment_id: appointmentId },
    });

    if (!appointment) {
      throw new NotFoundException('Appointment not found');
    }

    if (appointment.patient_id !== patientId) {
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

    // Delete from Google Calendar
    if (appointment.google_calendar_event_id) {
      try {
        await this.googleCalendarService.deleteEvent(
          appointment.google_calendar_event_id,
          userEmail,
        );
      } catch (error) {
        this.logger.error('Failed to delete appointment from Google Calendar', error);
        // Continue even if calendar sync fails
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

  private mapToResponseDto(appointment: any): AppointmentResponseDto {
    return {
      appointment_id: appointment.appointment_id,
      doctor_id: appointment.doctor_id,
      patient_id: appointment.patient_id,
      appointment_datetime: appointment.appointment_datetime,
      duration_minutes: appointment.duration_minutes,
      status: appointment.status,
      notes: appointment.notes,
      google_calendar_event_id: appointment.google_calendar_event_id,
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
}
