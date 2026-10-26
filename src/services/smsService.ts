import { SmsRecord, SmsType, SmsPreferences, SmsDeliveryStatus } from '../types/sms';
import { isOfflineModeActive } from './offlineStorage';

const SMS_CACHE_KEY = 'krishi_sms_history_v1';
const SMS_PREFS_KEY = 'krishi_sms_preferences_v1';

export const getStoredSmsPreferences = (): SmsPreferences => {
  try {
    const raw = localStorage.getItem(SMS_PREFS_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return {
    registeredMobile: '+91 98220 12345',
    autoLaunchMessagesApp: false,
    notifyOnSubmission: true,
    notifyOnStatusChange: true,
    notifyOnDbtCredit: true,
  };
};

export const saveSmsPreferences = (prefs: SmsPreferences) => {
  try {
    localStorage.setItem(SMS_PREFS_KEY, JSON.stringify(prefs));
    window.dispatchEvent(new Event('sms-prefs-changed'));
  } catch (e) {
    console.warn('Failed to save SMS preferences:', e);
  }
};

/**
 * Builds a universal cellular SMS URI.
 * Works on Android, iOS, and mobile browsers without requiring internet.
 */
export const buildSmsUri = (mobile: string, bodyText: string): string => {
  // Clean mobile digits
  const cleanNumber = mobile.replace(/[^0-9+]/g, '');
  const encodedBody = encodeURIComponent(bodyText);

  // iOS 8+ uses '&body=', Android & RFC 5724 use '?body='
  const isIOS = typeof navigator !== 'undefined' && /iPad|iPhone|iPod/.test(navigator.userAgent);
  const delimiter = isIOS ? '&body=' : '?body=';

  return `sms:${cleanNumber}${delimiter}${encodedBody}`;
};

/**
 * Opens native mobile Messages application directly.
 */
export const openNativeMessagesApp = (mobile: string, bodyText: string): boolean => {
  try {
    const uri = buildSmsUri(mobile, bodyText);
    const link = document.createElement('a');
    link.href = uri;
    link.setAttribute('rel', 'noopener noreferrer');
    document.body.appendChild(link);
    link.click();
    setTimeout(() => {
      document.body.removeChild(link);
    }, 200);
    return true;
  } catch (err) {
    console.warn('Could not launch native SMS handler:', err);
    return false;
  }
};

export const getLocalSmsHistory = (): SmsRecord[] => {
  try {
    const raw = localStorage.getItem(SMS_CACHE_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return [];
};

export const saveLocalSmsRecord = (record: SmsRecord) => {
  try {
    const history = getLocalSmsHistory();
    // Prepend new SMS
    const updated = [record, ...history.filter(s => s.id !== record.id)].slice(0, 50);
    localStorage.setItem(SMS_CACHE_KEY, JSON.stringify(updated));
    window.dispatchEvent(new CustomEvent('sms-dispatched', { detail: record }));
  } catch (e) {
    console.warn('Failed to cache SMS locally:', e);
  }
};

/**
 * Send real-time SMS to farmer in both OFFLINE and ONLINE modes.
 */
export const dispatchRealTimeSms = async (options: {
  recipientMobile?: string;
  recipientName?: string;
  type: SmsType;
  title: string;
  message: string;
  relatedId?: string;
  forceOpenMessagesApp?: boolean;
}): Promise<SmsRecord> => {
  const prefs = getStoredSmsPreferences();
  const targetMobile = options.recipientMobile || prefs.registeredMobile || '+91 98220 12345';
  const targetName = options.recipientName || 'Farmer';
  const isOffline = isOfflineModeActive();

  // Official GoI SMS format header
  const officialPrefix = '[KRISHI-GOV - Govt of India]\n';
  const fullSmsText = `${officialPrefix}${options.message}\n- Ministry of Agriculture, GoI`;

  const smsId = `SMS-${Date.now().toString().slice(-6)}`;
  const now = new Date().toISOString();
  const directUri = buildSmsUri(targetMobile, fullSmsText);

  let deliveryStatus: SmsDeliveryStatus = isOffline ? 'QUEUED_OFFLINE' : 'DELIVERED';

  // If user enabled auto-launch or forceOpen is passed, trigger native Messages app
  const shouldOpenDevice = options.forceOpenMessagesApp ?? prefs.autoLaunchMessagesApp;
  if (shouldOpenDevice) {
    const opened = openNativeMessagesApp(targetMobile, fullSmsText);
    if (opened) {
      deliveryStatus = isOffline ? 'QUEUED_OFFLINE' : 'OPENED_IN_MESSAGES';
    }
  }

  const record: SmsRecord = {
    id: smsId,
    recipientMobile: targetMobile,
    recipientName: targetName,
    type: options.type,
    title: options.title,
    message: fullSmsText,
    gateway: isOffline ? 'CELLULAR_NATIVE' : 'NIC_KISAN_SMS',
    status: deliveryStatus,
    sentAt: now,
    isOffline,
    relatedId: options.relatedId,
    directSmsUri: directUri,
  };

  // Always save locally immediately
  saveLocalSmsRecord(record);

  // If online, also dispatch to backend server
  if (!isOffline) {
    try {
      await fetch('/api/sms/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(record),
      }).catch(err => {
        console.warn('Backend SMS sync deferred:', err);
      });
    } catch {
      // Offline fallback
    }
  }

  return record;
};

/**
 * Fetch all SMS messages (combines backend server records and local offline records)
 */
export const fetchAllSmsHistory = async (): Promise<SmsRecord[]> => {
  const local = getLocalSmsHistory();

  if (isOfflineModeActive()) {
    return local;
  }

  try {
    const res = await fetch('/api/sms/history');
    if (res.ok) {
      const serverSms: SmsRecord[] = await res.json();
      // Merge unique by ID
      const mergedMap = new Map<string, SmsRecord>();
      serverSms.forEach(s => mergedMap.set(s.id, s));
      local.forEach(s => mergedMap.set(s.id, s));

      const mergedList = Array.from(mergedMap.values()).sort(
        (a, b) => new Date(b.sentAt).getTime() - new Date(a.sentAt).getTime()
      );
      // Update local storage
      localStorage.setItem(SMS_CACHE_KEY, JSON.stringify(mergedList.slice(0, 50)));
      return mergedList;
    }
  } catch (err) {
    console.warn('Using local SMS history due to network:', err);
  }

  return local;
};
