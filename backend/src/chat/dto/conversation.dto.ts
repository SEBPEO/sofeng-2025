export class ConversationDto {
  user_id: string;
  first_name: string;
  last_name: string;
  role: string;
  last_message: {
    content: string;
    sent_at: Date;
    is_read: boolean;
    is_sent_by_me: boolean;
  } | null;
  unread_count: number;
}
