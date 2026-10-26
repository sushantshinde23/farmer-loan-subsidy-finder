import { initializeApp, getApps, getApp } from 'firebase/app';
import {
  getAuth,
  signInWithPopup,
  GoogleAuthProvider,
  onAuthStateChanged,
  User,
  signOut
} from 'firebase/auth';
import firebaseConfig from '../../firebase-applet-config.json';

const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
export const auth = getAuth(app);
export { firestore } from './firestoreService';

export const WORKSPACE_SCOPES = [
  'https://mail.google.com/',
  'https://www.googleapis.com/auth/gmail.addons.current.action.compose',
  'https://www.googleapis.com/auth/gmail.addons.current.message.action',
  'https://www.googleapis.com/auth/gmail.addons.current.message.metadata',
  'https://www.googleapis.com/auth/gmail.addons.current.message.readonly',
  'https://www.googleapis.com/auth/gmail.compose',
  'https://www.googleapis.com/auth/gmail.insert',
  'https://www.googleapis.com/auth/gmail.labels',
  'https://www.googleapis.com/auth/gmail.metadata',
  'https://www.googleapis.com/auth/gmail.modify',
  'https://www.googleapis.com/auth/gmail.readonly',
  'https://www.googleapis.com/auth/gmail.send',
  'https://www.googleapis.com/auth/gmail.settings.basic',
  'https://www.googleapis.com/auth/gmail.settings.sharing',
  'https://www.googleapis.com/auth/drive.file',
  'https://www.googleapis.com/auth/drive.readonly',
  'https://www.googleapis.com/auth/drive'
];

export const googleWorkspaceProvider = new GoogleAuthProvider();
WORKSPACE_SCOPES.forEach((scope) => {
  googleWorkspaceProvider.addScope(scope);
});

// Alias for existing Google Drive references
export const googleDriveProvider = googleWorkspaceProvider;

let cachedWorkspaceAccessToken: string | null = null;
let isSigningIn = false;

// Initialize auth listener
export const initAuth = (
  onAuthSuccess?: (user: User, token: string | null) => void,
  onAuthFailure?: () => void
) => {
  return onAuthStateChanged(auth, async (user: User | null) => {
    if (user) {
      if (onAuthSuccess) {
        onAuthSuccess(user, cachedWorkspaceAccessToken);
      }
    } else {
      cachedWorkspaceAccessToken = null;
      if (onAuthFailure) onAuthFailure();
    }
  });
};

// Sign in with Google Workspace (Gmail + Drive)
export const signInWithGoogleWorkspace = async (): Promise<{ user: User; accessToken: string }> => {
  try {
    isSigningIn = true;
    const result = await signInWithPopup(auth, googleWorkspaceProvider);
    const credential = GoogleAuthProvider.credentialFromResult(result);
    const accessToken = credential?.accessToken;

    if (!accessToken) {
      throw new Error('Could not obtain Google OAuth access token.');
    }

    cachedWorkspaceAccessToken = accessToken;
    return { user: result.user, accessToken };
  } catch (error: any) {
    console.error('Sign-in with Google Workspace error:', error);
    throw error;
  } finally {
    isSigningIn = false;
  }
};

// Alias for backwards compatibility
export const signInWithGoogleDrive = signInWithGoogleWorkspace;

export const getWorkspaceAccessToken = (): string | null => {
  return cachedWorkspaceAccessToken;
};

export const getDriveAccessToken = getWorkspaceAccessToken;

export const setWorkspaceAccessToken = (token: string | null) => {
  cachedWorkspaceAccessToken = token;
};

export const setDriveAccessToken = setWorkspaceAccessToken;

export const logoutGoogle = async () => {
  await signOut(auth);
  cachedWorkspaceAccessToken = null;
};

// Google Drive API Interfaces
export interface GoogleDriveFile {
  id: string;
  name: string;
  mimeType: string;
  size?: string;
  modifiedTime?: string;
  webViewLink?: string;
  thumbnailLink?: string;
  iconLink?: string;
}

// List files from Google Drive
export const fetchDriveFiles = async (
  accessToken: string,
  searchQuery?: string
): Promise<GoogleDriveFile[]> => {
  try {
    let q = "trashed = false";
    if (searchQuery) {
      q += ` and name contains '${searchQuery.replace(/'/g, "\\'")}'`;
    }
    const params = new URLSearchParams({
      pageSize: '30',
      fields: 'files(id, name, mimeType, size, modifiedTime, webViewLink, thumbnailLink, iconLink)',
      orderBy: 'modifiedTime desc',
      q
    });

    const res = await fetch(`https://www.googleapis.com/drive/v3/files?${params.toString()}`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error?.message || `Google Drive API error (${res.status})`);
    }

    const data = await res.json();
    return data.files || [];
  } catch (err: any) {
    console.error('Failed to fetch Google Drive files:', err);
    throw err;
  }
};

// Upload a document directly to Google Drive
export const uploadFileToDrive = async (
  accessToken: string,
  file: File | Blob,
  fileName: string,
  mimeType: string = 'application/pdf',
  description?: string
): Promise<GoogleDriveFile> => {
  const metadata = {
    name: fileName,
    mimeType: mimeType,
    description: description || 'Uploaded via Farmer Loan & Subsidy Portal'
  };

  const form = new FormData();
  form.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
  form.append('file', file);

  const res = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name,mimeType,size,webViewLink', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
    body: form,
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error?.message || `Google Drive upload failed (${res.status})`);
  }

  return await res.json();
};

// Export eligibility dossier / document as a file into Google Drive
export const saveDossierToDrive = async (
  accessToken: string,
  dossierTitle: string,
  content: string
): Promise<GoogleDriveFile> => {
  const blob = new Blob([content], { type: 'text/markdown;charset=utf-8' });
  return uploadFileToDrive(accessToken, blob, `${dossierTitle}.md`, 'text/markdown', 'Farmer Eligibility & Sanction Dossier');
};

// Delete file with mandatory confirmation dialog requirement from workspace skill
export const deleteFileFromDrive = async (
  accessToken: string,
  fileId: string,
  fileName: string
): Promise<boolean> => {
  const confirmed = window.confirm(
    `Are you sure you want to permanently delete "${fileName}" from your Google Drive? This action cannot be undone.`
  );
  if (!confirmed) return false;

  const res = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}`, {
    method: 'DELETE',
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!res.ok && res.status !== 204) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error?.message || `Google Drive deletion failed (${res.status})`);
  }

  return true;
};
