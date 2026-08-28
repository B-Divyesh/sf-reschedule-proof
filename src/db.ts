import type { BusinessSettings, ChangeRecord } from './types';
import { validBackupRecords } from './validation';

export const DEMO_MODE = location.pathname === '/demo' || location.pathname === '/demo/' || new URLSearchParams(location.search).get('demo') === '1';
const DB_NAME = DEMO_MODE ? 'move-confirmed-demo' : 'move-confirmed';
const DB_VERSION = 1;
const RECORDS = 'records';
const SETTINGS = 'settings';

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(RECORDS)) {
        const store = db.createObjectStore(RECORDS, { keyPath: 'id' });
        store.createIndex('createdAt', 'createdAt');
      }
      if (!db.objectStoreNames.contains(SETTINGS)) db.createObjectStore(SETTINGS);
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error('Could not open the local log.'));
  });
}

function requestResult<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error('Local storage operation failed.'));
  });
}

export async function getRecords(): Promise<ChangeRecord[]> {
  const db = await openDb();
  const records = await requestResult(db.transaction(RECORDS).objectStore(RECORDS).getAll()) as ChangeRecord[];
  db.close();
  return records.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export async function getRecord(id: string): Promise<ChangeRecord | undefined> {
  const db = await openDb();
  const record = await requestResult(db.transaction(RECORDS).objectStore(RECORDS).get(id)) as ChangeRecord | undefined;
  db.close();
  return record;
}

export async function saveRecord(record: ChangeRecord): Promise<void> {
  const db = await openDb();
  await requestResult(db.transaction(RECORDS, 'readwrite').objectStore(RECORDS).put(record));
  db.close();
}

export async function deleteRecord(id: string): Promise<void> {
  const db = await openDb();
  await requestResult(db.transaction(RECORDS, 'readwrite').objectStore(RECORDS).delete(id));
  db.close();
}

export async function replaceRecords(records: ChangeRecord[]): Promise<void> {
  // Keep this guard at the write boundary as well as the UI boundary. It makes
  // an accidental caller unable to clear a valid log with malformed data.
  if (!validBackupRecords(records)) throw new Error('Import contains invalid records.');
  const db = await openDb();
  const tx = db.transaction(RECORDS, 'readwrite');
  tx.objectStore(RECORDS).clear();
  for (const record of records) tx.objectStore(RECORDS).put(record);
  await new Promise<void>((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error ?? new Error('Import failed.'));
  });
  db.close();
}

export async function getSettings(): Promise<BusinessSettings> {
  const db = await openDb();
  const stored = await requestResult(db.transaction(SETTINGS).objectStore(SETTINGS).get('business')) as BusinessSettings | undefined;
  db.close();
  return stored ?? { businessName: '', replyPhone: '', replyEmail: '', messageTemplate: '' };
}

export async function saveSettings(settings: BusinessSettings): Promise<void> {
  const db = await openDb();
  await requestResult(db.transaction(SETTINGS, 'readwrite').objectStore(SETTINGS).put(settings, 'business'));
  db.close();
}

function sampleRecords(): ChangeRecord[] {
  const now = Date.now();
  const iso = (offset: number) => new Date(now + offset).toISOString();
  return [
    {
      id: 'demo-piano', token: 'demo-piano-receipt-token', type: 'rescheduled',
      title: 'Piano lesson', customerName: 'Maya', customerPhone: '+15551234567', customerEmail: '',
      oldStart: iso(86_400_000), newStart: iso(90_000_000), location: 'North Street studio',
      note: 'Use the side entrance. Your lesson length stays the same.', businessName: 'North Street Music',
      replyPhone: '+15557654321', createdAt: iso(-3_600_000), expiresAt: iso(172_800_000),
      notifications: [{ channel: 'sms', at: iso(-3_300_000) }], acknowledgement: { at: iso(-3_000_000), method: 'receipt' }
    },
    {
      id: 'demo-bike', token: 'demo-bike-receipt-token', type: 'rescheduled',
      title: 'Bike service pickup', customerName: 'Leo', customerPhone: '', customerEmail: 'leo@example.test',
      oldStart: iso(176_400_000), newStart: iso(180_000_000), location: 'Market Street workshop',
      businessName: 'City Wheel Repairs', replyEmail: 'owner@example.test', createdAt: iso(-7_200_000),
      expiresAt: iso(259_200_000), notifications: [{ channel: 'email', at: iso(-6_900_000) }]
    },
    {
      id: 'demo-groom', token: 'demo-groom-receipt-token', type: 'cancelled',
      title: 'Dog grooming', customerName: 'Ari', customerPhone: '+15559876543', customerEmail: '',
      oldStart: iso(345_600_000), businessName: 'Little Paw Grooming', replyPhone: '+15557654321',
      createdAt: iso(-10_800_000), expiresAt: iso(432_000_000), notifications: []
    }
  ];
}

export async function ensureDemoData(force = false): Promise<void> {
  if (!DEMO_MODE) return;
  const existing = await getRecords();
  if (existing.length && !force) return;
  await replaceRecords(sampleRecords());
  await saveSettings({
    businessName: 'North Street Music',
    replyPhone: '+15557654321',
    replyEmail: 'owner@example.test',
    messageTemplate: 'Hi {customer}, your {appointment} {change}. Please check the private card: {link}'
  });
}

export async function resetDemoData(): Promise<void> {
  if (!DEMO_MODE) return;
  await replaceRecords([]);
  await ensureDemoData(true);
}

export function discardDemoData(): Promise<void> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.deleteDatabase('move-confirmed-demo');
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error ?? new Error('Could not clear demo data.'));
    request.onblocked = () => reject(new Error('Close other demo tabs before leaving the demo.'));
  });
}
