import {
  Controller,
  Get,
  Query,
  Req,
  UseGuards,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { AuditService } from './audit.service';
import { AuditAction, PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

@Controller('audit')
@UseGuards(AuthGuard('jwt'))
export class AuditController {
  constructor(private readonly auditService: AuditService) {}

  @Get('logs')
  async getAuditLogs(
    @Req() req,
    @Query('userId') userId?: string,
    @Query('resourceType') resourceType?: string,
    @Query('action') action?: AuditAction,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('limit') limit?: string,
  ) {
    const currentUserId = req.user?.userId || req.user?.sub;
    const userRole = req.user?.role;

    // Get user's profiles to determine what they can see
    const user = await prisma.user.findUnique({
      where: { user_id: currentUserId },
      include: {
        doctor_profile: true,
        patient_profile: true,
      },
    });

    if (!user) {
      throw new ForbiddenException('User not found');
    }

    // ROLE-BASED FILTERING
    let filters: any = {
      resourceType,
      action,
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined,
      limit: limit ? parseInt(limit) : undefined,
    };

    if (userRole === 'doctor') {
      // DOCTORS: See logs related to their patients
      if (!user.doctor_profile) {
        throw new ForbiddenException('Doctor profile not found');
      }

      // Get all patient IDs for this doctor
      const doctorPatients = await prisma.doctorPatient.findMany({
        where: { doctor_id: user.doctor_profile.doctor_id },
        select: { patient_id: true },
      });

      const patientIds = doctorPatients.map((dp) => dp.patient_id);

      // Get user IDs for these patients
      const patientUsers = await prisma.patientProfile.findMany({
        where: { patient_id: { in: patientIds } },
        include: { user: true },
      });

      const allowedUserIds = [
        currentUserId, // Doctor's own actions
        ...patientUsers.map((pu) => pu.user_id), // Their patients' actions
      ];

      // If userId filter specified, ensure it's in allowed list
      if (userId && !allowedUserIds.includes(userId)) {
        throw new ForbiddenException('You can only view logs for yourself and your patients');
      }

      filters.allowedUserIds = allowedUserIds;
    } else if (userRole === 'patient') {
      // PATIENTS: Can only see their own logs (HIPAA compliance)
      if (userId && userId !== currentUserId) {
        throw new ForbiddenException('Patients can only view their own audit logs');
      }
      filters.userId = currentUserId;
    } else {
      // FUTURE: admin role would have unrestricted access
      // For now, default to user's own logs
      filters.userId = currentUserId;
    }

    return this.auditService.getAuditLogs(filters);
  }

  @Get('resource-history')
  async getResourceHistory(
    @Req() req,
    @Query('resourceType') resourceType: string,
    @Query('resourceId') resourceId: string,
  ) {
    if (!resourceType || !resourceId) {
      throw new BadRequestException('resourceType and resourceId are required');
    }

    const currentUserId = req.user?.userId || req.user?.sub;
    const userRole = req.user?.role;

    // Authorization check based on resource type
    if (resourceType === 'Consultation') {
      const consultation = await prisma.consultation.findUnique({
        where: { consultation_id: parseInt(resourceId) },
        include: { appointment: true },
      });

      if (!consultation) {
        throw new ForbiddenException('Consultation not found');
      }

      const user = await prisma.user.findUnique({
        where: { user_id: currentUserId },
        include: { doctor_profile: true, patient_profile: true },
      });

      const isDoctor = user?.doctor_profile?.doctor_id === consultation.appointment.doctor_id;
      const isPatient = user?.patient_profile?.patient_id === consultation.appointment.patient_id;

      if (!isDoctor && !isPatient) {
        throw new ForbiddenException('You do not have access to this consultation history');
      }
    }

    return this.auditService.getResourceAuditHistory(resourceType, resourceId);
  }
}
