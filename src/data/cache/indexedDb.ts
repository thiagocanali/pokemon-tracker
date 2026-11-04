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

  databasePromise = new Promise((resolve) => {
    let request: IDBOpenDBRequest;

    try {
      request = indexedDB.open(DATABASE_NAME, DATABASE_VERSION);
    } catch {
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
      database.onversionchange = () => database.close();
      resolve(database);
    };

    request.onerror = () => resolve(null);
    request.onblocked = () => resolve(null);
  }).catch(() => null);

  return databasePromise;
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
