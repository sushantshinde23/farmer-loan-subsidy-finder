import React, { useState, useEffect } from 'react';
import {
  ShieldCheck,
  Building2,
  CheckCircle2,
  XCircle,
  AlertCircle,
  FileText,
  Clock,
  Search,
  Filter,
  Eye,
  UserCheck,
  Loader2,
  Mail,
  Lock,
  X,
  Download,
  Shield
} from 'lucide-react';
import { api } from '../services/api';
import { Application, UserDocument } from '../types';
import { useAuth } from '../context/AuthContext';
import { dispatchRealTimeSms } from '../services/smsService';
import { getWorkspaceAccessToken, signInWithGoogleWorkspace } from '../lib/firebase';
import { GmailComposeModal } from '../components/GmailComposeModal';

export const OfficerDashboard: React.FC = () => {
  const { user, role } = useAuth();
  const [applications, setApplications] = useState<Application[]>([]);
  const [selectedApp, setSelectedApp] = useState<Application | null>(null);
  const [loading, setLoading] = useState(true);

  // Scrutiny Action Form State
  const [newStatus, setNewStatus] = useState<string>('APPROVED');
  const [officerRemarks, setOfficerRemarks] = useState('');
  const [missingDocInput, setMissingDocInput] = useState('');
  const [updating, setUpdating] = useState(false);
  const [activeTabFilter, setActiveTabFilter] = useState<string>('ALL');

  // Document Inspection & Secure Access Ticket State
  const [appDocs, setAppDocs] = useState<UserDocument[]>([]);
  const [loadingDocs, setLoadingDocs] = useState(false);
  const [fetchingTicket, setFetchingTicket] = useState(false);
  const [activeTicketDoc, setActiveTicketDoc] = useState<{
    docId: string;
    docName: string;
    docType: string;
    viewUrl: string;
    downloadUrl: string;
    remainingSeconds: number;
  } | null>(null);

  // Gmail Compose State
  const [showGmailModal, setShowGmailModal] = useState(false);
  const [gmailRecipient, setGmailRecipient] = useState('');
  const [gmailSubject, setGmailSubject] = useState('');
  const [gmailBody, setGmailBody] = useState('');

  const isBankOfficer = role === 'BANK_OFFICER';

  // Countdown timer for officer ticket validity
  useEffect(() => {
    if (!activeTicketDoc) return;
    const interval = setInterval(() => {
      setActiveTicketDoc(prev => {
        if (!prev) return null;
        if (prev.remainingSeconds <= 1) {
          clearInterval(interval);
          return null; // Link Expired
        }
        return { ...prev, remainingSeconds: prev.remainingSeconds - 1 };
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [activeTicketDoc?.viewUrl]);

  const loadAppDocuments = async (app: Application) => {
    setLoadingDocs(true);
    try {
      const allDocs = await api.getDocuments(app.userId);
      setAppDocs(allDocs);
    } catch {
      setAppDocs([]);
    } finally {
      setLoadingDocs(false);
    }
  };

  const handleOfficerInspectDoc = async (doc: UserDocument) => {
    setFetchingTicket(true);
    try {
      const ticketRes = await api.getDocumentAccessTicket(
        doc.id,
        'VIEW',
        `Official scrutiny of ${doc.documentType} for application #${selectedApp?.id}`
      );
      setActiveTicketDoc({
        docId: doc.id,
        docName: doc.fileName,
        docType: doc.documentType,
        viewUrl: ticketRes.viewUrl,
        downloadUrl: ticketRes.downloadUrl,
        remainingSeconds: ticketRes.expiresInSeconds
      });
    } catch (err: any) {
      alert(`Access Clearance Error: ${err?.message || 'Access denied by system security.'}`);
    } finally {
      setFetchingTicket(false);
    }
  };

  const handleVerifyDoc = async (docId: string, status: 'VERIFIED' | 'REJECTED') => {
    const remarks = prompt(
      status === 'VERIFIED'
        ? 'Enter officer verification remark (e.g. Validated against official Land Records):'
        : 'Enter reason for rejecting or flagging this document:'
    );
    if (remarks === null) return;
    try {
      await api.verifyDocument(docId, status, remarks || undefined);
      if (selectedApp) {
        await loadAppDocuments(selectedApp);
      }
      alert(`Document marked as ${status}. Official audit logged.`);
    } catch (err: any) {
      alert(`Verification action failed: ${err?.message || 'Access error'}`);
    }
  };

  const fetchApplications = async () => {
    setLoading(true);
    try {
      const data = await api.getApplications();
      setApplications(data);
      if (data.length > 0 && !selectedApp) {
        setSelectedApp(data[0]);
      }
    } catch (err) {
      console.error('Failed to load officer queue:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchApplications();
  }, [role]);

  useEffect(() => {
    if (selectedApp) {
      loadAppDocuments(selectedApp);
    }
  }, [selectedApp?.id]);

  const handleUpdateStatus = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedApp || !officerRemarks.trim()) {
      alert('Please enter formal officer inspection remarks.');
      return;
    }

    setUpdating(true);
    try {
      const requestedDocs = missingDocInput
        ? missingDocInput.split(',').map(s => s.trim()).filter(Boolean)
        : undefined;

      const updated = await api.updateApplicationStatus(selectedApp.id, {
        status: newStatus,
        remarks: officerRemarks.trim(),
        requestedDocuments: requestedDocs
      });

      // Dispatch automated real-time SMS to applicant phone
      try {
        let smsType: 'STATUS_UPDATE' | 'DBT_CREDIT' = 'STATUS_UPDATE';
        let smsTitle = `Application Status Update: ${updated.applicationNumber}`;
        let smsMsg = `Gov Portal Update: Aapke aavedan ${updated.applicationNumber} ka status ab '${newStatus}' hai. Adhikari tippani: ${officerRemarks.trim()}`;

        if (newStatus === 'APPROVED') {
          smsType = 'DBT_CREDIT';
          smsTitle = `Congratulations! Application Approved (${updated.applicationNumber})`;
          smsMsg = `Badhaai ho! Aapka aavedan ${updated.applicationNumber} (${updated.schemeName}) manzoor kar liya gaya hai. DBT subsidy rashi jald hi bank khate mein aavedhit ki jayegi.`;
        } else if (newStatus === 'REJECTED') {
          smsType = 'STATUS_UPDATE';
          smsTitle = `Application Notice: ${updated.applicationNumber}`;
          smsMsg = `Soochana: Aavedan ${updated.applicationNumber} asweekar kar diya gaya hai. Kaaran: ${officerRemarks.trim()}. Sahayata hetu Kiosk ya Agri Helpdesk se sampark karein.`;
        }

        await dispatchRealTimeSms({
          recipientMobile: '+91 98220 12345',
          recipientName: updated.applicantName,
          type: smsType,
          title: smsTitle,
          message: smsMsg,
          relatedId: updated.id
        });
      } catch (smsErr) {
        console.warn('Real-time SMS dispatch deferred:', smsErr);
      }

      setSelectedApp(updated);
      setOfficerRemarks('');
      setMissingDocInput('');
      await fetchApplications();
      alert(`Application ${updated.applicationNumber} updated to ${newStatus} successfully.`);
    } catch (err) {
      console.error('Status update failed:', err);
      alert('Failed to update status. Please try again.');
    } finally {
      setUpdating(false);
    }
  };

  const filteredApps = applications.filter(app => {
    if (activeTabFilter === 'ALL') return true;
    return app.status === activeTabFilter;
  });

  return (
    <div className="space-y-6 pb-12">
      {/* Officer Desk Banner */}
      <div className="p-5 rounded-2xl bg-gradient-to-r from-blue-900 to-slate-900 text-white shadow-md border border-blue-800/50 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-blue-700/60 text-white">
              <Building2 className="w-5 h-5" />
            </span>
            <h2 className="text-lg sm:text-xl font-black">
              {isBankOfficer ? 'Bank Officer Credit Scrutiny & Sanction Desk' : 'Agriculture Department Sanction Desk'}
            </h2>
          </div>
          <p className="text-xs text-blue-200/90 font-medium">
            Authorized Officer: <strong>{user?.fullName}</strong> • Jurisdiction: {user?.district}, {user?.state}
          </p>
        </div>

        <div className="flex items-center gap-2 bg-blue-950/60 px-3 py-1.5 rounded-xl border border-blue-700/50 text-xs">
          <ShieldCheck className="w-4 h-4 text-emerald-400" />
          <span>Legally Binding Digital Signature Active</span>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
        {['ALL', 'PENDING', 'UNDER_REVIEW', 'DOCUMENTS_REQUIRED', 'APPROVED', 'REJECTED'].map((st) => (
          <button
            key={st}
            onClick={() => setActiveTabFilter(st)}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition shrink-0 ${
              activeTabFilter === st
                ? 'bg-blue-700 text-white shadow-xs'
                : 'bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50'
            }`}
          >
            {st === 'PENDING' ? 'Pending' : st.replace(/_/g, ' ')}
          </button>
        ))}
      </div>

      {/* Master Detail Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Applications Queue */}
        <div className="lg:col-span-5 space-y-3">
          <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
            Assigned Applications Queue ({filteredApps.length})
          </h3>

          <div className="space-y-2.5 max-h-[600px] overflow-y-auto pr-1">
            {filteredApps.map((app) => {
              const isSelected = selectedApp?.id === app.id;
              return (
                <div
                  key={app.id}
                  onClick={() => setSelectedApp(app)}
                  className={`p-3.5 rounded-xl border transition cursor-pointer ${
                    isSelected
                      ? 'bg-blue-50/80 dark:bg-blue-950/30 border-blue-500 shadow-sm'
                      : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="text-[10px] font-mono font-bold text-slate-400">
                        {app.applicationNumber}
                      </div>
                      <h4 className="font-bold text-xs sm:text-sm text-slate-900 dark:text-white line-clamp-1">
                        {app.schemeName}
                      </h4>
                      <div className="text-xs text-slate-600 dark:text-slate-300 mt-0.5">
                        Farmer: <strong>{app.applicantName}</strong>
                      </div>
                    </div>

                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded shrink-0 ${
                        app.status === 'APPROVED'
                          ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                          : app.status === 'REJECTED'
                          ? 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'
                          : 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                      }`}
                    >
                      {app.status}
                    </span>
                  </div>

                  <div className="mt-2 pt-2 border-t border-slate-100 dark:border-slate-700/60 flex items-center justify-between text-[10px] text-slate-400">
                    <span>Priority: <strong>{app.priority}</strong></span>
                    <span>₹{app.subsidyClaimAmount?.toLocaleString() || 0}</span>
                  </div>
                </div>
              );
            })}

            {filteredApps.length === 0 && (
              <div className="p-6 text-center text-xs text-slate-400 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700">
                No applications matching this filter.
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Active Scrutiny & Approval Panel */}
        <div className="lg:col-span-7">
          {selectedApp ? (
            <div className="p-5 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-xs space-y-5">
              {/* Top Header of Selected Dossier */}
              <div className="flex items-start justify-between pb-3 border-b border-slate-200 dark:border-slate-700">
                <div>
                  <span className="text-xs font-mono font-bold text-slate-400">
                    {selectedApp.applicationNumber}
                  </span>
                  <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">
                    {selectedApp.schemeName}
                  </h3>
                  <div className="text-xs text-slate-500">
                    Applicant: <strong className="text-slate-800 dark:text-slate-200">{selectedApp.applicantName}</strong> • Aadhaar: ****-****-4821
                  </div>
                </div>

                <div className="text-right">
                  <div className="text-xs font-bold text-emerald-700 dark:text-emerald-400 font-mono">
                    ₹{selectedApp.subsidyClaimAmount?.toLocaleString()}
                  </div>
                  <div className="text-[10px] text-slate-400">Subsidy Claim</div>
                </div>
              </div>

              {/* Farmer & Land Particulars Verification Box */}
              <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-700 text-xs space-y-1.5">
                <div className="font-bold text-slate-800 dark:text-slate-200 mb-1">
                  Landholding & Cultivation Verification:
                </div>
                <div className="grid grid-cols-2 gap-2 text-slate-600 dark:text-slate-300">
                  <div>Survey/Gat No: <strong>Gat No. 42/1</strong></div>
                  <div>Recorded Area: <strong>3.5 Acres (1.41 Ha)</strong></div>
                  <div>Land Classification: <strong>Jirayat / Bagayat</strong></div>
                  <div>Water Source: <strong>Borewell + Farm Pond</strong></div>
                </div>
              </div>

              {/* Attached Farmer Documents (Strict Officer Scrutiny & Audited Viewing) */}
              <div className="space-y-2.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <FileText className="w-4 h-4 text-blue-600" />
                    <h4 className="font-bold text-xs sm:text-sm text-slate-900 dark:text-white">
                      Attached Dossier Documents ({appDocs.length})
                    </h4>
                  </div>
                  <span className="text-[10px] text-slate-400 flex items-center gap-1">
                    <Lock className="w-3 h-3 text-emerald-600" />
                    AES-256-GCM Encrypted • Audited Officer Session
                  </span>
                </div>

                {loadingDocs ? (
                  <div className="p-4 text-center text-xs text-slate-400 bg-slate-50 dark:bg-slate-900/40 rounded-xl">
                    <Loader2 className="w-4 h-4 animate-spin mx-auto text-blue-600 mb-1" />
                    <span>Verifying cryptographic access credentials & retrieving documents...</span>
                  </div>
                ) : appDocs.length === 0 ? (
                  <div className="p-4 text-center text-xs text-slate-400 bg-slate-50 dark:bg-slate-900/40 rounded-xl border border-dashed border-slate-200 dark:border-slate-700">
                    No documents attached or authorized for this application dossier.
                  </div>
                ) : (
                  <div className="space-y-2">
                    {appDocs.map((doc) => (
                      <div
                        key={doc.id}
                        className="p-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs"
                      >
                        <div className="space-y-0.5">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-slate-900 dark:text-white">
                              {doc.fileName}
                            </span>
                            <span className={`text-[10px] px-1.5 py-0.5 rounded font-bold ${
                              doc.status === 'VERIFIED'
                                ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                                : doc.status === 'REJECTED'
                                ? 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'
                                : 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                            }`}>
                              {doc.status || 'UPLOADED'}
                            </span>
                          </div>
                          <div className="flex items-center gap-2 text-[11px] text-slate-400">
                            <span>{doc.documentType}</span>
                            <span>•</span>
                            <span>{((doc.fileSize || 0) / 1024).toFixed(1)} KB</span>
                            {doc.officerRemarks && (
                              <>
                                <span>•</span>
                                <span className="text-slate-500 italic">"{doc.officerRemarks}"</span>
                              </>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center gap-1.5 shrink-0">
                          <button
                            type="button"
                            onClick={() => handleOfficerInspectDoc(doc)}
                            disabled={fetchingTicket}
                            className="px-2.5 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs flex items-center gap-1 transition cursor-pointer"
                            title="Generate audited temporary access ticket to inspect document"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            <span>Inspect Securely</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => handleVerifyDoc(doc.id, 'VERIFIED')}
                            className="px-2 py-1.5 rounded-lg border border-emerald-300 dark:border-emerald-700 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 font-bold text-xs transition cursor-pointer"
                            title="Mark document verified"
                          >
                            Verify
                          </button>

                          <button
                            type="button"
                            onClick={() => handleVerifyDoc(doc.id, 'REJECTED')}
                            className="px-2 py-1.5 rounded-lg border border-rose-300 dark:border-rose-700 text-rose-700 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 font-bold text-xs transition cursor-pointer"
                            title="Flag/reject document"
                          >
                            Flag
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Scrutiny Decision Form */}
              <form onSubmit={handleUpdateStatus} className="space-y-4 pt-1">
                <h4 className="font-bold text-xs sm:text-sm text-slate-900 dark:text-white flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-blue-600" />
                  <span>Record Official Scrutiny Decision & Action:</span>
                </h4>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                    Select Sanction Status:
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                    {[
                      { id: 'APPROVED', label: 'Approve & Sanction' },
                      { id: 'REJECTED', label: 'Reject / Decline' },
                      { id: 'PENDING', label: 'Keep Pending' },
                      { id: 'UNDER_REVIEW', label: 'Under Review' },
                      { id: 'DOCUMENTS_REQUIRED', label: 'Docs Required' }
                    ].map((st) => (
                      <button
                        type="button"
                        key={st.id}
                        onClick={() => setNewStatus(st.id)}
                        className={`py-2 px-2 rounded-lg text-xs font-bold border transition ${
                          newStatus === st.id
                            ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-950 border-slate-900'
                            : 'bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300'
                        }`}
                      >
                        {st.label}
                      </button>
                    ))}
                  </div>
                </div>

                {newStatus === 'DOCUMENTS_REQUIRED' && (
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Specify Missing Documents (comma separated):
                    </label>
                    <input
                      type="text"
                      value={missingDocInput}
                      onChange={(e) => setMissingDocInput(e.target.value)}
                      placeholder="e.g. Updated 7/12 Extract, Electricity NOC, Joint Ownership Consent"
                      className="w-full text-xs py-2 px-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white"
                    />
                  </div>
                )}

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Formal Officer Remarks (Audit Record & Farmer Notification):
                  </label>
                  <textarea
                    rows={3}
                    value={officerRemarks}
                    onChange={(e) => setOfficerRemarks(e.target.value)}
                    placeholder="Enter official verification remarks, survey findings, or reason for sanction/rejection..."
                    className="w-full text-xs p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div className="flex flex-col sm:flex-row gap-2 pt-1">
                  <button
                    type="submit"
                    disabled={updating || !officerRemarks.trim()}
                    className="flex-1 py-2.5 rounded-xl bg-blue-700 hover:bg-blue-800 disabled:opacity-50 text-white text-xs sm:text-sm font-bold shadow-md transition flex items-center justify-center gap-2"
                  >
                    {updating ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Logging Digital Sanction...</span>
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="w-4 h-4" />
                        <span>Commit Decision & Notify Farmer</span>
                      </>
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={async () => {
                      let token = getWorkspaceAccessToken();
                      if (!token) {
                        try {
                          const res = await signInWithGoogleWorkspace();
                          token = res.accessToken;
                        } catch {
                          return;
                        }
                      }
                      setGmailRecipient(selectedApp.applicantName ? 'sushantshinde5598@gmail.com' : 'farmer.applicant@gov.in');
                      setGmailSubject(`[Official Scrutiny Notice] ${selectedApp.schemeName} (${selectedApp.applicationNumber})`);
                      setGmailBody(`Dear ${selectedApp.applicantName || 'Farmer Beneficiary'},\n\nThis is an official communication regarding your DBT scheme application #${selectedApp.applicationNumber} for ${selectedApp.schemeName}.\n\nScrutiny Status: ${newStatus}\nOfficer Inspection Remarks: ${officerRemarks || 'Documentation under active verification.'}\n${missingDocInput ? `Action Required: Please submit missing document(s): ${missingDocInput}\n` : ''}\nFor further assistance, you may contact your nearest KVK or reply directly to this email.\n\nAgricultural Scrutiny & Sanction Desk\nGovernment of India`);
                      setShowGmailModal(true);
                    }}
                    className="px-3.5 py-2.5 rounded-xl border border-red-200 dark:border-red-900 bg-red-50 hover:bg-red-100 dark:bg-red-950/40 text-red-700 dark:text-red-300 text-xs font-bold transition flex items-center justify-center gap-1.5"
                    title="Send Formal Email Notice via Gmail"
                  >
                    <Mail className="w-4 h-4 text-red-600" />
                    <span>Email Notice via Gmail</span>
                  </button>
                </div>
              </form>
            </div>
          ) : (
            <div className="p-8 text-center text-xs text-slate-400 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700">
              Select an application from the queue to review and sanction.
            </div>
          )}
        </div>
      </div>

      {/* Gmail Compose Modal for Officers */}
      <GmailComposeModal
        isOpen={showGmailModal}
        onClose={() => setShowGmailModal(false)}
        accessToken={getWorkspaceAccessToken()}
        defaultTo={gmailRecipient}
        defaultSubject={gmailSubject}
        defaultBody={gmailBody}
        senderEmail={user?.email || 'officer.agri@gov.in'}
      />

      {/* Officer Secure Document Inspection Modal (With 10-min Countdown & Auditing) */}
      {activeTicketDoc && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/75 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="w-full max-w-4xl bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 flex flex-col max-h-[90vh] overflow-hidden">
            {/* Header */}
            <div className="p-4 sm:p-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between gap-3 bg-slate-50 dark:bg-slate-900">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-bold text-sm sm:text-base text-slate-900 dark:text-white flex items-center gap-2">
                    <span>{activeTicketDoc.docName}</span>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-blue-100 dark:bg-blue-950 text-blue-800 dark:text-blue-300 font-semibold">
                      {activeTicketDoc.docType}
                    </span>
                  </h4>
                  <p className="text-[11px] text-slate-500 flex items-center gap-1.5 mt-0.5">
                    <Clock className="w-3 h-3 text-amber-500" />
                    <span>Temporary Access Ticket Valid: </span>
                    <strong className="text-amber-600 dark:text-amber-400 font-mono">
                      {Math.floor(activeTicketDoc.remainingSeconds / 60)}m {activeTicketDoc.remainingSeconds % 60}s
                    </strong>
                    <span>• Officer Session Cryptographically Logged</span>
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <a
                  href={activeTicketDoc.downloadUrl}
                  download={activeTicketDoc.docName}
                  className="px-3 py-1.5 text-xs font-bold rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-white transition flex items-center gap-1"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Download (Audited)</span>
                </a>
                <button
                  type="button"
                  onClick={() => setActiveTicketDoc(null)}
                  className="p-2 rounded-xl hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-500 transition cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Document Preview Frame */}
            <div className="flex-1 min-h-[420px] bg-slate-950 relative flex items-center justify-center">
              <iframe
                src={activeTicketDoc.viewUrl}
                title={activeTicketDoc.docName}
                className="w-full h-full min-h-[420px] border-0"
              />
            </div>

            {/* Security Footer Notice */}
            <div className="p-3 bg-slate-50 dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 text-[11px] text-slate-500 flex flex-col sm:flex-row sm:items-center justify-between gap-1">
              <div className="flex items-center gap-1.5 text-emerald-700 dark:text-emerald-400">
                <Lock className="w-3.5 h-3.5" />
                <span>Zero Public URL • Decrypted Stream via Cryptographic Ticket</span>
              </div>
              <span className="text-slate-400 font-mono text-[10px]">
                Authorized Officer: {user?.fullName} ({role})
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
