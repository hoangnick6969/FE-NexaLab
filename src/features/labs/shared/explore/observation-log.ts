const store = "logs";
export const OBSERVATION_LOG_LIMIT = 500;

export function observationLogKey(labId: string, version: string | number) {
  return `${labId}@${version}`;
}

export function buildObservationLogExport<Metadata extends object, Entry>(metadata: Metadata, entries: readonly Entry[]) {
  return { ...metadata, exportedAt: new Date().toISOString(), scored: false as const, entries };
}

/** Each bench owns its row shape and can keep its existing IndexedDB name. */
export function createObservationLogStore<Entry>(databaseName: string) {
  function openDb(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(databaseName, 1);
      request.onupgradeneeded = () => { request.result.createObjectStore(store, { keyPath: "key" }); };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  return {
    async load(key: string): Promise<Entry[]> {
      try {
        const db = await openDb();
        try {
          const record = await new Promise<{ entries?: Entry[] } | undefined>((resolve, reject) => {
            const request = db.transaction(store, "readonly").objectStore(store).get(key);
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
          });
          return Array.isArray(record?.entries) ? record.entries.slice(-OBSERVATION_LOG_LIMIT) : [];
        } finally { db.close(); }
      } catch { return []; }
    },

    async save(key: string, entries: readonly Entry[]) {
      try {
        const db = await openDb();
        try {
          await new Promise<void>((resolve, reject) => {
            const transaction = db.transaction(store, "readwrite");
            transaction.oncomplete = () => resolve();
            transaction.onabort = () => reject(transaction.error);
            transaction.objectStore(store).put({ key, entries: entries.slice(-OBSERVATION_LOG_LIMIT), updatedAt: Date.now() });
          });
        } finally { db.close(); }
      } catch { /* The bench still has its in-memory log. */ }
    },
  };
}
