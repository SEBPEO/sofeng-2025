import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { UserResponseDto } from './dto/user-response.dto';
import {
  RequestAccountDeletionDto,
  AccountDeletionRequestResponseDto,
} from './dto/request-account-deletion.dto';
import { DataExportResponseDto, UserDataExportDto } from './dto/data-export.dto';
import { PrismaService } from '../prisma/prisma.service';

export type User = {
  id: string;
  email: string;
  name?: string;
  picture?: string;
  provider: 'google' | string;
};

@Injectable()
export class UsersService {
  private readonly logger = new Logger(UsersService.name);

  constructor(private prisma: PrismaService) {}

  async findByEmail(email: string) {
    return await this.prisma.user.findUnique({ where: { email } });
  }

  async findById(id: string) {
    return await this.prisma.user.findUnique({ where: { user_id: id } });
  }

  async findDbById(id: string) {
    return await this.prisma.user.findUnique({ where: { user_id: id } });
  }

  async findByIdWithProfiles(id: string): Promise<UserResponseDto | null> {
    const user = await this.prisma.user.findUnique({
      where: { user_id: id },
      include: {
        doctor_profile: true,
        patient_profile: true,
      },
    });

    if (!user) return null;

    return this.mapToUserResponse(user);
  }

  async listDoctors(currentUserId?: string) {
    return this.prisma.user.findMany({
      where: {
        role: 'doctor',
        doctor_profile: { isNot: null },
        ...(currentUserId ? { NOT: { user_id: currentUserId } } : {}),
      },
      select: {
        user_id: true,
        first_name: true,
        last_name: true,
        email: true,
        doctor_profile: {
          select: {
            doctor_id: true,
            specialization: true,
          },
        },
      },
      orderBy: { first_name: 'asc' },
    });
  }

  async updateProfile(userId: string, dto: UpdateProfileDto): Promise<UserResponseDto> {
    // Get current user to check if role is already set
    const currentUser = await this.prisma.user.findUnique({
      where: { user_id: userId },
      include: {
        doctor_profile: true,
        patient_profile: true,
      },
    });

    if (!currentUser) {
      throw new NotFoundException('User not found');
    }

    // Check if user already has a profile (role is locked)
    const hasExistingProfile = !!(currentUser.doctor_profile || currentUser.patient_profile);

    // If user has existing profile and tries to change role, reject it
    if (hasExistingProfile && dto.role && dto.role !== currentUser.role) {
      throw new BadRequestException('Role cannot be changed after registration');
    }

    // First, update the user basic info
    const updateData: any = {};
    if (dto.first_name) updateData.first_name = dto.first_name;
    if (dto.last_name) updateData.last_name = dto.last_name;
    if (dto.gender) updateData.gender = dto.gender;
    // Only update role if it's provided and user doesn't have existing profile
    if (dto.role && !hasExistingProfile) {
      updateData.role = dto.role;
    } else if (dto.role && hasExistingProfile) {
      // Use existing role if profile exists
      updateData.role = currentUser.role;
    } else if (!hasExistingProfile && !dto.role) {
      // Role is required for new profiles
      throw new BadRequestException('Role is required');
    }

    const user = await this.prisma.user.update({
      where: { user_id: userId },
      data: updateData,
      include: {
        doctor_profile: true,
        patient_profile: true,
      },
    });

    // Determine which role to use for profile creation/update
    const roleToUse = hasExistingProfile ? currentUser.role : dto.role || currentUser.role;

    // Create or update role-specific profile
    if (roleToUse === 'doctor') {
      await this.createOrUpdateDoctorProfile(userId, dto);
    } else if (roleToUse === 'patient') {
      await this.createOrUpdatePatientProfile(userId, dto);
    }

    // Fetch updated user with profiles
    const updatedUser = await this.prisma.user.findUnique({
      where: { user_id: userId },
      include: {
        doctor_profile: true,
        patient_profile: true,
      },
    });

    return this.mapToUserResponse(updatedUser!);
  }

  private async createOrUpdateDoctorProfile(userId: string, dto: UpdateProfileDto) {
    if (!dto.specialization || !dto.clinic_address) {
      throw new BadRequestException('Specialization and clinic address are required for doctors');
    }

    const existing = await this.prisma.doctorProfile.findUnique({
      where: { user_id: userId },
    });

    if (existing) {
      await this.prisma.doctorProfile.update({
        where: { user_id: userId },
        data: {
          specialization: dto.specialization,
          experience_years: dto.experience_years,
          clinic_address: dto.clinic_address,
          contact_info: dto.contact_info,
          working_hours: dto.working_hours,
        },
      });
    } else {
      // Get the next available doctor_id
      const maxDoctor = await this.prisma.doctorProfile.findFirst({
        orderBy: { doctor_id: 'desc' },
      });
      const nextId = (maxDoctor?.doctor_id || 0) + 1;

      await this.prisma.doctorProfile.create({
        data: {
          doctor_id: nextId,
          user_id: userId,
          specialization: dto.specialization,
          experience_years: dto.experience_years,
          clinic_address: dto.clinic_address,
          contact_info: dto.contact_info,
          working_hours: dto.working_hours,
        },
      });
    }
  }

  private async createOrUpdatePatientProfile(userId: string, dto: UpdateProfileDto) {
    const existing = await this.prisma.patientProfile.findUnique({
      where: { user_id: userId },
    });

    if (existing) {
      await this.prisma.patientProfile.update({
        where: { user_id: userId },
        data: {
          date_of_birth: dto.date_of_birth ? new Date(dto.date_of_birth) : null,
          emergency_contact: dto.emergency_contact,
          conditions: dto.conditions,
          medications: dto.medications,
          allergy: dto.allergy,
        },
      });
    } else {
      // Get the next available patient_id
      const maxPatient = await this.prisma.patientProfile.findFirst({
        orderBy: { patient_id: 'desc' },
      });
      const nextId = (maxPatient?.patient_id || 0) + 1;

      await this.prisma.patientProfile.create({
        data: {
          patient_id: nextId,
          user_id: userId,
          date_of_birth: dto.date_of_birth ? new Date(dto.date_of_birth) : null,
          emergency_contact: dto.emergency_contact,
          conditions: dto.conditions,
          medications: dto.medications,
          allergy: dto.allergy,
        },
      });
    }
  }

  private mapToUserResponse(user: any): UserResponseDto {
    const profileCompleted = !!(user.doctor_profile || user.patient_profile);

    return {
      user_id: user.user_id,
      first_name: user.first_name,
      last_name: user.last_name,
      gender: user.gender,
      email: user.email,
      role: user.role,
      createdAt: user.createdAt,
      lastLogin: user.lastLogin,
      profileCompleted,
      doctor_profile: user.doctor_profile,
      patient_profile: user.patient_profile,
    };
  }

  async upsertGoogle(profile: {
    id: string;
    email: string;
    name?: string;
    picture?: string;
    refreshToken?: string;
  }) {
    // Split display name into first/last
    const name = profile.name ?? '';
    const parts = name.trim().split(/\s+/).filter(Boolean);
    const first_name = parts.shift() ?? profile.email.split('@')[0];
    const last_name = parts.join(' ') || '';

    // Prisma schema requires several required fields (role, gender, first_name, last_name).
    // We'll choose sensible defaults: role='patient' and gender='male' when missing.
    // NOTE: adjust these defaults if your app needs different values or a migration to nullable fields.
    try {
      const updateData: any = {
        first_name,
        last_name,
        lastLogin: new Date(),
      };

      const dbUser = await this.prisma.user.upsert({
        where: { email: profile.email },
        update: updateData,
        create: {
          email: profile.email,
          first_name,
          last_name,
          role: 'patient',
          gender: 'male',
          createdAt: new Date(),
          lastLogin: new Date(),
        },
      });

      return mapDbUser(dbUser);
    } catch (err) {
      this.logger.error('Failed to upsert google user', err as any);
      throw err;
    }
  }

  async requestAccountDeletion(
    userId: string,
    dto: RequestAccountDeletionDto,
  ): Promise<AccountDeletionRequestResponseDto> {
    // Check if user exists
    const user = await this.prisma.user.findUnique({
      where: { user_id: userId },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Check if there's already a pending request
    const existingRequest = await this.prisma.accountDeletionRequest.findFirst({
      where: {
        user_id: userId,
        status: 'PENDING',
      },
    });

    if (existingRequest) {
      throw new BadRequestException('You already have a pending deletion request');
    }

    // Create deletion request
    const request = await this.prisma.accountDeletionRequest.create({
      data: {
        user_id: userId,
        reason: dto.reason,
      },
    });

    this.logger.log(`Account deletion requested by user ${userId}`);

    return {
      request_id: request.request_id,
      status: request.status,
      requested_at: request.requested_at,
      message:
        'Your account deletion request has been submitted. You will receive a confirmation email once processed.',
    };
  }

  async requestDataExport(userId: string): Promise<DataExportResponseDto> {
    // Check if user exists
    const user = await this.prisma.user.findUnique({
      where: { user_id: userId },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Create export request (auto-completed for audit trail)
    const request = await this.prisma.dataExportRequest.create({
      data: {
        user_id: userId,
        status: 'COMPLETED',
        completed_at: new Date(),
      },
    });

    this.logger.log(`Data export completed for user ${userId}`);

    return {
      request_id: request.request_id,
      status: request.status,
      requested_at: request.requested_at,
      message:
        'Your data export request has been submitted. You will receive a download link via email once ready.',
    };
  }

  async exportUserData(userId: string): Promise<UserDataExportDto> {
    // Get user with all related data
    const user = await this.prisma.user.findUnique({
      where: { user_id: userId },
      include: {
        doctor_profile: true,
        patient_profile: true,
        notifications: true,
        sentMessages: {
          select: {
            message_id: true,
            receiver_id: true,
            content: true,
            sent_at: true,
            read_at: true,
          },
        },
        receivedMessages: {
          select: {
            message_id: true,
            sender_id: true,
            content: true,
            sent_at: true,
            read_at: true,
          },
        },
      },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Get appointments (either as doctor or patient)
    const appointments: any[] = [];
    if (user.doctor_profile) {
      const doctorAppointments = await this.prisma.appointment.findMany({
        where: { doctor_id: user.doctor_profile.doctor_id },
        include: {
          patient: {
            include: {
              user: {
                select: {
                  first_name: true,
                  last_name: true,
                  email: true,
                },
              },
            },
          },
        },
      });
      appointments.push(...doctorAppointments);
    } else if (user.patient_profile) {
      const patientAppointments = await this.prisma.appointment.findMany({
        where: { patient_id: user.patient_profile.patient_id },
        include: {
          doctor: {
            include: {
              user: {
                select: {
                  first_name: true,
                  last_name: true,
                  email: true,
                },
              },
            },
          },
        },
      });
      appointments.push(...patientAppointments);
    }

    // Get consultations
    const consultations: any[] = [];
    if (user.doctor_profile) {
      const doctorAppointments = await this.prisma.appointment.findMany({
        where: { doctor_id: user.doctor_profile.doctor_id },
        select: { appointment_id: true },
      });
      const doctorConsultations = await this.prisma.consultation.findMany({
        where: {
          appointment_id: {
            in: doctorAppointments.map((a) => a.appointment_id),
          },
        },
      });
      consultations.push(...doctorConsultations);
    } else if (user.patient_profile) {
      const patientAppointments = await this.prisma.appointment.findMany({
        where: { patient_id: user.patient_profile.patient_id },
        select: { appointment_id: true },
      });
      const patientConsultations = await this.prisma.consultation.findMany({
        where: {
          appointment_id: {
            in: patientAppointments.map((a) => a.appointment_id),
          },
        },
      });
      consultations.push(...patientConsultations);
    }

    return {
      user: {
        user_id: user.user_id,
        first_name: user.first_name,
        last_name: user.last_name,
        email: user.email,
        gender: user.gender,
        role: user.role,
        createdAt: user.createdAt,
        lastLogin: user.lastLogin,
      },
      profile: user.doctor_profile || user.patient_profile || null,
      appointments,
      consultations,
      messages: [...user.sentMessages, ...user.receivedMessages],
      notifications: user.notifications,
      exportedAt: new Date(),
    };
  }

  async getMyPrivacyRequests(userId: string) {
    const [deletionRequests, exportRequests] = await Promise.all([
      this.prisma.accountDeletionRequest.findMany({
        where: { user_id: userId },
        orderBy: { requested_at: 'desc' },
      }),
      this.prisma.dataExportRequest.findMany({
        where: { user_id: userId },
        orderBy: { requested_at: 'desc' },
      }),
    ]);

    return { deletionRequests, exportRequests };
  }

  async cancelDeletionRequest(userId: string, requestId: number) {
    const req = await this.prisma.accountDeletionRequest.findUnique({
      where: { request_id: requestId },
    });
    if (!req || req.user_id !== userId) {
      throw new NotFoundException('Deletion request not found');
    }
    if (req.status !== 'PENDING') {
      throw new BadRequestException('Only pending requests can be cancelled');
    }
    const updated = await this.prisma.accountDeletionRequest.update({
      where: { request_id: requestId },
      data: { status: 'CANCELLED', processed_at: new Date(), processed_by: userId },
    });
    return { success: true, request: updated };
  }

  async cancelExportRequest(userId: string, requestId: number) {
    const req = await this.prisma.dataExportRequest.findUnique({
      where: { request_id: requestId },
    });
    if (!req || req.user_id !== userId) {
      throw new NotFoundException('Export request not found');
    }
    if (req.status !== 'PENDING' && req.status !== 'PROCESSING') {
      throw new BadRequestException('Only pending/processing requests can be cancelled');
    }
    const updated = await this.prisma.dataExportRequest.update({
      where: { request_id: requestId },
      data: { status: 'CANCELLED', completed_at: new Date() },
    });
    return { success: true, request: updated };
  }

  async approveDeletionRequest(userId: string, requestId: number) {
    const request = await this.prisma.accountDeletionRequest.findUnique({
      where: { request_id: requestId },
    });
    if (!request || request.user_id !== userId) {
      throw new NotFoundException('Deletion request not found');
    }
    if (request.status !== 'PENDING') {
      throw new BadRequestException('Can only approve pending requests');
    }
    // Mark as completed
    await this.prisma.accountDeletionRequest.update({
      where: { request_id: requestId },
      data: { status: 'COMPLETED', processed_at: new Date(), processed_by: userId },
    });

    // Get doctor and patient IDs for this user
    const doctor = await this.prisma.doctorProfile.findUnique({ where: { user_id: userId } });
    const patient = await this.prisma.patientProfile.findUnique({ where: { user_id: userId } });

    // Delete in reverse order of foreign keys
    await this.prisma.notification.deleteMany({ where: { user_id: userId } });
    await this.prisma.chat.deleteMany({
      where: { OR: [{ sender_id: userId }, { receiver_id: userId }] },
    });

    // Delete consultation-related data
    if (doctor) {
      const consultationIds = (
        await this.prisma.consultation.findMany({
          where: { appointment: { doctor_id: doctor.doctor_id } },
          select: { consultation_id: true },
        })
      ).map((c) => c.consultation_id);

      await this.prisma.consultationActionItem.deleteMany({
        where: { consultation_id: { in: consultationIds } },
      });
      await this.prisma.consultationRecording.deleteMany({
        where: { consultation_id: { in: consultationIds } },
      });
      await this.prisma.sharedConsultationNote.deleteMany({
        where: { consultation_id: { in: consultationIds } },
      });
      await this.prisma.consultation.deleteMany({
        where: { consultation_id: { in: consultationIds } },
      });
      await this.prisma.appointment.deleteMany({ where: { doctor_id: doctor.doctor_id } });
      await this.prisma.availability.deleteMany({ where: { doctor_id: doctor.doctor_id } });
    }

    if (patient) {
      const consultationIds = (
        await this.prisma.consultation.findMany({
          where: { appointment: { patient_id: patient.patient_id } },
          select: { consultation_id: true },
        })
      ).map((c) => c.consultation_id);

      await this.prisma.consultationActionItem.deleteMany({
        where: { consultation_id: { in: consultationIds } },
      });
      await this.prisma.consultationRecording.deleteMany({
        where: { consultation_id: { in: consultationIds } },
      });
      await this.prisma.sharedConsultationNote.deleteMany({
        where: { consultation_id: { in: consultationIds } },
      });
      await this.prisma.consultation.deleteMany({
        where: { consultation_id: { in: consultationIds } },
      });
      await this.prisma.appointment.deleteMany({ where: { patient_id: patient.patient_id } });
    }

    await this.prisma.notificationPreferences.deleteMany({ where: { user_id: userId } });
    await this.prisma.accountDeletionRequest.deleteMany({ where: { user_id: userId } });
    await this.prisma.dataExportRequest.deleteMany({ where: { user_id: userId } });
    await this.prisma.doctorProfile.deleteMany({ where: { user_id: userId } });
    await this.prisma.patientProfile.deleteMany({ where: { user_id: userId } });
    await this.prisma.user.delete({ where: { user_id: userId } });
    return { success: true, message: 'Account deleted successfully' };
  }

  async approveExportRequest(userId: string, requestId: number) {
    const request = await this.prisma.dataExportRequest.findUnique({
      where: { request_id: requestId },
    });
    if (!request || request.user_id !== userId) {
      throw new NotFoundException('Export request not found');
    }
    if (request.status !== 'PENDING') {
      throw new BadRequestException('Can only approve pending requests');
    }
    await this.prisma.dataExportRequest.update({
      where: { request_id: requestId },
      data: { status: 'COMPLETED', completed_at: new Date() },
    });
    return {
      success: true,
      message: 'Export completed. Download your data from the Export section.',
    };
  }
}

function mapDbUser(dbUser: any): User {
  const name = [dbUser.first_name, dbUser.last_name].filter(Boolean).join(' ').trim();
  return {
    id: dbUser.user_id,
    email: dbUser.email,
    name: name || undefined,
    picture: undefined,
    provider: 'google',
  };
}
