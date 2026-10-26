import React, { useState } from 'react';
import {
  X,
  Send,
  Sparkles,
  Mail,
  Loader2,
  FileCheck,
  CheckCircle2,
  Info
} from 'lucide-react';
import { sendGmailEmail, SendEmailParams } from '../services/gmailService';
import { GmailConfirmModal } from './GmailConfirmModal';

interface GmailComposeModalProps {
  isOpen: boolean;
  onClose: () => void;
  accessToken: string | null;
  defaultTo?: string;
  defaultSubject?: string;
  defaultBody?: string;
  onSuccess?: () => void;
  senderEmail?: string;
}

export const GmailComposeModal: React.FC<GmailComposeModalProps> = ({
  isOpen,
  onClose,
  accessToken,
  defaultTo = '',
  defaultSubject = '',
  defaultBody = '',
  onSuccess,
  senderEmail
}) => {
  const [to, setTo] = useState(defaultTo);
  const [subject, setSubject] = useState(defaultSubject);
  const [body, setBody] = useState(defaultBody);
  const [isSending, setIsSending] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [showConfirm, setShowConfirm] = useState(false);

  // Sync defaults when modal opens with new props
  React.useEffect(() => {
    if (isOpen) {
      setTo(defaultTo);
      setSubject(defaultSubject);
      setBody(defaultBody);
      setErrorMsg(null);
      setSuccessMsg(null);
      setShowConfirm(false);
    }
  }, [isOpen, defaultTo, defaultSubject, defaultBody]);

  if (!isOpen) return null;

  const quickTemplates = [
    {
      title: 'PM-KISAN Status Inquiry',
      to: 'dbt-agri.helpdesk@gov.in',
      subject: 'Inquiry regarding PM-KISAN Scrutiny & Aadhaar eKYC Status',
      body: `Respected Agriculture Officer / DBT Helpdesk,\n\nI am writing to inquire regarding my DBT subsidy application status. My details are:\n- Farmer Name: [Your Name]\n- Aadhaar Linked Mobile: [Your Mobile]\n- State & District: [State, District]\n\nKindly inspect my pending DBT installment and let me know if any further biometric eKYC verification is needed at the local CSC/Seva Kendra.\n\nThank you,\nFarmer Applicant`
    },
    {
      title: 'KCC Crop Loan Disbursement Follow-up',
      to: 'kcc.desk@sbi.co.in',
      subject: 'Follow-up on Kisan Credit Card (KCC) Crop Loan Sanction',
      body: `To The Branch Manager / Agricultural Credit Officer,\n\nI have submitted my 7/12 Land Record and Aadhaar documentation for sanctioning my Kisan Credit Card (KCC) Kharif season credit limit.\n\nKindly update me regarding the field verification schedule and disbursement date.\n\nRegards,\nFarmer Applicant`
    },
    {
      title: 'Solar Pump (PM-KUSUM) Subsidy Query',
      to: 'kusum-solar@mahaurja.com',
      subject: 'PM-KUSUM Component-B Solar Pump Installation & Verification Query',
      body: `Respected Agency Representative,\n\nI have registered for the 90% Subsidized Solar Water Pump scheme. My agricultural land is located at Survey No: [Survey Number].\n\nPlease let me know the status of site inspection by the empaneled solar vendor.\n\nWarm regards,\nFarmer Applicant`
    },
    {
      title: 'Officer Official Sanction Notification',
      to: to || 'farmer.applicant@gov.in',
      subject: 'Official Update: Application Approved for Direct Benefit Transfer',
      body: `Dear Farmer / Applicant,\n\nThis is an official communication regarding your agricultural assistance application.\n\nYour application has been verified by the desk officer. All submitted land and bank documents have met the government eligibility standards.\n\nThe subsidy amount will be credited to your Aadhaar-seeded bank account under Direct Benefit Transfer (DBT).\n\nOffice of Agricultural Scrutiny\nGovernment of India`
    }
  ];

  const handleApplyTemplate = (tmpl: typeof quickTemplates[0]) => {
    setTo(tmpl.to);
    setSubject(tmpl.subject);
    setBody(tmpl.body);
  };

  const handleInitiateSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!accessToken) {
      setErrorMsg('Please connect your Google Account first to send emails through Gmail.');
      return;
    }
    if (!to.trim()) {
      setErrorMsg('Please specify a recipient email address.');
      return;
    }
    if (!subject.trim()) {
      setErrorMsg('Please enter an email subject.');
      return;
    }
    if (!body.trim()) {
      setErrorMsg('Please write message content before sending.');
      return;
    }

    setErrorMsg(null);
    setShowConfirm(true);
  };

  const handleConfirmSend = async () => {
    if (!accessToken) return;
    setIsSending(true);
    setErrorMsg(null);

    try {
      const params: SendEmailParams = {
        to: to.trim(),
        subject: subject.trim(),
        body: body.trim(),
        isHtml: false,
        from: senderEmail || undefined
      };

      await sendGmailEmail(accessToken, params);
      setShowConfirm(false);
      setSuccessMsg('Email sent successfully via your connected Gmail account!');

      setTimeout(() => {
        if (onSuccess) onSuccess();
        onClose();
      }, 1500);
    } catch (err: any) {
      console.error('Failed to send email via Gmail:', err);
      setErrorMsg(err.message || 'Failed to dispatch email. Please check your network and Google authorization.');
      setShowConfirm(false);
    } finally {
      setIsSending(false);
    }
  };

  return (
    <>
      <div className="fixed inset-0 z-40 flex items-center justify-center p-3 sm:p-4 bg-slate-950/60 backdrop-blur-xs animate-in fade-in duration-150">
        <div className="relative w-full max-w-2xl bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
          {/* Header */}
          <div className="px-5 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-950/60">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-red-100 text-red-600 dark:bg-red-950/60 dark:text-red-400 flex items-center justify-center shrink-0">
                <Mail className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white leading-tight">
                  Official Gmail Compose Desk
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {senderEmail ? `Sending from: ${senderEmail}` : 'Send official inquiries & notices via Gmail'}
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Body */}
          <div className="flex-1 overflow-y-auto p-5 space-y-4 text-xs sm:text-sm">
            {/* Quick Templates Drawer */}
            <div>
              <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-700 dark:text-slate-300 mb-2">
                <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                <span>Quick Agricultural Templates:</span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {quickTemplates.map((tmpl, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => handleApplyTemplate(tmpl)}
                    className="px-2.5 py-1 text-[11px] font-medium rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 hover:bg-emerald-50 hover:border-emerald-300 hover:text-emerald-700 dark:hover:bg-emerald-950 dark:hover:border-emerald-800 dark:hover:text-emerald-300 transition"
                  >
                    {tmpl.title}
                  </button>
                ))}
              </div>
            </div>

            {/* Error & Success alerts */}
            {errorMsg && (
              <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 text-rose-700 dark:text-rose-300 text-xs flex items-start gap-2">
                <Info className="w-4 h-4 shrink-0 mt-0.5 text-rose-500" />
                <span>{errorMsg}</span>
              </div>
            )}

            {successMsg && (
              <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900/60 text-emerald-800 dark:text-emerald-300 text-xs flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
                <span>{successMsg}</span>
              </div>
            )}

            <form onSubmit={handleInitiateSend} id="gmail-compose-form" className="space-y-3">
              {/* To */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  To (Recipient Email Address) <span className="text-rose-500">*</span>
                </label>
                <input
                  type="email"
                  value={to}
                  onChange={(e) => setTo(e.target.value)}
                  placeholder="e.g. agri-officer@gov.in or applicant.farmer@gmail.com"
                  required
                  className="w-full px-3 py-2 text-xs sm:text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-600"
                />
              </div>

              {/* Subject */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Subject <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  placeholder="Official inquiry, sanction letter, or claim verification..."
                  required
                  className="w-full px-3 py-2 text-xs sm:text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-600"
                />
              </div>

              {/* Message Body */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Message Content <span className="text-rose-500">*</span>
                </label>
                <textarea
                  rows={8}
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  placeholder="Type your official message, grievance, or response here..."
                  required
                  className="w-full px-3 py-2 text-xs sm:text-sm font-sans rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-600 leading-relaxed"
                />
              </div>
            </form>
          </div>

          {/* Footer */}
          <div className="px-5 py-3 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/60 flex items-center justify-between gap-3">
            <span className="text-[11px] text-slate-500 dark:text-slate-400">
              User confirmation required before sending
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                disabled={isSending}
                className="px-3.5 py-2 text-xs font-semibold rounded-lg border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
              >
                Discard
              </button>
              <button
                type="submit"
                form="gmail-compose-form"
                disabled={isSending}
                className="px-4 py-2 text-xs font-bold rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white shadow-xs transition active:scale-95 flex items-center gap-1.5 disabled:opacity-50"
              >
                {isSending ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Send className="w-3.5 h-3.5" />
                )}
                <span>Send Message</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Mandatory User Confirmation Dialog before mutating Workspace data */}
      <GmailConfirmModal
        isOpen={showConfirm}
        onClose={() => setShowConfirm(false)}
        onConfirm={handleConfirmSend}
        type="SEND"
        title="Confirm Sending Email via Gmail"
        description="Are you sure you want to send this email through your connected Google Workspace account?"
        details={{
          recipient: to,
          subject: subject
        }}
        confirmButtonText="Confirm & Send via Gmail"
        isLoading={isSending}
      />
    </>
  );
};
