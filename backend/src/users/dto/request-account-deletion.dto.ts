export class RequestAccountDeletionDto {
  reason?: string;
}

export class AccountDeletionRequestResponseDto {
  request_id: number;
  status: string;
  requested_at: Date;
  message: string;
}
