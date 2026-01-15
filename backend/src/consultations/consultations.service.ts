import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';
import type { File as MulterFile } from 'multer';
import { AiService } from './ai.service';

const prisma = new PrismaClient();

@Injectable()
export class ConsultationsService {
  constructor(private readonly aiService: AiService) {}
  private ensureUploadsDir(dir: string) {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  }

  private async getDoctorProfileId(userId: string) {
    const user = await prisma.user.findUnique({
      where: { user_id: userId },
      include: { doctor_profile: true },
    });

    if (!user?.doctor_profile) {
      throw new ForbiddenException('Only doctors can start consultations');
    }

    return user.doctor_profile.doctor_id;
  }

  private async validateAppointmentOwnership(
    appointmentId: number,
    doctorId: number,
    requireConsent = false,
  ) {
    const appointment = await prisma.appointment.findUnique({
      where: { appointment_id: appointmentId },
    });

    if (!appointment) {
      throw new NotFoundException('Appointment not found');
    }

    if (appointment.doctor_id !== doctorId) {
      throw new ForbiddenException('You do not own this appointment');
    }

    if (appointment.status === 'cancelled') {
      throw new BadRequestException('Cannot start consultation for a cancelled appointment');
    }

    if (requireConsent && !appointment.patient_consent_to_record) {
      throw new BadRequestException('Patient has not consented to recording for this appointment');
    }

    return appointment;
  }

  async startConsultation(userId: string, appointmentId: number) {
    const doctorId = await this.getDoctorProfileId(userId);
    const appointment = await this.validateAppointmentOwnership(appointmentId, doctorId, true);

    const existing = await prisma.consultation.findUnique({
      where: { appointment_id: appointmentId },
      include: {
        appointment: { include: { patient: { include: { user: true } }, doctor: { include: { user: true } } } },
        recordings: { orderBy: { created_at: 'desc' } },
      },
    });

    if (existing) return existing;

    const maxConsultation = await prisma.consultation.findFirst({
      orderBy: { consultation_id: 'desc' },
    });
    const nextId = (maxConsultation?.consultation_id || 0) + 1;

    return prisma.consultation.create({
      data: {
        consultation_id: nextId,
        appointment_id: appointment.appointment_id,
        created_at: new Date(),
      },
      include: {
        appointment: {
          include: {
            patient: { include: { user: true } },
            doctor: { include: { user: true } },
          },
        },
        recordings: { orderBy: { created_at: 'desc' } },
      },
    });
  }

  async getByAppointmentForUser(
    user: { doctor_profile?: { doctor_id: number } | null; patient_profile?: { patient_id: number } | null } | null,
    appointmentId: number,
  ) {
    if (!user) {
      throw new ForbiddenException('User not found');
    }

    // Allow doctor or patient tied to the appointment
    if (user.doctor_profile) {
      await this.validateAppointmentOwnership(appointmentId, user.doctor_profile.doctor_id);
    } else if (user.patient_profile) {
      const appointment = await prisma.appointment.findUnique({ where: { appointment_id: appointmentId } });
      if (!appointment || appointment.patient_id !== user.patient_profile.patient_id) {
        throw new ForbiddenException('You do not have access to this consultation');
      }
    } else {
      throw new ForbiddenException('Profile not found');
    }

    return prisma.consultation.findUnique({
      where: { appointment_id: appointmentId },
      include: {
        appointment: {
          include: {
            patient: { include: { user: true } },
            doctor: { include: { user: true } },
          },
        },
        recordings: { orderBy: { created_at: 'desc' } },
      },
    });
  }

  async saveRecording(userId: string, consultationId: number, file?: MulterFile) {
    const doctorId = await this.getDoctorProfileId(userId);

    const consultation = await prisma.consultation.findUnique({
      where: { consultation_id: consultationId },
      include: { appointment: true },
    });

    if (!consultation) {
      throw new NotFoundException('Consultation not found');
    }

    if (consultation.appointment.doctor_id !== doctorId) {
      throw new ForbiddenException('You do not own this consultation');
    }

    if (!file) {
      throw new BadRequestException('No recording file uploaded');
    }

    if (!consultation.appointment.patient_consent_to_record) {
      throw new BadRequestException('Patient has not consented to recording for this appointment');
    }

    const uploadsDir = path.join(process.cwd(), 'uploads', 'recordings');
    this.ensureUploadsDir(uploadsDir);

    // Use multer-provided path; ensure it lands inside uploads/recordings
    const storedPath = path.relative(process.cwd(), file.path);

    await prisma.consultationRecording.create({
      data: {
        consultation_id: consultationId,
        file_path: storedPath,
      },
    });

    // Keep legacy recording field pointing to most recent
    return prisma.consultation.update({
      where: { consultation_id: consultationId },
      data: { recording: storedPath },
      include: {
        appointment: {
          include: {
            patient: { include: { user: true } },
            doctor: { include: { user: true } },
          },
        },
        recordings: { orderBy: { created_at: 'desc' } },
      },
    });
  }

  async getRecordingFile(
    userId: string,
    consultationId: number,
    recordingId: number,
  ): Promise<{ fullPath: string; filename: string }> {
    const user = await prisma.user.findUnique({
      where: { user_id: userId },
      include: { doctor_profile: true, patient_profile: true },
    });

    if (!user) {
      throw new ForbiddenException('User not found');
    }

    const recording = await prisma.consultationRecording.findUnique({
      where: { consultation_recording_id: recordingId },
      include: {
        consultation: {
          include: {
            appointment: true,
          },
        },
      },
    });

    if (!recording || recording.consultation_id !== consultationId) {
      throw new NotFoundException('Recording not found');
    }

    const appointment = recording.consultation.appointment;

    const isDoctorOwner = user.doctor_profile?.doctor_id === appointment.doctor_id;
    const isPatientOwner = user.patient_profile?.patient_id === appointment.patient_id;

    if (!isDoctorOwner && !isPatientOwner) {
      throw new ForbiddenException('You do not have access to this recording');
    }

    const fullPath = path.join(process.cwd(), recording.file_path);
    if (!fs.existsSync(fullPath)) {
      throw new NotFoundException('Recording file missing');
    }

    return { fullPath, filename: path.basename(recording.file_path) };
  }

  async generateNotes(userId: string, consultationId: number): Promise<{ transcript: string; summary: string }> {
    const user = await prisma.user.findUnique({
      where: { user_id: userId },
      include: { doctor_profile: true, patient_profile: true },
    });

    if (!user) {
      throw new ForbiddenException('User not found');
    }

    const consultation = await prisma.consultation.findUnique({
      where: { consultation_id: consultationId },
      include: {
        appointment: {
          include: {
            patient: { include: { user: true } },
            doctor: { include: { user: true } },
          },
        },
        recordings: { orderBy: { created_at: 'desc' }, take: 1 },
      },
    });

    if (!consultation) {
      throw new NotFoundException('Consultation not found');
    }

    // Check access
    const isDoctorOwner = user.doctor_profile?.doctor_id === consultation.appointment.doctor_id;
    const isPatientOwner = user.patient_profile?.patient_id === consultation.appointment.patient_id;

    if (!isDoctorOwner && !isPatientOwner) {
      throw new ForbiddenException('You do not have access to this consultation');
    }

    // Check if summary already exists
    if (consultation.AI_summary) {
      // Return existing summary and transcript
      return {
        transcript: consultation.transcript || '',
        summary: consultation.AI_summary,
      };
    }

    // Check if there's a recording
    if (!consultation.recordings || consultation.recordings.length === 0) {
      throw new BadRequestException('No recording found for this consultation');
    }

    const recording = consultation.recordings[0];
    const recordingPath = path.join(process.cwd(), recording.file_path);

    if (!fs.existsSync(recordingPath)) {
      throw new NotFoundException('Recording file not found');
    }

    const patientName = `${consultation.appointment.patient.user.first_name} ${consultation.appointment.patient.user.last_name}`;
    const doctorName = `${consultation.appointment.doctor.user.first_name} ${consultation.appointment.doctor.user.last_name}`;

    // Process recording: transcribe and generate summary
    const { transcript, summary } = await this.aiService.processRecording(
      recording.file_path,
      patientName,
      doctorName,
    );

    // Save transcript and summary to database
    await prisma.consultation.update({
      where: { consultation_id: consultationId },
      data: {
        transcript,
        AI_summary: summary,
      },
    });

    return { transcript, summary };
  }

  async updateNotes(
    userId: string,
    consultationId: number,
    updateData: { summary?: string; transcript?: string },
  ): Promise<{ transcript: string; summary: string }> {
    const user = await prisma.user.findUnique({
      where: { user_id: userId },
      include: { doctor_profile: true },
    });

    if (!user) {
      throw new ForbiddenException('User not found');
    }

    // Only doctors can update notes
    if (!user.doctor_profile) {
      throw new ForbiddenException('Only doctors can update consultation notes');
    }

    const consultation = await prisma.consultation.findUnique({
      where: { consultation_id: consultationId },
      include: { appointment: true },
    });

    if (!consultation) {
      throw new NotFoundException('Consultation not found');
    }

    // Check if doctor owns this consultation
    if (consultation.appointment.doctor_id !== user.doctor_profile.doctor_id) {
      throw new ForbiddenException('You do not have access to update this consultation');
    }

    // Update notes
    const updatedConsultation = await prisma.consultation.update({
      where: { consultation_id: consultationId },
      data: {
        ...(updateData.summary !== undefined && { AI_summary: updateData.summary }),
        ...(updateData.transcript !== undefined && { transcript: updateData.transcript }),
      },
    });

    return {
      transcript: updatedConsultation.transcript || '',
      summary: updatedConsultation.AI_summary || '',
    };
  }

  async getActionItems(userId: string, consultationId: number) {
    const user = await prisma.user.findUnique({
      where: { user_id: userId },
      include: { doctor_profile: true, patient_profile: true },
    });

    if (!user) {
      throw new ForbiddenException('User not found');
    }

    const consultation = await prisma.consultation.findUnique({
      where: { consultation_id: consultationId },
      include: { appointment: true },
    });

    if (!consultation) {
      throw new NotFoundException('Consultation not found');
    }

    // Check access - doctor or patient tied to the appointment
    const isDoctorOwner = user.doctor_profile?.doctor_id === consultation.appointment.doctor_id;
    const isPatientOwner = user.patient_profile?.patient_id === consultation.appointment.patient_id;

    if (!isDoctorOwner && !isPatientOwner) {
      throw new ForbiddenException('You do not have access to this consultation');
    }

    return prisma.consultationActionItem.findMany({
      where: { consultation_id: consultationId },
      orderBy: { created_at: 'asc' },
    });
  }

  async createActionItem(
    userId: string,
    consultationId: number,
    createDto: { description: string },
  ) {
    const doctorId = await this.getDoctorProfileId(userId);

    const consultation = await prisma.consultation.findUnique({
      where: { consultation_id: consultationId },
      include: { appointment: true },
    });

    if (!consultation) {
      throw new NotFoundException('Consultation not found');
    }

    if (consultation.appointment.doctor_id !== doctorId) {
      throw new ForbiddenException('Only the consultation doctor can create action items');
    }

    return prisma.consultationActionItem.create({
      data: {
        consultation_id: consultationId,
        description: createDto.description,
      },
    });
  }

  async updateActionItem(
    userId: string,
    consultationId: number,
    actionItemId: number,
    updateDto: { description?: string; is_completed?: boolean },
  ) {
    const user = await prisma.user.findUnique({
      where: { user_id: userId },
      include: { doctor_profile: true, patient_profile: true },
    });

    if (!user) {
      throw new ForbiddenException('User not found');
    }

    const actionItem = await prisma.consultationActionItem.findUnique({
      where: { action_item_id: actionItemId },
      include: {
        consultation: {
          include: { appointment: true },
        },
      },
    });

    if (!actionItem || actionItem.consultation_id !== consultationId) {
      throw new NotFoundException('Action item not found');
    }

    const consultation = actionItem.consultation;
    const isDoctorOwner = user.doctor_profile?.doctor_id === consultation.appointment.doctor_id;
    const isPatientOwner = user.patient_profile?.patient_id === consultation.appointment.patient_id;

    if (!isDoctorOwner && !isPatientOwner) {
      throw new ForbiddenException('You do not have access to this action item');
    }

    // Doctors can only update description, patients can only toggle completion
    const updateData: any = {};
    if (isDoctorOwner) {
      // Doctor can only update description, not completion status
      if (updateDto.description !== undefined) {
        updateData.description = updateDto.description;
      }
      if (updateDto.is_completed !== undefined) {
        throw new ForbiddenException('Doctors cannot change action item completion status. Only patients can mark items as completed.');
      }
    } else if (isPatientOwner) {
      // Patient can only toggle completion
      if (updateDto.is_completed !== undefined) {
        updateData.is_completed = updateDto.is_completed;
      }
      if (updateDto.description !== undefined) {
        throw new ForbiddenException('Patients cannot modify action item descriptions');
      }
    }

    return prisma.consultationActionItem.update({
      where: { action_item_id: actionItemId },
      data: updateData,
    });
  }

  async deleteActionItem(userId: string, consultationId: number, actionItemId: number) {
    const doctorId = await this.getDoctorProfileId(userId);

    const actionItem = await prisma.consultationActionItem.findUnique({
      where: { action_item_id: actionItemId },
      include: {
        consultation: {
          include: { appointment: true },
        },
      },
    });

    if (!actionItem || actionItem.consultation_id !== consultationId) {
      throw new NotFoundException('Action item not found');
    }

    if (actionItem.consultation.appointment.doctor_id !== doctorId) {
      throw new ForbiddenException('Only the consultation doctor can delete action items');
    }

    await prisma.consultationActionItem.delete({
      where: { action_item_id: actionItemId },
    });

    return { message: 'Action item deleted successfully' };
  }
}
