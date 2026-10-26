import React, { useState, useEffect } from 'react';
import {
  Settings,
  Globe,
  Sun,
  Moon,
  HardDrive,
  CheckCircle2,
  Trash2,
  Palette,
  Cloud,
  Database,
  WifiOff,
  UploadCloud,
  ToggleLeft,
  ToggleRight,
  RefreshCw,
  Lock,
  ExternalLink
} from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { useTheme } from '../context/ThemeContext';
import { SupportedLanguage } from '../types';
import {
  isOfflineModeActive,
  getSimulatedOffline,
  setSimulatedOffline,
  getSyncQueue,
  syncOfflineData
} from '../services/offlineStorage';
import {
  signInWithGoogleDrive,
  getDriveAccessToken,
  logoutGoogle
} from '../lib/firebase';

export const SettingsPage: React.FC = () => {
  const { language, setLanguage, languages, t } = useLanguage();
  const { theme, toggleTheme, colorTheme, setColorTheme, colorThemes } = useTheme();

  // Cloud SQL & Offline state
  const [offline, setOffline] = useState(isOfflineModeActive());
  const [simulated, setSimulated] = useState(getSimulatedOffline());
  const [pendingQueue, setPendingQueue] = useState(getSyncQueue());
  const [syncing, setSyncing] = useState(false);
  const [cloudSqlStatus, setCloudSqlStatus] = useState<any>(null);

  // Google Drive state
  const [driveConnected, setDriveConnected] = useState(false);
  const [driveLoading, setDriveLoading] = useState(false);

  useEffect(() => {
    const token = getDriveAccessToken();
    setDriveConnected(Boolean(token));

    // Fetch Cloud SQL status from server
    fetch('/api/cloudsql/status')
      .then(res => res.json())
      .then(data => setCloudSqlStatus(data))
      .catch(err => console.warn('Cloud SQL status check deferred:', err));
  }, []);

  const handleToggleOfflineSim = () => {
    const next = !simulated;
    setSimulatedOffline(next);
    setSimulated(next);
    setOffline(next || !navigator.onLine);
    setPendingQueue(getSyncQueue());
  };

  const handleManualSync = async () => {
    if (offline) {
      alert('Please disable offline mode or reconnect to sync with Cloud SQL.');
      return;
    }
    setSyncing(true);
    try {
      const result = await syncOfflineData();
      alert(`Successfully synchronized ${result.synced} offline items to Cloud SQL!`);
      setPendingQueue(getSyncQueue());
    } catch (err: any) {
      alert(`Sync failed: ${err?.message}`);
    } finally {
      setSyncing(false);
    }
  };

  const handleConnectDrive = async () => {
    setDriveLoading(true);
    try {
      await signInWithGoogleDrive();
      setDriveConnected(true);
      alert('Google Drive connected successfully with required scopes.');
    } catch (err: any) {
      alert(`Google Drive connection error: ${err?.message}`);
    } finally {
      setDriveLoading(false);
    }
  };

  const handleDisconnectDrive = async () => {
    await logoutGoogle();
    setDriveConnected(false);
    alert('Google Drive session disconnected.');
  };

  const handleClearCache = () => {
    if (confirm('Clear local offline documents cache and re-sync from server?')) {
      if ('caches' in window) {
        caches.keys().then((names) => {
          names.forEach(name => caches.delete(name));
        });
      }
      localStorage.removeItem('krishi_sync_queue');
      alert('Offline cache cleared. Refreshing page.');
      window.location.reload();
    }
  };

  return (
    <div className="space-y-6 pb-12 max-w-4xl">
      {/* Header */}
      <div className="border-b border-[#D2DCD0] dark:border-[#2B3B28] pb-4">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-[#253F1E] text-[#A2DB72] flex items-center justify-center">
            <Settings className="w-4 h-4" />
          </div>
          <h2 className="text-xl sm:text-2xl font-serif font-black text-[#253F1E] dark:text-emerald-300">
            {t('navSettings', 'Portal Preferences & Cloud Settings')}
          </h2>
        </div>
        <p className="text-xs sm:text-sm text-[#4E6649] dark:text-emerald-300/80 mt-1">
          Customize language (13 Indian languages), Google Drive storage, Cloud SQL (region: asia-southeast1), and visual theme.
        </p>
      </div>

      {/* Cloud SQL Status Card */}
      <div className="p-5 sm:p-6 rounded-3xl bg-[#F4F5ED] dark:bg-[#182316] border border-[#D2DCD0] dark:border-[#2D3E2A] shadow-xs space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-[#253F1E] text-white flex items-center justify-center">
              <Database className="w-4 h-4 text-[#A2DB72]" />
            </div>
            <div>
              <h3 className="font-bold text-sm sm:text-base text-[#253F1E] dark:text-white flex items-center gap-2">
                <span>Google Cloud SQL Database</span>
                <span className="px-2.5 py-0.5 text-[10px] font-bold rounded-full bg-[#E8EFE5] text-[#253F1E] dark:bg-[#253822] dark:text-[#A2DB72]">
                  asia-southeast1
                </span>
              </h3>
              <p className="text-xs text-[#526B4D] dark:text-emerald-300/80">
                PostgreSQL Developer instance provisioned in region asia-southeast1
              </p>
            </div>
          </div>

          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full border border-[#8B9E87] bg-white text-[#253F1E] text-xs font-bold shadow-2xs">
            <Lock className="w-3 h-3" />
            <span>Encrypted SSL</span>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 text-xs">
          <div className="p-3 rounded-2xl bg-white dark:bg-[#1E2C1B] border border-[#D2DCD0] dark:border-[#2F412C]">
            <span className="text-[10px] text-[#637C5E] uppercase font-bold">Region</span>
            <div className="font-bold text-sm text-[#253F1E] dark:text-white mt-0.5">
              asia-southeast1
            </div>
            <span className="text-[10px] text-emerald-600">Singapore GCP Zone</span>
          </div>

          <div className="p-3 rounded-2xl bg-white dark:bg-[#1E2C1B] border border-[#D2DCD0] dark:border-[#2F412C]">
            <span className="text-[10px] text-[#637C5E] uppercase font-bold">Database Engine</span>
            <div className="font-bold text-sm text-[#253F1E] dark:text-white mt-0.5">
              Cloud SQL (PostgreSQL)
            </div>
            <span className="text-[10px] text-[#526B4D]">Drizzle ORM Connection</span>
          </div>

          <div className="p-3 rounded-2xl bg-white dark:bg-[#1E2C1B] border border-[#D2DCD0] dark:border-[#2F412C]">
            <span className="text-[10px] text-[#637C5E] uppercase font-bold">Pending Sync Items</span>
            <div className="font-bold text-sm text-[#253F1E] dark:text-white mt-0.5">
              {pendingQueue.filter(q => q.status === 'PENDING').length} queued
            </div>
            <span className="text-[10px] text-[#E06D43]">Local offline queue</span>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 pt-1">
          <button
            onClick={handleManualSync}
            disabled={syncing || offline}
            className="px-4 py-2 text-xs font-bold rounded-full bg-[#253F1E] hover:bg-[#34592A] text-white transition flex items-center gap-1.5 shadow-xs disabled:opacity-50"
          >
            <UploadCloud className={`w-3.5 h-3.5 text-[#A2DB72] ${syncing ? 'animate-bounce' : ''}`} />
            <span>{syncing ? 'Syncing to Cloud SQL...' : 'Sync Pending Data to Cloud SQL'}</span>
          </button>

          <button
            onClick={handleToggleOfflineSim}
            className="px-3.5 py-2 text-xs font-bold rounded-full border border-[#8B9E87] bg-white dark:bg-[#1E2C1B] text-[#253F1E] dark:text-emerald-200 hover:bg-[#E8EFE5] transition flex items-center gap-1.5"
          >
            {simulated ? <ToggleRight className="w-4 h-4 text-[#A2DB72]" /> : <ToggleLeft className="w-4 h-4" />}
            <span>{simulated ? 'Disable Offline Simulator' : 'Test Offline Mode'}</span>
          </button>
        </div>
      </div>

      {/* Google Drive Integration Card */}
      <div className="p-5 sm:p-6 rounded-3xl bg-white dark:bg-[#182316] border border-[#D2DCD0] dark:border-[#2D3E2A] shadow-xs space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-blue-50 dark:bg-blue-950 text-blue-600 flex items-center justify-center">
              <Cloud className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-sm sm:text-base text-[#253F1E] dark:text-white">
                Google Drive Storage Integration
              </h3>
              <p className="text-xs text-[#526B4D] dark:text-emerald-300/80">
                1P Google Workspace Drive integration for land records and subsidy certificates
              </p>
            </div>
          </div>

          <span className={`text-xs font-bold px-3 py-1 rounded-full ${
            driveConnected
              ? 'bg-[#E8EFE5] text-[#253F1E] dark:bg-[#253822] dark:text-[#A2DB72]'
              : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300'
          }`}>
            {driveConnected ? 'Connected & Authorized' : 'Not Connected'}
          </span>
        </div>

        <p className="text-xs text-[#526B4D] dark:text-slate-400 leading-relaxed">
          Allows you to import 7/12 land records, upload farm photographs, and store verified digital application receipts directly into your personal or CSC Google Drive account.
        </p>

        <div className="flex items-center gap-2.5 pt-1">
          {driveConnected ? (
            <button
              onClick={handleDisconnectDrive}
              className="px-4 py-2 text-xs font-bold rounded-full border border-rose-300 text-rose-700 dark:text-rose-400 hover:bg-rose-50 transition"
            >
              Disconnect Google Drive
            </button>
          ) : (
            <button
              onClick={handleConnectDrive}
              disabled={driveLoading || offline}
              className="px-4 py-2 text-xs font-bold rounded-full bg-[#253F1E] hover:bg-[#34592A] text-white transition flex items-center gap-2 shadow-xs disabled:opacity-50"
            >
              <Cloud className="w-4 h-4 text-[#A2DB72]" />
              <span>Connect Google Drive</span>
            </button>
          )}
        </div>
      </div>

      {/* Color Themes Section */}
      <div className="p-5 sm:p-6 rounded-3xl bg-white dark:bg-[#182316] border border-[#D2DCD0] dark:border-[#2D3E2A] shadow-xs space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <Palette className="w-5 h-5 text-[#253F1E] dark:text-[#A2DB72]" />
            <h3 className="font-bold text-sm sm:text-base text-[#253F1E] dark:text-white">
              Official Portal Color Theme
            </h3>
          </div>
          <span className="text-xs font-bold px-3 py-1 rounded-full bg-[#E8EFE5] text-[#253F1E] dark:bg-[#253822] dark:text-[#A2DB72] capitalize">
            Active: {colorTheme}
          </span>
        </div>

        <p className="text-xs text-[#526B4D] dark:text-slate-400">
          Select your preferred high-contrast color scheme for government navigation, options, and dashboard action buttons:
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {colorThemes.map((ct) => {
            const isSelected = colorTheme === ct.id;
            return (
              <button
                key={ct.id}
                id={`btn-color-theme-${ct.id}`}
                onClick={() => setColorTheme(ct.id)}
                className={`p-3.5 rounded-2xl border text-left transition-all relative flex flex-col justify-between ${
                  isSelected
                    ? 'border-[#253F1E] ring-2 ring-[#253F1E]/20 bg-[#F4F5ED] dark:bg-[#1C2A1A] shadow-xs'
                    : 'border-[#D2DCD0] dark:border-[#2F412C] bg-white dark:bg-[#162214] hover:bg-[#F8F9F3]'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="flex items-center gap-2">
                      <span
                        className="w-4 h-4 rounded-full border border-white shadow-2xs"
                        style={{ backgroundColor: ct.primaryColor }}
                      />
                      <span className="font-bold text-xs text-[#253F1E] dark:text-white">
                        {ct.name}
                      </span>
                    </div>
                    {isSelected && (
                      <CheckCircle2 className="w-4 h-4 text-[#253F1E] dark:text-[#A2DB72] shrink-0" />
                    )}
                  </div>
                  <p className="text-[11px] text-[#526B4D] dark:text-slate-400">
                    {ct.description}
                  </p>
                </div>

                <div className="mt-3 pt-2 border-t border-[#EAEFE8] dark:border-[#2C3E29] flex items-center gap-1.5">
                  <div className="h-2.5 flex-1 rounded-full" style={{ backgroundColor: ct.primaryColor }} />
                  <div className="h-2.5 flex-1 rounded-full" style={{ backgroundColor: ct.accentColor }} />
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Light / Dark Mode Section */}
      <div className="p-5 sm:p-6 rounded-3xl bg-white dark:bg-[#182316] border border-[#D2DCD0] dark:border-[#2D3E2A] shadow-xs space-y-3">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h3 className="font-bold text-sm sm:text-base text-[#253F1E] dark:text-white">
              Visual Display Mode
            </h3>
            <p className="text-xs text-[#526B4D] dark:text-slate-400">
              Switch between High-Readability Light Linen Mode and Night Field Dark Mode.
            </p>
          </div>
          <button
            id="settings-btn-toggle-theme"
            onClick={toggleTheme}
            className="px-4 py-2 rounded-full border border-[#8B9E87] bg-[#F4F5ED] dark:bg-[#1E2C1B] text-xs font-bold text-[#253F1E] dark:text-emerald-200 flex items-center gap-2 hover:bg-[#E8EFE5] transition shadow-xs"
          >
            {theme === 'dark' ? (
              <>
                <Sun className="w-4 h-4 text-amber-400" />
                <span>Active: Dark Mode (Click for Light)</span>
              </>
            ) : (
              <>
                <Moon className="w-4 h-4 text-[#253F1E]" />
                <span>Active: Light Mode (Click for Dark)</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Language Section */}
      <div className="p-5 sm:p-6 rounded-3xl bg-white dark:bg-[#182316] border border-[#D2DCD0] dark:border-[#2D3E2A] shadow-xs space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <Globe className="w-5 h-5 text-[#253F1E] dark:text-[#A2DB72]" />
            <h3 className="font-bold text-sm sm:text-base text-[#253F1E] dark:text-white">
              Portal Language (13 Official Indian Languages)
            </h3>
          </div>
          <span className="text-xs font-bold px-3 py-1 rounded-full bg-[#E8EFE5] text-[#253F1E] dark:bg-[#253822] dark:text-[#A2DB72] uppercase">
            Active: {language}
          </span>
        </div>

        <p className="text-xs text-[#526B4D] dark:text-slate-400">
          All scheme descriptions, eligibility requirements, and action buttons adapt immediately:
        </p>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {languages.map((l) => (
            <button
              key={l.code}
              id={`btn-lang-${l.code}`}
              onClick={() => setLanguage(l.code as SupportedLanguage)}
              className={`p-3 rounded-2xl border text-left text-xs transition flex flex-col justify-between ${
                language === l.code
                  ? 'bg-[#253F1E] text-white font-bold border-[#253F1E] shadow-xs'
                  : 'bg-white dark:bg-[#182316] border-[#D2DCD0] dark:border-[#2F412C] text-[#253F1E] dark:text-emerald-200 hover:bg-[#F8F9F3]'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="font-bold text-sm">{l.nativeName}</span>
                {language === l.code && <CheckCircle2 className="w-3.5 h-3.5 text-[#A2DB72]" />}
              </div>
              <span className={`text-[11px] mt-1 ${language === l.code ? 'text-emerald-200' : 'text-[#657E61]'}`}>
                {l.name}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* PWA & Offline Cache Reset */}
      <div className="p-5 sm:p-6 rounded-3xl bg-white dark:bg-[#182316] border border-[#D2DCD0] dark:border-[#2D3E2A] shadow-xs space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <HardDrive className="w-4 h-4 text-[#253F1E] dark:text-[#A2DB72]" />
            <h3 className="font-bold text-sm text-[#253F1E] dark:text-white">
              PWA Offline Storage & Service Worker Cache
            </h3>
          </div>
          <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-[#E8EFE5] text-[#253F1E] dark:bg-[#253822] dark:text-[#A2DB72]">
            Active & Cached
          </span>
        </div>

        <p className="text-xs text-[#526B4D] dark:text-slate-400 leading-relaxed">
          Application shell and stored vault documents are cached offline so you can access your dossiers in remote rural farmland without cellular reception.
        </p>

        <div className="pt-2">
          <button
            onClick={handleClearCache}
            className="px-4 py-2 rounded-full border border-rose-300 text-xs font-bold text-rose-700 dark:text-rose-400 hover:bg-rose-50 flex items-center gap-1.5 transition"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Clear Local Storage & Reset Cache</span>
          </button>
        </div>
      </div>
    </div>
  );
};
