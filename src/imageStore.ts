const DB_NAME = 'yinian-images';
const STORE_NAME = 'images';
const DB_VERSION = 1;

interface StoredImage {
  name: string;
  type: string;
  data: ArrayBuffer;
}

export async function saveImage(file: File): Promise<string> {
  const db = await openDb();
  const id = `image_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  const storedImage: StoredImage = { name: file.name, type: file.type, data: await file.arrayBuffer() };
  await runTransaction(db, 'readwrite', (store) => store.put(storedImage, id));
  db.close();
  return id;
}

export async function getImage(id: string): Promise<File | undefined> {
  const db = await openDb();
  const result = await runTransaction<StoredImage | undefined>(db, 'readonly', (store) => store.get(id));
  db.close();
  return result ? new File([result.data], result.name, { type: result.type }) : undefined;
}

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

function runTransaction<T>(
  db: IDBDatabase,
  mode: IDBTransactionMode,
  action: (store: IDBObjectStore) => IDBRequest<T>,
): Promise<T> {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, mode);
    const request = action(transaction.objectStore(STORE_NAME));

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
    transaction.onerror = () => reject(transaction.error);
  });
}
