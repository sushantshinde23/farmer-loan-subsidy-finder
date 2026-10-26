import React, { useState, useEffect } from 'react';
import {
  MessageSquare,
  X,
  Phone,
  Send,
  CheckCircle2,
  Clock,
  Wifi,
  WifiOff,
  ExternalLink,
  ShieldCheck,
  Copy,
  Check,
  Smartphone,
  Sparkles,
  RefreshCw,
  Info
} from 'lucide-react';
import { SmsRecord, SmsType } from '../types/sms';
import {
  fetchAllSmsHistory,
  dispatchRealTimeSms,
  getStoredSmsPreferences,
  saveSmsPreferences,
  openNativeMessagesApp
} from '../services/smsService';
import { isOfflineModeActive } from '../services/offlineStorage';
import { useAuth } from '../context/AuthContext';

interface SmsCenterModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SmsCenterModal: React.FC<SmsCenterModalProps> = ({ isOpen, onClose }) => {
  const { user } = useAuth();
  const [messages, setMessages] = useState<SmsRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // User SMS Preferences
  const [mobileNumber, setMobileNumber] = useState('+91 98220 12345');
  const [isEditingMobile, setIsEditingMobile] = useState(false);
  const [autoLaunch, setAutoLaunch] = useState(false);

  // Test SMS Composer
  const [selectedTemplate, setSelectedTemplate] = useState<SmsType>('APPLICATION_SUBMITTED');
  const [customText, setCustomText] = useState('');
  const [sending, setSending] = useState(false);
  const [sendSuccessNotice, setSendSuccessNotice] = useState<string | null>(null);

  const isOffline = isOfflineModeActive();

  const templates: Record<SmsType, { title: string; defaultMsg: string }> = {
    APPLICATION_SUBMITTED: {
      title: 'Application Submitted',
      defaultMsg: `Priye ${user?.fullName || 'Kisan'}, aapka aavedan APP-2026-881920 PM-KUSUM Solar Pump hetu safalta-purvak darj ho gaya hai. Scrutiny shuru ho gayi hai.`
    },
    STATUS_UPDATE: {
      title: 'Officer Sanction Approved',
      defaultMsg: `Priye ${user?.fullName || 'Kisan'}, aapka aavedan APP-2026-881920 APPROVE ho chuka hai. Subsidy sanction: ₹1,56,000. Adhikari: District Agriculture Officer.`
    },
    DBT_CREDIT: {
      title: 'PM-KISAN DBT Credit Alert',
      defaultMsg: `DBT Alert: ₹2,000 transferred to your Aadhaar-linked Bank A/c for PM-KISAN 17th Installment. UTR: 881290312.`
    },
    LOAN_SANCTION: {
      title: 'KCC Crop Loan Disbursed',
      defaultMsg: `SBI Kisan Branch: KCC limit of ₹1,60,000 active at 4.00% interest rate with 3% prompt repayment incentive.`
    },
    OFFLINE_SYNC: {
      title: 'Offline Sync Confirmed',
      defaultMsg: `Offline sync complete: 2 pending application(s) synchronized with Central Cloud SQL Database.`
    },
    WEATHER_ALERT: {
      title: 'Urgent Weather Advisory',
      defaultMsg: `IMD Agro Alert: High winds and rain expected in your district next 24h. Secure polyhouse structures & delay fertilizer broadcast.`
    },
    CUSTOM_TEST: {
      title: 'Direct Farmer Notice',
      defaultMsg: `Kisan Suvidha Portal: Your Aadhaar e-KYC and land 7/12 record verification is active and up to date.`
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadHistory();
      const prefs = getStoredSmsPreferences();
      setMobileNumber(user?.mobile || prefs.registeredMobile || '+91 98220 12345');
      setAutoLaunch(prefs.autoLaunchMessagesApp);
      setCustomText(templates[selectedTemplate].defaultMsg);
    }
  }, [isOpen, selectedTemplate, user]);

  useEffect(() => {
    const handleSmsDispatched = () => {
      loadHistory();
    };
    window.addEventListener('sms-dispatched', handleSmsDispatched);
    return () => window.removeEventListener('sms-dispatched', handleSmsDispatched);
  }, []);

  const loadHistory = async () => {
    setLoading(true);
    try {
      const history = await fetchAllSmsHistory();
      setMessages(history);
    } catch (err) {
      console.warn('Failed to load SMS history:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveMobile = () => {
    const prefs = getStoredSmsPreferences();
    saveSmsPreferences({
      ...prefs,
      registeredMobile: mobileNumber
    });
    setIsEditingMobile(false);
  };

  const handleToggleAutoLaunch = (val: boolean) => {
    setAutoLaunch(val);
    const prefs = getStoredSmsPreferences();
    saveSmsPreferences({
      ...prefs,
      autoLaunchMessagesApp: val
    });
  };

  const handleSendTestSms = async () => {
    setSending(true);
    setSendSuccessNotice(null);
    try {
      const activeTemplate = templates[selectedTemplate];
      const sms = await dispatchRealTimeSms({
        recipientMobile: mobileNumber,
        recipientName: user?.fullName || 'Farmer',
        type: selectedTemplate,
        title: activeTemplate.title,
        message: customText || activeTemplate.defaultMsg,
        forceOpenMessagesApp: autoLaunch
      });

      setSendSuccessNotice(
        isOffline
          ? `Offline SMS generated! Opened in your phone's Messages app via cellular SIM.`
          : `SMS dispatched via NIC Kisan Gateway & prepared in phone messages!`
      );
      loadHistory();
    } catch (err) {
      console.error('Error sending SMS:', err);
    } finally {
      setSending(false);
    }
  };

  const handleCopyText = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleOpenPhoneMessages = (sms: SmsRecord) => {
    openNativeMessagesApp(sms.recipientMobile, sms.message);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="relative w-full max-w-2xl max-h-[92vh] flex flex-col rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-700 flex items-center justify-center text-white shadow-xs">
              <MessageSquare className="w-5 h-5 text-amber-300" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-extrabold text-base sm:text-lg text-slate-900 dark:text-white">
                  Real-Time Farmer SMS Center
                </h3>
                <span className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800">
                  <ShieldCheck className="w-3 h-3" />
                  NIC Kisan SMS
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Direct SMS updates to farmer mobile numbers in both Online and Offline modes.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-5">
          {/* Mode Status & Explanation Banner */}
          <div
            className={`p-3.5 rounded-xl border flex items-start gap-3 text-xs ${
              isOffline
                ? 'bg-amber-50 dark:bg-amber-950/30 border-amber-300 dark:border-amber-800/60 text-amber-900 dark:text-amber-200'
                : 'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-300 dark:border-emerald-800/60 text-emerald-900 dark:text-emerald-200'
            }`}
          >
            {isOffline ? (
              <WifiOff className="w-4 h-4 text-amber-600 mt-0.5 shrink-0" />
            ) : (
              <Wifi className="w-4 h-4 text-emerald-600 mt-0.5 shrink-0" />
            )}
            <div className="space-y-1">
              <div className="font-bold flex items-center gap-1.5">
                <span>
                  {isOffline
                    ? 'Offline Cellular Mode Active (SIM Card SMS)'
                    : 'Online Gateway Active (NIC Kisan SMS 24x7)'}
                </span>
              </div>
              <p className="opacity-90 leading-relaxed">
                {isOffline
                  ? 'Internet is disconnected, but cellular SMS operates over 2G/4G/5G SIM networks without requiring web data. When an update occurs, tapping "Send in Phone Messages" opens your device\'s default Messages app with pre-filled text.'
                  : 'Connected to official Government NIC Kisan SMS Gateway. Updates for applications, approvals, and DBT credits are automatically dispatched to the farmer\'s mobile number.'}
              </p>
            </div>
          </div>

          {/* Farmer's Registered Mobile Number & Settings */}
          <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Smartphone className="w-4 h-4 text-emerald-600" />
                <span className="text-xs font-bold text-slate-900 dark:text-white">
                  Recipient Mobile Number:
                </span>
                {!isEditingMobile ? (
                  <span className="font-mono text-xs font-semibold px-2 py-0.5 rounded bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 text-slate-800 dark:text-slate-100">
                    {mobileNumber}
                  </span>
                ) : (
                  <input
                    type="tel"
                    value={mobileNumber}
                    onChange={(e) => setMobileNumber(e.target.value)}
                    className="text-xs py-1 px-2 rounded border border-emerald-500 bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-mono"
                    placeholder="+91 98765 43210"
                  />
                )}
              </div>

              <div>
                {!isEditingMobile ? (
                  <button
                    onClick={() => setIsEditingMobile(true)}
                    className="text-xs font-semibold text-emerald-700 dark:text-emerald-400 hover:underline"
                  >
                    Change Number
                  </button>
                ) : (
                  <button
                    onClick={handleSaveMobile}
                    className="px-2.5 py-1 text-xs font-bold bg-emerald-700 hover:bg-emerald-800 text-white rounded shadow-xs"
                  >
                    Save Number
                  </button>
                )}
              </div>
            </div>

            {/* Auto-Launch Native Messages App Toggle */}
            <div className="pt-2 border-t border-slate-200 dark:border-slate-700 flex items-center justify-between">
              <div className="space-y-0.5">
                <label
                  htmlFor="auto-launch-toggle"
                  className="text-xs font-bold text-slate-800 dark:text-slate-200 cursor-pointer"
                >
                  Direct Phone SMS Auto-Launch
                </label>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  Automatically open phone's default Messages app when an application or status update occurs.
                </p>
              </div>
              <input
                id="auto-launch-toggle"
                type="checkbox"
                checked={autoLaunch}
                onChange={(e) => handleToggleAutoLaunch(e.target.checked)}
                className="w-4 h-4 text-emerald-600 rounded cursor-pointer"
              />
            </div>
          </div>

          {/* Instant SMS Dispatcher & Test Console */}
          <div className="p-4 rounded-xl bg-white dark:bg-slate-850 border border-slate-200 dark:border-slate-700 space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="font-bold text-xs sm:text-sm text-slate-900 dark:text-white flex items-center gap-1.5">
                <Send className="w-3.5 h-3.5 text-emerald-600" />
                <span>Instant Mobile SMS Dispatcher</span>
              </h4>
              <span className="text-[10px] text-slate-400 font-mono">Live Dispatch</span>
            </div>

            {/* Template Selector */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
              {(Object.keys(templates) as SmsType[]).map((type) => (
                <button
                  key={type}
                  onClick={() => {
                    setSelectedTemplate(type);
                    setCustomText(templates[type].defaultMsg);
                  }}
                  className={`p-2 text-left rounded-lg text-[11px] font-semibold transition border ${
                    selectedTemplate === type
                      ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-500 text-emerald-800 dark:text-emerald-300 shadow-xs'
                      : 'bg-slate-50 dark:bg-slate-800/40 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100'
                  }`}
                >
                  <div className="truncate">{templates[type].title}</div>
                </button>
              ))}
            </div>

            {/* Message Preview Box */}
            <div className="space-y-1">
              <label className="text-[11px] font-semibold text-slate-600 dark:text-slate-400">
                SMS Content (Includes Official GoI Prefix):
              </label>
              <textarea
                rows={3}
                value={customText}
                onChange={(e) => setCustomText(e.target.value)}
                className="w-full text-xs p-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-600 font-mono"
              />
            </div>

            {/* Dispatch Action */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-2 pt-1">
              <div className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-1">
                <Info className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                <span>Sends to {mobileNumber} & opens native Messages app directly</span>
              </div>

              <button
                onClick={handleSendTestSms}
                disabled={sending}
                className="w-full sm:w-auto px-4 py-2 rounded-xl text-xs font-bold bg-emerald-700 hover:bg-emerald-800 disabled:opacity-50 text-white shadow-xs transition active:scale-95 flex items-center justify-center gap-2"
              >
                <Send className="w-3.5 h-3.5" />
                <span>{sending ? 'Dispatching...' : 'Send Real-Time SMS Now'}</span>
              </button>
            </div>

            {sendSuccessNotice && (
              <div className="p-2.5 rounded-lg bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 text-xs font-semibold flex items-center gap-2 animate-in fade-in">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>{sendSuccessNotice}</span>
              </div>
            )}
          </div>

          {/* Real-Time SMS History Logs */}
          <div className="space-y-3 pt-2">
            <div className="flex items-center justify-between">
              <h4 className="font-bold text-xs sm:text-sm text-slate-900 dark:text-white flex items-center gap-2">
                <span>Dispatched SMS History ({messages.length})</span>
                <button
                  onClick={loadHistory}
                  className="p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 transition"
                  title="Refresh SMS log"
                >
                  <RefreshCw className={`w-3 h-3 ${loading ? 'animate-spin' : ''}`} />
                </button>
              </h4>
              <span className="text-[11px] text-slate-400">Target: {mobileNumber}</span>
            </div>

            <div className="space-y-2.5">
              {messages.map((sms) => (
                <div
                  key={sms.id}
                  className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-700/80 bg-slate-50/70 dark:bg-slate-850 space-y-2"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="text-[10px] font-mono font-bold text-slate-400">
                        {sms.id}
                      </span>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                        {sms.title}
                      </span>
                      <span className="text-[10px] font-semibold px-1.5 py-0.2 rounded bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300">
                        {sms.gateway}
                      </span>
                      {sms.isOffline && (
                        <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300">
                          Offline Cellular
                        </span>
                      )}
                    </div>

                    <span className="text-[10px] text-slate-400 shrink-0">
                      {new Date(sms.sentAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>

                  {/* SMS Text Box */}
                  <div className="p-2.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 font-mono text-xs text-slate-800 dark:text-slate-200 whitespace-pre-line leading-relaxed">
                    {sms.message}
                  </div>

                  {/* Bottom details & direct launch button */}
                  <div className="flex flex-wrap items-center justify-between gap-2 pt-1 text-[11px]">
                    <div className="text-slate-500 dark:text-slate-400 flex items-center gap-1">
                      <Phone className="w-3 h-3" />
                      <span>{sms.recipientMobile}</span>
                      <span className="mx-1">•</span>
                      <span className="text-emerald-600 font-medium">
                        {sms.status === 'DELIVERED' ? '✓ Delivered via Gateway' : '✓ Opened in Messages App'}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleCopyText(sms.message, sms.id)}
                        className="px-2 py-1 rounded text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white flex items-center gap-1 transition"
                      >
                        {copiedId === sms.id ? (
                          <>
                            <Check className="w-3 h-3 text-emerald-600" />
                            <span>Copied</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3 h-3" />
                            <span>Copy</span>
                          </>
                        )}
                      </button>

                      <button
                        onClick={() => handleOpenPhoneMessages(sms)}
                        className="px-2.5 py-1 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white font-semibold flex items-center gap-1 text-[11px] shadow-xs transition"
                        title="Open this message directly in phone's SMS app"
                      >
                        <Smartphone className="w-3 h-3" />
                        <span>Open in Phone Messages</span>
                      </button>
                    </div>
                  </div>
                </div>
              ))}

              {messages.length === 0 && !loading && (
                <div className="p-6 text-center text-xs text-slate-400 border border-dashed border-slate-200 dark:border-slate-700 rounded-xl">
                  No SMS messages logged yet. Tap "Send Real-Time SMS Now" above or submit an application to see live notifications.
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 flex items-center justify-between text-xs text-slate-500">
          <span>SMS Gateway: Gov. of India / Telecom Reg. Trai DLT Registered</span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 font-bold transition"
          >
            Close Center
          </button>
        </div>
      </div>
    </div>
  );
};
