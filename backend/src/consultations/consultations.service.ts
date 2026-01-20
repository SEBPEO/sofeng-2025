import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';
import type { File as MulterFile } from 'multer';
import { AiService } from './ai.service';
import { AuditService } from '../audit/audit.service';

const prisma = new PrismaClient();

@Injectable()
export class ConsultationsService {
  constructor(
    private readonly aiService: AiService,
    private readonly auditService: AuditService,
  ) {}
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
        appointment: {
          include: { patient: { include: { user: true } }, doctor: { include: { user: true } } },
        },
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
    user: {
      user_id?: string;
      doctor_profile?: { doctor_id: number } | null;
      patient_profile?: { patient_id: number } | null;
    } | null,
    appointmentId: number,
  ) {
    if (!user) {
      throw new ForbiddenException('User not found');
    }

    // Allow doctor or patient tied to the appointment
    if (user.doctor_profile) {
      await this.validateAppointmentOwnership(appointmentId, user.doctor_profile.doctor_id);
    } else if (user.patient_profile) {
      const appointment = await prisma.appointment.findUnique({
        where: { appointment_id: appointmentId },
      });
      if (!appointment || appointment.patient_id !== user.patient_profile.patient_id) {
        throw new ForbiddenException('You do not have access to this consultation');
      }
    } else {
      throw new ForbiddenException('Profile not found');
    }

    const consultation = await prisma.consultation.findUnique({
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

    // Log consultation access
    if (consultation && user.user_id) {
      try {
        await this.auditService.logMedicalRecordAccess(
          user.user_id,
          'CONSULTATION_VIEW',
          consultation.consultation_id.toString(),
          consultation.appointment.patient_id.toString(),
        );
      } catch (error) {
        console.error('Failed to log consultation view:', error);
      }
    }

    return consultation;
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
    const updated = await prisma.consultation.update({
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

    // Log recording upload
    try {
      await this.auditService.logFileAccess(
        userId,
        'RECORDING_UPLOAD',
        consultationId.toString(),
        storedPath,
      );
    } catch (error) {
      console.error('Failed to log recording upload:', error);
    }

    return updated;
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

    // Log recording download
    try {
      await this.auditService.logFileAccess(
        userId,
        'RECORDING_DOWNLOAD',
        recordingId.toString(),
        recording.file_path,
      );
    } catch (error) {
      console.error('Failed to log recording download:', error);
    }

    return { fullPath, filename: path.basename(recording.file_path) };
  }

  async generateNotes(
    userId: string,
    consultationId: number,
  ): Promise<{ transcript: string; summary: string }> {
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

    // Check if notes are locked
    if (consultation.notes_locked) {
      throw new ForbiddenException('Cannot edit notes that have been approved and locked');
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

  async approveNotes(
    userId: string,
    consultationId: number,
  ): Promise<{ success: boolean; approvedAt: Date; status: string }> {
    const user = await prisma.user.findUnique({
      where: { user_id: userId },
      include: { doctor_profile: true },
    });

    if (!user) {
      throw new ForbiddenException('User not found');
    }

    // Only doctors can approve notes
    if (!user.doctor_profile) {
      throw new ForbiddenException('Only doctors can approve consultation notes');
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
      throw new ForbiddenException('You do not have access to approve this consultation');
    }

    // Check if already approved
    if (consultation.notes_locked) {
      throw new ForbiddenException('Notes have already been approved and locked');
    }

    // Check if notes exist
    if (!consultation.AI_summary && !consultation.transcript) {
      throw new ForbiddenException('Cannot approve consultation without notes');
    }

    const approvedAt = new Date();

    // Approve and lock notes
    await prisma.consultation.update({
      where: { consultation_id: consultationId },
      data: {
        notes_approved_at: approvedAt,
        notes_approved_by: userId,
        notes_locked: true,
        notes_status: 'FINAL',
      },
    });

    // Audit log
    try {
      await this.auditService.log({
        userId,
        action: 'CONSULTATION_EDIT',
        resourceType: 'Consultation',
        resourceId: consultationId.toString(),
        details: { message: 'Doctor approved and locked consultation notes', status: 'FINAL' },
      });
    } catch (err) {
      console.error('Failed to log approval audit:', err);
    }

    return {
      success: true,
      approvedAt,
      status: 'FINAL',
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
        throw new ForbiddenException(
          'Doctors cannot change action item completion status. Only patients can mark items as completed.',
        );
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

  async shareNotes(
    userId: string,
    consultationId: number,
    sharedWithDoctorId: number,
    permissions: string = 'read',
  ): Promise<{ success: boolean; shareId: number }> {
    const user = await prisma.user.findUnique({
      where: { user_id: userId },
      include: { doctor_profile: true },
    });

    if (!user || !user.doctor_profile) {
      throw new ForbiddenException('Only doctors can share notes');
    }

    const consultation = await prisma.consultation.findUnique({
      where: { consultation_id: consultationId },
      include: { appointment: true },
    });

    if (!consultation) {
      throw new NotFoundException('Consultation not found');
    }

    // Verify current user is the doctor who created the consultation
    if (consultation.appointment.doctor_id !== user.doctor_profile.doctor_id) {
      throw new ForbiddenException('You can only share your own consultations');
    }

    // Verify the target doctor exists
    const targetDoctor = await prisma.doctorProfile.findUnique({
      where: { doctor_id: sharedWithDoctorId },
      include: { user: true },
    });

    if (!targetDoctor) {
      throw new NotFoundException('Target doctor not found');
    }

    // Prevent sharing with self
    if (targetDoctor.doctor_id === user.doctor_profile.doctor_id) {
      throw new ForbiddenException('Cannot share notes with yourself');
    }

    // Check if already shared with this doctor
    const existingShare = await prisma.sharedConsultationNote.findUnique({
      where: {
        consultation_id_shared_by_doctor_id_shared_with_doctor_id: {
          consultation_id: consultationId,
          shared_by_doctor_id: user.doctor_profile.doctor_id,
          shared_with_doctor_id: sharedWithDoctorId,
        },
      },
    });

    if (existingShare && !existingShare.revoked_at) {
      throw new ForbiddenException('Notes already shared with this doctor');
    }

    // Create or restore share
    let share;
    if (existingShare && existingShare.revoked_at) {
      // Restore revoked share
      share = await prisma.sharedConsultationNote.update({
        where: { share_id: existingShare.share_id },
        data: {
          revoked_at: null,
          permissions,
          created_at: new Date(),
        },
      });
    } else {
      // Create new share
      share = await prisma.sharedConsultationNote.create({
        data: {
          consultation_id: consultationId,
          shared_by_doctor_id: user.doctor_profile.doctor_id,
          shared_with_doctor_id: sharedWithDoctorId,
          permissions,
        },
      });
    }

    // Audit log
    try {
      await this.auditService.log({
        userId,
        action: 'SHARE',
        resourceType: 'Consultation',
        resourceId: consultationId.toString(),
        details: {
          message: `Shared consultation notes with doctor ${targetDoctor.user.first_name} ${targetDoctor.user.last_name}`,
          permissions,
        },
      });
    } catch (err) {
      console.error('Failed to log share audit:', err);
    }

    return { success: true, shareId: share.share_id };
  }

  async getSharedNotes(userId: string): Promise<any[]> {
    const user = await prisma.user.findUnique({
      where: { user_id: userId },
      include: { doctor_profile: true },
    });

    if (!user || !user.doctor_profile) {
      throw new ForbiddenException('Only doctors can view shared notes');
    }

    const sharedNotes = await prisma.sharedConsultationNote.findMany({
      where: {
        shared_with_doctor_id: user.doctor_profile.doctor_id,
        revoked_at: null,
      },
      include: {
        consultation: {
          include: {
            appointment: {
              include: {
                doctor: { include: { user: true } },
                patient: { include: { user: true } },
              },
            },
          },
        },
        shared_by: { include: { user: true } },
      },
    });

    return sharedNotes;
  }

  async getConsultationShares(userId: string, consultationId: number): Promise<any[]> {
    const user = await prisma.user.findUnique({
      where: { user_id: userId },
      include: { doctor_profile: true },
    });

    if (!user || !user.doctor_profile) {
      throw new ForbiddenException('Only doctors can view shares');
    }

    const consultation = await prisma.consultation.findUnique({
      where: { consultation_id: consultationId },
      include: { appointment: true },
    });

    if (!consultation) {
      throw new NotFoundException('Consultation not found');
    }

    // Only the owner doctor can see shares of their consultation
    if (consultation.appointment.doctor_id !== user.doctor_profile.doctor_id) {
      throw new ForbiddenException('You can only view shares for your own consultations');
    }

    const shares = await prisma.sharedConsultationNote.findMany({
      where: {
        consultation_id: consultationId,
        shared_by_doctor_id: user.doctor_profile.doctor_id,
        revoked_at: null,
      },
      include: {
        shared_with: { include: { user: true } },
      },
    });

    return shares;
  }

  async revokeShare(userId: string, shareId: number): Promise<{ success: boolean }> {
    const user = await prisma.user.findUnique({
      where: { user_id: userId },
      include: { doctor_profile: true },
    });

    if (!user || !user.doctor_profile) {
      throw new ForbiddenException('Only doctors can revoke shares');
    }

    const share = await prisma.sharedConsultationNote.findUnique({
      where: { share_id: shareId },
    });

    if (!share) {
      throw new NotFoundException('Share not found');
    }

    // Only the doctor who shared can revoke
    if (share.shared_by_doctor_id !== user.doctor_profile.doctor_id) {
      throw new ForbiddenException('You can only revoke shares you created');
    }

    await prisma.sharedConsultationNote.update({
      where: { share_id: shareId },
      data: { revoked_at: new Date() },
    });

    // Audit log
    try {
      const sharedWith = await prisma.doctorProfile.findUnique({
        where: { doctor_id: share.shared_with_doctor_id },
        include: { user: true },
      });

      await this.auditService.log({
        userId,
        action: 'SHARE',
        resourceType: 'Consultation',
        resourceId: share.consultation_id.toString(),
        details: {
          message: `Revoked consultation note sharing from doctor ${sharedWith?.user.first_name} ${sharedWith?.user.last_name}`,
        },
      });
    } catch (err) {
      console.error('Failed to log revoke audit:', err);
    }

    return { success: true };
  }
}
