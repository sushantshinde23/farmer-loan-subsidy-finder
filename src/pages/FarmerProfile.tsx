import React, { useState, useEffect } from 'react';
import {
  User,
  MapPin,
  LandPlot,
  Building2,
  CheckCircle2,
  Edit2,
  Save,
  Tractor,
  Droplets,
  ShieldCheck,
  CreditCard,
  Bookmark,
  BookmarkCheck,
  Trash2,
  ArrowRight,
  ExternalLink,
  Lock,
  Eye,
  FileText,
  Download,
  ShieldAlert,
  Key,
  Activity,
  RefreshCw,
  AlertTriangle,
  Shield,
  Clock,
  Loader2
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useSavedSchemes } from '../context/SavedSchemesContext';
import { useLanguage } from '../context/LanguageContext';
import { api } from '../services/api';
import { DocumentSecurityAuditEntry } from '../types';

interface FarmerProfileProps {
  onNavigateTab?: (tab: string) => void;
  onApplyForScheme?: (schemeId: string, schemeName: string) => void;
}

export const FarmerProfile: React.FC<FarmerProfileProps> = ({ onNavigateTab, onApplyForScheme }) => {
  const { user, farmerProfile, updateFarmerProfile, updateUserProfile } = useAuth();
  const { savedSchemes, unsaveScheme } = useSavedSchemes();
  const { t } = useLanguage();
  const [isEditing, setIsEditing] = useState(false);

  const [fullName, setFullName] = useState(user?.fullName || 'Balasaheb Shinde');
  const [district, setDistrict] = useState(user?.district || 'Pune');
  const [state, setState] = useState(user?.state || 'Maharashtra');
  const [village, setVillage] = useState(farmerProfile?.village || 'Baramati');
  const [landArea, setLandArea] = useState(farmerProfile?.landAreaAcres || 3.5);
  const [surveyNo, setSurveyNo] = useState(farmerProfile?.surveyNumber || 'Gat No. 42/1');
  const [crops, setCrops] = useState(farmerProfile?.primaryCrops?.join(', ') || 'Sugarcane, Soybean, Wheat');
  const [bankName, setBankName] = useState(farmerProfile?.bankName || 'State Bank of India');
  const [ifsc, setIfsc] = useState(farmerProfile?.ifscCode || 'SBIN0001234');
  const [saving, setSaving] = useState(false);

  // Privacy & Security UI State
  const [privacyLogs, setPrivacyLogs] = useState<DocumentSecurityAuditEntry[]>([]);
  const [loadingLogs, setLoadingLogs] = useState(false);
  const [exportingData, setExportingData] = useState(false);
  const [showErasureModal, setShowErasureModal] = useState(false);
  const [erasureLoading, setErasureLoading] = useState(false);
  const [erasureMessage, setErasureMessage] = useState<string | null>(null);

  const loadPrivacyActivity = async () => {
    setLoadingLogs(true);
    try {
      const logs = await api.getFarmerPrivacyActivity();
      setPrivacyLogs(logs);
    } catch (err) {
      console.warn('Could not load privacy activity:', err);
    } finally {
      setLoadingLogs(false);
    }
  };

  useEffect(() => {
    loadPrivacyActivity();
  }, [user]);

  const handleExportDataPackage = async () => {
    setExportingData(true);
    try {
      const data = await api.exportFarmerData();
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `krishi-farmer-data-export-${user?.id || 'citizen'}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Export failed:', err);
      alert('Failed to generate export package. Please try again.');
    } finally {
      setExportingData(false);
    }
  };

  const handleRequestErasure = async () => {
    setErasureLoading(true);
    setErasureMessage(null);
    try {
      const res = await api.requestAccountErasure();
      setErasureMessage(res.message);
    } catch (err: any) {
      setErasureMessage(err?.message || 'Could not process erasure request.');
    } finally {
      setErasureLoading(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await updateUserProfile({
        fullName,
        district,
        state
      });

      await updateFarmerProfile({
        village,
        landAreaAcres: Number(landArea),
        surveyNumber: surveyNo,
        primaryCrops: crops.split(',').map(s => s.trim()).filter(Boolean),
        bankName,
        ifscCode: ifsc
      });

      setIsEditing(false);
      alert('Farmer profile updated successfully.');
    } catch (err) {
      console.error('Update profile error:', err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <User className="w-5 h-5 text-emerald-600" />
            <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white">
              {t('profileTitle', 'Farmer Profile & Landholding Record')}
            </h2>
            <span className="px-2 py-0.5 text-[10px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 rounded-md flex items-center gap-1">
              <CheckCircle2 className="w-3 h-3" />
              {t('ekycVerifiedBadge', 'Aadhaar eKYC Verified')}
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
            {t('profileSubtitle', 'Permanent land records, cultivation data, and Direct Benefit Transfer (DBT) bank details.')}
          </p>
        </div>

        <button
          onClick={() => setIsEditing(!isEditing)}
          className="px-3.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 transition flex items-center gap-1.5 self-start sm:self-auto shadow-xs"
        >
          <Edit2 className="w-3.5 h-3.5" />
          <span>{isEditing ? t('btnCancel', 'Cancel Edit') : t('btnEdit', 'Edit Profile')}</span>
        </button>
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        {/* Personal & Village Identity */}
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-xs space-y-4">
          <h3 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
            <User className="w-4 h-4 text-emerald-600" />
            <span>{t('personalDetails', 'Personal & Demographic Details')}</span>
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                {t('fullNameLabel', 'Farmer Full Name')}:
              </label>
              <input
                type="text"
                disabled={!isEditing}
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="w-full py-2 px-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white disabled:opacity-80"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                {t('districtLabel', 'District')}:
              </label>
              <input
                type="text"
                disabled={!isEditing}
                value={district}
                onChange={(e) => setDistrict(e.target.value)}
                className="w-full py-2 px-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white disabled:opacity-80"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                {t('villageLabel', 'Village / Taluka')}:
              </label>
              <input
                type="text"
                disabled={!isEditing}
                value={village}
                onChange={(e) => setVillage(e.target.value)}
                className="w-full py-2 px-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white disabled:opacity-80"
              />
            </div>
          </div>
        </div>

        {/* Landholding & Survey Records */}
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-xs space-y-4">
          <h3 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
            <LandPlot className="w-4 h-4 text-emerald-600" />
            <span>{t('landDetails', 'Landholding & Survey Information')}</span>
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                {t('landAreaLabel', 'Total Landholding (Acres)')}:
              </label>
              <input
                type="number"
                step="0.1"
                disabled={!isEditing}
                value={landArea}
                onChange={(e) => setLandArea(parseFloat(e.target.value) || 0)}
                className="w-full py-2 px-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white disabled:opacity-80"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                {t('surveyNoLabel', 'Land Survey / Gat Number')}:
              </label>
              <input
                type="text"
                disabled={!isEditing}
                value={surveyNo}
                onChange={(e) => setSurveyNo(e.target.value)}
                className="w-full py-2 px-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white disabled:opacity-80 font-mono"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                {t('primaryCropsLabel', 'Primary Crops Cultivated')}:
              </label>
              <input
                type="text"
                disabled={!isEditing}
                value={crops}
                onChange={(e) => setCrops(e.target.value)}
                className="w-full py-2 px-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white disabled:opacity-80"
              />
            </div>
          </div>
        </div>

        {/* Bank & DBT Details */}
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-xs space-y-4">
          <h3 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
            <Building2 className="w-4 h-4 text-emerald-600" />
            <span>{t('bankDbtDetails', 'Bank Account & DBT Seeding')}</span>
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                {t('bankNameLabel', 'Bank Name')}:
              </label>
              <input
                type="text"
                disabled={!isEditing}
                value={bankName}
                onChange={(e) => setBankName(e.target.value)}
                className="w-full py-2 px-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white disabled:opacity-80"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                {t('ifscLabel', 'IFSC Code')}:
              </label>
              <input
                type="text"
                disabled={!isEditing}
                value={ifsc}
                onChange={(e) => setIfsc(e.target.value)}
                className="w-full py-2 px-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white disabled:opacity-80 font-mono"
              />
            </div>
          </div>
        </div>

        {isEditing && (
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setIsEditing(false)}
              className="px-4 py-2 rounded-xl text-xs font-semibold border border-slate-200 dark:border-slate-700"
            >
              {t('btnCancel', 'Cancel')}
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-5 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs flex items-center gap-1.5 shadow-sm"
            >
              <Save className="w-3.5 h-3.5" />
              <span>{saving ? t('statusUnderReview', 'Saving...') : t('btnSave', 'Save Changes')}</span>
            </button>
          </div>
        )}
      </form>

      {/* Bookmarked / Saved Schemes Section in Profile */}
      <div className="p-5 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-xs space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 flex items-center justify-center">
              <Bookmark className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-slate-900 dark:text-white">
                Saved Government Schemes
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Schemes bookmarked by you for future application & document verification
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 text-xs font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 rounded-full">
              {savedSchemes.length} Saved
            </span>
            {onNavigateTab && (
              <button
                type="button"
                onClick={() => onNavigateTab('saved-schemes')}
                className="text-xs font-semibold text-emerald-700 dark:text-emerald-400 hover:underline flex items-center gap-1"
              >
                <span>View All</span>
                <ArrowRight className="w-3 h-3" />
              </button>
            )}
          </div>
        </div>

        {savedSchemes.length === 0 ? (
          <div className="p-6 text-center rounded-xl bg-slate-50 dark:bg-slate-900 border border-dashed border-slate-200 dark:border-slate-700">
            <p className="text-xs text-slate-500 dark:text-slate-400">
              You haven't bookmarked any government schemes yet.
            </p>
            {onNavigateTab && (
              <button
                type="button"
                onClick={() => onNavigateTab('schemes')}
                className="mt-2 text-xs font-bold text-emerald-700 dark:text-emerald-400 hover:underline inline-flex items-center gap-1"
              >
                <span>Browse Scheme Directory</span>
                <ArrowRight className="w-3 h-3" />
              </button>
            )}
          </div>
        ) : (
          <div className="divide-y divide-slate-100 dark:divide-slate-700/60">
            {savedSchemes.map((item) => (
              <div
                key={item.id}
                className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
              >
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300">
                      {item.category || 'SCHEME'}
                    </span>
                    <h4 className="font-bold text-xs sm:text-sm text-slate-900 dark:text-white">
                      {item.schemeName}
                    </h4>
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    {item.department} • Grant: <strong className="text-emerald-700 dark:text-emerald-400">{item.subsidyAmountOrPercent || 'Direct Subsidy'}</strong>
                  </p>
                  {item.notes && (
                    <p className="text-[11px] text-amber-700 dark:text-amber-300 italic">
                      Note: {item.notes}
                    </p>
                  )}
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => unsaveScheme(item.schemeId)}
                    className="p-1.5 text-xs text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg transition"
                    title="Remove from saved"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                  {onApplyForScheme && (
                    <button
                      type="button"
                      onClick={() => onApplyForScheme(item.schemeId, item.schemeName)}
                      className="px-3 py-1.5 text-xs font-bold rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white transition active:scale-95 flex items-center gap-1 shadow-xs"
                    >
                      <span>Apply</span>
                      <ArrowRight className="w-3 h-3" />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* =========================================================================
          PRIVACY & SECURITY SECTION (FARMER PRIVACY, ACCESS MATRIX & DPDP COMPLIANCE)
      ========================================================================= */}
      <div className="p-5 sm:p-6 rounded-3xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-xs space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-700/80 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-100 dark:bg-emerald-950/70 text-emerald-700 dark:text-emerald-300 flex items-center justify-center shrink-0">
              <Lock className="w-5 h-5 text-emerald-700 dark:text-[#A2DB72]" />
            </div>
            <div>
              <h3 className="font-bold text-base text-slate-900 dark:text-white flex items-center gap-2">
                <span>Farmer Document Security & Privacy Charter</span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300">
                  DPDP Act Compliant
                </span>
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                End-to-end cryptographic protection, zero public exposure, and complete access transparency for your agricultural records.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleExportDataPackage}
              disabled={exportingData}
              className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100 transition flex items-center gap-1.5"
            >
              {exportingData ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5 text-emerald-600" />}
              <span>Export My Data</span>
            </button>
          </div>
        </div>

        {/* 1. Core Security Guarantees & Cryptography */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-700/80 space-y-1">
            <div className="flex items-center gap-1.5 text-xs font-bold text-slate-900 dark:text-white">
              <Key className="w-3.5 h-3.5 text-emerald-600" />
              <span>AES-256-GCM Encryption</span>
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
              Every document is encrypted at rest with isolated initialization vectors and tamper-detection authentication tags.
            </p>
          </div>

          <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-700/80 space-y-1">
            <div className="flex items-center gap-1.5 text-xs font-bold text-slate-900 dark:text-white">
              <Clock className="w-3.5 h-3.5 text-amber-600" />
              <span>Zero Public Links</span>
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
              Files are never exposed via static URLs. Decryption is streamed only through single-session 10-minute temporary tickets.
            </p>
          </div>

          <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-700/80 space-y-1">
            <div className="flex items-center gap-1.5 text-xs font-bold text-slate-900 dark:text-white">
              <Shield className="w-3.5 h-3.5 text-blue-600" />
              <span>Zero AI Training</span>
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
              Farmer 7/12 land records, Aadhaar, and passbooks are never sold, shared with third parties, or used for AI model training.
            </p>
          </div>

          <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-700/80 space-y-1">
            <div className="flex items-center gap-1.5 text-xs font-bold text-slate-900 dark:text-white">
              <ShieldAlert className="w-3.5 h-3.5 text-purple-600" />
              <span>Statutory DBT Retention</span>
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
              Documents linked to active applications are legally locked against accidental deletion until official audit completion.
            </p>
          </div>
        </div>

        {/* 2. Access Transparency Matrix (Who Can Access What?) */}
        <div className="space-y-2.5">
          <div className="flex items-center justify-between">
            <h4 className="font-bold text-xs sm:text-sm text-slate-900 dark:text-white flex items-center gap-1.5">
              <Eye className="w-4 h-4 text-emerald-600" />
              <span>Access Transparency Matrix (Who Has Permission To View Your Records?)</span>
            </h4>
            <span className="text-[10px] text-slate-400">Strict Role-Based Access Control (RBAC)</span>
          </div>

          <div className="overflow-x-auto rounded-2xl border border-slate-200 dark:border-slate-700">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-slate-900/80 text-slate-600 dark:text-slate-300 font-semibold border-b border-slate-200 dark:border-slate-700">
                <tr>
                  <th className="p-3">User Role</th>
                  <th className="p-3">Access Level</th>
                  <th className="p-3">Permitted Scope</th>
                  <th className="p-3">Audit Trail</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-700/60 text-slate-700 dark:text-slate-300">
                <tr>
                  <td className="p-3 font-bold text-emerald-700 dark:text-emerald-400">Farmer (You)</td>
                  <td className="p-3"><span className="px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 font-semibold text-[10px]">Owner Full Access</span></td>
                  <td className="p-3 text-slate-500 dark:text-slate-400">All personal documents in private vault. Upload, view, and delete unlinked records.</td>
                  <td className="p-3 text-emerald-600 font-semibold">Self-Logged</td>
                </tr>
                <tr>
                  <td className="p-3 font-semibold text-blue-700 dark:text-blue-400">Bank Officer</td>
                  <td className="p-3"><span className="px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-950 text-blue-800 dark:text-blue-300 font-semibold text-[10px]">Conditional Inspection</span></td>
                  <td className="p-3 text-slate-500 dark:text-slate-400">ONLY documents attached to authorized loan/KCC applications assigned to their scrutiny queue.</td>
                  <td className="p-3 text-blue-600 font-semibold">100% Cryptographic Audit</td>
                </tr>
                <tr>
                  <td className="p-3 font-semibold text-purple-700 dark:text-purple-400">Agriculture Officer</td>
                  <td className="p-3"><span className="px-2 py-0.5 rounded-full bg-purple-100 dark:bg-purple-950 text-purple-800 dark:text-purple-300 font-semibold text-[10px]">Conditional Inspection</span></td>
                  <td className="p-3 text-slate-500 dark:text-slate-400">ONLY documents attached to authorized government subsidy schemes (e.g. PM-KUSUM, drip).</td>
                  <td className="p-3 text-purple-600 font-semibold">100% Cryptographic Audit</td>
                </tr>
                <tr>
                  <td className="p-3 font-semibold text-amber-700 dark:text-amber-400">CSC Operator (VLE)</td>
                  <td className="p-3"><span className="px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 font-semibold text-[10px]">Assisted Only</span></td>
                  <td className="p-3 text-slate-500 dark:text-slate-400">Only during in-person citizen registration and application submission at digital seva kiosk.</td>
                  <td className="p-3 text-amber-600 font-semibold">Session Logged</td>
                </tr>
                <tr>
                  <td className="p-3 font-semibold text-rose-700 dark:text-rose-400">System Admin</td>
                  <td className="p-3"><span className="px-2 py-0.5 rounded-full bg-rose-100 dark:bg-rose-950 text-rose-800 dark:text-rose-300 font-semibold text-[10px]">Audited Administrative</span></td>
                  <td className="p-3 text-slate-500 dark:text-slate-400">Controlled emergency maintenance; requires justification reason recorded in permanent audit trail.</td>
                  <td className="p-3 text-rose-600 font-semibold">Mandatory Reason Logged</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* 3. Recent Document Access Activity (Live Cryptographic Audit Feed) */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="font-bold text-xs sm:text-sm text-slate-900 dark:text-white flex items-center gap-1.5">
                <Activity className="w-4 h-4 text-emerald-600" />
                <span>Recent Document Access Activity (Transparency Audit Trail)</span>
              </h4>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Live cryptographic record of whenever an officer or service verified or viewed your vaulted documents.
              </p>
            </div>

            <button
              type="button"
              onClick={loadPrivacyActivity}
              disabled={loadingLogs}
              className="p-1.5 text-xs text-slate-500 hover:text-emerald-700 dark:hover:text-[#A2DB72] rounded-lg transition"
              title="Refresh Audit Feed"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loadingLogs ? 'animate-spin' : ''}`} />
            </button>
          </div>

          <div className="space-y-2">
            {loadingLogs ? (
              <div className="p-6 text-center text-xs text-slate-400">
                <Loader2 className="w-5 h-5 animate-spin mx-auto text-emerald-600 mb-2" />
                <span>Loading official access logs...</span>
              </div>
            ) : privacyLogs.length === 0 ? (
              <div className="p-5 text-center text-xs text-slate-500 bg-slate-50 dark:bg-slate-900/60 rounded-2xl border border-dashed border-slate-200 dark:border-slate-700">
                No third-party access events recorded. Your documents remain securely encrypted and unviewed by officers.
              </div>
            ) : (
              privacyLogs.slice(0, 5).map((log) => (
                <div
                  key={log.id}
                  className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-700/80 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs"
                >
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-800 dark:text-slate-200">
                        {log.action.replace(/_/g, ' ')}
                      </span>
                      <span className="text-[10px] px-1.5 py-0.2 rounded bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 font-mono">
                        {log.userRole}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">
                      {log.details}
                    </p>
                  </div>

                  <span className="text-[10px] text-slate-400 font-mono shrink-0">
                    {new Date(log.timestamp).toLocaleString()}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>

        {/* 4. Data Rights: Export & Erasure Request Controls */}
        <div className="pt-4 border-t border-slate-100 dark:border-slate-700/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="space-y-0.5">
            <h5 className="font-bold text-xs text-slate-900 dark:text-white">
              Data Portability & Right to Erasure
            </h5>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 max-w-xl">
              Under the Digital Personal Data Protection Act, you may export your complete data package or request account deletion when there are no active statutory applications.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleExportDataPackage}
              disabled={exportingData}
              className="px-3.5 py-2 text-xs font-bold rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-800 dark:text-white transition flex items-center gap-1.5"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export Package</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setShowErasureModal(true);
                setErasureMessage(null);
              }}
              className="px-3.5 py-2 text-xs font-bold rounded-xl border border-rose-200 dark:border-rose-900 text-rose-700 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition flex items-center gap-1.5"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Request Erasure</span>
            </button>
          </div>
        </div>
      </div>

      {/* Account / Data Erasure Modal */}
      {showErasureModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 p-5 space-y-4">
            <div className="flex items-center gap-3 text-rose-600">
              <div className="w-10 h-10 rounded-2xl bg-rose-100 dark:bg-rose-950/60 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-5 h-5 text-rose-600 dark:text-rose-400" />
              </div>
              <div>
                <h4 className="font-bold text-base text-slate-900 dark:text-white">
                  Citizen Data Erasure Request
                </h4>
                <p className="text-xs text-slate-500">
                  DPDP Right to Be Forgotten Protocol
                </p>
              </div>
            </div>

            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
              This request will purge your personal documents, farm profile, and notifications from the portal. In accordance with government DBT rules, records linked to active subsidy or loan applications under review cannot be deleted until statutory audit concludes.
            </p>

            {erasureMessage && (
              <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/60 border border-amber-300 dark:border-amber-800 text-xs text-amber-900 dark:text-amber-200">
                {erasureMessage}
              </div>
            )}

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setShowErasureModal(false)}
                className="px-4 py-2 text-xs font-semibold rounded-xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200"
              >
                Close
              </button>
              <button
                type="button"
                onClick={handleRequestErasure}
                disabled={erasureLoading}
                className="px-4 py-2 text-xs font-bold rounded-xl bg-rose-600 hover:bg-rose-700 text-white disabled:opacity-50 flex items-center gap-1.5"
              >
                {erasureLoading ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Processing...</span>
                  </>
                ) : (
                  <span>Submit Erasure Request</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
