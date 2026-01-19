import apiClient from '@/store/apiClient';

export interface AuditLog {
  audit_id: number;
  user_id: string | null;
  action: string;
  resource_type: string;
  resource_id: string | null;
  details: string | null;
  ip_address: string | null;
  user_agent: string | null;
  created_at: string;
  user?: {
    user_id: string;
    first_name: string;
    last_name: string;
    email: string;
    role: string;
  };
}

export interface AuditLogFilters {
  userId?: string;
  resourceType?: string;
  action?: string;
  startDate?: string;
  endDate?: string;
  limit?: number;
}

export const auditApi = {
  /**
   * Get audit logs with optional filters
   */
  async getAuditLogs(filters?: AuditLogFilters): Promise<AuditLog[]> {
    const params = new URLSearchParams();
    if (filters?.userId) params.append('userId', filters.userId);
    if (filters?.resourceType) params.append('resourceType', filters.resourceType);
    if (filters?.action) params.append('action', filters.action);
    if (filters?.startDate) params.append('startDate', filters.startDate);
    if (filters?.endDate) params.append('endDate', filters.endDate);
    if (filters?.limit) params.append('limit', filters.limit.toString());

    const response = await apiClient.get(`/audit/logs?${params.toString()}`);
    return response.data;
  },

  /**
   * Get audit history for a specific resource (e.g., consultation, recording)
   */
  async getResourceHistory(resourceType: string, resourceId: string): Promise<AuditLog[]> {
    const response = await apiClient.get(
      `/audit/resource-history?resourceType=${resourceType}&resourceId=${resourceId}`,
    );
    return response.data;
  },
};
