/**
 * Client-side image preview and thumbnail caching service.
 * Provides durable downscaled thumbnail generation (base64 Data URLs)
 * and binary blob storage via browser IndexedDB.
 */

const DB_NAME = 'exifsense_db';
const DB_VERSION = 1;
const STORE_NAME = 'image_previews';

/**
 * Generates a compact downscaled JPEG data URL from an image File or Blob
 * using an off-screen HTML canvas.
 * Safe to call in non-browser environments (falls back to empty string).
 */
export async function generateThumbnailDataUrl(
  fileOrBlob: Blob,
  maxDim = 180
): Promise<string> {
  if (
    typeof document === 'undefined' ||
    typeof document.createElement !== 'function' ||
    !fileOrBlob
  ) {
    return '';
  }

  return new Promise((resolve) => {
    let objectUrl = '';
    let isSettled = false;

    const cleanup = () => {
      if (objectUrl) {
        try {
          URL.revokeObjectURL(objectUrl);
        } catch {
          // Ignore revoke error
        }
        objectUrl = '';
      }
    };

    const settle = (val: string) => {
      if (!isSettled) {
        isSettled = true;
        clearTimeout(timer);
        cleanup();
        resolve(val);
      }
    };

    // Safety timeout in case onload/onerror never fire
    const timer = setTimeout(() => {
      settle('');
    }, 2000);

    try {
      if (typeof URL !== 'undefined' && typeof URL.createObjectURL === 'function') {
        objectUrl = URL.createObjectURL(fileOrBlob);
      }
    } catch {
      return settle('');
    }

    if (!objectUrl) {
      return settle('');
    }

    try {
      const img = new Image();
      img.onload = () => {
        try {
          let width = img.naturalWidth || img.width;
          let height = img.naturalHeight || img.height;

          if (!width || !height) {
            return settle('');
          }

          if (width > height) {
            if (width > maxDim) {
              height = Math.round((height * maxDim) / width);
              width = maxDim;
            }
          } else {
            if (height > maxDim) {
              width = Math.round((width * maxDim) / height);
              height = maxDim;
            }
          }

          const canvas = document.createElement('canvas');
          canvas.width = Math.max(1, width);
          canvas.height = Math.max(1, height);
          const ctx = canvas.getContext('2d');
          if (!ctx) {
            return settle('');
          }

          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
          const dataUrl = canvas.toDataURL('image/jpeg', 0.75);
          settle(dataUrl || '');
        } catch {
          settle('');
        }
      };

      img.onerror = () => {
        settle('');
      };

      img.src = objectUrl;
    } catch {
      settle('');
    }
  });
}

function openDb(): Promise<IDBDatabase | null> {
  if (
    typeof window === 'undefined' ||
    typeof window.indexedDB === 'undefined' ||
    window.indexedDB === null
  ) {
    return Promise.resolve(null);
  }

  return new Promise((resolve) => {
    try {
      const request = window.indexedDB.open(DB_NAME, DB_VERSION);

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME);
        }
      };

      request.onsuccess = () => {
        resolve(request.result);
      };

      request.onerror = () => {
        resolve(null);
      };
    } catch {
      resolve(null);
    }
  });
}

/**
 * Stores an image blob in browser IndexedDB keyed by hash or identifier.
 */
export async function saveImagePreview(key: string, blob: Blob): Promise<boolean> {
  if (!key || !blob) return false;

  try {
    const db = await openDb();
    if (!db) return false;

    return new Promise((resolve) => {
      try {
        const tx = db.transaction(STORE_NAME, 'readwrite');
        const store = tx.objectStore(STORE_NAME);
        store.put(blob, key);

        tx.oncomplete = () => {
          db.close();
          resolve(true);
        };

        tx.onerror = () => {
          db.close();
          resolve(false);
        };
      } catch {
        db.close();
        resolve(false);
      }
    });
  } catch {
    return false;
  }
}

/**
 * Retrieves a cached image blob from browser IndexedDB.
 */
export async function getImagePreview(key: string): Promise<Blob | null> {
  if (!key) return null;

  try {
    const db = await openDb();
    if (!db) return null;

    return new Promise((resolve) => {
      try {
        const tx = db.transaction(STORE_NAME, 'readonly');
        const store = tx.objectStore(STORE_NAME);
        const req = store.get(key);

        req.onsuccess = () => {
          db.close();
          const result = req.result;
          if (result instanceof Blob) {
            resolve(result);
          } else {
            resolve(null);
          }
        };

        req.onerror = () => {
          db.close();
          resolve(null);
        };
      } catch {
        db.close();
        resolve(null);
      }
    });
  } catch {
    return null;
  }
}

/**
 * Removes a specific preview entry from browser IndexedDB.
 */
export async function deleteImagePreview(key: string): Promise<boolean> {
  if (!key) return false;

  try {
    const db = await openDb();
    if (!db) return false;

    return new Promise((resolve) => {
      try {
        const tx = db.transaction(STORE_NAME, 'readwrite');
        const store = tx.objectStore(STORE_NAME);
        store.delete(key);

        tx.oncomplete = () => {
          db.close();
          resolve(true);
        };

        tx.onerror = () => {
          db.close();
          resolve(false);
        };
      } catch {
        db.close();
        resolve(false);
      }
    });
  } catch {
    return false;
  }
}

/**
 * Clears all cached preview images from browser IndexedDB.
 */
export async function clearImagePreviewCache(): Promise<boolean> {
  try {
    const db = await openDb();
    if (!db) return false;

    return new Promise((resolve) => {
      try {
        const tx = db.transaction(STORE_NAME, 'readwrite');
        const store = tx.objectStore(STORE_NAME);
        store.clear();

        tx.oncomplete = () => {
          db.close();
          resolve(true);
        };

        tx.onerror = () => {
          db.close();
          resolve(false);
        };
      } catch {
        db.close();
        resolve(false);
      }
    });
  } catch {
    return false;
  }
}
