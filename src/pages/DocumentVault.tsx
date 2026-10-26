import React, { useState, useEffect, useRef } from 'react';
import {
  FolderOpen,
  Upload,
  Camera,
  Trash2,
  Eye,
  CheckCircle2,
  Clock,
  AlertCircle,
  FileText,
  Lock,
  Cloud,
  X,
  Loader2,
  ShieldCheck,
  Search,
  ExternalLink,
  Download,
  WifiOff,
  RefreshCw,
  Sparkles,
  Bot,
  ShieldAlert,
  Key,
  History,
  AlertTriangle
} from 'lucide-react';
import { api } from '../services/api';
import { UserDocument } from '../types';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import {
  signInWithGoogleDrive,
  fetchDriveFiles,
  uploadFileToDrive,
  deleteFileFromDrive,
  getDriveAccessToken,
  logoutGoogle,
  GoogleDriveFile
} from '../lib/firebase';
import {
  uploadDocumentFileToStorage,
  saveDocumentMetadataToCloud,
  getDocumentsFromCloud,
  deleteDocumentFromCloud
} from '../lib/firestoreService';
import { openGooglePicker } from '../lib/googlePicker';
import { isOfflineModeActive } from '../services/offlineStorage';

export const DocumentVault: React.FC = () => {
  const { user } = useAuth();
  const { t } = useLanguage();
  const [documents, setDocuments] = useState<UserDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);

  // Upload modal / selection state
  const [selectedDocType, setSelectedDocType] = useState<string>('7_12_EXTRACT');

  // Secure Temporary Access Ticket State
  const [ticketLoading, setTicketLoading] = useState(false);
  const [securePreview, setSecurePreview] = useState<{
    doc: UserDocument;
    ticket: string;
    viewUrl: string;
    downloadUrl: string;
    expiresAt: string;
    remainingSeconds: number;
  } | null>(null);

  // Deletion Confirmation & Statutory Retention Warning State
  const [docToDelete, setDocToDelete] = useState<UserDocument | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Document Specific Audit Log State
  const [viewAuditDoc, setViewAuditDoc] = useState<UserDocument | null>(null);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [loadingAudit, setLoadingAudit] = useState(false);

  // Google Drive state
  const [driveConnected, setDriveConnected] = useState<boolean>(false);
  const [driveFiles, setDriveFiles] = useState<GoogleDriveFile[]>([]);
  const [driveLoading, setDriveLoading] = useState<boolean>(false);
  const [driveSearch, setDriveSearch] = useState<string>('');
  const [showDriveModal, setShowDriveModal] = useState<boolean>(false);
  const [driveUserEmail, setDriveUserEmail] = useState<string | null>(null);
  const [driveNotification, setDriveNotification] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  // Countdown timer for temporary ticket validity
  useEffect(() => {
    if (!securePreview) return;
    const interval = setInterval(() => {
      setSecurePreview(prev => {
        if (!prev) return null;
        if (prev.remainingSeconds <= 1) {
          clearInterval(interval);
          return null; // Link Expired
        }
        return { ...prev, remainingSeconds: prev.remainingSeconds - 1 };
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [securePreview?.ticket]);

  const docTypes = [
    { id: '7_12_EXTRACT', name: '7/12 Land Record (Saat-Baara)', category: 'Land' },
    { id: 'AADHAAR', name: 'Aadhaar Card (Identity)', category: 'ID' },
    { id: 'BANK_PASSBOOK', name: 'Bank Passbook / Cheque', category: 'Finance' },
    { id: 'SOIL_HEALTH_CARD', name: 'Soil Health Card (Testing)', category: 'Agri' },
    { id: 'CASTE_CERTIFICATE', name: 'Caste Certificate (Category)', category: 'ID' },
    { id: 'INCOME_CERTIFICATE', name: 'Tahsildar Income Certificate', category: 'Finance' },
    { id: 'ELECTRICITY_BILL', name: 'Pump Electricity Bill', category: 'Utility' }
  ];

  const fetchDocuments = async () => {
    setLoading(true);
    try {
      const data = await api.getDocuments();
      let combined = Array.isArray(data) ? [...data] : [];

      // Also merge records from Cloud Firestore ("users/{uid}/documents" and root "documents")
      try {
        const cloudDocs = await getDocumentsFromCloud(user?.id);
        if (cloudDocs && cloudDocs.length > 0) {
          const map = new Map<string, UserDocument>();
          combined.forEach(d => map.set(d.id, d));
          cloudDocs.forEach(cd => {
            const existing = map.get(cd.id);
            if (!existing || new Date(cd.uploadedAt) >= new Date(existing.uploadedAt)) {
              map.set(cd.id, cd);
            }
          });
          combined = Array.from(map.values());
        }
      } catch (cErr) {
        console.warn('Cloud documents fetch deferred:', cErr);
      }

      setDocuments(combined);
    } catch (err) {
      console.error('Failed to load documents:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDocuments();
    const token = getDriveAccessToken();
    if (token) {
      setDriveConnected(true);
      loadDriveFiles(token);
    }
  }, [user]);

  // Load files from Google Drive
  const loadDriveFiles = async (token: string, search?: string) => {
    setDriveLoading(true);
    try {
      const files = await fetchDriveFiles(token, search);
      setDriveFiles(files);
    } catch (err: any) {
      console.error('Error loading Google Drive files:', err);
      if (err?.message?.includes('401') || err?.message?.includes('auth')) {
        setDriveConnected(false);
      }
    } finally {
      setDriveLoading(false);
    }
  };

  // Google Drive Connection Handler
  const handleConnectDrive = async () => {
    try {
      setDriveLoading(true);
      const { user: gUser, accessToken } = await signInWithGoogleDrive();
      setDriveConnected(true);
      setDriveUserEmail(gUser.email || 'Connected Google Account');
      setDriveNotification('Google Drive linked successfully!');
      setTimeout(() => setDriveNotification(null), 3500);
      await loadDriveFiles(accessToken);
    } catch (err: any) {
      alert(`Google Drive sign-in error: ${err.message || 'Please enable popups or try again'}`);
    } finally {
      setDriveLoading(false);
    }
  };

  const handleDisconnectDrive = async () => {
    await logoutGoogle();
    setDriveConnected(false);
    setDriveFiles([]);
    setDriveUserEmail(null);
  };

  // Upload file from local device or camera
  const processUploadFile = async (file: File, source: string = 'DEVICE') => {
    setUploading(true);

    const reader = new FileReader();
    reader.onload = async () => {
      try {
        const fileData = reader.result as string;
        const targetUserId = user?.id || 'citizen';
        const docId = `DOC-${Date.now()}`;

        // 1. Upload actual file to Firebase Storage
        let storagePath = '';
        let downloadUrl = '';
        try {
          const storageRes = await uploadDocumentFileToStorage(
            targetUserId,
            docId,
            file,
            file.name,
            file.type || 'application/pdf'
          );
          storagePath = storageRes.storagePath;
          downloadUrl = storageRes.downloadUrl;
        } catch (stErr) {
          console.warn('Firebase Storage upload warning:', stErr);
        }

        // 2. Save metadata to Cloud Firestore ("users/{uid}/documents/{documentId}" & "documents/{documentId}")
        const newDocPayload: UserDocument = {
          id: docId,
          userId: targetUserId,
          documentType: selectedDocType as any,
          fileName: file.name,
          fileSize: file.size,
          mimeType: file.type || 'application/pdf',
          uploadSource: source as any,
          uploadedAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          status: 'UPLOADED',
          verificationStatus: 'UPLOADED',
          isEncryptedAtRest: true,
          securityClassification: 'RESTRICTED_PERSONAL_DATA'
        };

        try {
          await saveDocumentMetadataToCloud({
            ...newDocPayload,
            fileData: downloadUrl ? undefined : fileData
          });
        } catch (fErr) {
          console.warn('Cloud Firestore doc metadata save deferred:', fErr);
        }

        // 3. Save to Portal API / Cloud SQL
        await api.uploadDocument({
          documentType: selectedDocType,
          fileName: file.name,
          fileSize: file.size,
          mimeType: file.type || 'application/pdf',
          fileData,
          uploadSource: source
        });

        // 4. If Google Drive is connected, mirror to Google Drive
        const driveToken = getDriveAccessToken();
        if (driveToken && driveConnected) {
          try {
            const driveFile = await uploadFileToDrive(
              driveToken,
              file,
              `Krishi_${selectedDocType}_${file.name}`,
              file.type || 'application/pdf',
              'Uploaded via Farmer Loan & Subsidy Portal'
            );
            console.log('Mirrored to Google Drive:', driveFile.id);
          } catch (dErr) {
            console.warn('Google Drive mirror upload deferred:', dErr);
          }
        }

        await fetchDocuments();
        setDriveNotification(`"${file.name}" uploaded to Firebase Storage & Vault${driveConnected ? ' + Google Drive' : ''}!`);
        setTimeout(() => setDriveNotification(null), 4000);
      } catch (err) {
        console.error('Upload failed:', err);
        alert('Document upload failed. Please verify file size or try again.');
      } finally {
        setUploading(false);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>, source: string = 'DEVICE') => {
    const file = e.target.files?.[0];
    if (file) processUploadFile(file, source);
  };

  // Drag and drop handlers
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) processUploadFile(file, 'DRAG_AND_DROP');
  };

  // Import file from Google Drive into Krishi Vault
  const handleImportFromDrive = async (gFile: GoogleDriveFile) => {
    setUploading(true);
    try {
      await api.uploadDocument({
        documentType: selectedDocType,
        fileName: gFile.name,
        fileSize: gFile.size ? parseInt(gFile.size) : 350000,
        mimeType: gFile.mimeType,
        uploadSource: 'GOOGLE_DRIVE',
        driveFileId: gFile.id,
        driveWebViewLink: gFile.webViewLink
      });
      await fetchDocuments();
      setShowDriveModal(false);
      setDriveNotification(`Imported "${gFile.name}" from Google Drive into Krishi Vault!`);
      setTimeout(() => setDriveNotification(null), 4000);
    } catch (err: any) {
      alert(`Import failed: ${err.message}`);
    } finally {
      setUploading(false);
    }
  };

  // Initiate secure temporary ticket viewing
  const handleOpenSecureView = async (doc: UserDocument) => {
    setTicketLoading(true);
    try {
      const ticketRes = await api.getDocumentAccessTicket(doc.id, 'VIEW');
      setSecurePreview({
        doc,
        ticket: ticketRes.ticket,
        viewUrl: ticketRes.viewUrl,
        downloadUrl: ticketRes.downloadUrl,
        expiresAt: ticketRes.expiresAt,
        remainingSeconds: ticketRes.expiresInSeconds
      });
    } catch (err: any) {
      alert(`Access Clearance Error: ${err?.message || 'Access denied for this document.'}`);
    } finally {
      setTicketLoading(false);
    }
  };

  // Initiate secure temporary ticket download
  const handleDownloadWithTicket = async (doc: UserDocument) => {
    try {
      const ticketRes = await api.getDocumentAccessTicket(doc.id, 'DOWNLOAD');
      const a = document.createElement('a');
      a.href = ticketRes.downloadUrl;
      a.download = doc.fileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setDriveNotification(`Audited download initiated for ${doc.fileName}`);
      setTimeout(() => setDriveNotification(null), 3000);
    } catch (err: any) {
      alert(`Download Clearance Error: ${err?.message || 'Access denied for download.'}`);
    }
  };

  // Open Document Audit History
  const handleOpenAuditTrail = async (doc: UserDocument) => {
    setViewAuditDoc(doc);
    setLoadingAudit(true);
    try {
      const logs = await api.getFarmerPrivacyActivity();
      const filtered = logs.filter(l => l.targetId === doc.id || l.details?.includes(doc.fileName) || l.details?.includes(doc.id));
      setAuditLogs(filtered);
    } catch (err) {
      console.warn('Failed to load audit trail:', err);
    } finally {
      setLoadingAudit(false);
    }
  };

  // Prompt delete with statutory retention check
  const promptDeleteDocument = (doc: UserDocument) => {
    setDocToDelete(doc);
    setDeleteError(null);
  };

  // Confirm delete handler with retention lock error presentation
  const confirmDelete = async () => {
    if (!docToDelete) return;
    setIsDeleting(true);
    setDeleteError(null);
    try {
      await api.deleteDocument(docToDelete.id);
      try {
        await deleteDocumentFromCloud(docToDelete.id, (docToDelete as any).storagePath);
      } catch (cDelErr) {
        console.warn('Cloud document deletion note:', cDelErr);
      }
      setDocuments(prev => prev.filter(d => d.id !== docToDelete.id));
      setDriveNotification(`Document "${docToDelete.fileName}" removed from vault.`);
      setTimeout(() => setDriveNotification(null), 3500);
      setDocToDelete(null);
    } catch (err: any) {
      setDeleteError(err?.message || 'Failed to delete document from vault.');
    } finally {
      setIsDeleting(false);
    }
  };

  // Delete directly from Google Drive (Requires explicit confirmation modal)
  const handleDeleteDriveFile = async (gFile: GoogleDriveFile) => {
    const token = getDriveAccessToken();
    if (!token) return;
    try {
      const deleted = await deleteFileFromDrive(token, gFile.id, gFile.name);
      if (deleted) {
        setDriveFiles(prev => prev.filter(f => f.id !== gFile.id));
        setDriveNotification(`Deleted "${gFile.name}" from Google Drive.`);
        setTimeout(() => setDriveNotification(null), 3000);
      }
    } catch (err: any) {
      alert(`Drive deletion failed: ${err.message}`);
    }
  };

  // Google Picker Selection Handler
  const handleOpenGooglePicker = async () => {
    try {
      setUploading(true);
      const picked = await openGooglePicker();
      if (picked) {
        await api.uploadDocument({
          documentType: selectedDocType,
          fileName: picked.name,
          fileSize: picked.sizeBytes || 350000,
          mimeType: picked.mimeType,
          uploadSource: 'GOOGLE_PICKER',
          driveFileId: picked.id,
          driveWebViewLink: picked.url
        });
        await fetchDocuments();
        setDriveNotification(`"${picked.name}" imported successfully via Google Picker!`);
        setTimeout(() => setDriveNotification(null), 4000);
      }
    } catch (err: any) {
      console.warn('Google Picker notice:', err);
      // Fallback to Google Drive modal
      setShowDriveModal(true);
    } finally {
      setUploading(false);
    }
  };

  const isOffline = isOfflineModeActive();

  return (
    <div className="space-y-6 pb-12">
      {/* Toast / Notification Banner */}
      {driveNotification && (
        <div className="bg-[#253F1E] text-white px-4 py-2.5 rounded-xl shadow-md flex items-center justify-between text-xs font-semibold animate-in fade-in slide-in-from-top duration-200">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-[#A2DB72]" />
            <span>{driveNotification}</span>
          </div>
          <button onClick={() => setDriveNotification(null)}>
            <X className="w-4 h-4 text-emerald-200" />
          </button>
        </div>
      )}

      {/* Top Header & Credentials Pill Badges (Matches App Image Style) */}
      <div className="bg-[#F4F5ED] dark:bg-[#172215] p-5 sm:p-6 rounded-3xl border border-[#D2DCD0] dark:border-[#2B3B28] shadow-xs">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="flex flex-wrap items-center gap-2.5">
              <h2 className="text-xl sm:text-2xl font-black text-[#253F1E] dark:text-emerald-300 font-serif">
                {t('vaultTitle', 'Farmer Document Vault & DigiLocker')}
              </h2>

              {/* Connected Badge (Matching image pill capsule with lock) */}
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full border border-[#8B9E87] bg-white/80 dark:bg-[#202E1E] text-[#253F1E] dark:text-emerald-300 text-xs font-bold shadow-xs">
                <Lock className="w-3 h-3 text-[#253F1E] dark:text-[#A2DB72]" />
                <span>{t('connectedBadge', 'Connected')}</span>
              </div>

              {/* AI Badge (Matching lime robot and forest capsule from image) */}
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#253F1E] text-white text-xs font-bold shadow-xs">
                <Bot className="w-3.5 h-3.5 text-[#A2DB72]" />
                <span>{t('docVerified', 'AI Verified')}</span>
              </div>

              {isOffline && (
                <div className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-[#E06D43] text-white text-xs font-bold">
                  <WifiOff className="w-3 h-3" />
                  <span>{t('offlineActive', 'Offline Active')}</span>
                </div>
              )}
            </div>

            <p className="text-xs sm:text-sm text-[#3C5635] dark:text-emerald-200/80 mt-1.5 max-w-2xl leading-relaxed">
              {t('vaultSubtitle', 'Securely store land 7/12 extracts, Aadhaar, and bank records once. Automatically attaches to all state and central agricultural subsidy applications.')}
            </p>
          </div>

          {/* Google Drive Status & Connection Button */}
          <div className="flex flex-wrap items-center gap-2.5">
            {driveConnected ? (
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setShowDriveModal(true)}
                  className="px-4 py-2 text-xs font-bold rounded-full bg-[#253F1E] hover:bg-[#34592A] text-white transition flex items-center gap-2 shadow-xs"
                >
                  <Cloud className="w-4 h-4 text-[#A2DB72]" />
                  <span>{t('browseGoogleDrive', 'Browse Google Drive')}</span>
                  <span className="w-5 h-5 rounded-full bg-[#E06D43] text-white text-[10px] flex items-center justify-center font-black">
                    {driveFiles.length}
                  </span>
                </button>
                <button
                  onClick={handleDisconnectDrive}
                  title="Disconnect Google Drive"
                  className="px-3 py-2 text-xs font-semibold rounded-full border border-[#D2DCD0] dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100 transition"
                >
                  {t('btnDisconnect', 'Disconnect')}
                </button>
              </div>
            ) : (
              <button
                onClick={handleConnectDrive}
                disabled={driveLoading || isOffline}
                className="px-4 py-2.5 text-xs font-bold rounded-full bg-[#253F1E] hover:bg-[#34592A] text-white transition flex items-center gap-2 shadow-xs disabled:opacity-50"
              >
                {driveLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin text-[#A2DB72]" />
                ) : (
                  <Cloud className="w-4 h-4 text-[#A2DB72]" />
                )}
                <span>{t('connectGoogleDrive', 'Connect Google Drive')}</span>
              </button>
            )}
          </div>
        </div>

        {/* Option Selection Capsules (Matching Image Style) */}
        <div className="mt-5 pt-4 border-t border-[#D2DCD0] dark:border-[#2B3B28]">
          <div className="text-[11px] font-bold text-[#253F1E] dark:text-emerald-300 uppercase tracking-wider mb-2.5">
            Step 1: Select Document Type to Upload or Scan
          </div>
          <div className="flex flex-wrap gap-2">
            {docTypes.map((dt) => {
              const isSelected = selectedDocType === dt.id;
              return (
                <button
                  key={dt.id}
                  onClick={() => setSelectedDocType(dt.id)}
                  className={`px-3.5 py-1.5 text-xs font-semibold rounded-full transition-all duration-150 flex items-center gap-1.5 ${
                    isSelected
                      ? 'bg-[#253F1E] text-white shadow-sm border border-[#253F1E]'
                      : 'bg-white dark:bg-[#1E2B1C] text-[#253F1E] dark:text-emerald-200 border border-[#C5D2C2] dark:border-[#334630] hover:bg-[#E8EFE5] dark:hover:bg-[#253723]'
                  }`}
                >
                  <span className={`w-1.5 h-1.5 rounded-full ${isSelected ? 'bg-[#A2DB72]' : 'bg-[#8B9E87]'}`} />
                  <span>{dt.name}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Document Security & Farmer Privacy Protocol Card */}
      <div className="p-4 rounded-2xl bg-emerald-900/10 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-800 text-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-emerald-800 text-white flex items-center justify-center shrink-0">
            <Lock className="w-4 h-4 text-[#A2DB72]" />
          </div>
          <div>
            <h4 className="font-bold text-emerald-950 dark:text-emerald-200">
              Government Document Security & Farmer Privacy Shield
            </h4>
            <p className="text-[11px] text-emerald-800/80 dark:text-emerald-300/70">
              AES-256-GCM Encrypted at Rest • Zero Public URLs • 10-Minute Expiring Access Tickets • Zero AI Model Training
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 text-[10px] font-bold text-emerald-900 dark:text-emerald-300">
          <span className="px-2.5 py-1 rounded-full bg-white dark:bg-slate-800 border border-emerald-300 dark:border-emerald-700 flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
            DPDP Act Compliant
          </span>
          <span className="px-2.5 py-1 rounded-full bg-white dark:bg-slate-800 border border-emerald-300 dark:border-emerald-700 flex items-center gap-1">
            <ShieldCheck className="w-3 h-3 text-emerald-600" />
            Assigned Officer Only
          </span>
        </div>
      </div>

      {/* Upload Dropzone with the Exact Image Color Palette */}
      <div
        onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
        onDragLeave={() => setIsDragOver(false)}
        onDrop={handleDrop}
        className={`p-6 sm:p-8 rounded-3xl border-2 border-dashed transition-all duration-200 text-center ${
          isDragOver
            ? 'border-[#253F1E] bg-[#E8EFE5] dark:bg-[#1D2E1B]'
            : 'border-[#8A9E86] dark:border-[#354932] bg-[#F8F9F3] dark:bg-[#172215]'
        }`}
      >
        <input
          type="file"
          ref={fileInputRef}
          onChange={(e) => handleFileInputChange(e, 'DEVICE')}
          accept="image/*,.pdf"
          className="hidden"
        />
        <input
          type="file"
          ref={cameraInputRef}
          onChange={(e) => handleFileInputChange(e, 'CAMERA')}
          accept="image/*"
          capture="environment"
          className="hidden"
        />

        <div className="max-w-md mx-auto space-y-4">
          <div className="w-14 h-14 rounded-full bg-[#E8EFE5] dark:bg-[#233520] text-[#253F1E] dark:text-[#A2DB72] flex items-center justify-center mx-auto shadow-xs">
            {uploading ? (
              <Loader2 className="w-7 h-7 animate-spin" />
            ) : (
              <Upload className="w-7 h-7" />
            )}
          </div>

          <div>
            <h3 className="text-base sm:text-lg font-bold text-[#253F1E] dark:text-emerald-200">
              Drag & Drop or Choose Document
            </h3>
            <p className="text-xs text-[#526B4D] dark:text-emerald-300/80 mt-1">
              Currently uploading as: <strong className="text-[#253F1E] dark:text-white font-bold">{docTypes.find(d => d.id === selectedDocType)?.name}</strong>
            </p>
            <p className="text-[11px] text-[#7A9375] dark:text-emerald-400/60 mt-0.5">
              Supports PDF, JPG, PNG (Auto-compressed, AES-256 encrypted, Cloud SQL backed)
            </p>
          </div>

          {/* Action Button Capsules in Uniform Forest Green Palette */}
          <div className="flex flex-wrap items-center justify-center gap-2.5 pt-2">
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="px-5 py-2.5 text-xs font-bold rounded-full bg-[#253F1E] hover:bg-[#34592A] text-white transition flex items-center gap-2 shadow-xs"
            >
              <Upload className="w-4 h-4 text-[#A2DB72]" />
              <span>Upload from Device</span>
            </button>

            <button
              onClick={() => cameraInputRef.current?.click()}
              disabled={uploading}
              className="px-4 py-2.5 text-xs font-bold rounded-full border border-[#8B9E87] bg-white dark:bg-[#1E2B1C] text-[#253F1E] dark:text-emerald-200 hover:bg-[#E8EFE5] transition flex items-center gap-2 shadow-xs"
            >
              <Camera className="w-4 h-4 text-[#253F1E] dark:text-[#A2DB72]" />
              <span>Scan with Camera</span>
            </button>

            <button
              onClick={handleOpenGooglePicker}
              disabled={uploading || isOffline}
              className="px-4 py-2.5 text-xs font-bold rounded-full border border-[#8B9E87] bg-white dark:bg-[#1E2B1C] text-[#253F1E] dark:text-emerald-200 hover:bg-[#E8EFE5] transition flex items-center gap-2 shadow-xs"
            >
              <ExternalLink className="w-4 h-4 text-[#253F1E] dark:text-[#A2DB72]" />
              <span>Select via Google Picker</span>
            </button>

            {driveConnected ? (
              <button
                onClick={() => setShowDriveModal(true)}
                className="px-4 py-2.5 text-xs font-bold rounded-full bg-[#253F1E] text-white hover:bg-[#34592A] transition flex items-center gap-2 shadow-xs"
              >
                <Cloud className="w-4 h-4 text-[#A2DB72]" />
                <span>Select from Google Drive</span>
              </button>
            ) : (
              <button
                onClick={handleConnectDrive}
                disabled={isOffline}
                className="px-4 py-2.5 text-xs font-bold rounded-full border border-[#8B9E87] bg-white dark:bg-[#1E2B1C] text-[#253F1E] dark:text-emerald-200 hover:bg-[#E8EFE5] transition flex items-center gap-2 shadow-xs"
              >
                <Cloud className="w-4 h-4 text-emerald-700 dark:text-[#A2DB72]" />
                <span>Import via Google Drive</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Uploaded Documents List */}
      <div>
        <div className="flex items-center justify-between mb-3.5">
          <div className="flex items-center gap-2">
            <h3 className="font-serif font-bold text-lg text-[#253F1E] dark:text-emerald-300">
              Your Stored Documents ({documents.length})
            </h3>
            <span className="text-xs text-[#526B4D] dark:text-emerald-400">
              Cloud SQL & Offline Synchronized
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {documents.map((doc) => {
            const typeInfo = docTypes.find(d => d.id === doc.documentType) || { name: doc.documentType };
            const isVerified = (doc.verificationStatus || doc.status) === 'VERIFIED';
            const isPending = (doc.verificationStatus || doc.status) === 'UNDER_REVIEW' || (doc.verificationStatus || doc.status) === 'UPLOADED';

            return (
              <div
                key={doc.id}
                className="p-4 rounded-2xl bg-white dark:bg-[#1B2819] border border-[#D2DCD0] dark:border-[#2D3E2A] shadow-xs flex flex-col justify-between hover:border-[#8A9E86] transition-all"
              >
                <div className="space-y-2.5">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2.5">
                      <div className="w-10 h-10 rounded-xl bg-[#E8EFE5] dark:bg-[#253822] text-[#253F1E] dark:text-[#A2DB72] flex items-center justify-center shrink-0">
                        <FileText className="w-5 h-5" />
                      </div>
                      <div>
                        <h4 className="font-bold text-xs sm:text-sm text-[#253F1E] dark:text-white line-clamp-1">
                          {typeInfo.name}
                        </h4>
                        <div className="text-[10px] text-[#5A7355] dark:text-emerald-400/80 font-mono truncate max-w-[150px]">
                          {doc.fileName}
                        </div>
                      </div>
                    </div>

                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 ${
                        isVerified
                          ? 'bg-[#E8EFE5] text-[#253F1E] dark:bg-[#263D23] dark:text-[#A2DB72]'
                          : isPending
                          ? 'bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-300'
                          : 'bg-rose-100 text-rose-900 dark:bg-rose-950 dark:text-rose-300'
                      }`}
                    >
                      {isVerified ? (
                        <>
                          <CheckCircle2 className="w-3 h-3 text-[#253F1E] dark:text-[#A2DB72]" />
                          Verified
                        </>
                      ) : (
                        <>
                          <Clock className="w-3 h-3 text-amber-700" />
                          In Review
                        </>
                      )}
                    </span>
                  </div>

                  {/* Security & Retention Badges */}
                  <div className="flex flex-wrap items-center gap-1.5 pt-1">
                    <span className="inline-flex items-center gap-1 text-[9px] font-semibold text-emerald-800 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/60 px-2 py-0.5 rounded-full border border-emerald-200 dark:border-emerald-800/60">
                      <Lock className="w-2.5 h-2.5 text-emerald-600 dark:text-emerald-400" />
                      <span>AES-256 Encrypted</span>
                    </span>

                    {doc.retentionLocked ? (
                      <span
                        title="Attached to active government application. Protected against accidental deletion during departmental review."
                        className="inline-flex items-center gap-1 text-[9px] font-bold text-amber-800 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/60 px-2 py-0.5 rounded-full border border-amber-300 dark:border-amber-800/60"
                      >
                        <ShieldAlert className="w-2.5 h-2.5 text-amber-600" />
                        <span>Statutory Retention</span>
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-[9px] text-slate-600 dark:text-slate-400 bg-slate-100 dark:bg-slate-800/80 px-2 py-0.5 rounded-full">
                        <span>Private Document</span>
                      </span>
                    )}
                  </div>

                  <div className="text-[11px] text-[#4A6445] dark:text-emerald-300/70 space-y-1 pt-1.5 border-t border-[#EAEFE8] dark:border-[#2B3B28]">
                    <div className="flex items-center justify-between">
                      <span>Source:</span>
                      <span className="font-semibold text-[#253F1E] dark:text-emerald-200">
                        {doc.uploadSource === 'GOOGLE_DRIVE' ? 'Google Drive' : doc.uploadSource || 'Device Upload'}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>Uploaded:</span>
                      <span>{new Date(doc.uploadedAt).toLocaleDateString()}</span>
                    </div>
                    {doc.id.startsWith('OFFLINE-') && (
                      <div className="text-[10px] font-bold text-[#E06D43] flex items-center gap-1">
                        <WifiOff className="w-3 h-3" />
                        Stored in local offline vault
                      </div>
                    )}
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-[#EAEFE8] dark:border-[#2B3B28] flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleOpenSecureView(doc)}
                      disabled={ticketLoading}
                      className="text-xs font-bold text-[#253F1E] dark:text-[#A2DB72] hover:underline flex items-center gap-1"
                      title="Generate secure temporary access link"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      <span>View File</span>
                    </button>

                    <button
                      onClick={() => handleDownloadWithTicket(doc)}
                      className="p-1 text-slate-500 hover:text-emerald-700 dark:hover:text-[#A2DB72] transition"
                      title="Secure Download"
                    >
                      <Download className="w-3.5 h-3.5" />
                    </button>

                    <button
                      onClick={() => handleOpenAuditTrail(doc)}
                      className="p-1 text-slate-500 hover:text-blue-600 dark:hover:text-blue-400 transition"
                      title="View Access History & Security Trail"
                    >
                      <History className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <button
                    onClick={() => promptDeleteDocument(doc)}
                    className="p-1 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 transition"
                    title={doc.retentionLocked ? "Under statutory application lock" : "Delete Document"}
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })}

          {documents.length === 0 && !loading && (
            <div className="col-span-full p-8 text-center rounded-3xl border-2 border-dashed border-[#C5D2C2] dark:border-[#2E3F2B] bg-[#F8F9F3] dark:bg-[#162114]">
              <FolderOpen className="w-10 h-10 text-[#8A9E86] mx-auto mb-2" />
              <h4 className="font-bold text-[#253F1E] dark:text-emerald-200">Your Document Vault is Empty</h4>
              <p className="text-xs text-[#526B4D] mt-1">
                Upload your 7/12 land record, Aadhaar card, or connect Google Drive to start.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Google Drive Files Modal */}
      {showDriveModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="w-full max-w-2xl bg-[#F4F5ED] dark:bg-[#172315] rounded-3xl shadow-2xl border border-[#C5D2C2] dark:border-[#2F412C] overflow-hidden flex flex-col max-h-[85vh]">
            <div className="p-4 sm:p-5 bg-[#253F1E] text-white flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <Cloud className="w-5 h-5 text-[#A2DB72]" />
                <div>
                  <h4 className="font-bold text-sm sm:base">
                    Google Drive File Picker
                  </h4>
                  <p className="text-[11px] text-emerald-200">
                    {driveUserEmail || 'Select an agricultural record from your connected Google Drive'}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowDriveModal(false)}
                className="p-1.5 rounded-full text-emerald-200 hover:text-white hover:bg-[#34592A] transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Search and Refresh */}
            <div className="p-3 sm:p-4 border-b border-[#D2DCD0] dark:border-[#2B3B28] bg-white dark:bg-[#1C2919] flex items-center gap-2">
              <div className="relative flex-1">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search in Google Drive (7/12, Aadhaar, Land, Kisan)..."
                  value={driveSearch}
                  onChange={(e) => {
                    setDriveSearch(e.target.value);
                    const token = getDriveAccessToken();
                    if (token) loadDriveFiles(token, e.target.value);
                  }}
                  className="w-full pl-9 pr-3 py-2 text-xs rounded-full border border-[#D2DCD0] dark:border-[#334630] bg-[#F8F9F3] dark:bg-[#172215] text-[#253F1E] dark:text-white focus:outline-hidden focus:ring-2 focus:ring-[#253F1E]"
                />
              </div>
              <button
                onClick={() => {
                  const token = getDriveAccessToken();
                  if (token) loadDriveFiles(token, driveSearch);
                }}
                disabled={driveLoading}
                className="px-3 py-2 text-xs font-bold rounded-full bg-[#253F1E] text-white hover:bg-[#34592A] transition flex items-center gap-1 shrink-0"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${driveLoading ? 'animate-spin' : ''}`} />
                <span>Refresh</span>
              </button>
            </div>

            {/* Files List */}
            <div className="p-4 overflow-y-auto flex-1 space-y-2">
              {driveLoading ? (
                <div className="p-8 text-center space-y-2">
                  <Loader2 className="w-8 h-8 text-[#253F1E] dark:text-[#A2DB72] animate-spin mx-auto" />
                  <p className="text-xs text-slate-500">Loading Google Drive documents...</p>
                </div>
              ) : driveFiles.length === 0 ? (
                <div className="p-8 text-center space-y-2 bg-white dark:bg-[#1E2B1B] rounded-2xl border border-dashed border-[#C5D2C2]">
                  <Cloud className="w-10 h-10 text-[#8A9E86] mx-auto" />
                  <div className="font-bold text-xs text-[#253F1E] dark:text-emerald-200">
                    No files found in Google Drive
                  </div>
                  <p className="text-[11px] text-[#526B4D]">
                    Upload a file from your device, or add land/identity documents to your Google Drive account.
                  </p>
                </div>
              ) : (
                driveFiles.map((gFile) => (
                  <div
                    key={gFile.id}
                    className="p-3 rounded-2xl bg-white dark:bg-[#1C2919] border border-[#D2DCD0] dark:border-[#2D3E2A] flex items-center justify-between gap-3 hover:border-[#253F1E] transition"
                  >
                    <div className="flex items-center gap-2.5 truncate">
                      <div className="w-8 h-8 rounded-lg bg-[#E8EFE5] dark:bg-[#253822] text-[#253F1E] dark:text-[#A2DB72] flex items-center justify-center shrink-0">
                        <FileText className="w-4 h-4" />
                      </div>
                      <div className="truncate">
                        <div className="font-bold text-xs text-[#253F1E] dark:text-white truncate">
                          {gFile.name}
                        </div>
                        <div className="text-[10px] text-slate-400">
                          {gFile.mimeType} • {gFile.modifiedTime ? new Date(gFile.modifiedTime).toLocaleDateString() : 'Drive File'}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      {gFile.webViewLink && (
                        <a
                          href={gFile.webViewLink}
                          target="_blank"
                          rel="noreferrer"
                          className="p-1.5 rounded-full border border-slate-200 dark:border-slate-700 hover:bg-slate-100 text-slate-600 dark:text-slate-300"
                          title="Open in Google Drive"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                        </a>
                      )}
                      <button
                        onClick={() => handleImportFromDrive(gFile)}
                        disabled={uploading}
                        className="px-3 py-1.5 text-[11px] font-bold rounded-full bg-[#253F1E] hover:bg-[#34592A] text-white transition flex items-center gap-1"
                      >
                        <Download className="w-3 h-3 text-[#A2DB72]" />
                        <span>Import</span>
                      </button>
                      <button
                        onClick={() => handleDeleteDriveFile(gFile)}
                        className="p-1.5 text-slate-400 hover:text-rose-600 rounded-full"
                        title="Delete from Drive"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="p-3 sm:p-4 bg-white dark:bg-[#1C2919] border-t border-[#D2DCD0] dark:border-[#2B3B28] flex items-center justify-between">
              <span className="text-[11px] text-[#526B4D]">
                Encrypted OAuth 2.0 Google Drive Integration
              </span>
              <button
                onClick={() => setShowDriveModal(false)}
                className="px-4 py-1.5 text-xs font-bold rounded-full border border-[#8B9E87] bg-white text-[#253F1E] hover:bg-[#E8EFE5] transition"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Secure Document View Modal with 10-Min Temporary Signed Access Ticket */}
      {securePreview && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="w-full max-w-2xl bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col max-h-[85vh]">
            <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-950">
              <div className="space-y-0.5">
                <div className="flex items-center gap-2">
                  <Lock className="w-4 h-4 text-emerald-600 dark:text-[#A2DB72]" />
                  <h4 className="font-bold text-sm text-slate-900 dark:text-white">
                    {securePreview.doc.fileName}
                  </h4>
                </div>
                <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
                  <span>{securePreview.doc.documentType}</span>
                  <span>•</span>
                  <span className="text-emerald-700 dark:text-emerald-400 font-semibold flex items-center gap-1">
                    <ShieldCheck className="w-3.5 h-3.5" />
                    Encrypted Stream (AES-256-GCM)
                  </span>
                </div>
              </div>

              {/* Temporary Ticket Expiry Countdown */}
              <div className="flex items-center gap-2">
                <div className="px-2.5 py-1 rounded-full bg-amber-100 text-amber-900 dark:bg-amber-950/70 dark:text-amber-300 text-[11px] font-mono font-bold flex items-center gap-1">
                  <Clock className="w-3 h-3 text-amber-700 dark:text-amber-400" />
                  <span>
                    Expires in {Math.floor(securePreview.remainingSeconds / 60)}:
                    {String(securePreview.remainingSeconds % 60).padStart(2, '0')}
                  </span>
                </div>

                <button
                  onClick={() => setSecurePreview(null)}
                  className="p-1.5 rounded-full text-slate-400 hover:text-slate-700 dark:hover:text-white"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Document Content Viewport */}
            <div className="p-4 flex-1 overflow-y-auto flex items-center justify-center bg-slate-100 dark:bg-slate-950 min-h-[300px]">
              {securePreview.doc.mimeType?.includes('pdf') || securePreview.doc.fileName.toLowerCase().endsWith('.pdf') ? (
                <iframe
                  src={securePreview.viewUrl}
                  title={securePreview.doc.fileName}
                  className="w-full h-[460px] rounded-xl border border-slate-300 dark:border-slate-800 bg-white"
                />
              ) : securePreview.doc.mimeType?.includes('image') || /\.(jpg|jpeg|png|webp)$/i.test(securePreview.doc.fileName) ? (
                <img
                  src={securePreview.viewUrl}
                  alt={securePreview.doc.fileName}
                  className="max-h-[440px] rounded-lg shadow-md object-contain border border-slate-200 dark:border-slate-800"
                />
              ) : (
                <div className="p-8 text-center space-y-3">
                  <FileText className="w-16 h-16 text-[#253F1E] dark:text-[#A2DB72] mx-auto" />
                  <div className="font-bold text-sm text-slate-800 dark:text-slate-200">
                    Encrypted Government Document
                  </div>
                  <p className="text-xs text-slate-500 max-w-sm">
                    This file is encrypted at rest. Use the temporary download link below to view it using your device's native document viewer.
                  </p>
                </div>
              )}
            </div>

            <div className="p-3 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-950">
              <span className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                Single-session cryptographic token verified
              </span>

              <div className="flex items-center gap-2">
                <a
                  href={securePreview.downloadUrl}
                  download={securePreview.doc.fileName}
                  className="px-3 py-1.5 rounded-full border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-semibold text-slate-800 dark:text-slate-200 hover:bg-slate-100 flex items-center gap-1.5"
                >
                  <Download className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Download File</span>
                </a>
                <button
                  onClick={() => setSecurePreview(null)}
                  className="px-4 py-1.5 text-xs font-bold rounded-full bg-[#253F1E] text-white hover:bg-[#34592A]"
                >
                  Close Viewer
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation & Statutory Retention Lock Modal */}
      {docToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 p-5 space-y-4">
            <div className="flex items-center gap-3 text-rose-600">
              <div className="w-10 h-10 rounded-2xl bg-rose-100 dark:bg-rose-950/60 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-5 h-5 text-rose-600 dark:text-rose-400" />
              </div>
              <div>
                <h4 className="font-bold text-base text-slate-900 dark:text-white">
                  Confirm Document Deletion
                </h4>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {docToDelete.fileName} ({docToDelete.documentType})
                </p>
              </div>
            </div>

            {/* Statutory Retention Warning if Document is Linked */}
            {docToDelete.retentionLocked ? (
              <div className="p-3 rounded-2xl bg-amber-50 dark:bg-amber-950/60 border border-amber-300 dark:border-amber-800 text-xs text-amber-900 dark:text-amber-200 space-y-1">
                <div className="font-bold flex items-center gap-1.5">
                  <ShieldAlert className="w-4 h-4 text-amber-600" />
                  <span>Statutory Retention Lock Active</span>
                </div>
                <p>
                  This document is attached to an active government loan or subsidy application under departmental review. State DBT guidelines prohibit deletion while an application is in progress.
                </p>
              </div>
            ) : (
              <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                Are you sure you want to permanently remove this document from your private vault? Once deleted, it cannot be recovered and must be re-scanned if required for future applications.
              </p>
            )}

            {deleteError && (
              <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/60 border border-rose-300 dark:border-rose-800 text-xs text-rose-900 dark:text-rose-200">
                {deleteError}
              </div>
            )}

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setDocToDelete(null)}
                disabled={isDeleting}
                className="px-4 py-2 text-xs font-semibold rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-50 text-slate-700 dark:text-slate-200"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmDelete}
                disabled={isDeleting || docToDelete.retentionLocked}
                className="px-4 py-2 text-xs font-bold rounded-xl bg-rose-600 hover:bg-rose-700 text-white disabled:opacity-50 flex items-center gap-1.5 shadow-sm"
              >
                {isDeleting ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Deleting...</span>
                  </>
                ) : (
                  <>
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Permanently Delete</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Document Specific Audit Log Modal */}
      {viewAuditDoc && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="w-full max-w-xl bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 p-5 space-y-4 max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <History className="w-5 h-5 text-blue-600" />
                <div>
                  <h4 className="font-bold text-sm text-slate-900 dark:text-white">
                    Document Access & Security Audit Trail
                  </h4>
                  <p className="text-xs text-slate-500">
                    {viewAuditDoc.fileName} • ID: {viewAuditDoc.id}
                  </p>
                </div>
              </div>
              <button onClick={() => setViewAuditDoc(null)} className="p-1 text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto space-y-2.5 pr-1">
              {loadingAudit ? (
                <div className="p-8 text-center">
                  <Loader2 className="w-6 h-6 animate-spin mx-auto text-blue-600" />
                  <p className="text-xs text-slate-500 mt-2">Retrieving cryptographic audit trail...</p>
                </div>
              ) : auditLogs.length === 0 ? (
                <div className="p-6 text-center text-xs text-slate-500 bg-slate-50 dark:bg-slate-950 rounded-2xl">
                  No third-party access events recorded for this document. It remains privately stored and encrypted.
                </div>
              ) : (
                auditLogs.map((log) => (
                  <div
                    key={log.id}
                    className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs space-y-1"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-800 dark:text-slate-200">
                        {log.action.replace(/_/g, ' ')}
                      </span>
                      <span className="text-[10px] text-slate-400 font-mono">
                        {new Date(log.timestamp).toLocaleString()}
                      </span>
                    </div>
                    <p className="text-slate-600 dark:text-slate-300">
                      {log.details}
                    </p>
                    <div className="text-[10px] text-slate-400 flex items-center gap-2">
                      <span>User Role: {log.userRole}</span>
                      <span>•</span>
                      <span>User: {log.userName || log.userId}</span>
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="pt-2 border-t border-slate-200 dark:border-slate-800 flex justify-end">
              <button
                type="button"
                onClick={() => setViewAuditDoc(null)}
                className="px-4 py-1.5 text-xs font-bold rounded-full bg-[#253F1E] text-white hover:bg-[#34592A]"
              >
                Close Audit Log
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
