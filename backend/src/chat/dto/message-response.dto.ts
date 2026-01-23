export class MessageResponseDto {
  message_id: number;
  sender_id: string;
  receiver_id: string;
  content: string;
  sent_at: Date;
  read_at: Date | null;
  file_path: string | null;
  file_name: string | null;
  file_type: string | null;
  file_size: number | null;
  sender: {
    user_id: string;
    first_name: string;
    last_name: string;
    role: string;
  };
  receiver: {
    user_id: string;
    first_name: string;
    last_name: string;
    role: string;
  };
}
