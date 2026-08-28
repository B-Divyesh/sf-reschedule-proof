import { describe, expect, it } from 'vitest';
import { decodePayload, encodePayload, parseIcs, recordsToCsv } from '../src/codec';
import type { ChangeRecord } from '../src/types';

describe('private link codec', () => {
  it('round-trips unicode without leaking JSON punctuation', () => {
    const payload = { customer: 'Zoë', note: 'Use side door — thanks' };
    const encoded = encodePayload(payload);
    expect(encoded).not.toContain('{');
    expect(decodePayload(encoded)).toEqual(payload);
  });
});

describe('calendar import', () => {
  it('reads a folded VEVENT and unescapes fields', () => {
    const event = ['BEGIN:VCALENDAR', 'BEGIN:VEVENT', 'DTSTART:20260904T143000Z', 'SUMMARY:Piano lesson', 'LOCATION:Studio\\, rear door', 'DESCRIPTION:Bring book', '  two', 'END:VEVENT', 'END:VCALENDAR'].join('\r\n');
    expect(parseIcs(event)).toMatchObject({ title: 'Piano lesson', start: '2026-09-04T14:30:00.000Z', location: 'Studio, rear door', note: 'Bring book two' });
  });

  it('rejects a file without an event', () => {
    expect(() => parseIcs('BEGIN:VCALENDAR\nEND:VCALENDAR')).toThrow(/does not contain/);
  });
});

describe('export', () => {
  it('quotes fields safely for CSV', () => {
    const record = { id: '1', type: 'cancelled', title: 'Cut, colour', customerName: 'Ana', customerPhone: '', customerEmail: '', oldStart: '2026-01-01T10:00:00.000Z', businessName: 'Studio', createdAt: '2026-01-01T09:00:00.000Z', expiresAt: '2026-01-08T00:00:00.000Z', token: 'x', notifications: [] } satisfies ChangeRecord;
    expect(recordsToCsv([record])).toContain('"Cut, colour"');
  });
});
