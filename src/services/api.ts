import {
  User,
  FarmerProfile,
  GovernmentScheme,
  AgriculturalLoan,
  Application,
  UserDocument,
  NotificationItem,
  AuditLog,
  MandiPrice,
  NearbyService,
  WeatherData,
  EligibilityResult,
  FarmerRecommendationsResponse,
  SavedScheme,
  OfficialPortal,
  DocumentAccessTicket,
  DocumentSecurityAuditEntry
} from '../types';
import {
  isOfflineModeActive,
  getCachedSchemes,
  cacheSchemes,
  getCachedLoans,
  cacheLoans,
  getCachedApplications,
  saveApplicationOffline,
  getCachedDocuments,
  saveDocumentOffline,
  getCachedSavedSchemes,
  cacheSavedSchemes
} from './offlineStorage';
import {
  saveApplicationToCloud,
  getApplicationsFromCloud,
  updateApplicationStatusInCloud,
  saveFarmerProfileToCloud,
  getFarmerProfileFromCloud,
  saveSchemeBookmarkToCloud,
  removeSchemeBookmarkFromCloud,
  getSavedSchemesFromCloud,
  saveDocumentMetadataToCloud,
  checkFirestoreConnection,
  subscribeToCloudApplications
} from '../lib/firestoreService';

const TOKEN_KEY = 'krishi_auth_token';

export function getStoredToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function setStoredToken(token: string) {
  localStorage.setItem(TOKEN_KEY, token);
}

export function clearStoredToken() {
  localStorage.removeItem(TOKEN_KEY);
}

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  if (isOfflineModeActive() && !endpoint.includes('/api/auth/me')) {
    throw new Error('Offline mode active');
  }

  const token = getStoredToken();
  const headers = new Headers(options.headers || {});
  
  if (!headers.has('Content-Type') && !(options.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json');
  }
  
  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  try {
    const response = await fetch(endpoint, {
      ...options,
      headers
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || `Request failed with status ${response.status}`);
    }

    return await response.json();
  } catch (err: any) {
    if (isOfflineModeActive() || !navigator.onLine) {
      console.warn(`Device is offline or endpoint ${endpoint} failed. Using offline fallback if available.`);
    }
    throw err;
  }
}

export const api = {
  // Auth
  login: (data: {
    email?: string;
    password?: string;
    mobile?: string;
    role?: string;
    fullName?: string;
    state?: string;
    district?: string;
    village?: string;
    isGoogleAuth?: boolean;
    googleProfile?: { email: string; name: string };
  }) =>
    request<{ user: User; farmerProfile: FarmerProfile | null; token: string }>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify(data)
    }),

  register: (data: Partial<User>) =>
    request<{ user: User; farmerProfile: FarmerProfile | null; token: string }>('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify(data)
    }),

  getMe: () =>
    request<{ user: User; farmerProfile: FarmerProfile | null }>('/api/auth/me'),

  updateProfile: async (data: Partial<User> & { farmerProfile?: Partial<FarmerProfile> }) => {
    const res = await request<{ user: User; farmerProfile: FarmerProfile | null }>('/api/auth/profile', {
      method: 'PUT',
      body: JSON.stringify(data)
    });
    // Persist to Google Cloud Firestore in background
    if (res.user?.id && data.farmerProfile) {
      saveFarmerProfileToCloud(res.user.id, data.farmerProfile).catch(e => console.warn('Cloud profile sync deferred:', e));
    }
    return res;
  },

  // Schemes & Loans with Offline Fallback & Automatic Cache Refresh
  getSchemes: async (params?: { search?: string; category?: string; state?: string }): Promise<GovernmentScheme[]> => {
    if (isOfflineModeActive()) {
      const cached = getCachedSchemes();
      if (params?.category && params.category !== 'ALL') {
        return cached.filter(s => s.category === params.category);
      }
      return cached;
    }

    try {
      const query = new URLSearchParams();
      if (params?.search) query.set('search', params.search);
      if (params?.category) query.set('category', params.category);
      if (params?.state) query.set('state', params.state);
      const data = await request<GovernmentScheme[]>(`/api/schemes?${query.toString()}`);
      if (Array.isArray(data) && data.length > 0) {
        cacheSchemes(data);
      }
      return data;
    } catch {
      const cached = getCachedSchemes();
      return cached;
    }
  },

  getSchemeById: async (id: string): Promise<GovernmentScheme> => {
    if (isOfflineModeActive()) {
      const found = getCachedSchemes().find(s => s.id === id);
      if (found) return found;
    }
    try {
      return await request<GovernmentScheme>(`/api/schemes/${id}`);
    } catch {
      const found = getCachedSchemes().find(s => s.id === id);
      if (found) return found;
      throw new Error('Scheme not available offline.');
    }
  },

  saveScheme: (scheme: Partial<GovernmentScheme>) =>
    request<GovernmentScheme>('/api/schemes', {
      method: 'POST',
      body: JSON.stringify(scheme)
    }),

  // Farmer Bookmarks / Saved Schemes with Cloud Firestore Synchronization
  getSavedSchemes: async (): Promise<SavedScheme[]> => {
    if (isOfflineModeActive()) {
      return getCachedSavedSchemes();
    }
    try {
      const data = await request<SavedScheme[]>('/api/saved-schemes');
      if (Array.isArray(data)) {
        cacheSavedSchemes(data);
      }
      return data;
    } catch {
      // Fallback: Check Google Cloud Firestore directly
      try {
        const cloudSaved = await getSavedSchemesFromCloud('USER-FARMER-1');
        if (cloudSaved && cloudSaved.length > 0) {
          cacheSavedSchemes(cloudSaved);
          return cloudSaved;
        }
      } catch {
        // use local cache
      }
      return getCachedSavedSchemes();
    }
  },

  saveFarmerScheme: async (schemeId: string, notes?: string): Promise<SavedScheme> => {
    let saved: SavedScheme;
    try {
      saved = await request<SavedScheme>('/api/saved-schemes', {
        method: 'POST',
        body: JSON.stringify({ schemeId, notes })
      });
    } catch {
      // Create local saved structure
      saved = {
        id: `SAVED-${Date.now()}`,
        userId: 'USER-FARMER-1',
        schemeId,
        schemeName: schemeId,
        savedAt: new Date().toISOString(),
        notes
      };
    }
    const current = getCachedSavedSchemes();
    const updated = [saved, ...current.filter(s => s.schemeId !== schemeId)];
    cacheSavedSchemes(updated);
    // Real-time Cloud Firestore persistence
    saveSchemeBookmarkToCloud(saved).catch(err => console.warn('Cloud bookmark sync deferred:', err));
    return saved;
  },

  unsaveFarmerScheme: async (schemeId: string): Promise<{ success: boolean; schemeId: string }> => {
    let result = { success: true, schemeId };
    try {
      result = await request<{ success: boolean; schemeId: string }>(`/api/saved-schemes/${schemeId}`, {
        method: 'DELETE'
      });
    } catch {
      // offline delete
    }
    const current = getCachedSavedSchemes();
    const updated = current.filter(s => s.schemeId !== schemeId && s.id !== schemeId);
    cacheSavedSchemes(updated);
    // Remove from Google Cloud Firestore
    removeSchemeBookmarkFromCloud(schemeId).catch(err => console.warn('Cloud bookmark delete deferred:', err));
    return result;
  },

  getLoans: async (): Promise<AgriculturalLoan[]> => {
    if (isOfflineModeActive()) {
      return getCachedLoans();
    }
    try {
      const data = await request<AgriculturalLoan[]>('/api/loans');
      if (Array.isArray(data) && data.length > 0) {
        cacheLoans(data);
      }
      return data;
    } catch {
      return getCachedLoans();
    }
  },

  // Recommendation Engine
  getRecommendations: (params?: {
    state?: string;
    district?: string;
    landAreaAcres?: number;
    farmerCategory?: string;
    primaryCrops?: string[];
    annualIncome?: number;
    irrigationType?: string;
    farmingType?: string;
    hasKisanCreditCard?: boolean;
  }) => {
    const query = new URLSearchParams();
    if (params?.state) query.set('state', params.state);
    if (params?.district) query.set('district', params.district);
    if (params?.landAreaAcres !== undefined) query.set('landAreaAcres', String(params.landAreaAcres));
    if (params?.farmerCategory) query.set('farmerCategory', params.farmerCategory);
    if (params?.primaryCrops && params.primaryCrops.length > 0) query.set('primaryCrops', params.primaryCrops.join(','));
    if (params?.annualIncome !== undefined) query.set('annualIncome', String(params.annualIncome));
    if (params?.irrigationType) query.set('irrigationType', params.irrigationType);
    if (params?.farmingType) query.set('farmingType', params.farmingType);
    if (params?.hasKisanCreditCard !== undefined) query.set('hasKisanCreditCard', String(params.hasKisanCreditCard));
    return request<FarmerRecommendationsResponse>(`/api/recommendations?${query.toString()}`);
  },

  simulateRecommendations: (data: any) =>
    request<FarmerRecommendationsResponse>('/api/recommendations/simulate', {
      method: 'POST',
      body: JSON.stringify(data)
    }),

  // Eligibility Engine (Rule based, can run on server or offline fallback)
  checkEligibility: async (data: {
    state?: string;
    landAreaAcres?: number;
    farmerCategory?: string;
    annualIncome?: number;
    crops?: string[];
    hasWaterSource?: boolean;
    availableDocuments?: string[];
  }) => {
    if (isOfflineModeActive()) {
      const cachedSchemes = getCachedSchemes();
      const results: EligibilityResult[] = cachedSchemes.map(scheme => {
        const matchedCriteria: string[] = ['Evaluated via local offline eligibility engine'];
        const missingCriteria: string[] = [];
        const missingDocs = (scheme.requiredDocuments || []).filter(
          doc => !(data.availableDocuments || []).includes(doc)
        );
        return {
          schemeId: scheme.id,
          schemeName: scheme.name,
          department: scheme.department,
          isEligible: missingCriteria.length === 0,
          confidence: missingDocs.length === 0 ? 'POTENTIALLY_ELIGIBLE' : 'REQUIRES_MORE_INFO',
          matchedCriteria,
          missingCriteria,
          missingDocuments: missingDocs,
          potentialBenefit: scheme.subsidyAmountOrPercent,
          officialSourceUrl: scheme.officialSourceUrl,
          lastVerifiedDate: scheme.lastVerifiedDate
        };
      });

      return {
        timestamp: new Date().toISOString(),
        totalSchemesChecked: cachedSchemes.length,
        eligibleCount: results.filter(r => r.isEligible).length,
        results
      };
    }

    return request<{
      timestamp: string;
      totalSchemesChecked: number;
      eligibleCount: number;
      results: EligibilityResult[];
    }>('/api/eligibility/check', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  },

  // Document Vault (With Offline & Google Drive Support)
  getDocuments: async (userId?: string): Promise<UserDocument[]> => {
    if (isOfflineModeActive()) {
      return getCachedDocuments();
    }
    try {
      return await request<UserDocument[]>(userId ? `/api/documents?userId=${userId}` : '/api/documents');
    } catch {
      return getCachedDocuments();
    }
  },

  uploadDocument: async (docData: {
    documentType: string;
    fileName: string;
    fileSize?: number;
    mimeType?: string;
    fileData?: string;
    uploadSource?: string;
    driveFileId?: string;
    driveWebViewLink?: string;
  }): Promise<UserDocument> => {
    if (isOfflineModeActive()) {
      return saveDocumentOffline(docData);
    }
    try {
      return await request<UserDocument>('/api/documents/upload', {
        method: 'POST',
        body: JSON.stringify(docData)
      });
    } catch {
      return saveDocumentOffline(docData);
    }
  },

  deleteDocument: (id: string) =>
    request<{ success: boolean; message: string }>(`/api/documents/${id}`, {
      method: 'DELETE'
    }),

  verifyDocument: (id: string, status: string, remarks?: string) =>
    request<UserDocument>(`/api/documents/${id}/verify`, {
      method: 'PUT',
      body: JSON.stringify({ status, remarks })
    }),

  // Secure Document Access Ticket Generation (10-minute temporary link)
  getDocumentAccessTicket: (docId: string, action: 'VIEW' | 'DOWNLOAD' = 'VIEW', adminReason?: string) =>
    request<DocumentAccessTicket>(`/api/documents/${docId}/access-ticket`, {
      method: 'POST',
      body: JSON.stringify({ action, adminReason })
    }),

  // Farmer Privacy & Audit Log Feed
  getFarmerPrivacyActivity: () =>
    request<DocumentSecurityAuditEntry[]>('/api/farmer/privacy-activity'),

  // DPDP / GDPR Certified Data Export
  exportFarmerData: () =>
    request<any>('/api/farmer/export-data'),

  // Request Data / Account Erasure
  requestAccountErasure: () =>
    request<{ success: boolean; message: string }>('/api/farmer/request-erasure', {
      method: 'POST'
    }),

  // Applications (With Google Cloud Firestore Real-Time Sync & Offline Queuing)
  getApplications: async (userId?: string): Promise<Application[]> => {
    if (isOfflineModeActive()) {
      return getCachedApplications();
    }
    let combined: Application[] = [];
    try {
      const serverApps = await request<Application[]>('/api/applications');
      combined = [...serverApps];
    } catch {
      combined = getCachedApplications();
    }

    // Synchronize with Google Cloud Firestore
    try {
      const cloudApps = await getApplicationsFromCloud(userId);
      if (cloudApps && cloudApps.length > 0) {
        // Merge cloudApps with existing, preferring the latest updatedAt
        const map = new Map<string, Application>();
        combined.forEach(a => map.set(a.id, a));
        cloudApps.forEach(ca => {
          const existing = map.get(ca.id);
          if (!existing || new Date(ca.updatedAt || ca.submittedAt) >= new Date(existing.updatedAt || existing.submittedAt)) {
            map.set(ca.id, ca);
          }
        });
        combined = Array.from(map.values());
      }
    } catch (err) {
      console.warn('Google Cloud Firestore applications sync deferred:', err);
    }

    const offlineApps = getCachedApplications().filter(a => a.id.startsWith('OFFLINE-'));
    return [...offlineApps, ...combined.filter(c => !c.id.startsWith('OFFLINE-'))];
  },

  getApplicationById: (id: string) =>
    request<Application>(`/api/applications/${id}`),

  createApplication: async (data: {
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
  }): Promise<Application> => {
    let newApp: Application;
    if (isOfflineModeActive()) {
      newApp = saveApplicationOffline(data);
      // Attempt background cloud write if internet becomes momentarily reachable
      saveApplicationToCloud(newApp).catch(e => console.warn('Cloud sync queued:', e));
      return newApp;
    }

    try {
      newApp = await request<Application>('/api/applications', {
        method: 'POST',
        body: JSON.stringify(data)
      });
    } catch {
      newApp = saveApplicationOffline(data);
    }

    // Immediate Real-Time persistence to Google Cloud Firestore
    saveApplicationToCloud(newApp).catch(err => console.warn('Direct Cloud Firestore sync deferred:', err));
    return newApp;
  },

  updateApplicationStatus: async (id: string, data: {
    status: string;
    remarks: string;
    requestedDocuments?: string[];
    officerName?: string;
    officerRole?: string;
  }) => {
    let result: Application;
    try {
      result = await request<Application>(`/api/applications/${id}/status`, {
        method: 'PUT',
        body: JSON.stringify(data)
      });
    } catch {
      // Offline update
      const apps = getCachedApplications();
      const target = apps.find(a => a.id === id);
      if (target) {
        target.status = data.status as any;
        target.updatedAt = new Date().toISOString();
        result = target;
      } else {
        throw new Error('Application not found');
      }
    }

    // Immediate status propagation to Google Cloud Firestore
    updateApplicationStatusInCloud(id, data.status, data.remarks, data.officerName, data.officerRole)
      .catch(err => console.warn('Cloud status sync deferred:', err));

    return result;
  },

  // Google Cloud Firestore Health & Real-time Subscriptions
  getCloudDatabaseStatus: () => checkFirestoreConnection(),
  subscribeToCloudApplications: (callback: (apps: Application[]) => void, userId?: string) =>
    subscribeToCloudApplications(callback, userId),

  // Notifications
  getNotifications: () =>
    request<NotificationItem[]>('/api/notifications'),

  markNotificationRead: (id: string) =>
    request<{ success: boolean }>(`/api/notifications/${id}/read`, {
      method: 'PUT'
    }),

  markAllNotificationsRead: () =>
    request<{ success: boolean }>('/api/notifications/read-all', {
      method: 'PUT'
    }),

  // Mandi & Weather
  getMandiPrices: () =>
    request<MandiPrice[]>('/api/mandi'),

  getWeather: (district: string) =>
    request<WeatherData>(`/api/weather/${district}`),

  getNearbyServices: () =>
    request<NearbyService[]>('/api/nearby'),

  // Audit Logs & System Stats
  getAuditLogs: () =>
    request<AuditLog[]>('/api/audit-logs'),

  getSystemStats: () =>
    request<{
      totalSchemes: number;
      totalLoans: number;
      totalApplications: number;
      approvedApplications: number;
      underReviewApplications: number;
      totalSubsidyDisbursedRupees: number;
      registeredUsersCount: number;
    }>('/api/system/stats'),

  // AI Assistant
  askKrishiSahayak: (message: string, language: string = 'en', context?: any) =>
    request<{ reply: string; source: string; model?: string }>('/api/ai/chat', {
      method: 'POST',
      body: JSON.stringify({ message, language, context })
    }),

  // Official Government Farmer Portals
  getPortals: async (params?: { category?: string; search?: string }): Promise<OfficialPortal[]> => {
    try {
      const query = new URLSearchParams();
      if (params?.category && params.category !== 'ALL') query.set('category', params.category);
      if (params?.search) query.set('search', params.search);
      return await request<OfficialPortal[]>(`/api/portals?${query.toString()}`);
    } catch {
      return [];
    }
  },

  getPortalById: (id: string) =>
    request<OfficialPortal>(`/api/portals/${id}`),

  savePortal: (portal: Partial<OfficialPortal>) =>
    request<OfficialPortal>('/api/portals', {
      method: 'POST',
      body: JSON.stringify(portal)
    }),

  updatePortal: (id: string, portal: Partial<OfficialPortal>) =>
    request<OfficialPortal>(`/api/portals/${id}`, {
      method: 'PUT',
      body: JSON.stringify(portal)
    }),

  deletePortal: (id: string) =>
    request<{ success: boolean; message: string }>(`/api/portals/${id}`, {
      method: 'DELETE'
    })
};
