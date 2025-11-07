import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { UserResponseDto } from './dto/user-response.dto';

export type User = {
  id: string;
  email: string;
  name?: string;
  picture?: string;
  provider: 'google' | string;
};

const prisma = new PrismaClient();

@Injectable()
export class UsersService {
  private readonly logger = new Logger(UsersService.name);

  async findByEmail(email: string) {
    return await prisma.user.findUnique({ where: { email } });
  }

  async findById(id: string) {
    return await prisma.user.findUnique({ where: { user_id: id } });
  }

  async findDbById(id: string) {
    return await prisma.user.findUnique({ where: { user_id: id } });
  }

  async findByIdWithProfiles(id: string): Promise<UserResponseDto | null> {
    const user = await prisma.user.findUnique({
      where: { user_id: id },
      include: {
        doctor_profile: true,
        patient_profile: true,
      },
    });

    if (!user) return null;

    return this.mapToUserResponse(user);
  }

  async updateProfile(userId: string, dto: UpdateProfileDto): Promise<UserResponseDto> {
    // Get current user to check if role is already set
    const currentUser = await prisma.user.findUnique({
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

    const user = await prisma.user.update({
      where: { user_id: userId },
      data: updateData,
      include: {
        doctor_profile: true,
        patient_profile: true,
      },
    });

    // Determine which role to use for profile creation/update
    const roleToUse = hasExistingProfile ? currentUser.role : (dto.role || currentUser.role);

    // Create or update role-specific profile
    if (roleToUse === 'doctor') {
      await this.createOrUpdateDoctorProfile(userId, dto);
    } else if (roleToUse === 'patient') {
      await this.createOrUpdatePatientProfile(userId, dto);
    }

    // Fetch updated user with profiles
    const updatedUser = await prisma.user.findUnique({
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

    const existing = await prisma.doctorProfile.findUnique({
      where: { user_id: userId },
    });

    if (existing) {
      await prisma.doctorProfile.update({
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
      const maxDoctor = await prisma.doctorProfile.findFirst({
        orderBy: { doctor_id: 'desc' },
      });
      const nextId = (maxDoctor?.doctor_id || 0) + 1;

      await prisma.doctorProfile.create({
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
    const existing = await prisma.patientProfile.findUnique({
      where: { user_id: userId },
    });

    if (existing) {
      await prisma.patientProfile.update({
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
      const maxPatient = await prisma.patientProfile.findFirst({
        orderBy: { patient_id: 'desc' },
      });
      const nextId = (maxPatient?.patient_id || 0) + 1;

      await prisma.patientProfile.create({
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
      const dbUser = await prisma.user.upsert({
        where: { email: profile.email },
        update: {
          first_name,
          last_name,
          lastLogin: new Date(),
        },
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
