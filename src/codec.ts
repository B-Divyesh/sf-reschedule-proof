import type { CardPayload, ChangeRecord, ReceiptPayload } from './types';
import { normalizePhone, validEmail } from './validation';

export function encodePayload(value: unknown): string {
  const bytes = new TextEncoder().encode(JSON.stringify(value));
  let binary = '';
  bytes.forEach((byte) => { binary += String.fromCharCode(byte); });
  return btoa(binary).replaceAll('+', '-').replaceAll('/', '_').replaceAll('=', '');
}

export function decodePayload<T>(encoded: string): T {
  const padded = encoded.replaceAll('-', '+').replaceAll('_', '/') + '='.repeat((4 - encoded.length % 4) % 4);
  const binary = atob(padded);
  const bytes = Uint8Array.from(binary, (character) => character.charCodeAt(0));
  return JSON.parse(new TextDecoder().decode(bytes)) as T;
}

export function randomToken(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  return [...bytes].map((byte) => byte.toString(16).padStart(2, '0')).join('');
}

export function cardPayload(record: ChangeRecord): CardPayload {
  return {
    v: 1,
    id: record.id,
    token: record.token,
    type: record.type,
    title: record.title,
    customerName: record.customerName,
    oldStart: record.oldStart,
    newStart: record.newStart,
    location: record.location,
    note: record.note,
    businessName: record.businessName,
    replyPhone: normalizePhone(record.replyPhone) ?? undefined,
    replyEmail: validEmail(record.replyEmail) ? record.replyEmail!.trim() : undefined,
    expiresAt: record.expiresAt
  };
}

export function cardUrl(record: ChangeRecord): string {
  return `${location.origin}${location.pathname}#/card/${encodePayload(cardPayload(record))}`;
}

export function receiptUrl(receipt: ReceiptPayload): string {
  return `${location.origin}${location.pathname}#/receipt/${encodePayload(receipt)}`;
}

export function humanDate(value: string): string {
  const date = new Date(value);
  return new Intl.DateTimeFormat(undefined, {
    weekday: 'short', month: 'short', day: 'numeric', year: 'numeric',
    hour: 'numeric', minute: '2-digit'
  }).format(date);
}

function unfoldIcs(content: string): string[] {
  return content.replace(/\r\n[ \t]/g, '').replace(/\n[ \t]/g, '').split(/\r?\n/);
}

function unescapeIcs(value: string): string {
  return value.replace(/\\n/gi, '\n').replace(/\\,/g, ',').replace(/\\;/g, ';').replace(/\\\\/g, '\\');
}

export function parseIcs(content: string): { title: string; start: string; location: string; note: string } {
  const lines = unfoldIcs(content);
  if (!lines.some((line) => line.trim() === 'BEGIN:VEVENT')) throw new Error('This file does not contain a calendar event.');
  const field = (name: string) => {
    const line = lines.find((entry) => entry.toUpperCase().startsWith(`${name}:`) || entry.toUpperCase().startsWith(`${name};`));
    return line ? unescapeIcs(line.slice(line.indexOf(':') + 1).trim()) : '';
  };
  const rawDate = field('DTSTART');
  if (!rawDate) throw new Error('The calendar event has no start time.');
  const match = rawDate.match(/^(\d{4})(\d{2})(\d{2})(?:T(\d{2})(\d{2})(\d{2})?(Z)?)?$/);
  if (!match) throw new Error('The calendar start time is not in a supported format.');
  const [, year, month, day, hour = '09', minute = '00', second = '00', utc] = match;
  const iso = utc
    ? new Date(Date.UTC(Number(year), Number(month) - 1, Number(day), Number(hour), Number(minute), Number(second))).toISOString()
    : new Date(Number(year), Number(month) - 1, Number(day), Number(hour), Number(minute), Number(second)).toISOString();
  return { title: field('SUMMARY') || 'Appointment', start: iso, location: field('LOCATION'), note: field('DESCRIPTION') };
}

export function toLocalInput(value: string): string {
  const date = new Date(value);
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
  return local.toISOString().slice(0, 16);
}

export function recordsToCsv(records: ChangeRecord[]): string {
  const quote = (value: unknown) => `"${String(value ?? '').replaceAll('"', '""')}"`;
  const header = ['id', 'type', 'appointment', 'customer', 'old_time', 'new_time', 'created_at', 'notified_at', 'acknowledged_at', 'acknowledgement_method'];
  const rows = records.map((record) => [
    record.id, record.type, record.title, record.customerName, record.oldStart, record.newStart,
    record.createdAt, record.notifications.at(-1)?.at, record.acknowledgement?.at, record.acknowledgement?.method
  ].map(quote).join(','));
  return [header.join(','), ...rows].join('\n');
}
