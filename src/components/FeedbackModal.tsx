import React, { useState } from 'react';
import {
  MessageSquare,
  Star,
  Send,
  X,
  CheckCircle2,
  AlertCircle,
  Loader2,
  ShieldCheck,
  User,
  Heart
} from 'lucide-react';
import { submitFeedbackToCloud } from '../lib/firestoreService';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';

interface FeedbackModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const FeedbackModal: React.FC<FeedbackModalProps> = ({ isOpen, onClose }) => {
  const { user } = useAuth();
  const { t } = useLanguage();
  const [farmerName, setFarmerName] = useState(user?.fullName || 'Sushant Shinde');
  const [farmerMobile, setFarmerMobile] = useState(user?.mobile || '+91 98220 14589');
  const [rating, setRating] = useState<number>(5);
  const [hoverRating, setHoverRating] = useState<number | null>(null);
  const [category, setCategory] = useState<string>('GENERAL_PORTAL');
  const [comments, setComments] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [successMsg, setSuccessMsg] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!comments.trim()) {
      setErrorMsg('Please share your feedback or experience in the comments box.');
      return;
    }

    setSubmitting(true);
    setErrorMsg(null);
    try {
      await submitFeedbackToCloud({
        farmerName: farmerName.trim() || 'Kisan Beneficiary',
        farmerMobile: farmerMobile.trim() || undefined,
        rating,
        category,
        comments: comments.trim(),
        userId: user?.id || 'anonymous'
      });

      setSuccessMsg(true);
      setTimeout(() => {
        setSuccessMsg(false);
        setComments('');
        onClose();
      }, 2500);
    } catch (err: any) {
      console.error('Feedback submit failed:', err);
      setErrorMsg(err?.message || 'Could not save feedback. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="w-full max-w-lg bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col max-h-[92vh]">
        {/* Government tricolor top stripe */}
        <div className="h-1 flex">
          <div className="flex-1 bg-amber-500" />
          <div className="flex-1 bg-white" />
          <div className="flex-1 bg-emerald-600" />
        </div>

        {/* Modal Header */}
        <div className="p-4 sm:p-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-2xl bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 flex items-center justify-center">
              <MessageSquare className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base text-slate-900 dark:text-white">
                {t('feedbackTitle', 'Farmer Feedback & Suggestions')}
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {t('feedbackSubtitle', 'Help improve subsidy discovery, loan applications & DigiLocker vault')}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body Content */}
        <div className="p-5 overflow-y-auto flex-1 space-y-4">
          {successMsg ? (
            <div className="p-6 rounded-2xl bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 text-center space-y-2">
              <div className="w-12 h-12 rounded-full bg-emerald-600 text-white flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <h4 className="font-bold text-base text-emerald-900 dark:text-emerald-200">
                {t('feedbackSuccessTitle', 'Dhanyawad! Feedback Submitted')}
              </h4>
              <p className="text-xs text-emerald-800 dark:text-emerald-300">
                {t('feedbackSuccessDesc', 'Your rating and suggestions have been securely persisted to Cloud Firestore.')}
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              {errorMsg && (
                <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-200 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
                  <span>{errorMsg}</span>
                </div>
              )}

              {/* Star Rating Section */}
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-center space-y-2">
                <label className="block text-xs font-bold text-slate-800 dark:text-slate-200">
                  {t('ratingLabel', 'Overall Portal Rating:')}
                </label>
                <div className="flex items-center justify-center gap-2">
                  {[1, 2, 3, 4, 5].map((star) => {
                    const active = (hoverRating !== null ? hoverRating : rating) >= star;
                    return (
                      <button
                        key={star}
                        type="button"
                        onClick={() => setRating(star)}
                        onMouseEnter={() => setHoverRating(star)}
                        onMouseLeave={() => setHoverRating(null)}
                        className="p-1 text-2xl transition transform hover:scale-110 active:scale-95 focus:outline-hidden"
                      >
                        <Star
                          className={`w-7 h-7 ${
                            active
                              ? 'text-amber-400 fill-amber-400'
                              : 'text-slate-300 dark:text-slate-600'
                          }`}
                        />
                      </button>
                    );
                  })}
                </div>
                <span className="inline-block text-[11px] font-semibold text-emerald-700 dark:text-emerald-400">
                  {rating === 5 && 'Outstanding & Extremely Helpful (5 / 5)'}
                  {rating === 4 && 'Very Good Service (4 / 5)'}
                  {rating === 3 && 'Good / Satisfactory (3 / 5)'}
                  {rating === 2 && 'Needs Improvement (2 / 5)'}
                  {rating === 1 && 'Poor Experience (1 / 5)'}
                </span>
              </div>

              {/* Category */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  {t('feedbackCategoryLabel', 'Feedback Category:')}
                </label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full text-xs py-2 px-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
                >
                  <option value="GENERAL_PORTAL">General Website & Navigation</option>
                  <option value="SUBSIDY_FINDER">Subsidy Finder (PM-KUSUM, PDMC)</option>
                  <option value="LOAN_FINDER">Kisan Credit Card (KCC) & Bank Loans</option>
                  <option value="DIGILOCKER_VAULT">Document Vault & 7/12 Records</option>
                  <option value="OFFLINE_PWA">Offline Accessibility & Sync</option>
                </select>
              </div>

              {/* Farmer Name & Mobile */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    {t('fullNameLabel', 'Farmer Full Name:')}
                  </label>
                  <input
                    type="text"
                    required
                    value={farmerName}
                    onChange={(e) => setFarmerName(e.target.value)}
                    placeholder="e.g. Balasaheb Shinde"
                    className="w-full text-xs py-2 px-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    {t('mobileNumberLabel', 'Mobile Number:')}
                  </label>
                  <input
                    type="text"
                    value={farmerMobile}
                    onChange={(e) => setFarmerMobile(e.target.value)}
                    placeholder="+91 98220 14589"
                    className="w-full text-xs py-2 px-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white"
                  />
                </div>
              </div>

              {/* Comments */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  {t('feedbackCommentsLabel', 'Comments & Suggestions:')}
                </label>
                <textarea
                  rows={4}
                  required
                  value={comments}
                  onChange={(e) => setComments(e.target.value)}
                  placeholder={t('feedbackPlaceholder', 'Share your experience using the subsidy finder, document uploads, or any feature request...')}
                  className="w-full text-xs p-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white leading-relaxed resize-none"
                />
              </div>

              {/* Security notice */}
              <div className="flex items-center gap-2 text-[11px] text-slate-500 dark:text-slate-400">
                <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>{t('feedbackSecurityNotice', 'Saved securely to Cloud Firestore and reviewed by the portal improvement cell.')}</span>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={submitting}
                className="w-full py-2.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs shadow-xs transition flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {submitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>{t('savingFeedback', 'Saving to Cloud Firestore...')}</span>
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    <span>{t('btnSubmitFeedback', 'Submit Official Feedback')}</span>
                  </>
                )}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
