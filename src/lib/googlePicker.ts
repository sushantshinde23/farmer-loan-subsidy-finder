import firebaseConfig from '../../firebase-applet-config.json';
import { getDriveAccessToken, signInWithGoogleWorkspace } from './firebase';

declare global {
  interface Window {
    gapi?: any;
    google?: any;
  }
}

export interface GooglePickerResult {
  id: string;
  name: string;
  mimeType: string;
  sizeBytes?: number;
  url?: string;
}

let isGapiLoaded = false;
let isPickerLoaded = false;

// Load Google API client script
export function loadGooglePickerApi(): Promise<void> {
  return new Promise((resolve, reject) => {
    if (isPickerLoaded && window.google?.picker) {
      return resolve();
    }

    if (!window.gapi) {
      const script = document.createElement('script');
      script.src = 'https://apis.google.com/js/api.js';
      script.async = true;
      script.defer = true;
      script.onload = () => {
        isGapiLoaded = true;
        window.gapi.load('picker', () => {
          isPickerLoaded = true;
          resolve();
        });
      };
      script.onerror = () => reject(new Error('Failed to load Google API script'));
      document.body.appendChild(script);
    } else {
      window.gapi.load('picker', () => {
        isPickerLoaded = true;
        resolve();
      });
    }
  });
}

/**
 * Opens Google Picker dialog to choose agricultural records from Google Drive
 */
export async function openGooglePicker(): Promise<GooglePickerResult | null> {
  let token = getDriveAccessToken();
  if (!token) {
    const authResult = await signInWithGoogleWorkspace();
    token = authResult.accessToken;
  }

  await loadGooglePickerApi();

  if (!window.google?.picker) {
    throw new Error('Google Picker is not available.');
  }

  return new Promise((resolve) => {
    const apiKey = (firebaseConfig as any).apiKey;
    const appId = (firebaseConfig as any).appId;

    const pickerCallback = (data: any) => {
      if (data[window.google.picker.Response.ACTION] === window.google.picker.Action.PICKED) {
        const doc = data[window.google.picker.Response.DOCUMENTS][0];
        resolve({
          id: doc[window.google.picker.Document.ID],
          name: doc[window.google.picker.Document.NAME],
          mimeType: doc[window.google.picker.Document.MIME_TYPE],
          sizeBytes: doc[window.google.picker.Document.SIZE_BYTES],
          url: doc[window.google.picker.Document.URL]
        });
      } else if (data[window.google.picker.Response.ACTION] === window.google.picker.Action.CANCEL) {
        resolve(null);
      }
    };

    const view = new window.google.picker.DocsView(window.google.picker.ViewId.DOCS)
      .setIncludeFolders(true)
      .setSelectFolderEnabled(false);

    const builder = new window.google.picker.PickerBuilder()
      .setAppId(appId)
      .setOAuthToken(token)
      .addView(view)
      .setCallback(pickerCallback)
      .setTitle('Select Land Record or Certificate from Google Drive');

    if (apiKey) {
      builder.setDeveloperKey(apiKey);
    }

    const picker = builder.build();
    picker.setVisible(true);
  });
}
