import { useState, useEffect, useRef } from 'react';
import { useSelector } from 'react-redux';
import type { RootState } from '@/store';
import {
  getConversations,
  getMessages,
  sendMessage,
  sendMessageWithAttachment,
  markAsRead,
  getAttachmentUrl,
  type Conversation,
  type Message,
} from '../api';
import styles from './Messages.module.css';

export function Messages() {
  const user = useSelector((state: RootState) => state.users.current);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [messageInput, setMessageInput] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const selectedConversation = conversations.find((c) => c.user_id === selectedUserId);

  useEffect(() => {
    loadConversations();
  }, []);

  useEffect(() => {
    if (!selectedUserId) return;

    const interval = setInterval(() => {
      loadMessages(selectedUserId);
      loadConversations();
    }, 5000);

    return () => clearInterval(interval);
  }, [selectedUserId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    if (selectedUserId) {
      loadMessages(selectedUserId);
      markAsRead(selectedUserId).catch(console.error);
    }
  }, [selectedUserId]);

  async function loadConversations() {
    try {
      const data = await getConversations();
      setConversations(data);
    } catch (error) {
      console.error('Failed to load conversations:', error);
    } finally {
      setLoading(false);
    }
  }

  async function loadMessages(userId: string) {
    try {
      const data = await getMessages(userId);
      setMessages(data);
    } catch (error) {
      console.error('Failed to load messages:', error);
    }
  }

  async function handleSendMessage(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedUserId || (!messageInput.trim() && !selectedFile) || sending) return;

    setSending(true);
    try {
      if (selectedFile) {
        await sendMessageWithAttachment(selectedUserId, messageInput.trim(), selectedFile);
      } else {
        await sendMessage(selectedUserId, messageInput.trim());
      }

      setMessageInput('');
      setSelectedFile(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
      
      await loadMessages(selectedUserId);
      await loadConversations();
    } catch (error) {
      console.error('Failed to send message:', error);
      alert('Failed to send message. Please try again.');
    } finally {
      setSending(false);
    }
  }

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 10 * 1024 * 1024) {
        alert('File size must be less than 10MB');
        return;
      }
      setSelectedFile(file);
    }
  }

  function formatFileSize(bytes: number): string {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  }

  function formatTime(dateString: string): string {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  }

  function getInitials(firstName: string, lastName: string): string {
    return `${firstName[0]}${lastName[0]}`.toUpperCase();
  }

  if (loading) {
    return <div className={styles.loading}>Loading conversations...</div>;
  }

  return (
    <div className={styles.messagesContainer}>
      <div className={styles.conversationsList}>
        {conversations.map((conversation) => (
          <div
            key={conversation.user_id}
            className={`${styles.conversationItem} ${
              selectedUserId === conversation.user_id ? styles.active : ''
            }`}
            onClick={() => setSelectedUserId(conversation.user_id)}
          >
            <div className={styles.conversationHeader}>
              <div className={styles.avatar}>
                {getInitials(conversation.first_name, conversation.last_name)}
              </div>
              <div className={styles.conversationInfo}>
                <div className={styles.conversationName}>
                  {conversation.first_name} {conversation.last_name}
                </div>
                <div className={styles.conversationRole}>{conversation.role}</div>
              </div>
              {conversation.unread_count > 0 && (
                <div className={styles.unreadBadge}>{conversation.unread_count}</div>
              )}
            </div>
            {conversation.last_message && (
              <>
                <div
                  className={`${styles.lastMessage} ${
                    !conversation.last_message.is_read && !conversation.last_message.is_sent_by_me
                      ? styles.unread
                      : ''
                  }`}
                >
                  {conversation.last_message.is_sent_by_me ? 'You: ' : ''}
                  {conversation.last_message.content}
                </div>
                <div className={styles.messageTime}>
                  {formatTime(conversation.last_message.sent_at)}
                </div>
              </>
            )}
          </div>
        ))}
      </div>

      <div className={styles.chatArea}>
        {!selectedUserId ? (
          <div className={styles.noConversation}>
            Select a conversation to start messaging
          </div>
        ) : (
          <>
            <div className={styles.chatHeader}>
              <div className={styles.avatar}>
                {selectedConversation &&
                  getInitials(selectedConversation.first_name, selectedConversation.last_name)}
              </div>
              <div>
                <div className={styles.chatHeaderName}>
                  {selectedConversation?.first_name} {selectedConversation?.last_name}
                </div>
                <div className={styles.chatHeaderRole}>{selectedConversation?.role}</div>
              </div>
            </div>

            <div className={styles.messagesArea}>
              {messages.map((msg) => {
                const isSent = msg.sender_id === user?.user_id;
                
                return (
                  <div
                    key={msg.message_id}
                    className={`${styles.messageItem} ${isSent ? styles.sent : styles.received}`}
                  >
                    <div className={styles.messageAvatar}>
                      {getInitials(msg.sender.first_name, msg.sender.last_name)}
                    </div>
                    <div className={styles.messageContent}>
                      <div className={styles.messageBubble}>
                        <p className={styles.messageText}>{msg.content}</p>
                        {msg.file_path && (
                          <a
                            href={getAttachmentUrl(msg.message_id)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className={styles.messageAttachment}
                          >
                            <span className={styles.attachmentIcon}>📎</span>
                            <div className={styles.attachmentInfo}>
                              <div className={styles.attachmentName}>{msg.file_name}</div>
                              {msg.file_size && (
                                <div className={styles.attachmentSize}>
                                  {formatFileSize(msg.file_size)}
                                </div>
                              )}
                            </div>
                          </a>
                        )}
                      </div>
                      <div className={styles.messageTime}>{formatTime(msg.sent_at)}</div>
                    </div>
                  </div>
                );
              })}
              <div ref={messagesEndRef} />
            </div>

            <div className={styles.inputArea}>
              <form onSubmit={handleSendMessage} className={styles.inputForm}>
                <div className={styles.inputWrapper}>
                  <textarea
                    className={styles.textInput}
                    value={messageInput}
                    onChange={(e) => setMessageInput(e.target.value)}
                    placeholder="Type a message..."
                    rows={1}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        handleSendMessage(e);
                      }
                    }}
                  />
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    <label className={styles.fileInputLabel}>
                      📎 Attach File
                      <input
                        ref={fileInputRef}
                        type="file"
                        className={styles.fileInput}
                        onChange={handleFileSelect}
                        accept="image/*,.pdf,.doc,.docx"
                      />
                    </label>
                    {selectedFile && (
                      <div className={styles.selectedFile}>
                        <span>{selectedFile.name}</span>
                        <button
                          type="button"
                          className={styles.removeFileBtn}
                          onClick={() => {
                            setSelectedFile(null);
                            if (fileInputRef.current) fileInputRef.current.value = '';
                          }}
                        >
                          ✕
                        </button>
                      </div>
                    )}
                  </div>
                </div>
                <button
                  type="submit"
                  className={styles.sendButton}
                  disabled={(!messageInput.trim() && !selectedFile) || sending}
                >
                  {sending ? 'Sending...' : 'Send'}
                </button>
              </form>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
