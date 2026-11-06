const DATABASE_NAME = "pokelab-local-data";
const DATABASE_VERSION = 1;
const STORE_NAME = "api-cache";

export interface PersistentCacheEntry<T> {
  value: T;
  cachedAt: string;
}

let databasePromise: Promise<IDBDatabase | null> | null = null;

function openDatabase(): Promise<IDBDatabase | null> {
  if (typeof indexedDB === "undefined") return Promise.resolve(null);
  if (databasePromise) return databasePromise;

  let pending: Promise<IDBDatabase | null>;
  let failedSynchronously = false;
  pending = new Promise<IDBDatabase | null>((resolve) => {
    let request: IDBOpenDBRequest;

    try {
      request = indexedDB.open(DATABASE_NAME, DATABASE_VERSION);
    } catch {
      failedSynchronously = true;
      resolve(null);
      return;
    }

    request.onupgradeneeded = () => {
      const database = request.result;
      if (!database.objectStoreNames.contains(STORE_NAME)) {
        database.createObjectStore(STORE_NAME, { keyPath: "key" });
      }
    };

    request.onsuccess = () => {
      const database = request.result;
      database.onversionchange = () => {
        database.close();
        // A later operation must open a fresh connection after another tab upgrades the DB.
        if (databasePromise === pending) databasePromise = null;
      };
      resolve(database);
    };

    request.onerror = () => {
      // Do not permanently cache a failed open; later reads/writes may succeed.
      if (databasePromise === pending) databasePromise = null;
      resolve(null);
    };

    // Keep the request pending while another tab holds an older connection.
    // It will either succeed once that connection closes or fail with an error.
  });

  databasePromise = failedSynchronously ? null : pending;
  return pending;
}

export async function readPersistentCache<T>(
  key: string,
): Promise<PersistentCacheEntry<T> | null> {
  const database = await openDatabase();
  if (!database) return null;

  return new Promise((resolve) => {
    try {
      const transaction = database.transaction(STORE_NAME, "readonly");
      const request = transaction.objectStore(STORE_NAME).get(key);

      request.onsuccess = () => {
        const result = request.result as
          | { key: string; value: T; cachedAt: string }
          | undefined;

        resolve(
          result && typeof result.cachedAt === "string"
            ? { value: result.value, cachedAt: result.cachedAt }
            : null,
        );
      };

      request.onerror = () => resolve(null);
      transaction.onabort = () => resolve(null);
    } catch {
      resolve(null);
    }
  });
}

export async function writePersistentCache<T>(
  key: string,
  value: T,
): Promise<void> {
  const database = await openDatabase();
  if (!database) return;

  await new Promise<void>((resolve) => {
    try {
      const transaction = database.transaction(STORE_NAME, "readwrite");
      transaction.objectStore(STORE_NAME).put({
        key,
        value,
        cachedAt: new Date().toISOString(),
      });
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => resolve();
      transaction.onabort = () => resolve();
    } catch {
      resolve();
    }
  });
}
