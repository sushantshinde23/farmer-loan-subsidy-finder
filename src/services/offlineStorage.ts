import { GovernmentScheme, AgriculturalLoan, Application, UserDocument, SavedScheme } from '../types';
import {
  saveApplicationToCloud,
  saveDocumentMetadataToCloud,
  saveFarmerProfileToCloud
} from '../lib/firestoreService';

const SCHEMES_CACHE_KEY = 'krishi_offline_schemes_v1';
const LOANS_CACHE_KEY = 'krishi_offline_loans_v1';
const APPLICATIONS_CACHE_KEY = 'krishi_offline_applications_v1';
const DOCUMENTS_CACHE_KEY = 'krishi_offline_documents_v1';
const SAVED_SCHEMES_CACHE_KEY = 'krishi_offline_saved_schemes_v1';
const SYNC_QUEUE_KEY = 'krishi_offline_sync_queue_v1';
const SIMULATED_OFFLINE_KEY = 'krishi_simulated_offline';

export interface SyncQueueItem {
  id: string;
  type: 'APPLICATION' | 'DOCUMENT' | 'PROFILE';
  payload: any;
  createdAt: string;
  status: 'PENDING' | 'SYNCED' | 'FAILED';
  error?: string;
  firebaseDocId?: string;
  syncedAt?: string;
}

// Check if simulated offline or navigator offline
export const isOfflineModeActive = (): boolean => {
  if (typeof window === 'undefined') return false;
  const isSimulated = localStorage.getItem(SIMULATED_OFFLINE_KEY) === 'true';
  return isSimulated || !navigator.onLine;
};

export const setSimulatedOffline = (enabled: boolean) => {
  localStorage.setItem(SIMULATED_OFFLINE_KEY, enabled ? 'true' : 'false');
  window.dispatchEvent(new Event('offline-mode-change'));
};

export const getSimulatedOffline = (): boolean => {
  if (typeof window === 'undefined') return false;
  return localStorage.getItem(SIMULATED_OFFLINE_KEY) === 'true';
};

// Cache schemes
export const cacheSchemes = (schemes: GovernmentScheme[]) => {
  try {
    localStorage.setItem(SCHEMES_CACHE_KEY, JSON.stringify(schemes));
    localStorage.setItem(`${SCHEMES_CACHE_KEY}_time`, new Date().toISOString());
  } catch (err) {
    console.warn('Failed to cache schemes offline:', err);
  }
};

export const getCachedSchemes = (): GovernmentScheme[] => {
  try {
    const raw = localStorage.getItem(SCHEMES_CACHE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
};

// Cache loans
export const cacheLoans = (loans: AgriculturalLoan[]) => {
  try {
    localStorage.setItem(LOANS_CACHE_KEY, JSON.stringify(loans));
  } catch (err) {
    console.warn('Failed to cache loans offline:', err);
  }
};

export const getCachedLoans = (): AgriculturalLoan[] => {
  try {
    const raw = localStorage.getItem(LOANS_CACHE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
};

// Cache saved schemes
export const cacheSavedSchemes = (saved: SavedScheme[]) => {
  try {
    localStorage.setItem(SAVED_SCHEMES_CACHE_KEY, JSON.stringify(saved));
  } catch (err) {
    console.warn('Failed to cache saved schemes offline:', err);
  }
};

export const getCachedSavedSchemes = (): SavedScheme[] => {
  try {
    const raw = localStorage.getItem(SAVED_SCHEMES_CACHE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
};

// Applications offline storage & sync queue
export const getCachedApplications = (): Application[] => {
  try {
    const raw = localStorage.getItem(APPLICATIONS_CACHE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
};

export const saveApplicationOffline = (appData: {
  schemeId: string;
  schemeName: string;
  schemeType?: string;
  attachedDocumentIds?: string[];
  subsidyClaimAmount?: number;
  priority?: string;
  farmerName?: string;
  farmerMobile?: string;
  farmerDistrict?: string;
  farmerState?: string;
}): Application => {
  const offlineId = `OFFLINE-APP-${Date.now()}`;
  const now = new Date().toISOString();

  const newApp: Application = {
    id: offlineId,
    userId: 'USER-FARMER-OFFLINE',
    farmerName: appData.farmerName || 'Kisan User (Offline)',
    farmerMobile: appData.farmerMobile || '9876543210',
    farmerDistrict: appData.farmerDistrict || 'Pune',
    farmerState: appData.farmerState || 'Maharashtra',
    schemeId: appData.schemeId,
    schemeName: appData.schemeName,
    schemeType: (appData.schemeType as any) || 'SCHEME',
    submittedAt: now,
    updatedAt: now,
    status: 'SUBMITTED',
    priority: (appData.priority as any) || 'NORMAL',
    attachedDocumentIds: appData.attachedDocumentIds || [],
    timeline: [
      {
        id: `t-${Date.now()}`,
        status: 'SUBMITTED',
        action: 'Application created offline (Queued for Cloud SQL synchronization upon network recovery)',
        timestamp: now,
      }
    ],
    subsidyClaimAmount: appData.subsidyClaimAmount || 50000,
  };

  // Append to cached applications
  const existingApps = getCachedApplications();
  existingApps.unshift(newApp);
  localStorage.setItem(APPLICATIONS_CACHE_KEY, JSON.stringify(existingApps));

  // Add to sync queue
  const queue = getSyncQueue();
  queue.push({
    id: `SYNC-${Date.now()}`,
    type: 'APPLICATION',
    payload: newApp,
    createdAt: now,
    status: 'PENDING'
  });
  localStorage.setItem(SYNC_QUEUE_KEY, JSON.stringify(queue));

  return newApp;
};

// Documents offline storage
export const getCachedDocuments = (): UserDocument[] => {
  try {
    const raw = localStorage.getItem(DOCUMENTS_CACHE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
};

export const saveDocumentOffline = (docData: {
  documentType: string;
  fileName: string;
  fileSize?: number;
  mimeType?: string;
  fileData?: string;
  uploadSource?: string;
}): UserDocument => {
  const offlineId = `OFFLINE-DOC-${Date.now()}`;
  const now = new Date().toISOString();

  const newDoc: UserDocument = {
    id: offlineId,
    userId: 'USER-FARMER-OFFLINE',
    documentType: docData.documentType as any,
    fileName: docData.fileName,
    fileSize: docData.fileSize || 256000,
    mimeType: docData.mimeType || 'application/pdf',
    fileData: docData.fileData,
    uploadSource: (docData.uploadSource as any) || 'DEVICE',
    uploadedAt: now,
    updatedAt: now,
    status: 'UPLOADED'
  };

  const existingDocs = getCachedDocuments();
  existingDocs.unshift(newDoc);
  localStorage.setItem(DOCUMENTS_CACHE_KEY, JSON.stringify(existingDocs));

  // Add document to sync queue
  const queue = getSyncQueue();
  queue.push({
    id: `SYNC-${Date.now()}`,
    type: 'DOCUMENT',
    payload: newDoc,
    createdAt: now,
    status: 'PENDING'
  });
  localStorage.setItem(SYNC_QUEUE_KEY, JSON.stringify(queue));

  return newDoc;
};

// Sync Queue Management
export const getSyncQueue = (): SyncQueueItem[] => {
  try {
    const raw = localStorage.getItem(SYNC_QUEUE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
};

export const clearSyncedQueue = () => {
  const pendingOnly = getSyncQueue().filter(item => item.status === 'PENDING');
  localStorage.setItem(SYNC_QUEUE_KEY, JSON.stringify(pendingOnly));
};

export interface SyncProgressUpdate {
  synced: number;
  total: number;
  currentItemName: string;
}

export interface SyncResult {
  synced: number;
  failed: number;
  total: number;
  details: string[];
}

/**
 * Background process to push cached form submissions directly to Firebase Firestore
 * and update backend portal states once network connection is active.
 */
export const syncCachedSubmissionsToFirebase = async (
  onProgress?: (update: SyncProgressUpdate) => void,
  onItemSynced?: (item: SyncQueueItem) => void
): Promise<SyncResult> => {
  if (isOfflineModeActive()) {
    return { synced: 0, failed: 0, total: 0, details: [] };
  }

  const queue = getSyncQueue();
  const pending = queue.filter(item => item.status === 'PENDING');
  if (pending.length === 0) {
    return { synced: 0, failed: 0, total: 0, details: [] };
  }

  let synced = 0;
  let failed = 0;
  const details: string[] = [];
  const total = pending.length;

  for (let i = 0; i < pending.length; i++) {
    const item = pending[i];
    try {
      if (item.type === 'APPLICATION') {
        const appPayload = item.payload as Application;
        const appName = appPayload.schemeName || appPayload.id;

        if (onProgress) {
          onProgress({
            synced: i + 1,
            total,
            currentItemName: `Application: ${appName}`
          });
        }

        // 1. Push to Firebase Cloud Firestore directly
        await saveApplicationToCloud(appPayload);

        // 2. Mirror to backend API
        try {
          await fetch('/api/applications', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(appPayload)
          });
        } catch (apiErr) {
          console.warn('[Sync] Backend API mirror notice:', apiErr);
        }

        item.status = 'SYNCED';
        item.syncedAt = new Date().toISOString();
        synced++;
        details.push(`Application: ${appName}`);
        if (onItemSynced) onItemSynced(item);
      } else if (item.type === 'DOCUMENT') {
        const docPayload = item.payload as UserDocument;
        const docName = docPayload.fileName || docPayload.id;

        if (onProgress) {
          onProgress({
            synced: i + 1,
            total,
            currentItemName: `Document: ${docName}`
          });
        }

        // 1. Push document metadata to Firebase Cloud Firestore
        await saveDocumentMetadataToCloud(docPayload);

        // 2. Mirror to backend API
        try {
          await fetch('/api/documents/upload', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(docPayload)
          });
        } catch (apiErr) {
          console.warn('[Sync] Backend doc mirror notice:', apiErr);
        }

        item.status = 'SYNCED';
        item.syncedAt = new Date().toISOString();
        synced++;
        details.push(`Document: ${docName}`);
        if (onItemSynced) onItemSynced(item);
      }
    } catch (err: any) {
      console.error(`[Firebase Sync] Failed to sync item ${item.id}:`, err);
      item.status = 'FAILED';
      item.error = err?.message || 'Sync failed';
      failed++;
    }
  }

  // Persist updated statuses in localStorage
  localStorage.setItem(SYNC_QUEUE_KEY, JSON.stringify(queue));

  // Dispatch global event for application components to refresh data immediately
  if (typeof window !== 'undefined') {
    window.dispatchEvent(
      new CustomEvent('offline-sync-completed', {
        detail: { synced, failed, total, details, timestamp: new Date().toISOString() }
      })
    );
  }

  return { synced, failed, total, details };
};

// Alias for compatibility
export const syncOfflineData = syncCachedSubmissionsToFirebase;

