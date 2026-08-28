export type ChangeType = 'rescheduled' | 'cancelled';
export type NotifyChannel = 'sms' | 'email' | 'copy';

export interface NotificationAttempt {
  channel: NotifyChannel;
  at: string;
}

export interface Acknowledgement {
  at: string;
  method: 'receipt' | 'manual';
}

export interface ChangeRecord {
  id: string;
  token: string;
  type: ChangeType;
  title: string;
  customerName: string;
  customerPhone: string;
  customerEmail: string;
  oldStart: string;
  newStart?: string;
  location?: string;
  note?: string;
  businessName: string;
  replyPhone?: string;
  replyEmail?: string;
  createdAt: string;
  expiresAt: string;
  notifications: NotificationAttempt[];
  acknowledgement?: Acknowledgement;
}

export interface CardPayload {
  v: 1;
  id: string;
  token: string;
  type: ChangeType;
  title: string;
  customerName: string;
  oldStart: string;
  newStart?: string;
  location?: string;
  note?: string;
  businessName: string;
  replyPhone?: string;
  replyEmail?: string;
  expiresAt: string;
}

export interface ReceiptPayload {
  v: 1;
  id: string;
  token: string;
  acknowledgedAt: string;
}

export interface BusinessSettings {
  businessName: string;
  replyPhone: string;
  replyEmail: string;
  messageTemplate: string;
}
