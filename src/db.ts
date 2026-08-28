import type { BusinessSettings, ChangeRecord } from './types';
import { validBackupRecords } from './validation';

const DB_NAME = 'move-confirmed';
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
