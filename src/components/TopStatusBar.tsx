import React, { useState } from 'react';
import {
  Globe,
  Sun,
  Moon,
  Bot,
  Bell,
  UserCheck,
  ShieldCheck,
  Building2,
  Tractor,
  Laptop,
  CheckCircle2,
  MessageSquare,
  Cloud
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { useLanguage } from '../context/LanguageContext';
import { UserRole } from '../types';

interface TopStatusBarProps {
  onOpenAI: () => void;
  onOpenNotifications: () => void;
  onOpenSMS?: () => void;
  onOpenAuth: () => void;
}

export const TopStatusBar: React.FC<TopStatusBarProps> = ({
  onOpenAI,
  onOpenNotifications,
  onOpenSMS,
  onOpenAuth
}) => {
  const { user, role, switchRole, unreadCount } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const { language, setLanguage, languages, t } = useLanguage();
  const [showRoleMenu, setShowRoleMenu] = useState(false);
  const [showLangMenu, setShowLangMenu] = useState(false);

  const roleLabels: Record<UserRole, { label: string; icon: any; color: string }> = {
    FARMER: { label: 'Farmer', icon: Tractor, color: 'bg-emerald-600 text-white' },
    BANK_OFFICER: { label: 'Bank Officer (SBI)', icon: Building2, color: 'bg-blue-600 text-white' },
    AGRICULTURE_OFFICER: { label: 'Agriculture Officer', icon: ShieldCheck, color: 'bg-amber-600 text-white' },
    CSC_OPERATOR: { label: 'CSC Operator', icon: Laptop, color: 'bg-purple-600 text-white' },
    SYSTEM_ADMIN: { label: 'System Admin', icon: UserCheck, color: 'bg-slate-800 text-white' }
  };

  const currentRoleInfo = roleLabels[role] || roleLabels.FARMER;
  const RoleIcon = currentRoleInfo.icon;

  return (
    <header className="sticky top-0 z-40 w-full border-b border-emerald-950/10 dark:border-emerald-800/30 bg-[#fbfbf9]/95 dark:bg-slate-900/95 backdrop-blur-md transition-colors">
      {/* Top Tricolor Strip representing official Indian national portal */}
      <div className="h-1 w-full flex">
        <div className="flex-1 bg-[#FF9933]"></div>
        <div className="flex-1 bg-white"></div>
        <div className="flex-1 bg-[#138808]"></div>
      </div>

      <div className="max-w-7xl mx-auto px-3 sm:px-6 h-16 flex items-center justify-between gap-2 sm:gap-4">
        {/* Brand & Emblem */}
        <div className="flex items-center gap-2.5 sm:gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-800 to-emerald-950 flex items-center justify-center text-white shadow-md shadow-emerald-900/20 ring-1 ring-emerald-600/30 shrink-0">
            <span className="text-xl font-bold font-serif text-amber-300">₹</span>
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <h1 className="font-bold text-base sm:text-lg tracking-tight text-slate-900 dark:text-white leading-none">
                {t('portalTitle', 'Farmer Loan & Subsidy Finder')}
              </h1>
              <span className="hidden md:inline-flex items-center gap-1 px-1.5 py-0.5 text-[10px] font-semibold tracking-wide uppercase bg-emerald-100 text-emerald-800 dark:bg-emerald-950/70 dark:text-emerald-300 rounded border border-emerald-300 dark:border-emerald-700/50">
                <CheckCircle2 className="w-2.5 h-2.5" />
                GoI Verified
              </span>
            </div>
            <p className="text-[11px] sm:text-xs text-slate-500 dark:text-slate-400 font-medium hidden sm:block truncate max-w-sm">
              {t('tagline', 'Find Your Eligible Schemes. Apply with Confidence.')}
            </p>
          </div>
        </div>

        {/* Right Action Tools */}
        <div className="flex items-center gap-1.5 sm:gap-2.5">
          {/* Google Cloud Live Sync Badge */}
          <div
            id="topbar-cloud-sync-status"
            className="hidden xl:flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-emerald-50/80 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 text-xs font-medium text-emerald-800 dark:text-emerald-300 shadow-xs"
            title="Database Connected to Google Cloud Firestore (Live Real-Time Sync)"
          >
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            <Cloud className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
            <span className="font-semibold">Google Cloud</span>
          </div>

          {/* AI Assistant Button */}
          <button
            id="topbar-btn-ai"
            onClick={onOpenAI}
            className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 text-xs sm:text-sm font-semibold rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white shadow-sm shadow-emerald-900/10 transition-all hover:scale-[1.02] active:scale-[0.98]"
            title="Ask Krishi Sahayak AI"
          >
            <Bot className="w-4 h-4 text-emerald-200 animate-pulse" />
            <span className="hidden sm:inline">Krishi Sahayak</span>
            <span className="sm:hidden">AI</span>
          </button>

          {/* Language Selector Dropdown */}
          <div className="relative">
            <button
              id="topbar-btn-lang"
              onClick={() => {
                setShowLangMenu(!showLangMenu);
                setShowRoleMenu(false);
              }}
              className="flex items-center gap-1 px-2 py-1.5 text-xs font-medium rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 transition"
              title="Change Language"
            >
              <Globe className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
              <span className="uppercase font-semibold tracking-wider text-[11px]">{language}</span>
            </button>

            {showLangMenu && (
              <>
                <div
                  className="fixed inset-0 z-40 bg-black/30 sm:bg-transparent"
                  onClick={() => setShowLangMenu(false)}
                />
                <div className="fixed left-2 right-2 top-14 sm:absolute sm:top-full sm:mt-1 sm:left-auto sm:right-0 sm:w-48 max-w-xs mx-auto sm:mx-0 max-h-72 overflow-y-auto rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-2xl py-1.5 z-50 animate-in fade-in zoom-in-95 duration-100">
                  <div className="px-3 py-1 text-[11px] font-semibold text-slate-400 uppercase tracking-wider border-b border-slate-100 dark:border-slate-700">
                    Select Language (13 Indian Languages)
                  </div>
                  {languages.map((l) => (
                    <button
                      key={l.code}
                      onClick={() => {
                        setLanguage(l.code);
                        setShowLangMenu(false);
                      }}
                      className={`w-full text-left px-3 py-2 text-xs flex items-center justify-between hover:bg-emerald-50 dark:hover:bg-slate-700/60 transition ${
                        language === l.code ? 'font-bold text-emerald-700 dark:text-emerald-400 bg-emerald-50/50 dark:bg-slate-700/40' : 'text-slate-700 dark:text-slate-200'
                      }`}
                    >
                      <span>{l.nativeName}</span>
                      <span className="text-[10px] text-slate-400">{l.name}</span>
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>

          {/* Theme Toggle Button */}
          <button
            id="topbar-btn-theme"
            onClick={toggleTheme}
            className="p-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 transition"
            title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
            aria-label="Toggle Theme"
          >
            {theme === 'dark' ? (
              <Sun className="w-4 h-4 text-amber-400" />
            ) : (
              <Moon className="w-4 h-4 text-slate-600" />
            )}
          </button>

          {/* Notifications Bell */}
          <button
            id="topbar-btn-notifications"
            onClick={onOpenNotifications}
            className="relative p-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 transition"
            title="Notifications"
          >
            <Bell className="w-4 h-4 text-slate-600 dark:text-slate-300" />
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 flex items-center justify-center min-w-[18px] h-[18px] px-1 text-[10px] font-bold text-white bg-rose-600 rounded-full ring-2 ring-white dark:ring-slate-900">
                {unreadCount}
              </span>
            )}
          </button>

          {/* Real-Time SMS Alert Center Button */}
          <button
            id="topbar-btn-sms"
            onClick={onOpenSMS}
            className="p-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 transition"
            title="Real-Time SMS Center"
          >
            <MessageSquare className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
          </button>

          {/* Role Switcher / Demo Profile Badge */}
          <div className="relative">
            <button
              id="topbar-btn-role"
              onClick={() => {
                setShowRoleMenu(!showRoleMenu);
                setShowLangMenu(false);
              }}
              className={`flex items-center gap-1.5 px-2 sm:px-2.5 py-1.5 rounded-lg text-xs font-semibold shadow-xs transition ${currentRoleInfo.color}`}
              title="Switch Active Role (Demo Testing)"
            >
              <RoleIcon className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">{currentRoleInfo.label}</span>
              <span className="text-[10px] opacity-80">▾</span>
            </button>

            {showRoleMenu && (
              <>
                <div
                  className="fixed inset-0 z-40 bg-black/30 sm:bg-transparent"
                  onClick={() => setShowRoleMenu(false)}
                />
                <div className="fixed left-2 right-2 top-14 sm:absolute sm:top-full sm:mt-1 sm:left-auto sm:right-0 sm:w-64 max-w-xs mx-auto sm:mx-0 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-2xl py-2 z-50 animate-in fade-in zoom-in-95 duration-100">
                  <div className="px-3 pb-2 border-b border-slate-100 dark:border-slate-700">
                  <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                    Role Testing Switcher
                  </p>
                  <p className="text-xs text-slate-600 dark:text-slate-300 mt-0.5">
                    Logged in: <strong className="text-slate-900 dark:text-white">{user?.fullName || 'User'}</strong>
                  </p>
                </div>
                <div className="py-1">
                  {(Object.keys(roleLabels) as UserRole[]).map((r) => {
                    const info = roleLabels[r];
                    const Icon = info.icon;
                    return (
                      <button
                        key={r}
                        onClick={() => {
                          switchRole(r);
                          setShowRoleMenu(false);
                        }}
                        className={`w-full text-left px-3 py-2 text-xs flex items-center gap-2.5 hover:bg-slate-100 dark:hover:bg-slate-700/70 transition ${
                          role === r ? 'font-bold text-emerald-700 dark:text-emerald-400 bg-emerald-50/70 dark:bg-slate-700/50' : 'text-slate-700 dark:text-slate-300'
                        }`}
                      >
                        <span className={`p-1 rounded ${info.color}`}>
                          <Icon className="w-3 h-3" />
                        </span>
                        <div className="flex-1">
                          <div>{info.label}</div>
                          <div className="text-[10px] font-normal text-slate-400">
                            {r === 'FARMER' ? 'Apply & upload documents' :
                             r === 'BANK_OFFICER' ? 'Credit appraisal & loans' :
                             r === 'AGRICULTURE_OFFICER' ? 'Subsidy scrutiny & sanctions' :
                             r === 'CSC_OPERATOR' ? 'Assisted farmer kiosk' : 'System audit & schemes'}
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
                <div className="border-t border-slate-100 dark:border-slate-700 pt-1.5 px-2">
                  <button
                    onClick={() => {
                      setShowRoleMenu(false);
                      onOpenAuth();
                    }}
                    className="w-full text-center px-2 py-1.5 text-xs text-emerald-700 dark:text-emerald-400 hover:underline font-semibold"
                  >
                    Custom Login / Register Account
                  </button>
                </div>
              </div>
            </>
          )}
          </div>
        </div>
      </div>
    </header>
  );
};
