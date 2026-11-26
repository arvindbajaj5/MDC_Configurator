export interface StoredPptxTemplate {
  id: string;
  name: string;
  sizeBytes: number;
  base64Data: string;
  coverLayoutHint: string;
  contentLayoutHint: string;
  qaLayoutHint: string;
  updatedAt: string;
}

const DB_NAME = 'mdc_configurator_v13_templates_db';
const STORE_NAME = 'pptx_templates';
const ACTIVE_KEY = 'active_corporate_pptx_template';

function openTemplateDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      reject(new Error('IndexedDB unavailable'));
      return;
    }
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error || new Error('Failed to open IndexedDB'));
  });
}

export async function saveCorporatePptxTemplate(tpl: StoredPptxTemplate): Promise<void> {
  const db = await openTemplateDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    tx.objectStore(STORE_NAME).put(tpl, ACTIVE_KEY);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error || new Error('Failed saving template'));
  });
}

export async function loadCorporatePptxTemplate(): Promise<StoredPptxTemplate | null> {
  try {
    const db = await openTemplateDb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const req = tx.objectStore(STORE_NAME).get(ACTIVE_KEY);
      req.onsuccess = () => resolve((req.result as StoredPptxTemplate) || null);
      req.onerror = () => reject(req.error);
    });
  } catch {
    return null;
  }
}

export async function clearCorporatePptxTemplate(): Promise<void> {
  try {
    const db = await openTemplateDb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      tx.objectStore(STORE_NAME).delete(ACTIVE_KEY);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch {
    // Ignore
  }
}
