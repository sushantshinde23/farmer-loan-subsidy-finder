import React from 'react';
import { AlertTriangle, Send, Trash2, X } from 'lucide-react';

interface GmailConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  type: 'SEND' | 'TRASH' | 'DELETE';
  title: string;
  description: string;
  details?: {
    recipient?: string;
    subject?: string;
    itemCount?: number;
  };
  confirmButtonText?: string;
  isLoading?: boolean;
}

export const GmailConfirmModal: React.FC<GmailConfirmModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  type,
  title,
  description,
  details,
  confirmButtonText,
  isLoading = false
}) => {
  if (!isOpen) return null;

  const isDestructive = type === 'TRASH' || type === 'DELETE';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="relative w-full max-w-md bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden p-6 space-y-4">
        {/* Header with Icon */}
        <div className="flex items-start gap-3">
          <div
            className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
              isDestructive
                ? 'bg-rose-100 text-rose-600 dark:bg-rose-950/50 dark:text-rose-400'
                : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400'
            }`}
          >
            {type === 'SEND' && <Send className="w-5 h-5" />}
            {type === 'TRASH' && <Trash2 className="w-5 h-5" />}
            {type === 'DELETE' && <AlertTriangle className="w-5 h-5" />}
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-base font-bold text-slate-900 dark:text-white leading-tight">
              {title}
            </h3>
            <p className="text-xs text-slate-600 dark:text-slate-300 mt-1 leading-relaxed">
              {description}
            </p>
          </div>
          <button
            onClick={onClose}
            disabled={isLoading}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Action Details Card */}
        {details && (
          <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 text-xs space-y-1.5">
            {details.recipient && (
              <div className="flex items-center justify-between text-slate-600 dark:text-slate-300">
                <span className="font-semibold text-slate-500">Recipient:</span>
                <span className="font-mono text-slate-800 dark:text-slate-200">{details.recipient}</span>
              </div>
            )}
            {details.subject && (
              <div className="flex items-start justify-between gap-2 text-slate-600 dark:text-slate-300">
                <span className="font-semibold text-slate-500 shrink-0">Subject:</span>
                <span className="font-medium text-slate-800 dark:text-slate-200 text-right truncate">
                  {details.subject}
                </span>
              </div>
            )}
            {details.itemCount !== undefined && (
              <div className="flex items-center justify-between text-slate-600 dark:text-slate-300">
                <span className="font-semibold text-slate-500">Items:</span>
                <span className="font-medium text-slate-800 dark:text-slate-200">{details.itemCount}</span>
              </div>
            )}
          </div>
        )}

        <div className="text-[11px] text-slate-500 dark:text-slate-400 bg-amber-50/80 dark:bg-amber-950/30 p-2.5 rounded-lg border border-amber-200 dark:border-amber-900/40">
          {type === 'SEND'
            ? 'This message will be dispatched directly through your authorized Google Account. A copy will appear in your Gmail Sent folder.'
            : 'This will move the selected message from your Gmail inbox into your Gmail Trash.'}
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-2.5 pt-2">
          <button
            type="button"
            onClick={onClose}
            disabled={isLoading}
            className="px-4 py-2 text-xs font-semibold rounded-lg border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isLoading}
            className={`px-4 py-2 text-xs font-bold rounded-lg text-white shadow-xs transition active:scale-95 flex items-center gap-1.5 ${
              isDestructive
                ? 'bg-rose-600 hover:bg-rose-700'
                : 'bg-emerald-700 hover:bg-emerald-800'
            }`}
          >
            {type === 'SEND' && <Send className="w-3.5 h-3.5" />}
            {type === 'TRASH' && <Trash2 className="w-3.5 h-3.5" />}
            <span>
              {confirmButtonText || (type === 'SEND' ? 'Confirm & Send Email' : 'Move to Trash')}
            </span>
          </button>
        </div>
      </div>
    </div>
  );
};
