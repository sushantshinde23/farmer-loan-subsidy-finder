import React, { useState, useEffect } from 'react';
import {
  FileCheck2,
  CheckCircle2,
  Clock,
  AlertCircle,
  XCircle,
  ArrowRight,
  ArrowLeft,
  FileText,
  Printer,
  ShieldCheck,
  Building,
  Upload,
  Sparkles,
  Download,
  Calendar,
  MessageSquare,
  Smartphone
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { api } from '../services/api';
import { Application, GovernmentScheme, UserDocument } from '../types';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { dispatchRealTimeSms, openNativeMessagesApp } from '../services/smsService';
import { AcknowledgementSlipModal } from '../components/AcknowledgementSlipModal';
import { getApplicationsFromCloud, subscribeToCloudApplications } from '../lib/firestoreService';
import { realtimeService } from '../services/realtimeService';

interface ApplicationSystemProps {
  initialSchemeId?: string;
  initialSchemeName?: string;
  onOpenVault: () => void;
}

export const ApplicationSystem: React.FC<ApplicationSystemProps> = ({
  initialSchemeId,
  initialSchemeName,
  onOpenVault
}) => {
  const { user, farmerProfile } = useAuth();
  const { t } = useLanguage();
  const [activeSubTab, setActiveSubTab] = useState<'track' | 'new'>(
    initialSchemeId ? 'new' : 'track'
  );

  const [applications, setApplications] = useState<Application[]>([]);
  const [vaultDocs, setVaultDocs] = useState<UserDocument[]>([]);
  const [schemes, setSchemes] = useState<GovernmentScheme[]>([]);
  const [loading, setLoading] = useState(true);

  // Wizard state
  const [currentStep, setCurrentStep] = useState(1);
  const [selectedSchemeId, setSelectedSchemeId] = useState(initialSchemeId || 'SCHEME-KUSUM-B');
  const [schemeName, setSchemeName] = useState(initialSchemeName || 'PM-KUSUM Component B: Standalone Solar Agriculture Pumps');
  const [claimAmount, setClaimAmount] = useState<number>(180000);
  const [attachedDocIds, setAttachedDocIds] = useState<string[]>([]);
  const [declarationAccepted, setDeclarationAccepted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [completedApp, setCompletedApp] = useState<Application | null>(null);

  // Detail modal for tracking
  const [selectedAppForModal, setSelectedAppForModal] = useState<Application | null>(null);
  // Official Acknowledgement Slip modal state
  const [acknowledgementApp, setAcknowledgementApp] = useState<Application | null>(null);
  // Live real-time status update notice
  const [realtimeNotice, setRealtimeNotice] = useState<{
    id: string;
    status: string;
    remarks: string;
    officer: string;
    timestamp: string;
  } | null>(null);
  const [isLiveConnected, setIsLiveConnected] = useState(realtimeService.isConnected);

  useEffect(() => {
    if (initialSchemeId && initialSchemeName) {
      setSelectedSchemeId(initialSchemeId);
      setSchemeName(initialSchemeName);
      setActiveSubTab('new');
    }
  }, [initialSchemeId, initialSchemeName]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [apps, docs, schemeList] = await Promise.all([
        api.getApplications(user?.id),
        api.getDocuments(user?.id),
        api.getSchemes()
      ]);

      // Direct Firestore check
      let combinedApps = Array.isArray(apps) ? [...apps] : [];
      try {
        const cloudApps = await getApplicationsFromCloud(user?.id);
        if (cloudApps && cloudApps.length > 0) {
          const map = new Map<string, Application>();
          combinedApps.forEach(a => map.set(a.id, a));
          cloudApps.forEach(ca => {
            const existing = map.get(ca.id);
            if (!existing || new Date(ca.updatedAt || ca.submittedAt) >= new Date(existing.updatedAt || existing.submittedAt)) {
              map.set(ca.id, ca);
            }
          });
          combinedApps = Array.from(map.values()).sort(
            (a, b) => new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime()
          );
        }
      } catch (cErr) {
        console.warn('Cloud applications fetch deferred:', cErr);
      }

      setApplications(combinedApps);
      setVaultDocs(docs);
      setSchemes(schemeList);

      // Auto-attach all verified docs
      const verifiedIds = docs.filter(d => d.verificationStatus === 'VERIFIED').map(d => d.id);
      setAttachedDocIds(verifiedIds);
    } catch (err) {
      console.error('Failed to load application data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();

    // 1. Direct WebSocket real-time listener for instant zero-refresh status updates
    const unsubWs = realtimeService.on('APPLICATION_STATUS_UPDATED', (event) => {
      const updatedApp = event.payload?.application as Application | undefined;
      const targetAppId = event.payload?.applicationId || updatedApp?.id;
      const newStatus = event.payload?.status || updatedApp?.status;
      const remarks = event.payload?.remarks || updatedApp?.officerRemarks;
      const officer = event.payload?.officer?.fullName || 'Reviewing Officer';
      const timestamp = event.payload?.updatedAt || new Date().toISOString();

      if (targetAppId) {
        setApplications(prev => {
          const exists = prev.find(a => a.id === targetAppId);
          if (exists) {
            return prev.map(a =>
              a.id === targetAppId
                ? {
                    ...a,
                    ...(updatedApp || {}),
                    status: newStatus,
                    officerRemarks: remarks,
                    updatedAt: timestamp
                  }
                : a
            );
          } else if (updatedApp) {
            return [updatedApp, ...prev];
          }
          return prev;
        });

        setSelectedAppForModal(prevModal => {
          if (prevModal && prevModal.id === targetAppId) {
            return {
              ...prevModal,
              ...(updatedApp || {}),
              status: newStatus,
              officerRemarks: remarks,
              updatedAt: timestamp
            };
          }
          return prevModal;
        });

        setRealtimeNotice({
          id: targetAppId,
          status: newStatus,
          remarks: remarks || '',
          officer,
          timestamp
        });

        if (newStatus === 'APPROVED') {
          confetti({
            particleCount: 90,
            spread: 80,
            origin: { y: 0.6 }
          });
        }
      }
    });

    const unsubWsAppCreated = realtimeService.on('APPLICATION_CREATED', (event) => {
      const newCreatedApp = event.payload?.application as Application | undefined;
      if (newCreatedApp) {
        setApplications(prev => {
          if (prev.some(a => a.id === newCreatedApp.id)) return prev;
          return [newCreatedApp, ...prev];
        });
      }
    });

    const checkInterval = setInterval(() => {
      setIsLiveConnected(realtimeService.isConnected);
    }, 2000);

    // 2. Attach real-time Firestore listener for live status updates, cleanly unsubscribed on unmount
    const unsubscribeFirestore = subscribeToCloudApplications((liveApps) => {
      if (liveApps && liveApps.length > 0) {
        setApplications(prev => {
          const map = new Map<string, Application>();
          prev.forEach(p => map.set(p.id, p));
          liveApps.forEach(la => {
            const existing = map.get(la.id);
            if (!existing || new Date(la.updatedAt || la.submittedAt) >= new Date(existing.updatedAt || existing.submittedAt)) {
              map.set(la.id, la);
            }
          });
          return Array.from(map.values()).sort(
            (a, b) => new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime()
          );
        });
      }
    }, user?.id);

    return () => {
      unsubWs();
      unsubWsAppCreated();
      clearInterval(checkInterval);
      if (typeof unsubscribeFirestore === 'function') {
        unsubscribeFirestore();
      }
    };
  }, [user]);

  const handleSchemeChange = (id: string) => {
    setSelectedSchemeId(id);
    const found = schemes.find(s => s.id === id);
    if (found) {
      setSchemeName(found.name);
    }
  };

  const handleToggleDoc = (docId: string) => {
    setAttachedDocIds(prev =>
      prev.includes(docId) ? prev.filter(id => id !== docId) : [...prev, docId]
    );
  };

  const handleSubmitApplication = async () => {
    if (!declarationAccepted) {
      alert('Please check the declaration box confirming the truthfulness of the information.');
      return;
    }

    setSubmitting(true);
    try {
      const newApp = await api.createApplication({
        schemeId: selectedSchemeId,
        schemeName,
        attachedDocumentIds: attachedDocIds,
        subsidyClaimAmount: claimAmount,
        priority: 'MEDIUM'
      });

      // Fire victory celebration
      try {
        confetti({
          particleCount: 80,
          spread: 70,
          origin: { y: 0.6 }
        });
      } catch (e) {
        // Confetti fallback
      }

      setCompletedApp(newApp);

      // Automated Real-Time SMS to Farmer's Phone (Works in Online & Offline)
      try {
        await dispatchRealTimeSms({
          recipientMobile: user?.mobile || '+91 98220 12345',
          recipientName: user?.fullName || 'Farmer',
          type: 'APPLICATION_SUBMITTED',
          title: `Application Lodged: ${newApp.applicationNumber}`,
          message: `Priye ${user?.fullName || 'Kisan'}, aapka aavedan ${newApp.applicationNumber} yojna '${newApp.schemeName}' hetu safalta-purvak darj ho gaya hai. Status track karne hetu Krishi Portal par login karein.`,
          relatedId: newApp.id,
          forceOpenMessagesApp: false // Will auto-open if farmer preference has auto-launch enabled
        });
      } catch (smsErr) {
        console.warn('Real-time SMS dispatch deferred:', smsErr);
      }

      await loadData();
    } catch (err) {
      console.error('Submission error:', err);
      alert('Failed to submit application. Please check details.');
    } finally {
      setSubmitting(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'APPROVED':
        return (
          <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 flex items-center gap-1">
            <CheckCircle2 className="w-3.5 h-3.5" />
            {t('statusApproved', 'Approved & Sanctioned')}
          </span>
        );
      case 'PENDING':
        return (
          <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 flex items-center gap-1">
            <Clock className="w-3.5 h-3.5" />
            {t('statusPending', 'Pending Verification')}
          </span>
        );
      case 'UNDER_REVIEW':
        return (
          <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300 flex items-center gap-1">
            <Clock className="w-3.5 h-3.5" />
            {t('statusUnderReview', 'Officer Scrutiny In Progress')}
          </span>
        );
      case 'DOCUMENTS_REQUIRED':
        return (
          <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-orange-100 text-orange-800 dark:bg-orange-950 dark:text-orange-300 flex items-center gap-1">
            <AlertCircle className="w-3.5 h-3.5" />
            {t('statusDocsRequired', 'Documents Required')}
          </span>
        );
      case 'REJECTED':
        return (
          <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300 flex items-center gap-1">
            <XCircle className="w-3.5 h-3.5" />
            {t('statusRejected', 'Application Rejected')}
          </span>
        );
      default:
        return (
          <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300 flex items-center gap-1">
            <FileText className="w-3.5 h-3.5" />
            {t('statusSubmitted', 'Submitted to Department')}
          </span>
        );
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Top Switcher: Track Applications vs Apply Now */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white">
            {t('applicationsTitle', 'Application Submission & Real-Time Tracking')}
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            {t('applicationsSubtitle', 'Submit verified subsidy dossiers and monitor officer review milestones.')}
          </p>
        </div>

        <div className="flex rounded-xl bg-slate-100 dark:bg-slate-800 p-1">
          <button
            onClick={() => {
              setActiveSubTab('track');
              setCompletedApp(null);
            }}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition ${
              activeSubTab === 'track'
                ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
            }`}
          >
            {t('myApplications', 'My Applications')} ({applications.length})
          </button>
          <button
            onClick={() => {
              setActiveSubTab('new');
              setCurrentStep(1);
              setCompletedApp(null);
            }}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition ${
              activeSubTab === 'new'
                ? 'bg-emerald-700 text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
            }`}
          >
            {t('btnNewApplication', '+ New Application')}
          </button>
        </div>
      </div>

      {/* VIEW 1: MY APPLICATIONS LIST & TIMELINE */}
      {activeSubTab === 'track' && (
        <div className="space-y-4">
          {/* Live Real-Time Status Notification Alert */}
          {realtimeNotice && (
            <div className="p-4 rounded-xl bg-gradient-to-r from-emerald-500/15 via-emerald-600/10 to-teal-500/15 border-2 border-emerald-500/50 shadow-md animate-in fade-in slide-in-from-top-2 duration-300 flex items-start justify-between gap-3">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-full bg-emerald-600 text-white flex items-center justify-center shrink-0 mt-0.5 animate-bounce">
                  <Sparkles className="w-4 h-4" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-700 text-white">
                      Real-Time Update
                    </span>
                    <span className="text-xs font-mono font-bold text-slate-800 dark:text-slate-200">
                      #{realtimeNotice.id}
                    </span>
                    <span className="text-xs font-bold text-emerald-800 dark:text-emerald-300">
                      → {realtimeNotice.status}
                    </span>
                  </div>
                  <p className="text-xs sm:text-sm font-semibold text-slate-900 dark:text-white mt-1">
                    Officer {realtimeNotice.officer} updated this application status to{' '}
                    <span className="underline decoration-emerald-500 decoration-2">{realtimeNotice.status}</span>.
                  </p>
                  {realtimeNotice.remarks && (
                    <p className="text-xs text-slate-600 dark:text-slate-300 italic mt-0.5">
                      "{realtimeNotice.remarks}"
                    </p>
                  )}
                </div>
              </div>
              <button
                onClick={() => setRealtimeNotice(null)}
                className="text-xs text-slate-400 hover:text-slate-700 dark:hover:text-white p-1"
                title="Dismiss"
              >
                ✕
              </button>
            </div>
          )}

          {/* Real-time synchronization indicator */}
          <div className="flex items-center justify-between text-xs px-1 text-slate-500 dark:text-slate-400">
            <div className="flex items-center gap-2">
              <span className={`w-2 h-2 rounded-full ${isLiveConnected ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'}`} />
              <span className="font-semibold text-slate-700 dark:text-slate-300">
                {isLiveConnected ? 'Real-time WebSocket Live Sync Active' : 'Connecting to Live Department Desk...'}
              </span>
            </div>
            <span className="text-[11px] text-slate-400">
              Instant updates enabled (no refresh needed)
            </span>
          </div>

          {applications.map((app) => (
            <div
              key={app.id}
              className="p-5 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-xs space-y-4"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-700/80">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono font-bold text-slate-400">
                      {app.applicationNumber}
                    </span>
                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300">
                      {app.schemeType}
                    </span>
                  </div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white mt-1">
                    {app.schemeName}
                  </h3>
                  <div className="text-xs text-slate-500 dark:text-slate-400">
                    Applicant: <strong>{app.applicantName}</strong> • Submitted: {new Date(app.submittedAt).toLocaleDateString()}
                  </div>
                </div>

                <div className="flex flex-col sm:items-end gap-1.5">
                  {getStatusBadge(app.status)}
                  {app.subsidyClaimAmount && (
                    <div className="text-xs font-bold text-emerald-700 dark:text-emerald-400 font-mono">
                      Claim: ₹{app.subsidyClaimAmount.toLocaleString()}
                    </div>
                  )}
                </div>
              </div>

              {/* Progress Milestones Bar */}
              <div className="py-2">
                <div className="text-xs font-bold text-slate-700 dark:text-slate-300 mb-2">
                  Scrutiny & Sanction Milestones:
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-4 gap-2">
                  {[
                    { label: '1. Lodged', done: true },
                    { label: '2. Document Verification', done: app.status !== 'SUBMITTED' },
                    { label: '3. Field Inspection', done: app.status === 'APPROVED' || app.status === 'UNDER_REVIEW' },
                    { label: '4. DBT Sanction', done: app.status === 'APPROVED' }
                  ].map((m, idx) => (
                    <div
                      key={idx}
                      className={`p-2 rounded-lg text-[11px] font-medium flex items-center gap-2 border ${
                        m.done
                          ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-300 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 font-semibold'
                          : 'bg-slate-50 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700 text-slate-400'
                      }`}
                    >
                      <span className={`w-4 h-4 rounded-full flex items-center justify-center text-[10px] text-white ${
                        m.done ? 'bg-emerald-600' : 'bg-slate-300 dark:bg-slate-600'
                      }`}>
                        {idx + 1}
                      </span>
                      <span>{m.label}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Latest Officer Remarks */}
              {app.timeline && app.timeline.length > 0 && (
                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-700/60 text-xs">
                  <div className="flex items-center justify-between text-[11px] text-slate-400 mb-1">
                    <span className="font-semibold text-slate-700 dark:text-slate-300">
                      Officer Audit Note:
                    </span>
                    <span>{new Date(app.timeline[app.timeline.length - 1].timestamp).toLocaleDateString()}</span>
                  </div>
                  <p className="text-slate-700 dark:text-slate-200">
                    "{app.timeline[app.timeline.length - 1].remarks}"
                  </p>
                  <div className="text-[10px] text-slate-400 mt-1">
                    Logged by: {app.timeline[app.timeline.length - 1].byRole} ({app.timeline[app.timeline.length - 1].byName})
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  id={`btn-slip-${app.id}`}
                  onClick={() => setAcknowledgementApp(app)}
                  className="px-3.5 py-2 text-xs font-bold rounded-xl bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-300 dark:border-emerald-700 hover:bg-emerald-100 dark:hover:bg-emerald-900 text-emerald-800 dark:text-emerald-200 flex items-center gap-2 transition active:scale-95 shadow-2xs cursor-pointer"
                >
                  <Printer className="w-3.5 h-3.5 text-emerald-700 dark:text-emerald-400" />
                  <span>{t('btnPrintSlip', 'Print Acknowledgement Slip')}</span>
                </button>
              </div>
            </div>
          ))}

          {applications.length === 0 && !loading && (
            <div className="p-8 text-center rounded-2xl border-2 border-dashed border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800">
              <FileCheck2 className="w-10 h-10 text-slate-300 mx-auto mb-2" />
              <h4 className="font-bold text-slate-700 dark:text-slate-200">{t('noApplications', 'No applications lodged yet')}</h4>
              <p className="text-xs text-slate-500 mt-1 mb-4">
                {t('noApplicationsDesc', 'You can apply for PM-KUSUM solar pumps, drip irrigation, or Kisan Credit Card in a few minutes.')}
              </p>
              <button
                onClick={() => setActiveSubTab('new')}
                className="px-4 py-2 text-xs font-bold rounded-xl bg-emerald-700 text-white"
              >
                {t('btnStartApplication', 'Start New Application')}
              </button>
            </div>
          )}
        </div>
      )}

      {/* VIEW 2: APPLICATION WIZARD */}
      {activeSubTab === 'new' && (
        <div>
          {/* Submission Success Screen */}
          {completedApp ? (
            <div className="p-6 sm:p-8 rounded-2xl bg-white dark:bg-slate-800 border border-emerald-300 dark:border-emerald-800 shadow-xl text-center max-w-xl mx-auto space-y-4 animate-in zoom-in-95">
              <div className="w-14 h-14 rounded-2xl bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 flex items-center justify-center mx-auto ring-8 ring-emerald-50 dark:ring-emerald-900/30">
                <CheckCircle2 className="w-8 h-8" />
              </div>

              <div>
                <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                  Application Successfully Lodged
                </span>
                <h3 className="text-xl font-extrabold text-slate-900 dark:text-white mt-2">
                  Dossier Dispatched to Agricultural Desk
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  Your application has been assigned to the District Agriculture & Verification Officer.
                </p>
              </div>

              <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900/80 border border-slate-200 dark:border-slate-700 text-left space-y-1.5 text-xs">
                <div className="flex justify-between">
                  <span className="text-slate-500">Official Tracking Number:</span>
                  <strong className="font-mono text-emerald-700 dark:text-emerald-400 font-bold">
                    {completedApp.applicationNumber}
                  </strong>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Scheme:</span>
                  <span className="font-semibold text-slate-800 dark:text-white truncate max-w-[200px]">
                    {completedApp.schemeName}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Applicant:</span>
                  <span className="font-semibold text-slate-800 dark:text-white">{completedApp.applicantName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Subsidy Claim:</span>
                  <span className="font-semibold font-mono text-slate-800 dark:text-white">
                    ₹{completedApp.subsidyClaimAmount?.toLocaleString()}
                  </span>
                </div>
              </div>

              <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-xs flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 rounded-lg bg-emerald-100 dark:bg-emerald-900 text-emerald-700 dark:text-emerald-300">
                    <Smartphone className="w-4 h-4" />
                  </div>
                  <div className="text-left">
                    <p className="font-bold text-emerald-900 dark:text-emerald-200">SMS Confirmation Dispatched</p>
                    <p className="text-[11px] text-emerald-700 dark:text-emerald-400">
                      Receipt sent to {user?.mobile || '+91 98220 12345'} via Gov SMS Gateway
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => openNativeMessagesApp(
                    user?.mobile || '+91 98220 12345',
                    `Gov Krishi Portal: Aavedan ${completedApp.applicationNumber} darj hua. Track karein: https://farmer.gov.in/app/${completedApp.applicationNumber}`
                  )}
                  className="px-2.5 py-1.5 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white text-[11px] font-bold shrink-0 flex items-center gap-1"
                >
                  <MessageSquare className="w-3 h-3" />
                  <span>Open SMS</span>
                </button>
              </div>

              <div className="flex flex-col sm:flex-row gap-2 pt-2">
                <button
                  type="button"
                  id="btn-completed-slip"
                  onClick={() => setAcknowledgementApp(completedApp)}
                  className="flex-1 py-2.5 rounded-xl border border-emerald-300 dark:border-emerald-700 bg-emerald-50 dark:bg-emerald-950/40 text-xs font-bold text-emerald-900 dark:text-emerald-200 hover:bg-emerald-100 transition flex items-center justify-center gap-1.5 shadow-2xs cursor-pointer"
                >
                  <Printer className="w-3.5 h-3.5 text-emerald-700 dark:text-emerald-400" />
                  <span>View & Print Acknowledgement Slip</span>
                </button>
                <button
                  onClick={() => {
                    setActiveSubTab('track');
                    setCompletedApp(null);
                  }}
                  className="flex-1 py-2.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold transition"
                >
                  View Application Status
                </button>
              </div>
            </div>
          ) : (
            /* Multi-step form container */
            <div className="p-6 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-xs space-y-6 max-w-2xl mx-auto">
              {/* Wizard Steps Header */}
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-700/80 pb-4">
                {[
                  { num: 1, title: 'Scheme' },
                  { num: 2, title: 'Land & Farm' },
                  { num: 3, title: 'Attach Vault Docs' },
                  { num: 4, title: 'Review & Submit' }
                ].map((s) => (
                  <div key={s.num} className="flex items-center gap-2">
                    <div
                      className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                        currentStep === s.num
                          ? 'bg-emerald-700 text-white'
                          : currentStep > s.num
                          ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                          : 'bg-slate-100 text-slate-400 dark:bg-slate-700'
                      }`}
                    >
                      {currentStep > s.num ? '✓' : s.num}
                    </div>
                    <span className="text-xs font-semibold hidden sm:inline text-slate-700 dark:text-slate-300">
                      {s.title}
                    </span>
                  </div>
                ))}
              </div>

              {/* STEP 1: Scheme Selection */}
              {currentStep === 1 && (
                <div className="space-y-4">
                  <h3 className="font-bold text-sm text-slate-900 dark:text-white">
                    Step 1: Select Scheme or Agricultural Loan
                  </h3>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                      Target Scheme:
                    </label>
                    <select
                      value={selectedSchemeId}
                      onChange={(e) => handleSchemeChange(e.target.value)}
                      className="w-full text-xs py-2.5 px-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500 font-medium"
                    >
                      {schemes.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.name} ({s.category})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Estimated Subsidy Claim / Project Cost (₹):
                    </label>
                    <input
                      type="number"
                      value={claimAmount}
                      onChange={(e) => setClaimAmount(parseInt(e.target.value) || 0)}
                      className="w-full text-xs py-2.5 px-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>

                  <div className="pt-2 flex justify-end">
                    <button
                      onClick={() => setCurrentStep(2)}
                      className="px-4 py-2 text-xs font-bold rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white flex items-center gap-1.5 shadow-xs"
                    >
                      <span>Next: Confirm Farm Details</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              )}

              {/* STEP 2: Farmer & Land Details */}
              {currentStep === 2 && (
                <div className="space-y-4">
                  <h3 className="font-bold text-sm text-slate-900 dark:text-white">
                    Step 2: Confirm Farm Particulars
                  </h3>

                  <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-700 text-xs space-y-2">
                    <div className="flex justify-between">
                      <span className="text-slate-500">Applicant Farmer Name:</span>
                      <strong className="text-slate-900 dark:text-white">{user?.fullName || 'Balasaheb Shinde'}</strong>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Aadhaar Linked Mobile:</span>
                      <span className="text-slate-800 dark:text-white">{user?.phoneNumber || '+91 98220 12345'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">State & District:</span>
                      <span className="text-slate-800 dark:text-white">{user?.state || 'Maharashtra'}, {user?.district || 'Pune'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Landholding Record:</span>
                      <span className="text-slate-800 dark:text-white">{farmerProfile?.landAreaAcres || 3.5} Acres (Gat No. 42)</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Bank Account for DBT:</span>
                      <span className="text-slate-800 dark:text-white">SBI A/C ****4821 (IFSC: SBIN0001234)</span>
                    </div>
                  </div>

                  <div className="pt-2 flex items-center justify-between">
                    <button
                      onClick={() => setCurrentStep(1)}
                      className="px-3.5 py-2 text-xs font-semibold rounded-xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300"
                    >
                      Back
                    </button>
                    <button
                      onClick={() => setCurrentStep(3)}
                      className="px-4 py-2 text-xs font-bold rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white flex items-center gap-1.5 shadow-xs"
                    >
                      <span>Next: Attach Verified Documents</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              )}

              {/* STEP 3: Attach Vault Documents */}
              {currentStep === 3 && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="font-bold text-sm text-slate-900 dark:text-white">
                      Step 3: Attach Documents from Vault
                    </h3>
                    <button
                      onClick={onOpenVault}
                      className="text-xs text-emerald-700 dark:text-emerald-400 font-semibold hover:underline"
                    >
                      Open Document Vault
                    </button>
                  </div>

                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Select documents stored in your vault to attach to this application dossier:
                  </p>

                  <div className="space-y-2">
                    {vaultDocs.map((doc) => {
                      const isAttached = attachedDocIds.includes(doc.id);
                      return (
                        <label
                          key={doc.id}
                          className={`p-3 rounded-xl border transition cursor-pointer flex items-center justify-between ${
                            isAttached
                              ? 'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-500 text-slate-900 dark:text-white'
                              : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300'
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <input
                              type="checkbox"
                              checked={isAttached}
                              onChange={() => handleToggleDoc(doc.id)}
                              className="w-4 h-4 text-emerald-600 rounded"
                            />
                            <div>
                              <div className="text-xs font-bold">{doc.documentType}</div>
                              <div className="text-[10px] text-slate-400 font-mono">{doc.fileName}</div>
                            </div>
                          </div>

                          <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                            {doc.verificationStatus}
                          </span>
                        </label>
                      );
                    })}

                    {vaultDocs.length === 0 && (
                      <div className="p-4 rounded-xl border border-dashed border-amber-300 bg-amber-50 dark:bg-amber-950/20 text-xs text-amber-800 dark:text-amber-300">
                        No documents found in vault. Please upload your 7/12 extract and Aadhaar.
                      </div>
                    )}
                  </div>

                  <div className="pt-2 flex items-center justify-between">
                    <button
                      onClick={() => setCurrentStep(2)}
                      className="px-3.5 py-2 text-xs font-semibold rounded-xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300"
                    >
                      Back
                    </button>
                    <button
                      onClick={() => setCurrentStep(4)}
                      className="px-4 py-2 text-xs font-bold rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white flex items-center gap-1.5 shadow-xs"
                    >
                      <span>Next: Final Review & Submit</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              )}

              {/* STEP 4: Review & Legal Undertaking */}
              {currentStep === 4 && (
                <div className="space-y-4">
                  <h3 className="font-bold text-sm text-slate-900 dark:text-white">
                    Step 4: Review Application & Declaration
                  </h3>

                  <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-700 text-xs space-y-1.5">
                    <div><strong>Scheme:</strong> {schemeName}</div>
                    <div><strong>Claim Amount:</strong> ₹{claimAmount.toLocaleString()}</div>
                    <div><strong>Attached Documents:</strong> {attachedDocIds.length} files attached</div>
                    <div><strong>Direct DBT Account:</strong> Verified Aadhaar Linked Account</div>
                  </div>

                  <div className="p-3.5 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/40">
                    <label className="flex items-start gap-2.5 cursor-pointer text-xs text-amber-950 dark:text-amber-200">
                      <input
                        type="checkbox"
                        checked={declarationAccepted}
                        onChange={(e) => setDeclarationAccepted(e.target.checked)}
                        className="w-4 h-4 rounded text-emerald-600 mt-0.5"
                      />
                      <span className="leading-relaxed">
                        I hereby solemnly affirm that the land and agricultural information submitted is true and correct to the best of my knowledge under the Government of India Gazette Guidelines.
                      </span>
                    </label>
                  </div>

                  <div className="pt-2 flex items-center justify-between">
                    <button
                      onClick={() => setCurrentStep(3)}
                      className="px-3.5 py-2 text-xs font-semibold rounded-xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300"
                    >
                      Back
                    </button>
                    <button
                      onClick={handleSubmitApplication}
                      disabled={submitting || !declarationAccepted}
                      className="px-5 py-2.5 text-xs sm:text-sm font-bold rounded-xl bg-emerald-700 hover:bg-emerald-800 disabled:opacity-50 text-white flex items-center gap-2 shadow-md transition active:scale-95"
                    >
                      <Sparkles className="w-4 h-4 text-amber-300" />
                      <span>{submitting ? 'Submitting Application...' : 'Sign & Submit Application'}</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Official DBT Application Acknowledgement Slip Modal */}
      <AcknowledgementSlipModal
        application={acknowledgementApp}
        isOpen={Boolean(acknowledgementApp)}
        onClose={() => setAcknowledgementApp(null)}
      />
    </div>
  );
};
