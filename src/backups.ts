export type BackupSnapshot = {
  schemaVersion: number;
  createdAt: number;
  companies: unknown[];
  schedules: unknown[];
  resources: unknown[];
  interviews: unknown[];
  preparations: unknown[];
  selectionRecords: unknown[];
  settings: Record<string, unknown>;
};

const DB_NAME = "careerflow-backups";
const STORE = "backup-store";
const DB_VERSION = 1;

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => request.result.createObjectStore(STORE, { keyPath: "createdAt" });
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error("Backup database could not be opened"));
  });
}

export async function createBackup(snapshot: BackupSnapshot): Promise<void> {
  const db = await openDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE, "readwrite");
    tx.objectStore(STORE).put(snapshot);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error ?? new Error("Backup could not be written"));
  });
  const all = await listBackups();
  for (const old of all.slice(5)) await deleteBackup(old.createdAt);
}

export async function listBackups(): Promise<BackupSnapshot[]> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const request = db.transaction(STORE, "readonly").objectStore(STORE).getAll();
    request.onsuccess = () => resolve((request.result as BackupSnapshot[]).sort((a, b) => b.createdAt - a.createdAt));
    request.onerror = () => reject(request.error ?? new Error("Backups could not be read"));
  });
}

export async function getBackup(createdAt: number): Promise<BackupSnapshot | undefined> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const request = db.transaction(STORE, "readonly").objectStore(STORE).get(createdAt);
    request.onsuccess = () => resolve(request.result as BackupSnapshot | undefined);
    request.onerror = () => reject(request.error ?? new Error("Backup could not be read"));
  });
}

export async function deleteBackup(createdAt: number): Promise<void> {
  const db = await openDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE, "readwrite");
    tx.objectStore(STORE).delete(createdAt);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error ?? new Error("Backup could not be deleted"));
  });
}
