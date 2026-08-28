import type { ChangeRecord, NotifyChannel, ReceiptPayload } from './types';

const MAX_RECEIPT_CLOCK_SKEW_MS = 5 * 60_000;

export type ReceiptVerdict = 'valid' | 'expired' | 'mismatch' | 'invalid-time';

/**
 * Converts a human-entered telephone number into a safe SMS URI recipient.
 * Local and international numbers are accepted, but arbitrary text, misplaced
 * plus signs, and numbers outside the ITU 7–15 digit range are rejected.
 */
export function normalizePhone(value: string | undefined): string | null {
  const input = value?.trim() ?? '';
  if (!input || !/^\+?[0-9().\-\s]+$/.test(input)) return null;
  const digits = input.replace(/\D/g, '');
  if (digits.length < 7 || digits.length > 15) return null;
  return input.startsWith('+') ? `+${digits}` : digits;
}

export function validEmail(value: string | undefined): boolean {
  const input = value?.trim() ?? '';
  return /^[^\s@]+@[^\s@]+$/.test(input);
}

function validDate(value: unknown): value is string {
  return typeof value === 'string' && Number.isFinite(new Date(value).getTime());
}

/**
 * A backup is untrusted input, even when it has the expected wrapper. Validate
 * every field before a replacement transaction is allowed to clear the log.
 */
export function validChangeRecord(value: unknown): value is ChangeRecord {
  if (!value || typeof value !== 'object') return false;
  const record = value as Partial<ChangeRecord>;
  if (typeof record.id !== 'string' || !record.id || typeof record.token !== 'string' || !record.token) return false;
  if (record.type !== 'rescheduled' && record.type !== 'cancelled') return false;
  if (typeof record.title !== 'string' || !record.title.trim() || typeof record.customerName !== 'string' || !record.customerName.trim()) return false;
  if (typeof record.customerPhone !== 'string' || typeof record.customerEmail !== 'string') return false;
  if (record.customerPhone && !normalizePhone(record.customerPhone)) return false;
  if (record.customerEmail && !validEmail(record.customerEmail)) return false;
  if (!record.customerPhone && !record.customerEmail) return false;
  if (typeof record.businessName !== 'string' || !record.businessName.trim()) return false;
  if (record.replyPhone !== undefined && (typeof record.replyPhone !== 'string' || !normalizePhone(record.replyPhone))) return false;
  if (record.replyEmail !== undefined && (typeof record.replyEmail !== 'string' || !validEmail(record.replyEmail))) return false;
  if (!record.replyPhone && !record.replyEmail) return false;
  if (!validDate(record.oldStart) || !validDate(record.createdAt) || !validDate(record.expiresAt)) return false;
  if (new Date(record.expiresAt).getTime() <= new Date(record.createdAt).getTime()) return false;
  if (record.type === 'rescheduled') {
    if (!validDate(record.newStart) || new Date(record.newStart).getTime() === new Date(record.oldStart).getTime()) return false;
  } else if (record.newStart !== undefined) return false;
  if (record.location !== undefined && typeof record.location !== 'string') return false;
  if (record.note !== undefined && typeof record.note !== 'string') return false;
  if (!Array.isArray(record.notifications)) return false;
  const channels: NotifyChannel[] = ['sms', 'email', 'copy'];
  if (!record.notifications.every((attempt) => attempt && channels.includes(attempt.channel) && validDate(attempt.at))) return false;
  if (record.acknowledgement !== undefined) {
    if (!record.acknowledgement || !['receipt', 'manual'].includes(record.acknowledgement.method) || !validDate(record.acknowledgement.at)) return false;
  }
  return true;
}

/** Validate the whole backup before the user is asked to approve replacement. */
export function validBackupRecords(value: unknown): value is ChangeRecord[] {
  return Array.isArray(value) && value.every(validChangeRecord) && new Set(value.map((record) => record.id)).size === value.length;
}

/** Validate both link possession and the full acknowledgement time window. */
export function receiptVerdict(
  record: ChangeRecord | undefined,
  receipt: ReceiptPayload,
  now = Date.now()
): ReceiptVerdict {
  if (!record || record.id !== receipt.id || record.token !== receipt.token) return 'mismatch';

  const acknowledgedAt = new Date(receipt.acknowledgedAt).getTime();
  const createdAt = new Date(record.createdAt).getTime();
  const expiresAt = new Date(record.expiresAt).getTime();
  if (![acknowledgedAt, createdAt, expiresAt].every(Number.isFinite)) return 'invalid-time';
  if (now > expiresAt || acknowledgedAt > expiresAt) return 'expired';
  if (acknowledgedAt < createdAt - MAX_RECEIPT_CLOCK_SKEW_MS || acknowledgedAt > now + MAX_RECEIPT_CLOCK_SKEW_MS) return 'invalid-time';
  return 'valid';
}
