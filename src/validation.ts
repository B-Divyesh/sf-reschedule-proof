import type { ChangeRecord, ReceiptPayload } from './types';

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
