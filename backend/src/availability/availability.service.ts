import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { CreateAvailabilityDto } from './dto/create-availability.dto';
import { UpdateAvailabilityDto } from './dto/update-availability.dto';
import { AvailabilityResponseDto } from './dto/availability-response.dto';
import { TimeSlotDto } from './dto/available-slots.dto';

const prisma = new PrismaClient();

@Injectable()
export class AvailabilityService {
  private readonly logger = new Logger(AvailabilityService.name);

  async createAvailability(
    doctorId: number,
    createAvailabilityDto: CreateAvailabilityDto,
  ): Promise<AvailabilityResponseDto> {
    // Validate start_time < end_time
    const startMinutes = this.timeToMinutes(createAvailabilityDto.start_time);
    const endMinutes = this.timeToMinutes(createAvailabilityDto.end_time);

    if (startMinutes >= endMinutes) {
      throw new BadRequestException('start_time must be before end_time');
    }

    // Check if availability for this day already exists
    const existing = await prisma.availability.findUnique({
      where: {
        doctor_id_day_of_week: {
          doctor_id: doctorId,
          day_of_week: createAvailabilityDto.day_of_week,
        },
      },
    });

    if (existing) {
      throw new BadRequestException(
        `Availability for day ${createAvailabilityDto.day_of_week} already exists. Use update instead.`,
      );
    }

    const availability = await prisma.availability.create({
      data: {
        doctor_id: doctorId,
        day_of_week: createAvailabilityDto.day_of_week,
        start_time: createAvailabilityDto.start_time,
        end_time: createAvailabilityDto.end_time,
        duration_minutes: createAvailabilityDto.duration_minutes,
        is_available: createAvailabilityDto.is_available ?? true,
      },
    });

    return this.mapToResponseDto(availability);
  }

  async getDoctorAvailability(doctorId: number): Promise<AvailabilityResponseDto[]> {
    const availabilities = await prisma.availability.findMany({
      where: {
        doctor_id: doctorId,
      },
      orderBy: {
        day_of_week: 'asc',
      },
    });

    return availabilities.map((av) => this.mapToResponseDto(av));
  }

  async updateAvailability(
    availabilityId: number,
    doctorId: number,
    updateAvailabilityDto: UpdateAvailabilityDto,
  ): Promise<AvailabilityResponseDto> {
    const availability = await prisma.availability.findUnique({
      where: { availability_id: availabilityId },
    });

    if (!availability) {
      throw new NotFoundException('Availability not found');
    }

    if (availability.doctor_id !== doctorId) {
      throw new ForbiddenException('You do not have permission to update this availability');
    }

    const updateData: any = {};

    if (updateAvailabilityDto.start_time !== undefined) {
      updateData.start_time = updateAvailabilityDto.start_time;
    }

    if (updateAvailabilityDto.end_time !== undefined) {
      updateData.end_time = updateAvailabilityDto.end_time;
    }

    if (updateAvailabilityDto.duration_minutes !== undefined) {
      updateData.duration_minutes = updateAvailabilityDto.duration_minutes;
    }

    if (updateAvailabilityDto.is_available !== undefined) {
      updateData.is_available = updateAvailabilityDto.is_available;
    }

    // Validate start_time < end_time if both are being updated
    if (updateData.start_time && updateData.end_time) {
      const startMinutes = this.timeToMinutes(updateData.start_time);
      const endMinutes = this.timeToMinutes(updateData.end_time);
      if (startMinutes >= endMinutes) {
        throw new BadRequestException('start_time must be before end_time');
      }
    } else if (updateData.start_time && availability.end_time) {
      const startMinutes = this.timeToMinutes(updateData.start_time);
      const endMinutes = this.timeToMinutes(availability.end_time);
      if (startMinutes >= endMinutes) {
        throw new BadRequestException('start_time must be before end_time');
      }
    } else if (updateData.end_time && availability.start_time) {
      const startMinutes = this.timeToMinutes(availability.start_time);
      const endMinutes = this.timeToMinutes(updateData.end_time);
      if (startMinutes >= endMinutes) {
        throw new BadRequestException('start_time must be before end_time');
      }
    }

    const updated = await prisma.availability.update({
      where: { availability_id: availabilityId },
      data: updateData,
    });

    return this.mapToResponseDto(updated);
  }

  async deleteAvailability(availabilityId: number, doctorId: number): Promise<void> {
    const availability = await prisma.availability.findUnique({
      where: { availability_id: availabilityId },
    });

    if (!availability) {
      throw new NotFoundException('Availability not found');
    }

    if (availability.doctor_id !== doctorId) {
      throw new ForbiddenException('You do not have permission to delete this availability');
    }

    await prisma.availability.delete({
      where: { availability_id: availabilityId },
    });
  }

  async getAvailableSlots(doctorId: number, date: string): Promise<TimeSlotDto[]> {
    // Parse date string (YYYY-MM-DD)
    const targetDate = new Date(date + 'T00:00:00');
    const dayOfWeek = targetDate.getDay(); // 0-6 (Sunday-Saturday)

    // Get availability for this day of week
    const availability = await prisma.availability.findUnique({
      where: {
        doctor_id_day_of_week: {
          doctor_id: doctorId,
          day_of_week: dayOfWeek,
        },
      },
    });

    if (!availability || !availability.is_available) {
      return []; // No availability for this day
    }

    // Get existing appointments for this doctor on this date
    const startOfDay = new Date(targetDate);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(targetDate);
    endOfDay.setHours(23, 59, 59, 999);

    const existingAppointments = await prisma.appointment.findMany({
      where: {
        doctor_id: doctorId,
        appointment_datetime: {
          gte: startOfDay,
          lte: endOfDay,
        },
        status: {
          not: 'cancelled',
        },
      },
    });

    // Generate time slots
    const slots: TimeSlotDto[] = [];
    const startMinutes = this.timeToMinutes(availability.start_time);
    const endMinutes = this.timeToMinutes(availability.end_time);
    const duration = availability.duration_minutes;

    let currentMinutes = startMinutes;

    while (currentMinutes + duration <= endMinutes) {
      const slotStart = new Date(targetDate);
      slotStart.setHours(Math.floor(currentMinutes / 60), currentMinutes % 60, 0, 0);

      const slotEnd = new Date(slotStart);
      slotEnd.setMinutes(slotEnd.getMinutes() + duration);

      // Check if this slot overlaps with any existing appointment
      const isBooked = existingAppointments.some((apt) => {
        const aptStart = new Date(apt.appointment_datetime);
        const aptEnd = new Date(
          aptStart.getTime() + (apt.duration_minutes || 30) * 60000,
        );

        // Slot overlaps if it starts before appointment ends AND ends after appointment starts
        return slotStart < aptEnd && slotEnd > aptStart;
      });

      // Only add slot if it's not booked and not in the past
      if (!isBooked && slotStart >= new Date()) {
        slots.push({
          start_time: slotStart.toISOString(),
          end_time: slotEnd.toISOString(),
          duration_minutes: duration,
        });
      }

      currentMinutes += duration;
    }

    return slots;
  }

  private timeToMinutes(time: string): number {
    const [hours, minutes] = time.split(':').map(Number);
    return hours * 60 + minutes;
  }

  private mapToResponseDto(availability: any): AvailabilityResponseDto {
    return {
      availability_id: availability.availability_id,
      doctor_id: availability.doctor_id,
      day_of_week: availability.day_of_week,
      start_time: availability.start_time,
      end_time: availability.end_time,
      duration_minutes: availability.duration_minutes,
      is_available: availability.is_available,
    };
  }
}


