import React, { useState, useEffect } from 'react';
import {
  FileCheck2,
  CheckCircle2,
  Clock,
  AlertCircle,
  XCircle,
  ArrowRight,
  Sparkles,
  Zap,
  Building,
  RefreshCw,
  Eye,
  ShieldCheck
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { api } from '../services/api';
import { realtimeService } from '../services/realtimeService';
import { Application } from '../types';

interface LiveApplicationTrackerProps {
  onNavigateToApplications: () => void;
}

export const LiveApplicationTracker: React.FC<LiveApplicationTrackerProps> = ({
  onNavigateToApplications
}) => {
  const { user } = useAuth();
  const { t } = useLanguage();
  const [applications, setApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [isWsConnected, setIsWsConnected] = useState(realtimeService.isConnected);
  const [recentlyUpdatedId, setRecentlyUpdatedId] = useState<string | null>(null);
  const [toastNotice, setToastNotice] = useState<{
    id: string;
    schemeName?: string;
    status: string;
    remarks: string;
    officer: string;
    timestamp: string;
  } | null>(null);

  const fetchApplications = async () => {
    try {
      const data = await api.getApplications(user?.id);
      setApplications(Array.isArray(data) ? data : []);
    } catch (err) {
      console.warn('Failed to fetch applications for tracker:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchApplications();

    // Listen to real-time status updates via WebSocket
    const unsubStatus = realtimeService.on('APPLICATION_STATUS_UPDATED', (event) => {
      const updatedApp = event.payload?.application as Application | undefined;
      const targetId = event.payload?.applicationId || updatedApp?.id;
      const newStatus = event.payload?.status || updatedApp?.status;
      const remarks = event.payload?.remarks || updatedApp?.officerRemarks || '';
      const officer = event.payload?.officer?.fullName || 'Reviewing Officer';
      const timestamp = event.payload?.updatedAt || new Date().toISOString();

      if (targetId) {
        setApplications((prev) => {
          const index = prev.findIndex((a) => a.id === targetId);
          if (index >= 0) {
            const next = [...prev];
            next[index] = {
              ...next[index],
              ...(updatedApp || {}),
              status: newStatus,
              officerRemarks: remarks,
              updatedAt: timestamp
            };
            return next;
          } else if (updatedApp) {
            return [updatedApp, ...prev];
          }
          return prev;
        });

        // Highlight the updated card with visual pulse
        setRecentlyUpdatedId(targetId);
        setTimeout(() => {
          setRecentlyUpdatedId((curr) => (curr === targetId ? null : curr));
        }, 7000);

        // Show prominent toast banner on farmer dashboard
        setToastNotice({
          id: targetId,
          schemeName: updatedApp?.schemeName,
          status: newStatus,
          remarks,
          officer,
          timestamp
        });

        // Trigger celebratory confetti if application was approved
        if (newStatus === 'APPROVED') {
          try {
            confetti({
              particleCount: 100,
              spread: 80,
              origin: { y: 0.6 }
            });
          } catch {
            // ignore
          }
        }
      }
    });

    const unsubCreated = realtimeService.on('APPLICATION_CREATED', (event) => {
      const newApp = event.payload?.application as Application | undefined;
      if (newApp) {
        setApplications((prev) => {
          if (prev.some((a) => a.id === newApp.id)) return prev;
          return [newApp, ...prev];
        });
        setRecentlyUpdatedId(newApp.id);
        setTimeout(() => setRecentlyUpdatedId(null), 5000);
      }
    });

    const connCheck = setInterval(() => {
      setIsWsConnected(realtimeService.isConnected);
    }, 2000);

    return () => {
      unsubStatus();
      unsubCreated();
      clearInterval(connCheck);
    };
  }, [user?.id]);

  const approvedCount = applications.filter((a) => a.status === 'APPROVED').length;
  const underReviewCount = applications.filter(
    (a) => a.status === 'UNDER_REVIEW' || a.status === 'PENDING'
  ).length;
  const docsRequiredCount = applications.filter(
    (a) => a.status === 'DOCUMENTS_REQUIRED'
  ).length;
  const totalSanctionRupees = applications
    .filter((a) => a.status === 'APPROVED')
    .reduce((sum, a) => sum + (a.subsidyClaimAmount || 0), 0);

  const renderStatusBadge = (status: string, isRecent: boolean) => {
    switch (status) {
      case 'APPROVED':
        return (
          <span
            className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-600 text-white shadow-xs transition-all ${
              isRecent ? 'ring-4 ring-emerald-400 ring-opacity-70 animate-bounce' : ''
            }`}
          >
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>{t('statusApproved', 'Approved & Sanctioned')} 🎉</span>
          </span>
        );
      case 'UNDER_REVIEW':
        return (
          <span
            className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-blue-600 text-white shadow-xs transition-all ${
              isRecent ? 'ring-4 ring-blue-400 ring-opacity-70 animate-pulse' : ''
            }`}
          >
            <Clock className="w-3.5 h-3.5" />
            <span>{t('statusUnderReview', 'Under Officer Review')}</span>
          </span>
        );
      case 'PENDING':
        return (
          <span
            className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-500 text-slate-950 shadow-xs transition-all ${
              isRecent ? 'ring-4 ring-amber-300 ring-opacity-70 animate-pulse' : ''
            }`}
          >
            <Clock className="w-3.5 h-3.5" />
            <span>{t('statusPending', 'Pending Officer Scrutiny')}</span>
          </span>
        );
      case 'DOCUMENTS_REQUIRED':
        return (
          <span
            className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-orange-600 text-white shadow-xs transition-all ${
              isRecent ? 'ring-4 ring-orange-300 ring-opacity-70 animate-pulse' : ''
            }`}
          >
            <AlertCircle className="w-3.5 h-3.5" />
            <span>{t('statusDocsRequired', 'Action: Documents Required')}</span>
          </span>
        );
      case 'REJECTED':
        return (
          <span
            className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-rose-600 text-white shadow-xs transition-all ${
              isRecent ? 'ring-4 ring-rose-400 ring-opacity-70 animate-pulse' : ''
            }`}
          >
            <XCircle className="w-3.5 h-3.5" />
            <span>{t('statusRejected', 'Rejected / Declined')}</span>
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-slate-200 text-slate-800 dark:bg-slate-700 dark:text-slate-200">
            <Clock className="w-3.5 h-3.5" />
            <span>{status}</span>
          </span>
        );
    }
  };

  return (
    <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm p-5 sm:p-6 space-y-5 transition-colors">
      {/* Live Toast Notice for Immediate Real-Time Changes */}
      {toastNotice && (
        <div className="p-4 rounded-xl bg-gradient-to-r from-emerald-500/20 via-teal-500/15 to-emerald-500/20 border-2 border-emerald-500 shadow-lg animate-in fade-in slide-in-from-top-3 duration-300 flex items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0 mt-0.5 shadow-md animate-bounce">
              <Sparkles className="w-5 h-5 text-amber-300" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-700 text-white">
                  ⚡ Live Status Update
                </span>
                <span className="text-xs font-mono font-bold text-slate-900 dark:text-white">
                  #{toastNotice.id}
                </span>
                <span className="text-xs font-bold text-emerald-800 dark:text-emerald-300">
                  {toastNotice.status}
                </span>
              </div>
              <h4 className="text-sm font-bold text-slate-900 dark:text-white mt-1">
                {toastNotice.schemeName || 'Government Scheme Application'}
              </h4>
              <p className="text-xs text-slate-700 dark:text-slate-200 mt-0.5">
                Officer <span className="font-semibold">{toastNotice.officer}</span> has updated this application status to{' '}
                <span className="font-bold underline decoration-emerald-500">{toastNotice.status}</span>.
              </p>
              {toastNotice.remarks && (
                <div className="text-xs text-slate-600 dark:text-slate-300 bg-white/70 dark:bg-slate-800/70 p-2 rounded-lg mt-2 border border-emerald-500/30">
                  <span className="font-semibold">Officer Remarks:</span> "{toastNotice.remarks}"
                </div>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={onNavigateToApplications}
              className="px-3 py-1.5 text-xs font-bold bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg transition"
            >
              Track Details
            </button>
            <button
              onClick={() => setToastNotice(null)}
              className="text-slate-400 hover:text-slate-700 dark:hover:text-white p-1 text-sm font-bold"
              title="Dismiss notification"
            >
              ✕
            </button>
          </div>
        </div>
      )}

      {/* Tracker Header with Connection Status */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100 dark:border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30">
              <FileCheck2 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-base sm:text-lg text-slate-900 dark:text-white flex items-center gap-2">
                <span>{t('applicationsTitle', 'Live Application Status Tracker')}</span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                  Real-Time
                </span>
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Department updates from reviewing officers appear here instantly without refreshing the page.
              </p>
            </div>
          </div>
        </div>

        {/* Real-Time WebSocket Heartbeat Badge */}
        <div className="flex items-center gap-3">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200">
            <span
              className={`w-2.5 h-2.5 rounded-full ${
                isWsConnected ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'
              }`}
            />
            <span>{isWsConnected ? 'WebSocket Live Sync' : 'Reconnecting...'}</span>
          </div>

          <button
            onClick={onNavigateToApplications}
            className="text-xs font-bold text-emerald-700 dark:text-emerald-400 hover:underline flex items-center gap-1"
          >
            <span>{t('myApplications', 'All Applications')} ({applications.length})</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Summary KPI Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60">
          <div className="text-xs text-slate-500 dark:text-slate-400 font-medium">Total Registered</div>
          <div className="text-xl font-black text-slate-900 dark:text-white mt-1">
            {applications.length}
          </div>
          <div className="text-[10px] text-slate-400 mt-0.5">Subsidy & Loan files</div>
        </div>

        <div className="p-3.5 rounded-xl bg-emerald-50/60 dark:bg-emerald-950/30 border border-emerald-300 dark:border-emerald-800/40">
          <div className="text-xs text-emerald-700 dark:text-emerald-300 font-medium">Approved & Sanctioned</div>
          <div className="text-xl font-black text-emerald-700 dark:text-emerald-300 mt-1">
            {approvedCount}
          </div>
          <div className="text-[10px] text-emerald-600 dark:text-emerald-400 mt-0.5">
            ₹{totalSanctionRupees.toLocaleString('en-IN')} Claimed
          </div>
        </div>

        <div className="p-3.5 rounded-xl bg-blue-50/60 dark:bg-blue-950/30 border border-blue-300 dark:border-blue-800/40">
          <div className="text-xs text-blue-700 dark:text-blue-300 font-medium">Under Review / Scrutiny</div>
          <div className="text-xl font-black text-blue-700 dark:text-blue-300 mt-1">
            {underReviewCount}
          </div>
          <div className="text-[10px] text-blue-600 dark:text-blue-400 mt-0.5">Officer desk processing</div>
        </div>

        <div className="p-3.5 rounded-xl bg-orange-50/60 dark:bg-orange-950/30 border border-orange-300 dark:border-orange-800/40">
          <div className="text-xs text-orange-700 dark:text-orange-300 font-medium">Action Required</div>
          <div className="text-xl font-black text-orange-700 dark:text-orange-300 mt-1">
            {docsRequiredCount}
          </div>
          <div className="text-[10px] text-orange-600 dark:text-orange-400 mt-0.5">Upload missing papers</div>
        </div>
      </div>

      {/* Applications Cards List */}
      {loading ? (
        <div className="py-8 text-center text-xs text-slate-400 flex items-center justify-center gap-2">
          <RefreshCw className="w-4 h-4 animate-spin text-emerald-600" />
          <span>Synchronizing live departmental records...</span>
        </div>
      ) : applications.length === 0 ? (
        <div className="p-6 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-dashed border-slate-300 dark:border-slate-700 text-center space-y-2">
          <Clock className="w-8 h-8 text-slate-400 mx-auto" />
          <h4 className="font-bold text-sm text-slate-800 dark:text-slate-200">
            No Active Applications Yet
          </h4>
          <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto">
            Once you submit a subsidy or loan application, officer review progress will be reflected here in real-time.
          </p>
          <button
            onClick={onNavigateToApplications}
            className="mt-2 px-4 py-2 text-xs font-bold rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white transition inline-flex items-center gap-1.5"
          >
            <span>+ Apply for Government Schemes</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {applications.slice(0, 3).map((app) => {
            const isJustUpdated = recentlyUpdatedId === app.id;
            return (
              <div
                key={app.id}
                className={`p-4 rounded-xl border transition-all duration-300 flex flex-col md:flex-row md:items-center justify-between gap-4 ${
                  isJustUpdated
                    ? 'border-emerald-500 bg-emerald-50/60 dark:bg-emerald-950/40 ring-2 ring-emerald-500/50 shadow-md scale-[1.01]'
                    : 'border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 hover:border-slate-300 dark:hover:border-slate-700'
                }`}
              >
                <div className="space-y-1.5 min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-mono text-xs font-extrabold text-slate-500 dark:text-slate-400">
                      {app.applicationNumber || app.id}
                    </span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-200/80 dark:bg-slate-700 text-slate-700 dark:text-slate-300 uppercase">
                      {app.schemeType || 'SCHEME'}
                    </span>
                    {isJustUpdated && (
                      <span className="inline-flex items-center gap-1 text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-emerald-600 text-white animate-pulse">
                        <Sparkles className="w-3 h-3 text-amber-300" />
                        Just Updated Live
                      </span>
                    )}
                  </div>

                  <h4 className="font-bold text-sm sm:text-base text-slate-900 dark:text-white truncate">
                    {app.schemeName}
                  </h4>

                  <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500 dark:text-slate-400">
                    <span className="font-semibold text-emerald-700 dark:text-emerald-400">
                      Claim: ₹{(app.subsidyClaimAmount || 0).toLocaleString('en-IN')}
                    </span>
                    <span>•</span>
                    <span>Applicant: {app.farmerName}</span>
                    <span>•</span>
                    <span>
                      Updated: {new Date(app.updatedAt || app.submittedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>

                  {app.officerRemarks && (
                    <div className="mt-2 text-xs text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-900 p-2.5 rounded-lg border border-slate-200 dark:border-slate-700 flex items-start gap-2">
                      <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                      <div>
                        <span className="font-semibold text-slate-900 dark:text-white">Officer Remarks:</span>{' '}
                        <span>{app.officerRemarks}</span>
                      </div>
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-3 shrink-0 self-end md:self-center">
                  <div>{renderStatusBadge(app.status, isJustUpdated)}</div>
                  <button
                    onClick={onNavigateToApplications}
                    className="p-2 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-white dark:hover:bg-slate-750 text-slate-700 dark:text-slate-200 transition"
                    title="View full audit timeline and documents"
                  >
                    <Eye className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
