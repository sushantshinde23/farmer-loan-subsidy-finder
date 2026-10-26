import { initializeApp, getApps, getApp } from 'firebase/app';
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  updateProfile as updateFirebaseProfile,
  Auth
} from 'firebase/auth';
import {
  getFirestore,
  doc,
  setDoc,
  getDoc,
  getDocs,
  collection,
  query,
  where,
  onSnapshot,
  deleteDoc,
  serverTimestamp,
  Firestore
} from 'firebase/firestore';
import {
  getStorage,
  ref as storageRef,
  uploadBytes,
  getDownloadURL,
  deleteObject,
  FirebaseStorage
} from 'firebase/storage';
import firebaseConfig from '../../firebase-applet-config.json';
import { Application, FarmerProfile, SavedScheme, UserDocument, User } from '../types';

// Initialize Firebase App
const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);

const firestoreDatabaseId: string = (firebaseConfig as any).firestoreDatabaseId || '(default)';

// Initialize Cloud Firestore, Auth & Storage
export const firestore: Firestore = getFirestore(app, firestoreDatabaseId);
export const auth: Auth = getAuth(app);
export const storage: FirebaseStorage = getStorage(app, (firebaseConfig as any).storageBucket);
export const googleProvider = new GoogleAuthProvider();

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

export function formatFirestoreErrorInfo(
  error: unknown,
  operationType: OperationType,
  path: string | null
): FirestoreErrorInfo {
  return {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo:
        auth.currentUser?.providerData?.map((provider) => ({
          providerId: provider.providerId,
          email: provider.email
        })) || []
    },
    operationType,
    path
  };
}

/**
 * Attempt Google Popup sign-in with Firebase Auth
 */
export async function authenticateWithFirebaseGooglePopup(): Promise<{
  uid: string;
  email: string | null;
  displayName: string | null;
} | null> {
  try {
    const cred = await signInWithPopup(auth, googleProvider);
    return {
      uid: cred.user.uid,
      email: cred.user.email,
      displayName: cred.user.displayName
    };
  } catch (err) {
    console.warn('Firebase Google Popup error:', err);
    return null;
  }
}

/**
 * Sign in or create Firebase Auth user with email & password to guarantee auth.currentUser has a valid UID
 */
export async function ensureFirebaseAuthWithEmail(
  email: string,
  password?: string,
  displayName?: string
): Promise<{ uid: string; email: string | null } | null> {
  try {
    if (!email) return null;
    const cleanEmail = email.trim().toLowerCase();
    // Use user-provided password or a robust deterministic fallback for session consistency
    const cleanPassword = password && password.length >= 6 ? password : `Krishi#${cleanEmail.replace(/[^a-z0-9]/g, '')}2026!`;

    try {
      const userCred = await signInWithEmailAndPassword(auth, cleanEmail, cleanPassword);
      return { uid: userCred.user.uid, email: userCred.user.email };
    } catch (signInErr: any) {
      if (
        signInErr.code === 'auth/user-not-found' ||
        signInErr.code === 'auth/invalid-credential' ||
        signInErr.code === 'auth/wrong-password'
      ) {
        // Try creating user in Firebase Auth
        try {
          const createCred = await createUserWithEmailAndPassword(auth, cleanEmail, cleanPassword);
          if (displayName && createCred.user) {
            await updateFirebaseProfile(createCred.user, { displayName }).catch(() => {});
          }
          return { uid: createCred.user.uid, email: createCred.user.email };
        } catch (createErr: any) {
          if (createErr.code === 'auth/email-already-in-use') {
            // Already created; return current user if available
            return auth.currentUser ? { uid: auth.currentUser.uid, email: auth.currentUser.email } : null;
          }
          console.warn('Firebase Auth user creation note:', createErr?.message);
        }
      }
    }
    return auth.currentUser ? { uid: auth.currentUser.uid, email: auth.currentUser.email } : null;
  } catch (e) {
    console.warn('ensureFirebaseAuthWithEmail note:', e);
    return null;
  }
}

export interface FirestoreStatus {
  connected: boolean;
  databaseId: string;
  projectId: string;
  totalSyncedApplications?: number;
  lastSyncTime?: string;
  error?: string;
}

/**
 * Checks connectivity to the Google Cloud Firestore database.
 */
export async function checkFirestoreConnection(): Promise<FirestoreStatus> {
  try {
    const healthRef = doc(firestore, 'test', 'health-check');
    await setDoc(healthRef, {
      status: 'HEALTHY',
      databaseId: firestoreDatabaseId,
      projectId: firebaseConfig.projectId,
      timestamp: new Date().toISOString()
    });

    let syncedCount = 0;
    if (auth.currentUser) {
      const appsSnap = await getDocs(collection(firestore, 'applications'));
      syncedCount = appsSnap.size;
    }

    return {
      connected: true,
      databaseId: firestoreDatabaseId,
      projectId: firebaseConfig.projectId,
      totalSyncedApplications: syncedCount,
      lastSyncTime: new Date().toLocaleTimeString('en-IN')
    };
  } catch (err: any) {
    return {
      connected: false,
      databaseId: firestoreDatabaseId,
      projectId: firebaseConfig.projectId,
      error: err?.message || 'Connecting to Google Cloud...'
    };
  }
}

/* =========================================================================
   1. USER PROFILE: "users/{uid}"
   Never overwrite existing profiles with empty default values on login
========================================================================= */

export async function saveUserToFirestore(userData: Partial<User>, uid?: string): Promise<void> {
  const targetUid = uid || auth.currentUser?.uid || userData.id;
  if (!targetUid) return;

  try {
    const userRef = doc(firestore, 'users', targetUid);
    const existingSnap = await getDoc(userRef);
    const existing = existingSnap.exists() ? (existingSnap.data() as Partial<User>) : null;

    // Filter out undefined, null or empty strings so existing data is never wiped
    const cleanData: Record<string, any> = {};
    Object.entries(userData).forEach(([key, val]) => {
      if (val !== undefined && val !== null && val !== '') {
        cleanData[key] = val;
      }
    });

    const payload: Record<string, any> = {
      ...(existing || {}),
      ...cleanData,
      uid: targetUid,
      id: targetUid,
      updatedAt: serverTimestamp(),
      lastSeenAt: new Date().toISOString()
    };

    if (!existing) {
      payload.createdAt = serverTimestamp();
    }

    await setDoc(userRef, payload, { merge: true });
  } catch (err) {
    console.error(
      'Firestore Error: ',
      JSON.stringify(formatFirestoreErrorInfo(err, OperationType.WRITE, `users/${targetUid}`))
    );
  }
}

export async function getUserFromFirestore(uid?: string): Promise<User | null> {
  const targetUid = uid || auth.currentUser?.uid;
  if (!targetUid) return null;

  try {
    const userRef = doc(firestore, 'users', targetUid);
    const snap = await getDoc(userRef);
    if (snap.exists()) {
      return snap.data() as User;
    }
    return null;
  } catch (err) {
    console.error(
      'Firestore Error: ',
      JSON.stringify(formatFirestoreErrorInfo(err, OperationType.GET, `users/${targetUid}`))
    );
    return null;
  }
}

/* =========================================================================
   2. FARMER PROFILE: "users/{uid}/farmerProfile/details" & "farmerProfiles/{userId}"
========================================================================= */

export async function saveFarmerProfileToCloud(
  userId: string,
  profile: Partial<FarmerProfile>
): Promise<void> {
  const targetUid = auth.currentUser?.uid || userId;
  if (!targetUid) return;

  try {
    // 1. Save in "users/{uid}/farmerProfile/details"
    const subRef = doc(firestore, 'users', targetUid, 'farmerProfile', 'details');
    const existingSub = await getDoc(subRef);
    const existingSubData = existingSub.exists() ? existingSub.data() : {};

    const cleanProfile: Record<string, any> = {};
    Object.entries(profile).forEach(([k, v]) => {
      if (v !== undefined && v !== null) {
        cleanProfile[k] = v;
      }
    });

    const subPayload = {
      ...existingSubData,
      ...cleanProfile,
      userId: targetUid,
      updatedAt: serverTimestamp(),
      cloudSyncedAt: new Date().toISOString()
    };
    await setDoc(subRef, subPayload, { merge: true });

    // 2. Also save in root "farmerProfiles/{userId}" for dashboard compatibility
    const rootRef = doc(firestore, 'farmerProfiles', targetUid);
    await setDoc(rootRef, subPayload, { merge: true });
  } catch (err) {
    console.error(
      'Firestore Error: ',
      JSON.stringify(formatFirestoreErrorInfo(err, OperationType.WRITE, `users/${targetUid}/farmerProfile/details`))
    );
  }
}

export async function getFarmerProfileFromCloud(userId: string): Promise<FarmerProfile | null> {
  const targetUid = auth.currentUser?.uid || userId;
  if (!targetUid) return null;

  try {
    // Check "users/{uid}/farmerProfile/details" first
    const subRef = doc(firestore, 'users', targetUid, 'farmerProfile', 'details');
    const subSnap = await getDoc(subRef);
    if (subSnap.exists()) {
      return subSnap.data() as FarmerProfile;
    }

    // Fallback: check root "farmerProfiles/{userId}"
    const rootRef = doc(firestore, 'farmerProfiles', targetUid);
    const rootSnap = await getDoc(rootRef);
    if (rootSnap.exists()) {
      return rootSnap.data() as FarmerProfile;
    }
    return null;
  } catch (err) {
    console.error(
      'Firestore Error: ',
      JSON.stringify(formatFirestoreErrorInfo(err, OperationType.GET, `users/${targetUid}/farmerProfile/details`))
    );
    return null;
  }
}

/* =========================================================================
   3. SAVED SCHEMES / BOOKMARKS: "users/{uid}/savedSchemes/{schemeId}" & "savedSchemes/{id}"
========================================================================= */

export async function saveSchemeBookmarkToCloud(savedRecord: SavedScheme): Promise<void> {
  const targetUid = auth.currentUser?.uid || savedRecord.userId;
  if (!targetUid) return;

  const schemeId = savedRecord.schemeId || savedRecord.id;
  try {
    const payload = {
      ...savedRecord,
      userId: targetUid,
      schemeId,
      updatedAt: serverTimestamp(),
      savedAt: savedRecord.savedAt || new Date().toISOString(),
      cloudSyncedAt: new Date().toISOString()
    };

    // Save in user subcollection "users/{uid}/savedSchemes/{schemeId}"
    const subRef = doc(firestore, 'users', targetUid, 'savedSchemes', schemeId);
    await setDoc(subRef, payload, { merge: true });

    // Save in root "savedSchemes/{savedRecord.id}"
    const rootRef = doc(firestore, 'savedSchemes', savedRecord.id);
    await setDoc(rootRef, payload, { merge: true });
  } catch (err) {
    console.error(
      'Firestore Error: ',
      JSON.stringify(formatFirestoreErrorInfo(err, OperationType.WRITE, `users/${targetUid}/savedSchemes/${schemeId}`))
    );
  }
}

export async function removeSchemeBookmarkFromCloud(savedIdOrSchemeId: string): Promise<void> {
  const targetUid = auth.currentUser?.uid;
  if (!targetUid) return;

  try {
    // 1. Delete from subcollection
    const subRef = doc(firestore, 'users', targetUid, 'savedSchemes', savedIdOrSchemeId);
    await deleteDoc(subRef).catch(() => {});

    // 2. Delete matching doc in root collection
    const rootRef = doc(firestore, 'savedSchemes', savedIdOrSchemeId);
    const snap = await getDoc(rootRef);
    if (snap.exists()) {
      await deleteDoc(rootRef);
      return;
    }

    const colRef = collection(firestore, 'savedSchemes');
    const q = query(
      colRef,
      where('userId', '==', targetUid),
      where('schemeId', '==', savedIdOrSchemeId)
    );
    const querySnap = await getDocs(q);
    for (const d of querySnap.docs) {
      await deleteDoc(doc(firestore, 'savedSchemes', d.id));
    }
  } catch (err) {
    console.error(
      'Firestore Error: ',
      JSON.stringify(formatFirestoreErrorInfo(err, OperationType.DELETE, `savedSchemes/${savedIdOrSchemeId}`))
    );
  }
}

export async function getSavedSchemesFromCloud(userId?: string): Promise<SavedScheme[]> {
  const targetUid = auth.currentUser?.uid || userId;
  if (!targetUid) return [];

  try {
    // 1. Try reading user subcollection "users/{uid}/savedSchemes"
    const subColRef = collection(firestore, 'users', targetUid, 'savedSchemes');
    const subSnap = await getDocs(subColRef);
    if (!subSnap.empty) {
      const results: SavedScheme[] = [];
      subSnap.forEach((d) => results.push(d.data() as SavedScheme));
      return results;
    }

    // 2. Fallback: query root "savedSchemes"
    const rootColRef = collection(firestore, 'savedSchemes');
    const q = query(rootColRef, where('userId', '==', targetUid));
    const snap = await getDocs(q);
    const results: SavedScheme[] = [];
    snap.forEach((d) => results.push(d.data() as SavedScheme));
    return results;
  } catch (err) {
    console.error(
      'Firestore Error: ',
      JSON.stringify(formatFirestoreErrorInfo(err, OperationType.LIST, `users/${targetUid}/savedSchemes`))
    );
    return [];
  }
}

/* =========================================================================
   4. LOAN & SUBSIDY APPLICATIONS:
      "users/{uid}/loanApplications/{applicationId}" & "applications/{applicationId}"
========================================================================= */

export async function saveApplicationToCloud(appData: Application): Promise<void> {
  const targetUid = auth.currentUser?.uid || appData.userId;
  if (!targetUid) return;

  try {
    const payload = {
      ...appData,
      userId: targetUid,
      updatedAt: new Date().toISOString(),
      cloudSyncedAt: new Date().toISOString(),
      serverTimestamp: serverTimestamp()
    };

    // 1. Save in "users/{uid}/loanApplications/{applicationId}"
    const subRef = doc(firestore, 'users', targetUid, 'loanApplications', appData.id);
    await setDoc(subRef, payload, { merge: true });

    // 2. Save in "applications/{applicationId}"
    const rootRef = doc(firestore, 'applications', appData.id);
    await setDoc(rootRef, payload, { merge: true });
  } catch (err) {
    console.error(
      'Firestore Error: ',
      JSON.stringify(formatFirestoreErrorInfo(err, OperationType.WRITE, `applications/${appData.id}`))
    );
  }
}

export async function getApplicationsFromCloud(userId?: string): Promise<Application[]> {
  const targetUid = auth.currentUser?.uid || userId;
  if (!targetUid) return [];

  try {
    // 1. Check user subcollection
    const subCol = collection(firestore, 'users', targetUid, 'loanApplications');
    const subSnap = await getDocs(subCol);
    if (!subSnap.empty) {
      const results: Application[] = [];
      subSnap.forEach((d) => results.push(d.data() as Application));
      return results.sort(
        (a, b) => new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime()
      );
    }

    // 2. Fallback: query root applications collection
    const colRef = collection(firestore, 'applications');
    const q = query(colRef, where('userId', '==', targetUid));
    const snap = await getDocs(q);
    const results: Application[] = [];
    snap.forEach((docSnap) => results.push(docSnap.data() as Application));
    return results.sort(
      (a, b) => new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime()
    );
  } catch (err) {
    console.error(
      'Firestore Error: ',
      JSON.stringify(formatFirestoreErrorInfo(err, OperationType.LIST, 'applications'))
    );
    return [];
  }
}

export function subscribeToCloudApplications(
  onUpdate: (apps: Application[]) => void,
  userId?: string
): () => void {
  const targetUid = auth.currentUser?.uid || userId;
  if (!targetUid) return () => {};

  try {
    const colRef = collection(firestore, 'applications');
    const q = query(colRef, where('userId', '==', targetUid));
    return onSnapshot(
      q,
      (snap) => {
        const results: Application[] = [];
        snap.forEach((docSnap) => {
          results.push(docSnap.data() as Application);
        });
        results.sort(
          (a, b) => new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime()
        );
        onUpdate(results);
      },
      (error) => {
        console.error(
          'Firestore Error: ',
          JSON.stringify(formatFirestoreErrorInfo(error, OperationType.LIST, 'applications'))
        );
      }
    );
  } catch {
    return () => {};
  }
}

export async function updateApplicationStatusInCloud(
  applicationId: string,
  status: string,
  remarks: string,
  officerName?: string,
  officerRole?: string
): Promise<void> {
  const targetUid = auth.currentUser?.uid;
  if (!targetUid) return;

  try {
    const appRef = doc(firestore, 'applications', applicationId);
    const snap = await getDoc(appRef);
    const existing = snap.exists() ? (snap.data() as Application) : null;
    const now = new Date().toISOString();

    const newTimelineEvent = {
      id: `t-${Date.now()}`,
      status: status as any,
      action: `Status updated to ${status} by ${officerName || 'Reviewing Officer'}`,
      officerName: officerName || 'District Nodal Officer',
      officerRole: (officerRole as any) || 'AGRICULTURE_OFFICER',
      remarks,
      timestamp: now
    };

    const updatedTimeline = existing?.timeline
      ? [...existing.timeline, newTimelineEvent]
      : [newTimelineEvent];

    const patch = {
      status,
      remarks,
      updatedAt: now,
      timeline: updatedTimeline,
      cloudSyncedAt: now,
      serverTimestamp: serverTimestamp()
    };

    await setDoc(appRef, patch, { merge: true });

    // Also update subcollection if owner is known
    const ownerUid = existing?.userId || targetUid;
    const subRef = doc(firestore, 'users', ownerUid, 'loanApplications', applicationId);
    await setDoc(subRef, patch, { merge: true }).catch(() => {});
  } catch (err) {
    console.error(
      'Firestore Error: ',
      JSON.stringify(formatFirestoreErrorInfo(err, OperationType.UPDATE, `applications/${applicationId}`))
    );
  }
}

/* =========================================================================
   5. DOCUMENT VAULT & FIREBASE STORAGE:
      - Upload files to Firebase Storage: `users/{userId}/documents/{documentId}_{fileName}`
      - Save metadata to `users/{uid}/documents/{documentId}` & `documents/{documentId}`
========================================================================= */

export async function uploadDocumentFileToStorage(
  userId: string,
  docId: string,
  file: File | Blob,
  fileName: string,
  mimeType: string
): Promise<{ storagePath: string; downloadUrl: string }> {
  const targetUid = auth.currentUser?.uid || userId;
  const sanitizedName = fileName.replace(/[^a-zA-Z0-9._-]/g, '_');
  const path = `users/${targetUid}/documents/${docId}_${sanitizedName}`;

  try {
    const fileRef = storageRef(storage, path);
    await uploadBytes(fileRef, file, { contentType: mimeType });
    const downloadUrl = await getDownloadURL(fileRef);
    return { storagePath: path, downloadUrl };
  } catch (err) {
    console.warn('Firebase Storage upload error (falling back to metadata storage):', err);
    return { storagePath: path, downloadUrl: '' };
  }
}

export async function deleteDocumentFromStorage(storagePath: string): Promise<void> {
  if (!storagePath) return;
  try {
    const fileRef = storageRef(storage, storagePath);
    await deleteObject(fileRef);
  } catch (err) {
    console.warn('Firebase Storage delete warning:', err);
  }
}

export async function saveDocumentMetadataToCloud(docData: UserDocument): Promise<void> {
  const targetUid = auth.currentUser?.uid || docData.userId;
  if (!targetUid) return;

  try {
    const payload = {
      ...docData,
      userId: targetUid,
      updatedAt: serverTimestamp(),
      cloudSyncedAt: new Date().toISOString()
    };

    // 1. Subcollection: "users/{uid}/documents/{documentId}"
    const subRef = doc(firestore, 'users', targetUid, 'documents', docData.id);
    await setDoc(subRef, payload, { merge: true });

    // 2. Root collection: "documents/{documentId}"
    const rootRef = doc(firestore, 'documents', docData.id);
    await setDoc(rootRef, payload, { merge: true });
  } catch (err) {
    console.error(
      'Firestore Error: ',
      JSON.stringify(formatFirestoreErrorInfo(err, OperationType.WRITE, `documents/${docData.id}`))
    );
  }
}

export async function getDocumentsFromCloud(userId?: string): Promise<UserDocument[]> {
  const targetUid = auth.currentUser?.uid || userId;
  if (!targetUid) return [];

  try {
    // 1. Check user subcollection first
    const subCol = collection(firestore, 'users', targetUid, 'documents');
    const subSnap = await getDocs(subCol);
    if (!subSnap.empty) {
      const results: UserDocument[] = [];
      subSnap.forEach((d) => results.push(d.data() as UserDocument));
      return results;
    }

    // 2. Fallback: check root collection
    const colRef = collection(firestore, 'documents');
    const q = query(colRef, where('userId', '==', targetUid));
    const snap = await getDocs(q);
    const docs: UserDocument[] = [];
    snap.forEach((d) => docs.push(d.data() as UserDocument));
    return docs;
  } catch (err) {
    console.error(
      'Firestore Error: ',
      JSON.stringify(formatFirestoreErrorInfo(err, OperationType.LIST, 'documents'))
    );
    return [];
  }
}

export async function deleteDocumentFromCloud(docId: string, storagePath?: string): Promise<void> {
  const targetUid = auth.currentUser?.uid;
  if (!targetUid) return;

  try {
    // Delete from Storage
    if (storagePath) {
      await deleteDocumentFromStorage(storagePath);
    }

    // Delete from user subcollection
    const subRef = doc(firestore, 'users', targetUid, 'documents', docId);
    await deleteDoc(subRef).catch(() => {});

    // Delete from root collection
    const rootRef = doc(firestore, 'documents', docId);
    await deleteDoc(rootRef).catch(() => {});
  } catch (err) {
    console.error(
      'Firestore Error: ',
      JSON.stringify(formatFirestoreErrorInfo(err, OperationType.DELETE, `documents/${docId}`))
    );
  }
}

/* =========================================================================
   6. USER PREFERENCES: "users/{uid}/settings/preferences"
========================================================================= */

export interface UserPreferences {
  userId: string;
  language?: string;
  theme?: 'light' | 'dark';
  colorTheme?: string;
  updatedAt?: any;
}

export async function saveUserPreferencesToCloud(prefs: Partial<UserPreferences>): Promise<void> {
  const targetUid = auth.currentUser?.uid || prefs.userId;
  if (!targetUid) return;

  try {
    const prefRef = doc(firestore, 'users', targetUid, 'settings', 'preferences');
    await setDoc(
      prefRef,
      {
        ...prefs,
        userId: targetUid,
        updatedAt: serverTimestamp()
      },
      { merge: true }
    );
  } catch (err) {
    console.error(
      'Firestore Error: ',
      JSON.stringify(formatFirestoreErrorInfo(err, OperationType.WRITE, `users/${targetUid}/settings/preferences`))
    );
  }
}

export async function getUserPreferencesFromCloud(userId?: string): Promise<UserPreferences | null> {
  const targetUid = auth.currentUser?.uid || userId;
  if (!targetUid) return null;

  try {
    const prefRef = doc(firestore, 'users', targetUid, 'settings', 'preferences');
    const snap = await getDoc(prefRef);
    if (snap.exists()) {
      return snap.data() as UserPreferences;
    }
    return null;
  } catch (err) {
    console.error(
      'Firestore Error: ',
      JSON.stringify(formatFirestoreErrorInfo(err, OperationType.GET, `users/${targetUid}/settings/preferences`))
    );
    return null;
  }
}

/* =========================================================================
   7. CITIZEN FEEDBACK: "feedback/{feedbackId}"
   Farmer name, rating, comments, timestamp
========================================================================= */

export interface FarmerFeedback {
  id: string;
  farmerName: string;
  farmerMobile?: string;
  userId?: string;
  rating: number; // 1 to 5
  comments: string;
  category?: string;
  timestamp: string;
}

export async function submitFeedbackToCloud(feedback: Omit<FarmerFeedback, 'id' | 'timestamp'> & { id?: string }): Promise<FarmerFeedback> {
  const feedbackId = feedback.id || `FB-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
  const now = new Date().toISOString();

  const record: FarmerFeedback = {
    ...feedback,
    id: feedbackId,
    farmerName: feedback.farmerName?.trim() || 'Kisan Beneficiary',
    rating: Math.max(1, Math.min(5, Number(feedback.rating) || 5)),
    comments: feedback.comments?.trim() || '',
    userId: auth.currentUser?.uid || feedback.userId || 'anonymous',
    timestamp: now
  };

  try {
    const docRef = doc(firestore, 'feedback', feedbackId);
    await setDoc(docRef, {
      ...record,
      serverTimestamp: serverTimestamp()
    });
  } catch (err) {
    console.error(
      'Firestore Error: ',
      JSON.stringify(formatFirestoreErrorInfo(err, OperationType.WRITE, `feedback/${feedbackId}`))
    );
  }
  return record;
}

export async function getFeedbackListFromCloud(): Promise<FarmerFeedback[]> {
  try {
    const colRef = collection(firestore, 'feedback');
    const snap = await getDocs(colRef);
    const results: FarmerFeedback[] = [];
    snap.forEach((d) => results.push(d.data() as FarmerFeedback));
    return results.sort(
      (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );
  } catch (err) {
    console.error(
      'Firestore Error: ',
      JSON.stringify(formatFirestoreErrorInfo(err, OperationType.LIST, 'feedback'))
    );
    return [];
  }
}
