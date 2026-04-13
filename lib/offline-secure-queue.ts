type OfflineQueueKind = 'attendance_scan' | 'behavior_event';

export interface AttendanceScanPayload {
  student_lrn: string;
  scanned_at: string;
  temperature?: number;
}

export interface BehaviorEventPayload {
  student_lrn: string;
  category_id: number | null;
  event_type: string;
  severity: string;
  description: string;
  location: string | null;
  action_taken: string | null;
  follow_up_required: boolean;
  parent_notified: boolean;
  notes: string | null;
  proof_image_url?: string | null;
  event_date: string;
  event_time: string;
  reported_by: string;
}

interface QueuePayloadMap {
  attendance_scan: AttendanceScanPayload;
  behavior_event: BehaviorEventPayload;
}

interface StoredQueueItem {
  id?: number;
  kind: OfflineQueueKind;
  encryptedData: string;
  iv: string;
  createdAt: string;
  attempts: number;
  lastError?: string;
}

interface DecryptedQueueItem<T extends OfflineQueueKind> {
  id: number;
  kind: T;
  payload: QueuePayloadMap[T];
  createdAt: string;
  attempts: number;
}

const DB_NAME = 'safegate-offline-db';
const DB_VERSION = 1;
const QUEUE_STORE = 'secure_queue';
const META_STORE = 'secure_meta';
const KEY_ID = 'queue_aes_key';

function isBrowser(): boolean {
  return typeof window !== 'undefined' && typeof indexedDB !== 'undefined';
}

function toBase64(bytes: Uint8Array): string {
  let binary = '';
  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }
  return btoa(binary);
}

function fromBase64(base64: string): Uint8Array {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

function toArrayBuffer(bytes: Uint8Array): ArrayBuffer {
  return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;
}

async function openDb(): Promise<IDBDatabase> {
  if (!isBrowser()) {
    throw new Error('Offline queue is only available in the browser.');
  }

  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => reject(request.error);

    request.onupgradeneeded = () => {
      const db = request.result;

      if (!db.objectStoreNames.contains(QUEUE_STORE)) {
        db.createObjectStore(QUEUE_STORE, { keyPath: 'id', autoIncrement: true });
      }

      if (!db.objectStoreNames.contains(META_STORE)) {
        db.createObjectStore(META_STORE, { keyPath: 'id' });
      }
    };

    request.onsuccess = () => resolve(request.result);
  });
}

function transactionComplete(tx: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error);
  });
}

async function getOrCreateKey(db: IDBDatabase): Promise<CryptoKey> {
  if (!window.crypto?.subtle) {
    throw new Error('Web Crypto API is not available.');
  }

  const readTx = db.transaction(META_STORE, 'readonly');
  const readStore = readTx.objectStore(META_STORE);

  const existing = await new Promise<{ id: string; key: CryptoKey } | undefined>((resolve, reject) => {
    const req = readStore.get(KEY_ID);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });

  await transactionComplete(readTx);

  if (existing?.key) {
    return existing.key;
  }

  const key = await window.crypto.subtle.generateKey(
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );

  const writeTx = db.transaction(META_STORE, 'readwrite');
  const writeStore = writeTx.objectStore(META_STORE);
  writeStore.put({ id: KEY_ID, key });
  await transactionComplete(writeTx);

  return key;
}

async function encryptPayload(db: IDBDatabase, payload: unknown): Promise<{ encryptedData: string; iv: string }> {
  const key = await getOrCreateKey(db);
  const iv = window.crypto.getRandomValues(new Uint8Array(12));
  const encoded = new TextEncoder().encode(JSON.stringify(payload));

  const encryptedBuffer = await window.crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    encoded
  );

  return {
    encryptedData: toBase64(new Uint8Array(encryptedBuffer)),
    iv: toBase64(iv),
  };
}

async function decryptPayload<T>(db: IDBDatabase, encryptedData: string, iv: string): Promise<T> {
  const key = await getOrCreateKey(db);

  const decryptedBuffer = await window.crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: toArrayBuffer(fromBase64(iv)) },
    key,
    toArrayBuffer(fromBase64(encryptedData))
  );

  const json = new TextDecoder().decode(new Uint8Array(decryptedBuffer));
  return JSON.parse(json) as T;
}

async function withDb<T>(handler: (db: IDBDatabase) => Promise<T>): Promise<T> {
  const db = await openDb();
  try {
    return await handler(db);
  } finally {
    db.close();
  }
}

export async function queueOfflineItem<T extends OfflineQueueKind>(
  kind: T,
  payload: QueuePayloadMap[T]
): Promise<number> {
  return withDb(async (db) => {
    const encrypted = await encryptPayload(db, payload);

    const tx = db.transaction(QUEUE_STORE, 'readwrite');
    const store = tx.objectStore(QUEUE_STORE);

    const id = await new Promise<number>((resolve, reject) => {
      const req = store.add({
        kind,
        encryptedData: encrypted.encryptedData,
        iv: encrypted.iv,
        createdAt: new Date().toISOString(),
        attempts: 0,
      } as StoredQueueItem);

      req.onsuccess = () => resolve(Number(req.result));
      req.onerror = () => reject(req.error);
    });

    await transactionComplete(tx);
    return id;
  });
}

async function getAllStoredItems(db: IDBDatabase): Promise<StoredQueueItem[]> {
  const tx = db.transaction(QUEUE_STORE, 'readonly');
  const store = tx.objectStore(QUEUE_STORE);

  const items = await new Promise<StoredQueueItem[]>((resolve, reject) => {
    const req = store.getAll();
    req.onsuccess = () => resolve((req.result || []) as StoredQueueItem[]);
    req.onerror = () => reject(req.error);
  });

  await transactionComplete(tx);
  return items.sort((a, b) => (a.id || 0) - (b.id || 0));
}

async function deleteById(db: IDBDatabase, id: number): Promise<void> {
  const tx = db.transaction(QUEUE_STORE, 'readwrite');
  tx.objectStore(QUEUE_STORE).delete(id);
  await transactionComplete(tx);
}

async function incrementAttempt(db: IDBDatabase, item: StoredQueueItem, errorMessage: string): Promise<void> {
  const tx = db.transaction(QUEUE_STORE, 'readwrite');
  tx.objectStore(QUEUE_STORE).put({
    ...item,
    attempts: (item.attempts || 0) + 1,
    lastError: errorMessage,
  });
  await transactionComplete(tx);
}

export async function getOfflineQueueCount(): Promise<number> {
  return withDb(async (db) => {
    const tx = db.transaction(QUEUE_STORE, 'readonly');
    const store = tx.objectStore(QUEUE_STORE);

    const count = await new Promise<number>((resolve, reject) => {
      const req = store.count();
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });

    await transactionComplete(tx);
    return count;
  });
}

export async function flushOfflineQueue(handlers: {
  attendance_scan: (payload: AttendanceScanPayload) => Promise<void>;
  behavior_event: (payload: BehaviorEventPayload) => Promise<void>;
}): Promise<{ synced: number; failed: number; remaining: number }> {
  return withDb(async (db) => {
    const items = await getAllStoredItems(db);

    let synced = 0;
    let failed = 0;

    for (const item of items) {
      const id = item.id;
      if (!id) {
        failed += 1;
        continue;
      }

      try {
        if (item.kind === 'attendance_scan') {
          const payload = await decryptPayload<AttendanceScanPayload>(db, item.encryptedData, item.iv);
          await handlers.attendance_scan(payload);
          await deleteById(db, id);
          synced += 1;
          continue;
        }

        if (item.kind === 'behavior_event') {
          const payload = await decryptPayload<BehaviorEventPayload>(db, item.encryptedData, item.iv);
          await handlers.behavior_event(payload);
          await deleteById(db, id);
          synced += 1;
          continue;
        }

        failed += 1;
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown sync error';
        await incrementAttempt(db, item, errorMessage);
        failed += 1;
      }
    }

    const remaining = await getOfflineQueueCount();
    return { synced, failed, remaining };
  });
}

export async function requestBackgroundSync(tag = 'safegate-sync'): Promise<void> {
  if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) {
    return;
  }

  const registration = await navigator.serviceWorker.ready;
  if ('sync' in registration) {
    const syncRegistration = registration as ServiceWorkerRegistration & {
      sync: { register: (value: string) => Promise<void> };
    };
    await syncRegistration.sync.register(tag);
  }
}
