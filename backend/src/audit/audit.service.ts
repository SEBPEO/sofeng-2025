import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditAction } from '@prisma/client';

export interface AuditLogData {
  userId?: string;
  action: AuditAction;
  resourceType: string;
  resourceId?: string;
  details?: Record<string, any>;
  ipAddress?: string;
  userAgent?: string;
}

@Injectable()
export class AuditService {
  constructor(private prisma: PrismaService) {}

  /**
   * Create an audit log entry
   */
  async log(data: AuditLogData): Promise<void> {
    try {
      await this.prisma.auditLog.create({
        data: {
          user_id: data.userId || null,
          action: data.action,
          resource_type: data.resourceType,
          resource_id: data.resourceId || null,
          details: data.details ? JSON.stringify(data.details) : null,
          ip_address: data.ipAddress || null,
          user_agent: data.userAgent || null,
        },
      });
    } catch (error) {
      // Don't fail the main operation if audit logging fails
      console.error('Failed to create audit log:', error);
    }
  }

  /**
   * Log authentication events
   */
  async logAuth(
    userId: string,
    action: 'LOGIN' | 'LOGOUT' | 'LOGIN_FAILED',
    ipAddress?: string,
    userAgent?: string,
  ) {
    await this.log({
      userId,
      action,
      resourceType: 'Auth',
      ipAddress,
      userAgent,
    });
  }

  /**
   * Log file/recording access
   */
  async logFileAccess(
    userId: string,
    action:
      | 'RECORDING_UPLOAD'
      | 'RECORDING_DOWNLOAD'
      | 'RECORDING_ACCESS'
      | 'FILE_UPLOAD'
      | 'FILE_DOWNLOAD'
      | 'FILE_ACCESS',
    fileId: string,
    fileName: string,
    ipAddress?: string,
  ) {
    await this.log({
      userId,
      action,
      resourceType: 'File',
      resourceId: fileId,
      details: { fileName },
      ipAddress,
    });
  }

  /**
   * Log consultation/medical record access
   */
  async logMedicalRecordAccess(
    userId: string,
    action:
      | 'CONSULTATION_VIEW'
      | 'CONSULTATION_EDIT'
      | 'MEDICAL_RECORD_ACCESS'
      | 'PRESCRIPTION_VIEW',
    consultationId: string,
    patientId?: string,
  ) {
    await this.log({
      userId,
      action,
      resourceType: 'Consultation',
      resourceId: consultationId,
      details: { patientId },
    });
  }

  /**
   * Log data operations (CRUD)
   */
  async logDataOperation(
    userId: string,
    action: 'CREATE' | 'READ' | 'UPDATE' | 'DELETE' | 'MESSAGE_SENT' | 'MESSAGE_READ',
    resourceType: string,
    resourceId: string,
    details?: Record<string, any>,
  ) {
    await this.log({
      userId,
      action,
      resourceType,
      resourceId,
      details,
    });
  }

  /**
   * Get audit logs with filters
   */
  async getAuditLogs(filters: {
    userId?: string;
    allowedUserIds?: string[];
    resourceType?: string;
    action?: AuditAction;
    startDate?: Date;
    endDate?: Date;
    limit?: number;
  }) {
    const where: any = {};

    // Handle user filtering
    if (filters.allowedUserIds) {
      // For doctors: filter by multiple user IDs
      where.user_id = { in: filters.allowedUserIds };
    } else if (filters.userId) {
      // For patients: filter by single user ID
      where.user_id = filters.userId;
    }

    if (filters.resourceType) where.resource_type = filters.resourceType;
    if (filters.action) where.action = filters.action;
    if (filters.startDate || filters.endDate) {
      where.created_at = {};
      if (filters.startDate) where.created_at.gte = filters.startDate;
      if (filters.endDate) where.created_at.lte = filters.endDate;
    }

    return this.prisma.auditLog.findMany({
      where,
      orderBy: { created_at: 'desc' },
      take: filters.limit || 100,
      include: {
        user: {
          select: {
            user_id: true,
            first_name: true,
            last_name: true,
            email: true,
            role: true,
          },
        },
      },
    });
  }

  /**
   * Get audit logs for a specific resource
   */
  async getResourceAuditHistory(resourceType: string, resourceId: string) {
    return this.prisma.auditLog.findMany({
      where: {
        resource_type: resourceType,
        resource_id: resourceId,
      },
      orderBy: { created_at: 'desc' },
      include: {
        user: {
          select: {
            first_name: true,
            last_name: true,
            email: true,
            role: true,
          },
        },
      },
    });
  }
}
