export class DataExportResponseDto {
  request_id: number;
  status: string;
  requested_at: Date;
  message: string;
}

export class UserDataExportDto {
  user: {
    user_id: string;
    first_name: string;
    last_name: string;
    email: string;
    gender: string;
    role: string;
    createdAt: Date;
    lastLogin: Date | null;
  };
  profile: any;
  appointments: any[];
  consultations: any[];
  messages: any[];
  notifications: any[];
  exportedAt: Date;
}
