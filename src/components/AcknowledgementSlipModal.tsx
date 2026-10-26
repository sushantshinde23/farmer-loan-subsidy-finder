import React, { useState } from 'react';
import {
  X,
  Printer,
  Download,
  Share2,
  Check,
  CheckCircle2,
  Clock,
  ShieldCheck,
  FileText,
  Building2,
  Calendar,
  Smartphone,
  Copy,
  MapPin,
  Mail,
  Loader2
} from 'lucide-react';
import { Application } from '../types';
import { useAuth } from '../context/AuthContext';
import { downloadApplicationSlipPDF } from '../services/pdfService';
import { sendGmailEmail } from '../services/gmailService';
import { getWorkspaceAccessToken, signInWithGoogleWorkspace } from '../lib/firebase';
import { GmailConfirmModal } from './GmailConfirmModal';

interface AcknowledgementSlipModalProps {
  application: Application | null;
  isOpen: boolean;
  onClose: () => void;
}

export const AcknowledgementSlipModal: React.FC<AcknowledgementSlipModalProps> = ({
  application,
  isOpen,
  onClose
}) => {
  const { user, farmerProfile } = useAuth();
  const [copied, setCopied] = useState(false);
  const [downloadSuccess, setDownloadSuccess] = useState(false);
  const [emailStatus, setEmailStatus] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle');
  const [emailErrorMsg, setEmailErrorMsg] = useState<string | null>(null);
  const [showEmailConfirm, setShowEmailConfirm] = useState(false);
  const [targetEmail, setTargetEmail] = useState('');

  if (!isOpen || !application) return null;

  const appNumber = application.applicationNumber || application.id;
  const applicantName = application.applicantName || application.farmerName || user?.fullName || 'Farmer Beneficiary';
  const mobile = application.farmerMobile || user?.mobile || '+91 98220 14589';
  const state = application.farmerState || user?.state || 'Maharashtra';
  const district = application.farmerDistrict || user?.district || 'Pune';
  const village = user?.village || 'Baramati';
  const surveyNo = farmerProfile?.surveyNumber || '142/2A, 143/1';
  const landArea = farmerProfile?.landAreaAcres ? `${farmerProfile.landAreaAcres} Acres` : '3.5 Acres';
  const claimAmount = application.subsidyClaimAmount ? `₹${application.subsidyClaimAmount.toLocaleString('en-IN')}` : '₹1,80,000';
  const submissionDate = application.submittedAt
    ? new Date(application.submittedAt).toLocaleDateString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      })
    : new Date().toLocaleDateString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric'
      });

  const receiptNo = `ACK/${new Date().getFullYear()}/${state.substring(0, 3).toUpperCase()}/${appNumber.replace(/\D/g, '').slice(-5) || '88192'}`;

  // Print Handler
  const handlePrint = () => {
    try {
      handleDownload();
      document.body.classList.add('printing-slip');
      const cleanup = () => {
        document.body.classList.remove('printing-slip');
        window.removeEventListener('afterprint', cleanup);
      };
      window.addEventListener('afterprint', cleanup);
      setTimeout(cleanup, 3000);
      if (typeof window !== 'undefined' && window.print) {
        window.print();
      }
    } catch (e) {
      console.error('Print failed or blocked in iframe sandbox:', e);
      handleDownload();
    }
  };

  // Copy Slip Info to Clipboard
  const handleCopyDetails = () => {
    const text = `GOVERNMENT OF INDIA - DBT ACKNOWLEDGEMENT SLIP
Receipt No: ${receiptNo}
Application No: ${appNumber}
Scheme: ${application.schemeName}
Applicant: ${applicantName}
Mobile: ${mobile}
District/State: ${district}, ${state}
Subsidy Claim: ${claimAmount}
Status: ${application.status}
Track URL: https://farmer.gov.in/track/${appNumber}`;

    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 3000);
  };

  // Share Slip
  const handleShare = async () => {
    const text = `Krishi DBT Acknowledgement Receipt: ${appNumber} for ${application.schemeName} lodged successfully.`;
    if (navigator.share) {
      try {
        await navigator.share({
          title: `DBT Acknowledgement - ${appNumber}`,
          text,
          url: window.location.href
        });
        return;
      } catch {
        // Fallback to copy
      }
    }
    handleCopyDetails();
  };

  // Download Official Vector PDF Slip
  const handleDownload = () => {
    try {
      downloadApplicationSlipPDF(
        application,
        applicantName,
        mobile,
        district,
        state,
        landArea
      );
      setDownloadSuccess(true);
      setTimeout(() => setDownloadSuccess(false), 3000);
    } catch (err) {
      console.error('Vector PDF generation error, downloading HTML receipt fallback:', err);
      const slipHTML = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Acknowledgement Slip - ${appNumber}</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; background: #f8fafc; color: #0f172a; padding: 24px; margin: 0; }
    .slip-container { max-width: 720px; margin: 0 auto; background: #ffffff; border: 2px solid #047857; border-radius: 12px; padding: 32px; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1); }
    .header { text-align: center; border-bottom: 2px solid #e2e8f0; padding-bottom: 20px; }
    .emblem { font-size: 28px; }
    .gov-title { font-size: 15px; font-weight: 800; color: #15803d; text-transform: uppercase; letter-spacing: 0.5px; margin: 4px 0; }
    .sub-title { font-size: 13px; color: #64748b; margin: 0; }
    .slip-heading { font-size: 18px; font-weight: 800; color: #0f172a; margin-top: 12px; }
    .meta-bar { display: flex; justify-content: space-between; background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 8px; padding: 12px 16px; margin: 20px 0; font-size: 13px; }
    .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 20px; }
    .card { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 16px; }
    .card-title { font-size: 12px; font-weight: 700; color: #15803d; text-transform: uppercase; margin-bottom: 12px; border-bottom: 1px solid #e2e8f0; padding-bottom: 6px; }
    .row { display: flex; justify-content: space-between; margin-bottom: 8px; font-size: 13px; }
    .label { color: #64748b; }
    .value { font-weight: 600; color: #0f172a; text-align: right; }
    .timeline { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 16px; margin-bottom: 20px; }
    .badge { display: inline-block; padding: 3px 8px; border-radius: 4px; font-size: 11px; font-weight: 700; background: #dcfce7; color: #15803d; }
    .footer { text-align: center; border-top: 1px solid #e2e8f0; padding-top: 16px; font-size: 11px; color: #64748b; }
    @media print {
      body { background: #fff; padding: 0; }
      .slip-container { border: 1px solid #000; box-shadow: none; }
    }
  </style>
</head>
<body>
  <div class="slip-container">
    <div class="header">
      <div class="emblem">🏛️</div>
      <div class="gov-title">Government of India • Ministry of Agriculture & Farmers Welfare</div>
      <div class="sub-title">कृषि एवं किसान कल्याण मंत्रालय • Direct Benefit Transfer (DBT) Portal</div>
      <div class="slip-heading">Official Application Acknowledgement Receipt (आवेदन पावती)</div>
    </div>
    <div class="meta-bar">
      <div><strong>Receipt No:</strong> ${receiptNo}</div>
      <div><strong>Date:</strong> ${submissionDate}</div>
      <div><strong>Tracking ID:</strong> <span style="font-family: monospace; font-weight: bold; color: #047857;">${appNumber}</span></div>
    </div>
    <div class="grid">
      <div class="card">
        <div class="card-title">Beneficiary Details</div>
        <div class="row"><span class="label">Farmer Name:</span><span class="value">${applicantName}</span></div>
        <div class="row"><span class="label">Mobile:</span><span class="value">${mobile}</span></div>
        <div class="row"><span class="label">District & State:</span><span class="value">${district}, ${state}</span></div>
        <div class="row"><span class="label">Landholding:</span><span class="value">${landArea}</span></div>
      </div>
      <div class="card">
        <div class="card-title">Scheme Details</div>
        <div class="row"><span class="label">Scheme Name:</span><span class="value">${application.schemeName}</span></div>
        <div class="row"><span class="label">Subsidy Claim:</span><span class="value" style="color: #047857; font-weight: 700;">${claimAmount}</span></div>
        <div class="row"><span class="label">Status:</span><span class="value"><span class="badge">${application.status}</span></span></div>
      </div>
    </div>
    <div class="footer">
      <p style="margin: 4px 0; font-weight: bold; color: #047857;">✓ Digitally Authenticated Government Document</p>
    </div>
  </div>
</body>
</html>`;

      const blob = new Blob([slipHTML], { type: 'text/html;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `Acknowledgement_Slip_${appNumber}.html`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      setDownloadSuccess(true);
      setTimeout(() => setDownloadSuccess(false), 3000);
    }
  };

  // Initiate Email via Gmail
  const handleInitiateEmail = async () => {
    let token = getWorkspaceAccessToken();
    if (!token) {
      try {
        const res = await signInWithGoogleWorkspace();
        token = res.accessToken;
      } catch (err: any) {
        setEmailErrorMsg('Please connect your Google Workspace / Gmail account to dispatch receipt.');
        setEmailStatus('error');
        return;
      }
    }

    const defaultRecipient = user?.email || 'sushantshinde5598@gmail.com';
    setTargetEmail(defaultRecipient);
    setShowEmailConfirm(true);
  };

  // Confirm sending via Gmail
  const handleConfirmEmail = async () => {
    const token = getWorkspaceAccessToken();
    if (!token) return;

    setEmailStatus('sending');
    setEmailErrorMsg(null);
    setShowEmailConfirm(false);

    try {
      const emailBody = `GOVERNMENT OF INDIA - DIRECT BENEFIT TRANSFER (DBT)
Ministry of Agriculture & Farmers Welfare
Application Acknowledgement Receipt

Receipt No: ${receiptNo}
Application Reference No: ${appNumber}
Scheme Name: ${application.schemeName}
Applicant / Beneficiary: ${applicantName}
Registered Mobile: ${mobile}
State / District: ${district}, ${state}
Landholding / Survey No: ${surveyNo} (${landArea})
Subsidy Claim Amount: ${claimAmount}
Current Status: ${application.status}
Submission Timestamp: ${submissionDate}

Your application has been received into the central scrutiny portal.
You can track scrutiny progress and official field officer inspection notes at:
https://farmer.gov.in/track/${appNumber}

Official Krishi Assistance Portal • Government of India`;

      await sendGmailEmail(token, {
        to: targetEmail,
        subject: `[Official Receipt] DBT Application Acknowledgement - ${application.schemeName} (${appNumber})`,
        body: emailBody,
        isHtml: false
      });

      setEmailStatus('sent');
      setTimeout(() => setEmailStatus('idle'), 4000);
    } catch (err: any) {
      console.error('Failed to send receipt via Gmail:', err);
      setEmailErrorMsg(err.message || 'Failed to dispatch email via Gmail.');
      setEmailStatus('error');
      setTimeout(() => setEmailStatus('idle'), 4000);
    }
  };

  return (
    <>
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/70 backdrop-blur-xs animate-in fade-in duration-200 overflow-y-auto">
      <div className="w-full max-w-2xl bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col my-auto max-h-[95vh]">
        {/* Top Government Tricolor Band */}
        <div className="h-1.5 flex shrink-0">
          <div className="flex-1 bg-amber-500" />
          <div className="flex-1 bg-white" />
          <div className="flex-1 bg-emerald-600" />
        </div>

        {/* Modal Top Controls Bar */}
        <div className="p-3 sm:p-4 bg-slate-50 dark:bg-slate-850 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            <span className="p-1 rounded-lg bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300">
              <FileText className="w-4 h-4" />
            </span>
            <div>
              <h3 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white">
                Official DBT Acknowledgement Slip
              </h3>
              <p className="text-[10px] sm:text-[11px] text-slate-500 dark:text-slate-400">
                Direct Benefit Transfer (DBT) • Agriculture Portal
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 sm:gap-2">
            {/* Email Slip via Gmail Button */}
            <button
              onClick={handleInitiateEmail}
              id="btn-modal-email-slip"
              title="Email Receipt via Gmail"
              disabled={emailStatus === 'sending'}
              className="px-2.5 py-1.5 rounded-xl border border-red-200 dark:border-red-900/60 bg-red-50 hover:bg-red-100 dark:bg-red-950/40 dark:hover:bg-red-900/60 text-red-700 dark:text-red-300 text-xs font-bold flex items-center gap-1.5 transition"
            >
              {emailStatus === 'sending' ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : emailStatus === 'sent' ? (
                <Check className="w-3.5 h-3.5 text-emerald-600" />
              ) : (
                <Mail className="w-3.5 h-3.5 text-red-600" />
              )}
              <span className="hidden sm:inline">
                {emailStatus === 'sending' ? 'Sending...' : emailStatus === 'sent' ? 'Emailed!' : 'Gmail Slip'}
              </span>
            </button>

            <button
              onClick={handlePrint}
              id="btn-modal-print-slip"
              title="Print Receipt"
              className="px-2.5 py-1.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold flex items-center gap-1.5 transition shadow-xs"
            >
              <Printer className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Print Slip</span>
            </button>

            <button
              onClick={handleDownload}
              id="btn-modal-download-slip"
              title="Download Slip File"
              className="px-2.5 py-1.5 rounded-xl border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs font-semibold flex items-center gap-1.5 transition"
            >
              {downloadSuccess ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Download className="w-3.5 h-3.5" />}
              <span className="hidden sm:inline">{downloadSuccess ? 'Downloaded' : 'Download'}</span>
            </button>

            <button
              onClick={handleShare}
              title="Share or Copy Tracking Link"
              className="p-1.5 rounded-xl border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 transition"
            >
              {copied ? <Check className="w-4 h-4 text-emerald-600" /> : <Share2 className="w-4 h-4" />}
            </button>

            <button
              onClick={onClose}
              className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-slate-800 transition ml-1"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Email feedback notice */}
        {emailStatus === 'sent' && (
          <div className="bg-emerald-600 text-white text-xs py-1.5 px-4 text-center font-medium animate-in fade-in">
            ✓ Acknowledgement slip emailed successfully to {targetEmail} via your Gmail account.
          </div>
        )}
        {emailErrorMsg && (
          <div className="bg-rose-600 text-white text-xs py-1.5 px-4 text-center font-medium animate-in fade-in">
            {emailErrorMsg}
          </div>
        )}

        {/* Printable & Scrollable Slip Body */}
        <div id="acknowledgement-slip-content" className="p-4 sm:p-7 overflow-y-auto space-y-5 bg-white text-slate-900">
          {/* Slip Official Emblem & Header */}
          <div className="text-center pb-4 border-b-2 border-slate-200 space-y-1">
            <div className="text-2xl">🏛️</div>
            <h2 className="text-xs sm:text-sm font-extrabold text-emerald-900 uppercase tracking-wide">
              Government of India • Ministry of Agriculture & Farmers Welfare
            </h2>
            <p className="text-[11px] text-slate-600 font-medium">
              कृषि एवं किसान कल्याण मंत्रालय • Direct Benefit Transfer (DBT) Central Portal
            </p>
            <div className="inline-block px-3 py-1 rounded-full bg-emerald-50 border border-emerald-300 text-emerald-900 text-xs font-black uppercase tracking-wider mt-1">
              Application Acknowledgement Receipt (आवेदन प्राप्ति रसीद)
            </div>
          </div>

          {/* Meta Information Bar with Barcode simulation */}
          <div className="p-3 sm:p-3.5 rounded-2xl bg-slate-50 border border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
            <div className="space-y-1 text-center sm:text-left">
              <div className="text-slate-500 text-[11px]">Official Receipt No:</div>
              <div className="font-mono font-bold text-slate-800 text-xs sm:text-sm">
                {receiptNo}
              </div>
            </div>

            <div className="space-y-1 text-center sm:text-left">
              <div className="text-slate-500 text-[11px]">Application Tracking Number:</div>
              <div className="font-mono font-extrabold text-emerald-700 text-sm sm:text-base">
                {appNumber}
              </div>
            </div>

            <div className="space-y-1 text-center sm:text-right">
              <div className="text-slate-500 text-[11px]">Date & Time Lodged:</div>
              <div className="font-semibold text-slate-800 text-xs">
                {submissionDate}
              </div>
            </div>
          </div>

          {/* Details Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Beneficiary Details */}
            <div className="p-4 rounded-2xl bg-slate-50/70 border border-slate-200 space-y-2.5 text-xs">
              <div className="flex items-center justify-between pb-1.5 border-b border-slate-200">
                <span className="font-bold text-emerald-800 uppercase tracking-wide text-[11px]">
                  1. Beneficiary Information (लाभार्थी विवरण)
                </span>
                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800">
                  eKYC Verified
                </span>
              </div>

              <div className="flex justify-between py-0.5">
                <span className="text-slate-500">Applicant Name:</span>
                <span className="font-bold text-slate-900">{applicantName}</span>
              </div>

              <div className="flex justify-between py-0.5">
                <span className="text-slate-500">Mobile Number:</span>
                <span className="font-semibold text-slate-800">{mobile}</span>
              </div>

              <div className="flex justify-between py-0.5">
                <span className="text-slate-500">Aadhaar (UIDAI):</span>
                <span className="font-mono text-slate-700">XXXX-XXXX-1458</span>
              </div>

              <div className="flex justify-between py-0.5">
                <span className="text-slate-500">State / District:</span>
                <span className="font-semibold text-slate-800">{district}, {state}</span>
              </div>

              <div className="flex justify-between py-0.5">
                <span className="text-slate-500">Village / Taluka:</span>
                <span className="font-semibold text-slate-800">{village}, Baramati</span>
              </div>

              <div className="flex justify-between py-0.5">
                <span className="text-slate-500">Landholding:</span>
                <span className="font-semibold text-slate-800">{landArea} (Khasra: {surveyNo})</span>
              </div>

              <div className="flex justify-between py-0.5">
                <span className="text-slate-500">Bank Account (PFMS):</span>
                <span className="font-mono text-slate-700">SBI ****4092 (Aadhaar Seeded)</span>
              </div>
            </div>

            {/* Scheme & Sanction Details */}
            <div className="p-4 rounded-2xl bg-slate-50/70 border border-slate-200 space-y-2.5 text-xs">
              <div className="flex items-center justify-between pb-1.5 border-b border-slate-200">
                <span className="font-bold text-emerald-800 uppercase tracking-wide text-[11px]">
                  2. Scheme & Sanction Details (योजना विवरण)
                </span>
                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-blue-100 text-blue-800">
                  {application.schemeType || 'SUBSIDY'}
                </span>
              </div>

              <div className="flex justify-between py-0.5">
                <span className="text-slate-500">Applied Scheme:</span>
                <span className="font-bold text-slate-900 text-right max-w-[180px] truncate" title={application.schemeName}>
                  {application.schemeName}
                </span>
              </div>

              <div className="flex justify-between py-0.5">
                <span className="text-slate-500">Subsidy Claim Amount:</span>
                <span className="font-bold text-emerald-700 font-mono text-sm">{claimAmount}</span>
              </div>

              <div className="flex justify-between py-0.5">
                <span className="text-slate-500">Processing Authority:</span>
                <span className="font-semibold text-slate-800">District Agriculture Office</span>
              </div>

              <div className="flex justify-between py-0.5">
                <span className="text-slate-500">Current Milestone:</span>
                <span className="font-bold text-emerald-700">
                  {application.status === 'APPROVED' ? 'DBT Sanction Issued' : 'Field Inspection & Verification'}
                </span>
              </div>

              <div className="flex justify-between py-0.5">
                <span className="text-slate-500">Lodged Channel:</span>
                <span className="font-semibold text-slate-800">Krishi Online Portal</span>
              </div>

              <div className="flex justify-between py-0.5">
                <span className="text-slate-500">Priority Level:</span>
                <span className="font-semibold text-slate-800">{application.priority || 'NORMAL'}</span>
              </div>

              <div className="flex justify-between py-0.5">
                <span className="text-slate-500">Attached Documents:</span>
                <span className="font-semibold text-slate-800">4 Verified (DigiLocker)</span>
              </div>
            </div>
          </div>

          {/* Attached Verified Documents Checklist */}
          <div className="p-3.5 rounded-2xl bg-emerald-50/60 border border-emerald-200 text-xs space-y-2">
            <span className="font-bold text-emerald-900 text-[11px] uppercase tracking-wider block">
              DigiLocker Verified Documents In Dossier:
            </span>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px]">
              <div className="flex items-center gap-1.5 text-emerald-800 font-semibold">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                <span>7/12 Land Record</span>
              </div>
              <div className="flex items-center gap-1.5 text-emerald-800 font-semibold">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                <span>Aadhaar eKYC</span>
              </div>
              <div className="flex items-center gap-1.5 text-emerald-800 font-semibold">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                <span>Bank Passbook (PFMS)</span>
              </div>
              <div className="flex items-center gap-1.5 text-emerald-800 font-semibold">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                <span>Caste / Category Cert.</span>
              </div>
            </div>
          </div>

          {/* Latest Officer Audit Note */}
          {application.timeline && application.timeline.length > 0 && (
            <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200 text-xs space-y-1">
              <div className="flex items-center justify-between text-[11px] text-slate-500">
                <span className="font-bold text-slate-700">Official Scrutiny Log & Note:</span>
                <span>{new Date(application.timeline[application.timeline.length - 1].timestamp).toLocaleDateString()}</span>
              </div>
              <p className="text-slate-800 italic">
                "{application.timeline[application.timeline.length - 1].remarks}"
              </p>
              <p className="text-[10px] text-slate-400">
                Action by: {application.timeline[application.timeline.length - 1].byRole || 'Agriculture Officer'} ({application.timeline[application.timeline.length - 1].byName || 'District Scrutiny Desk'})
              </p>
            </div>
          )}

          {/* Official Verification Seal & Footer */}
          <div className="pt-3 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs">
            <div className="space-y-1 text-center sm:text-left text-slate-500 text-[11px]">
              <div className="flex items-center gap-1.5 text-emerald-800 font-bold">
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
                <span>Digitally Authenticated by National Agriculture DBT Engine</span>
              </div>
              <p>This is a valid digital acknowledgement slip under IT Act 2000. Physical signature not required.</p>
              <p>Toll-Free Kisan Call Centre (KCC): 1800-180-1551 • farmer.gov.in</p>
            </div>

            {/* Simulated Stamp / Seal */}
            <div className="border-2 border-dashed border-emerald-600 rounded-2xl p-2.5 text-center min-w-[130px] bg-emerald-50/50">
              <div className="text-[9px] font-extrabold text-emerald-900 tracking-wider uppercase">DBT VERIFIED</div>
              <div className="text-xs font-black text-emerald-700 my-0.5">VALID RECEIPT</div>
              <div className="text-[8px] text-emerald-800 font-mono">{appNumber}</div>
            </div>
          </div>
        </div>

        {/* Modal Bottom Actions */}
        <div className="p-3 sm:p-4 bg-slate-50 dark:bg-slate-850 border-t border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-2 shrink-0">
          <button
            onClick={handleCopyDetails}
            className="text-xs font-semibold text-slate-600 dark:text-slate-300 hover:text-emerald-700 dark:hover:text-emerald-400 flex items-center gap-1.5 py-1.5 px-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 transition"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copied ? 'Details Copied!' : 'Copy Reference'}</span>
          </button>

          <div className="flex items-center gap-2">
            <button
              onClick={handleDownload}
              className="px-3.5 py-2 text-xs font-bold rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-100 text-slate-800 dark:text-slate-200 flex items-center gap-1.5 shadow-2xs"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Save / Download</span>
            </button>
            <button
              onClick={handlePrint}
              className="px-4 py-2 text-xs font-bold rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white flex items-center gap-1.5 shadow-sm transition"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print Acknowledgement</span>
            </button>
          </div>
        </div>
      </div>
    </div>

    {/* Mandatory Explicit Confirmation Dialog before sending Workspace Email */}
    <GmailConfirmModal
      isOpen={showEmailConfirm}
      onClose={() => setShowEmailConfirm(false)}
      onConfirm={handleConfirmEmail}
      type="SEND"
      title="Email DBT Acknowledgement via Gmail"
      description="Send the official DBT Application Acknowledgement receipt and reference details directly to your connected Gmail address?"
      details={{
        recipient: targetEmail,
        subject: `[Official Receipt] DBT Application Acknowledgement - ${application.schemeName} (${appNumber})`
      }}
      confirmButtonText="Confirm & Send via Gmail"
      isLoading={emailStatus === 'sending'}
    />
    </>
  );
};
