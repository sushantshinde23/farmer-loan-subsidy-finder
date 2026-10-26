import React from 'react';
import {
  Home,
  Calculator,
  Search,
  Zap,
  Coins,
  FileCheck2,
  FolderOpen,
  CloudSun,
  MapPin,
  User,
  ShieldCheck,
  Settings,
  HelpCircle,
  Building2,
  Tractor,
  Bookmark,
  Lock,
  LogOut,
  Mail,
  Globe
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { useSavedSchemes } from '../context/SavedSchemesContext';

export type ActiveTab =
  | 'home'
  | 'login'
  | 'dashboard'
  | 'eligibility'
  | 'schemes'
  | 'saved-schemes'
  | 'portals'
  | 'subsidies'
  | 'loans'
  | 'vault'
  | 'applications'
  | 'gmail'
  | 'officer'
  | 'csc'
  | 'admin'
  | 'mandi-weather'
  | 'nearby'
  | 'profile'
  | 'settings';

interface SidebarProps {
  activeTab: ActiveTab;
  setActiveTab: (tab: ActiveTab) => void;
  onOpenAI: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ activeTab, setActiveTab, onOpenAI }) => {
  const { user, role, logout } = useAuth();
  const { t } = useLanguage();
  const { savedCount } = useSavedSchemes();

  const isOfficer = role === 'BANK_OFFICER' || role === 'AGRICULTURE_OFFICER';
  const isAdmin = role === 'SYSTEM_ADMIN';
  const isCSC = role === 'CSC_OPERATOR';

  const navItems = [
    { id: 'home', label: t('navHome', 'Portal Home'), icon: Home },
    {
      id: 'dashboard',
      label: t('navDashboard', 'Farmer Dashboard'),
      icon: Tractor,
      badge: user ? 'Live' : undefined
    },
    { id: 'eligibility', label: t('navEligibility', 'Eligibility Engine'), icon: Calculator, badge: 'Rule-Based' },
    { id: 'schemes', label: t('navSchemes', 'Government Schemes'), icon: Search },
    { id: 'saved-schemes', label: t('navSavedSchemes', 'Saved Schemes'), icon: Bookmark, badge: savedCount > 0 ? `${savedCount}` : undefined },
    { id: 'portals', label: t('navPortals', 'Official Farmer Portals'), icon: Globe, badge: 'Gov.in' },
    { id: 'subsidies', label: t('navSubsidies', 'Subsidy Finder'), icon: Zap },
    { id: 'loans', label: t('navLoans', 'Loan Finder'), icon: Coins },
    { id: 'vault', label: t('navVault', 'Document Vault'), icon: FolderOpen, badge: 'DigiLocker' },
    { id: 'applications', label: t('navApplications', 'Applications & Tracking'), icon: FileCheck2 },
    { id: 'gmail', label: t('navGmail', 'Kisan Mail (Gmail)'), icon: Mail, badge: 'Google' },
    { id: 'mandi-weather', label: t('navMandiWeather', 'Mandi & Weather'), icon: CloudSun },
    { id: 'nearby', label: t('navNearby', 'Nearby Centers'), icon: MapPin },
    { id: 'profile', label: t('navProfile', 'Farmer Profile'), icon: User }
  ];

  return (
    <aside className="w-64 shrink-0 hidden lg:flex flex-col border-r border-slate-200 dark:border-slate-800 bg-[#fbfbf9] dark:bg-slate-900 min-h-[calc(100vh-4rem)] p-3">
      {/* User Session Status / Login Card */}
      {!user ? (
        <div className="mb-3 p-3 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900/60 shadow-2xs">
          <div className="flex items-center gap-2 text-xs font-bold text-emerald-900 dark:text-emerald-300">
            <Lock className="w-4 h-4 text-emerald-700 dark:text-emerald-400" />
            <span>{t('btnLogin', 'Citizen / Farmer Login')}</span>
          </div>
          <p className="text-[11px] text-emerald-800/80 dark:text-emerald-300/80 mt-1 leading-relaxed">
            {t('loginSubtitle', 'Login with Gmail & Mobile or Google to access your dashboard.')}
          </p>
          <button
            onClick={() => setActiveTab('login')}
            className="w-full mt-2 py-1.5 px-2.5 rounded-xl text-xs font-bold bg-emerald-700 hover:bg-emerald-800 text-white flex items-center justify-center gap-1.5 shadow-xs transition active:scale-95"
          >
            <span>{t('btnLogin', 'Proceed to Login')}</span>
          </button>
        </div>
      ) : (
        <div className="mb-3 p-2.5 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-2xs flex items-center justify-between gap-2">
          <div className="min-w-0 pl-1">
            <p className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate">
              {user.fullName}
            </p>
            <p className="text-[10px] text-slate-500 dark:text-slate-400 capitalize">
              {user.role.replace('_', ' ').toLowerCase()}
            </p>
          </div>
          <button
            onClick={() => {
              logout();
              setActiveTab('home');
            }}
            title="Sign Out of Portal"
            className="p-1.5 text-slate-500 hover:text-rose-600 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Role specific quick action notice */}
      {isOfficer && (
        <div className="mb-3 p-3 rounded-xl bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900/60">
          <div className="flex items-center gap-2 text-xs font-bold text-blue-900 dark:text-blue-300">
            <Building2 className="w-4 h-4 text-blue-600" />
            <span>Officer Portal Active</span>
          </div>
          <button
            onClick={() => setActiveTab('officer')}
            className={`w-full mt-2 py-1.5 px-2.5 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition ${
              activeTab === 'officer'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'bg-white dark:bg-slate-800 text-blue-800 dark:text-blue-300 hover:bg-blue-100 dark:hover:bg-blue-900/50'
            }`}
          >
            <ShieldCheck className="w-3.5 h-3.5" />
            {role === 'BANK_OFFICER' ? 'Review Loan Queue' : 'Review Subsidy Queue'}
          </button>
        </div>
      )}

      {isAdmin && (
        <div className="mb-3 p-3 rounded-xl bg-slate-100 dark:bg-slate-800/60 border border-slate-300 dark:border-slate-700">
          <div className="flex items-center gap-2 text-xs font-bold text-slate-900 dark:text-slate-200">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            <span>System Administrator</span>
          </div>
          <button
            onClick={() => setActiveTab('admin')}
            className={`w-full mt-2 py-1.5 px-2.5 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition ${
              activeTab === 'admin'
                ? 'bg-slate-900 dark:bg-emerald-600 text-white'
                : 'bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700'
            }`}
          >
            Audit Trail & Scheme Control
          </button>
        </div>
      )}

      {isCSC && (
        <div className="mb-3 p-3 rounded-xl bg-purple-50 dark:bg-purple-950/40 border border-purple-200 dark:border-purple-900/60">
          <div className="flex items-center gap-2 text-xs font-bold text-purple-900 dark:text-purple-300">
            <Tractor className="w-4 h-4 text-purple-600" />
            <span>CSC Digital Seva</span>
          </div>
          <button
            onClick={() => setActiveTab('csc')}
            className={`w-full mt-2 py-1.5 px-2.5 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition ${
              activeTab === 'csc'
                ? 'bg-purple-700 text-white'
                : 'bg-white dark:bg-slate-800 text-purple-900 dark:text-purple-300 hover:bg-purple-100 dark:hover:bg-purple-900/50'
            }`}
          >
            Farmer Kiosk Desk
          </button>
        </div>
      )}

      {/* Navigation Links */}
      <div className="space-y-1 flex-1">
        <div className="px-3 py-1.5 text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
          Primary Navigation
        </div>
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id as ActiveTab)}
              className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium transition ${
                isActive
                  ? 'bg-emerald-700 text-white font-semibold shadow-xs shadow-emerald-950/20'
                  : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <Icon className={`w-4 h-4 ${isActive ? 'text-emerald-200' : 'text-slate-400'}`} />
                <span>{item.label}</span>
              </div>
              {item.badge && (
                <span
                  className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${
                    isActive
                      ? 'bg-emerald-800 text-emerald-100'
                      : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                  }`}
                >
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* AI Assistant Quick Banner */}
      <div className="mt-4 p-3 rounded-xl bg-gradient-to-br from-emerald-800 to-emerald-950 text-white shadow-md">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
          <span className="text-xs font-bold text-emerald-200">Krishi Sahayak AI</span>
        </div>
        <p className="text-[11px] text-emerald-100/90 mt-1 leading-relaxed">
          Ask in Hindi, Marathi, or English about 60% solar pump subsidies & KCC loans.
        </p>
        <button
          onClick={onOpenAI}
          className="w-full mt-2.5 py-1.5 text-xs font-bold rounded-lg bg-amber-400 hover:bg-amber-300 text-slate-950 transition active:scale-[0.98]"
        >
          Ask AI Now
        </button>
      </div>

      {/* Bottom Settings Link */}
      <div className="pt-3 mt-3 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 px-2">
        <button
          onClick={() => setActiveTab('settings')}
          className="flex items-center gap-1.5 hover:text-emerald-700 dark:hover:text-emerald-400 transition"
        >
          <Settings className="w-3.5 h-3.5" />
          <span>{t('navSettings', 'Settings')}</span>
        </button>
        <span className="text-[10px] text-slate-400 font-mono">v2.4 Live</span>
      </div>
    </aside>
  );
};
