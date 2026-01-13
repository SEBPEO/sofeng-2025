import apiClient from '@/store/apiClient';

export interface Message {
  message_id: number;
  sender_id: string;
  receiver_id: string;
  content: string;
  sent_at: string;
  read_at: string | null;
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

export interface Conversation {
  user_id: string;
  first_name: string;
  last_name: string;
  role: string;
  last_message: {
    content: string;
    sent_at: string;
    is_read: boolean;
    is_sent_by_me: boolean;
  } | null;
  unread_count: number;
}

export async function getConversations(): Promise<Conversation[]> {
  const response = await apiClient.get('/chat/conversations');
  return response.data;
}

export async function getMessages(userId: string): Promise<Message[]> {
  const response = await apiClient.get(`/chat/messages/${userId}`);
  return response.data;
}

export async function sendMessage(receiverId: string, content: string): Promise<Message> {
  const response = await apiClient.post('/chat/send', {
    receiver_id: receiverId,
    content,
  });
  return response.data;
}

export async function sendMessageWithAttachment(
  receiverId: string,
  content: string,
  file: File,
): Promise<Message> {
  const formData = new FormData();
  formData.append('receiver_id', receiverId);
  formData.append('content', content);
  formData.append('file', file);

  const response = await apiClient.post('/chat/send-with-attachment', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });
  return response.data;
}

export async function markAsRead(userId: string): Promise<void> {
  await apiClient.patch(`/chat/mark-read/${userId}`);
}

export function getAttachmentUrl(messageId: number): string {
  const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000';
  return `${apiUrl}/chat/attachment/${messageId}`;
}
