import React, { useState, useEffect, useRef } from 'react';
import {
  WifiOff,
  Wifi,
  RefreshCw,
  CheckCircle2,
  UploadCloud,
  Database,
  ToggleLeft,
  ToggleRight,
  Loader2,
  Cloud,
  FileText,
  AlertCircle,
  X,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import {
  isOfflineModeActive,
  getSimulatedOffline,
  setSimulatedOffline,
  getSyncQueue,
  syncCachedSubmissionsToFirebase,
  SyncQueueItem,
  SyncProgressUpdate
} from '../services/offlineStorage';
import { api } from '../services/api';

export const OfflineIndicator: React.FC = () => {
  const [offline, setOffline] = useState(isOfflineModeActive());
  const [simulated, setSimulated] = useState(getSimulatedOffline());
  const [wasOffline, setWasOffline] = useState(false);
  const [pendingSyncCount, setPendingSyncCount] = useState(0);
  const [pendingItems, setPendingItems] = useState<SyncQueueItem[]>([]);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncProgress, setSyncProgress] = useState<SyncProgressUpdate | null>(null);
  const [syncSuccessMsg, setSyncSuccessMsg] = useState<string | null>(null);
  const [syncErrorMsg, setSyncErrorMsg] = useState<string | null>(null);
  const [showQueueDetails, setShowQueueDetails] = useState(false);
  const { t } = useLanguage();

  const prevOfflineRef = useRef(offline);

  const updateState = () => {
    const isOff = isOfflineModeActive();
    setOffline(isOff);
    setSimulated(getSimulatedOffline());
    const queue = getSyncQueue();
    const pending = queue.filter(q => q.status === 'PENDING');
    setPendingSyncCount(pending.length);
    setPendingItems(pending);
  };

  const handleSyncNow = async () => {
    if (offline) {
      alert('Network is currently disconnected. Reconnect or turn off offline simulation to push cached submissions to Firebase.');
      return;
    }

    setIsSyncing(true);
    setSyncErrorMsg(null);
    setSyncSuccessMsg(null);

    try {
      const result = await syncCachedSubmissionsToFirebase((progress) => {
        setSyncProgress(progress);
      });

      updateState();

      if (result.synced > 0) {
        setSyncSuccessMsg(
          `Successfully pushed ${result.synced} cached form submission${result.synced > 1 ? 's' : ''} to Firebase Cloud Firestore!`
        );
        setTimeout(() => setSyncSuccessMsg(null), 5000);
      } else if (result.failed > 0) {
        setSyncErrorMsg(`Failed to push ${result.failed} submission(s) to Firebase. Please try again.`);
      }
    } catch (err: any) {
      setSyncErrorMsg(`Firebase background sync error: ${err?.message || 'Connection interrupted'}`);
    } finally {
      setIsSyncing(false);
      setSyncProgress(null);
    }
  };

  useEffect(() => {
    updateState();

    const handleOnline = () => {
      updateState();
      setWasOffline(true);
      // Auto-trigger background push to Firebase when connection is restored
      const queue = getSyncQueue().filter(q => q.status === 'PENDING');
      if (queue.length > 0) {
        handleSyncNow();
      }
    };

    const handleOffline = () => {
      updateState();
      setWasOffline(true);
    };

    const handleCustomChange = () => {
      const wasOff = prevOfflineRef.current;
      const isOff = isOfflineModeActive();
      updateState();

      // If connection was restored from simulated offline
      if (wasOff && !isOff) {
        setWasOffline(true);
        const queue = getSyncQueue().filter(q => q.status === 'PENDING');
        if (queue.length > 0) {
          handleSyncNow();
        }
      }
      prevOfflineRef.current = isOff;
    };

    const handleSyncCompleted = () => {
      updateState();
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    window.addEventListener('offline-mode-change', handleCustomChange);
    window.addEventListener('offline-sync-completed', handleSyncCompleted);

    const interval = setInterval(updateState, 2500);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('offline-mode-change', handleCustomChange);
      window.removeEventListener('offline-sync-completed', handleSyncCompleted);
      clearInterval(interval);
    };
  }, [offline]);

  const handleToggleSimulated = () => {
    const next = !simulated;
    setSimulatedOffline(next);
    setSimulated(next);
    setOffline(next || !navigator.onLine);
  };

  // Pre-cache all schemes for complete offline reliability
  const handlePrecacheAll = async () => {
    try {
      await api.getSchemes();
      await api.getLoans();
      alert('All Central & State Schemes and Agricultural Loans have been saved to local offline cache!');
    } catch {
      alert('Unable to pre-cache right now.');
    }
  };

  // Hide indicator if fully online, no pending syncs, and no recent message
  if (!offline && pendingSyncCount === 0 && !syncSuccessMsg && !syncErrorMsg && !isSyncing && !wasOffline) {
    return null;
  }

  return (
    <div className="border-b shadow-md transition-colors duration-300">
      {/* 1. Sync Success Notification Toast */}
      {syncSuccessMsg && (
        <div className="bg-emerald-700 text-white px-4 py-2 text-xs font-semibold flex items-center justify-between gap-2 animate-in fade-in slide-in-from-top">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-[#A2DB72] shrink-0" />
            <span>{syncSuccessMsg}</span>
          </div>
          <button
            onClick={() => setSyncSuccessMsg(null)}
            className="p-1 hover:bg-emerald-800 rounded transition text-emerald-200 hover:text-white"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* 2. Sync Error Banner */}
      {syncErrorMsg && (
        <div className="bg-rose-800 text-white px-4 py-2 text-xs font-semibold flex items-center justify-between gap-2 animate-in fade-in">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-300 shrink-0" />
            <span>{syncErrorMsg}</span>
          </div>
          <button
            onClick={handleSyncNow}
            disabled={isSyncing}
            className="px-2.5 py-1 bg-white text-rose-900 rounded font-bold text-[11px] hover:bg-rose-100 transition"
          >
            Retry Sync
          </button>
        </div>
      )}

      {/* 3. Main Indicator Bar */}
      <div
        className={`px-4 py-2.5 text-xs font-medium text-white ${
          offline
            ? 'bg-[#2b1f1d] border-[#5a2e22]' // Disconnected/Offline styling (warm earthy dark)
            : 'bg-[#183617] border-[#2d5a2c]' // Reconnected/Online styling (rich forest green)
        }`}
      >
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-3">
          {/* Status info */}
          <div className="flex items-center gap-2.5">
            {offline ? (
              <span className="p-1.5 rounded-lg bg-[#E06D43] text-white flex items-center justify-center animate-pulse">
                <WifiOff className="w-3.5 h-3.5" />
              </span>
            ) : (
              <span className="p-1.5 rounded-lg bg-[#A2DB72] text-[#183617] flex items-center justify-center">
                <Wifi className="w-3.5 h-3.5" />
              </span>
            )}

            <div className="flex flex-col sm:flex-row sm:items-center sm:gap-2">
              <span className="font-bold text-white flex items-center gap-1.5">
                {offline ? (
                  simulated ? (
                    'Simulated Offline Mode Active'
                  ) : (
                    t('offlineBanner', 'Offline Mode Active (Working Locally)')
                  )
                ) : (
                  <>
                    <span className="inline-block w-2 h-2 rounded-full bg-[#A2DB72] animate-ping" />
                    <span>Connection Restored • Back Online</span>
                  </>
                )}
              </span>

              <span className="text-[11px] text-emerald-100/90">
                {offline ? (
                  pendingSyncCount > 0 ? (
                    <span className="text-amber-300 font-semibold">
                      {pendingSyncCount} form submission{pendingSyncCount > 1 ? 's' : ''} cached locally. Will sync to Firebase once connection is restored.
                    </span>
                  ) : (
                    'New loan and subsidy applications will be safely cached on this device.'
                  )
                ) : (
                  pendingSyncCount > 0 ? (
                    <span className="text-emerald-200">
                      {pendingSyncCount} cached form submission{pendingSyncCount > 1 ? 's' : ''} ready to push to Firebase Cloud Firestore.
                    </span>
                  ) : (
                    <span className="text-emerald-200">All submissions synchronized with Firebase Cloud Firestore.</span>
                  )
                )}
              </span>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-2 shrink-0">
            {/* Real-time background sync progress */}
            {isSyncing && syncProgress && (
              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-black/40 text-emerald-200 text-[11px] font-mono">
                <Loader2 className="w-3.5 h-3.5 animate-spin text-[#A2DB72]" />
                <span>
                  Pushing ({syncProgress.synced}/{syncProgress.total}): {syncProgress.currentItemName}
                </span>
              </div>
            )}

            {/* PROMINENT SYNC NOW BUTTON */}
            {pendingSyncCount > 0 && (
              <button
                type="button"
                id="btn-offline-sync-now"
                onClick={handleSyncNow}
                disabled={isSyncing}
                title="Trigger background process to push cached form submissions to Firebase Firestore"
                className={`px-3.5 py-1.5 rounded-xl font-bold text-xs flex items-center gap-1.5 shadow-md transition active:scale-95 cursor-pointer ${
                  offline
                    ? 'bg-amber-500 hover:bg-amber-400 text-slate-950 opacity-90'
                    : 'bg-[#A2DB72] hover:bg-emerald-300 text-[#143210]'
                }`}
              >
                {isSyncing ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Pushing to Firebase...</span>
                  </>
                ) : (
                  <>
                    <UploadCloud className="w-3.5 h-3.5" />
                    <span>Sync Now ({pendingSyncCount})</span>
                  </>
                )}
              </button>
            )}

            {/* Queue Inspection Toggle */}
            {pendingSyncCount > 0 && (
              <button
                type="button"
                onClick={() => setShowQueueDetails(prev => !prev)}
                className="p-1.5 rounded-lg bg-black/30 hover:bg-black/50 text-emerald-100 text-[11px] flex items-center gap-1 transition"
                title="View cached submissions queue"
              >
                <FileText className="w-3 h-3" />
                <span className="hidden sm:inline">Queue</span>
                {showQueueDetails ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
              </button>
            )}

            {/* Precache schemes */}
            <button
              type="button"
              onClick={handlePrecacheAll}
              title="Download all schemes to local device storage for full offline readiness"
              className="px-2.5 py-1 text-[11px] rounded bg-[#2e5725] hover:bg-[#386b2d] text-white hidden md:flex items-center gap-1 transition"
            >
              <Database className="w-3 h-3" />
              <span>Save Offline</span>
            </button>

            {/* Simulated Offline Toggle */}
            <button
              type="button"
              onClick={handleToggleSimulated}
              title="Toggle offline simulator to test disconnected behavior and offline form caching"
              className="px-2.5 py-1 text-[11px] rounded bg-black/40 hover:bg-black/60 text-[#D2DCD0] flex items-center gap-1.5 border border-white/20 transition cursor-pointer"
            >
              {simulated ? (
                <>
                  <ToggleRight className="w-4 h-4 text-[#A2DB72]" />
                  <span>Disable Simulation</span>
                </>
              ) : (
                <>
                  <ToggleLeft className="w-4 h-4 text-slate-300" />
                  <span>Test Offline</span>
                </>
              )}
            </button>

            {/* Dismiss restored banner if no pending items */}
            {!offline && pendingSyncCount === 0 && wasOffline && (
              <button
                type="button"
                onClick={() => setWasOffline(false)}
                className="p-1 rounded hover:bg-black/30 text-emerald-200"
                title="Dismiss"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* 4. Expandable Queue Details Panel */}
      {showQueueDetails && pendingItems.length > 0 && (
        <div className="bg-[#122410] border-t border-[#2d5a2c] text-white px-4 py-3 text-xs animate-in slide-in-from-top-2">
          <div className="max-w-7xl mx-auto space-y-2">
            <div className="flex items-center justify-between text-emerald-200">
              <span className="font-bold flex items-center gap-1.5">
                <Cloud className="w-3.5 h-3.5 text-[#A2DB72]" />
                Cached Submissions Pending Firebase Push ({pendingItems.length})
              </span>
              <span className="text-[10px] text-emerald-300 font-mono">
                Storage: Local Device Cache • Target: Google Cloud Firestore
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 pt-1">
              {pendingItems.map((item) => (
                <div
                  key={item.id}
                  className="p-2.5 rounded-xl bg-black/40 border border-white/10 text-xs space-y-1"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-emerald-950 text-[#A2DB72] border border-emerald-800">
                      {item.type}
                    </span>
                    <span className="text-[10px] text-slate-400 font-mono">
                      {new Date(item.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  <div className="font-bold text-white line-clamp-1">
                    {item.type === 'APPLICATION'
                      ? item.payload?.schemeName || item.payload?.id
                      : item.payload?.fileName || item.payload?.id}
                  </div>
                  <div className="text-[11px] text-emerald-200/80 flex items-center justify-between">
                    <span>Status: {item.status}</span>
                    <span className="text-[10px] text-slate-400">Ready to Push</span>
                  </div>
                </div>
              ))}
            </div>

            <div className="pt-2 flex items-center justify-end">
              <button
                type="button"
                onClick={handleSyncNow}
                disabled={isSyncing || offline}
                className="px-3 py-1.5 rounded-lg bg-[#A2DB72] hover:bg-emerald-300 text-[#143210] font-bold text-xs flex items-center gap-1.5 shadow-sm transition disabled:opacity-50"
              >
                <UploadCloud className="w-3.5 h-3.5" />
                <span>Push All {pendingItems.length} Submissions to Firebase</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

