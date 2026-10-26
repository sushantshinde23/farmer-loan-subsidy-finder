import React, { useState, useEffect } from 'react';
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
  Search,
  Palette,
  Menu,
  X,
  PhoneCall,
  Home,
  Calculator,
  Zap,
  Coins,
  FolderOpen,
  FileCheck2,
  CloudSun,
  MapPin,
  Settings,
  MessageSquare,
  Bookmark,
  Lock,
  LogOut,
  Mail
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { useLanguage } from '../context/LanguageContext';
import { useSavedSchemes } from '../context/SavedSchemesContext';
import { UserRole } from '../types';
import { ActiveTab } from './Sidebar';

interface WebsiteHeaderProps {
  activeTab: ActiveTab;
  setActiveTab: (tab: ActiveTab) => void;
  onOpenAI: () => void;
  onOpenNotifications: () => void;
  onOpenSMS?: () => void;
  onOpenAuth: () => void;
}

export const WebsiteHeader: React.FC<WebsiteHeaderProps> = ({
  activeTab,
  setActiveTab,
  onOpenAI,
  onOpenNotifications,
  onOpenSMS,
  onOpenAuth
}) => {
  const { user, role, switchRole, logout, unreadCount } = useAuth();
  const { savedCount } = useSavedSchemes();
  const { theme, toggleTheme, colorTheme, setColorTheme, colorThemes } = useTheme();
  const { language, setLanguage, languages, t } = useLanguage();

  const [showRoleMenu, setShowRoleMenu] = useState(false);
  const [showLangMenu, setShowLangMenu] = useState(false);
  const [showThemeMenu, setShowThemeMenu] = useState(false);
  const [showMobileNav, setShowMobileNav] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [fontSizeLevel, setFontSizeLevel] = useState<number>(100);

  // Handle accessibility font scaling
  const handleFontSizeChange = (delta: number) => {
    setFontSizeLevel((prev) => {
      const next = Math.max(90, Math.min(120, prev + delta));
      document.documentElement.style.fontSize = `${next}%`;
      return next;
    });
  };

  const roleLabels: Record<UserRole, { label: string; icon: React.ComponentType<{ className?: string }>; color: string }> = {
    FARMER: { label: 'Farmer (Kisan)', icon: Tractor, color: 'bg-emerald-700 text-white' },
    BANK_OFFICER: { label: 'Bank Officer (SBI)', icon: Building2, color: 'bg-blue-700 text-white' },
    AGRICULTURE_OFFICER: { label: 'Agriculture Officer', icon: ShieldCheck, color: 'bg-amber-700 text-white' },
    CSC_OPERATOR: { label: 'CSC Operator (VLE)', icon: Laptop, color: 'bg-purple-700 text-white' },
    SYSTEM_ADMIN: { label: 'System Admin', icon: UserCheck, color: 'bg-slate-800 text-white' }
  };

  const currentRoleInfo = roleLabels[role] || roleLabels.FARMER;
  const RoleIcon = currentRoleInfo.icon;

  const navMenuItems = [
    { id: 'home' as ActiveTab, label: t('navHome', 'Home'), icon: Home },
    { id: 'dashboard' as ActiveTab, label: t('navDashboard', 'Farmer Dashboard'), icon: Tractor },
    { id: 'eligibility' as ActiveTab, label: t('navEligibility', 'Eligibility Engine'), icon: Calculator },
    { id: 'schemes' as ActiveTab, label: t('navSchemes', 'Government Schemes'), icon: Search },
    { id: 'saved-schemes' as ActiveTab, label: t('navSavedSchemes', 'Saved Schemes'), icon: Bookmark },
    { id: 'portals' as ActiveTab, label: t('navPortals', 'Official Farmer Portals'), icon: Globe },
    { id: 'subsidies' as ActiveTab, label: t('navSubsidies', 'Subsidy Finder'), icon: Zap },
    { id: 'loans' as ActiveTab, label: t('navLoans', 'Loan Finder'), icon: Coins },
    { id: 'vault' as ActiveTab, label: t('navVault', 'Document Vault'), icon: FolderOpen },
    { id: 'applications' as ActiveTab, label: t('navApplications', 'Applications'), icon: FileCheck2 },
    { id: 'gmail' as ActiveTab, label: t('navGmail', 'Kisan Mail (Gmail)'), icon: Mail },
    { id: 'mandi-weather' as ActiveTab, label: t('navMandiWeather', 'Mandi & Weather'), icon: CloudSun },
    { id: 'nearby' as ActiveTab, label: t('navNearby', 'Nearby Centers'), icon: MapPin },
    { id: 'settings' as ActiveTab, label: t('navSettings', 'Settings'), icon: Settings }
  ];

  const handleNavClick = (tab: ActiveTab) => {
    setActiveTab(tab);
    setShowMobileNav(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    const q = searchQuery.toLowerCase();
    if (q.includes('save') || q.includes('bookmark')) {
      setActiveTab('saved-schemes');
    } else if (q.includes('portal') || q.includes('gov.in') || q.includes('nic.in') || q.includes('official') || q.includes('pmkisan') || q.includes('pmfby') || q.includes('fasalrin')) {
      setActiveTab('portals');
    } else if (q.includes('loan') || q.includes('kcc') || q.includes('interest')) {
      setActiveTab('loans');
    } else if (q.includes('subsidy') || q.includes('kusum') || q.includes('pump') || q.includes('drip')) {
      setActiveTab('subsidies');
    } else if (q.includes('eligible') || q.includes('check')) {
      setActiveTab('eligibility');
    } else if (q.includes('vault') || q.includes('doc') || q.includes('7/12') || q.includes('aadhaar')) {
      setActiveTab('vault');
    } else if (q.includes('mail') || q.includes('gmail') || q.includes('inbox') || q.includes('letter')) {
      setActiveTab('gmail');
    } else if (q.includes('mandi') || q.includes('price') || q.includes('rate') || q.includes('weather')) {
      setActiveTab('mandi-weather');
    } else {
      setActiveTab('schemes');
    }
  };

  return (
    <header className="w-full bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 shadow-sm sticky top-0 z-40 transition-colors">
      {/* 1. National Tricolor Strip */}
      <div className="h-1.5 w-full flex">
        <div className="flex-1 bg-[#FF9933]"></div>
        <div className="flex-1 bg-white"></div>
        <div className="flex-1 bg-[#138808]"></div>
      </div>

      {/* 2. Top Ministry Bar (Official Government Website Utility Header) */}
      <div className="bg-slate-50 dark:bg-slate-950 border-b border-slate-200/80 dark:border-slate-800/80 text-xs py-1.5 px-3 sm:px-6">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-2">
          {/* Left: Ministry Identification */}
          <div className="flex items-center gap-2 text-slate-700 dark:text-slate-300">
            <span className="font-semibold text-[11px] sm:text-xs">
              {t('ministryName', 'Ministry of Agriculture & Farmers Welfare • Government of India')}
            </span>
          </div>

          {/* Center: Toll-Free Helpline */}
          <div className="hidden lg:flex items-center gap-1.5 text-emerald-800 dark:text-emerald-400 font-medium">
            <PhoneCall className="w-3.5 h-3.5" />
            <a href="tel:18001801551" className="hover:underline">
              {t('kisanHelpline', 'Kisan Call Centre 24x7 Toll-Free: 1800-180-1551')}
            </a>
          </div>

          {/* Right: Accessibility, Theme & Language Tools */}
          <div className="flex items-center gap-2 sm:gap-3 text-slate-600 dark:text-slate-300">
            {/* Font Size Scaling Controls (A- / A / A+) */}
            <div className="hidden sm:flex items-center border border-slate-300 dark:border-slate-700 rounded bg-white dark:bg-slate-900 overflow-hidden text-[11px] font-semibold">
              <button
                onClick={() => handleFontSizeChange(-5)}
                className="px-1.5 py-0.5 hover:bg-slate-100 dark:hover:bg-slate-800 border-r border-slate-200 dark:border-slate-700"
                title="Decrease Font Size"
              >
                A-
              </button>
              <button
                onClick={() => {
                  setFontSizeLevel(100);
                  document.documentElement.style.fontSize = '100%';
                }}
                className="px-1.5 py-0.5 hover:bg-slate-100 dark:hover:bg-slate-800 border-r border-slate-200 dark:border-slate-700"
                title="Default Font Size"
              >
                A
              </button>
              <button
                onClick={() => handleFontSizeChange(5)}
                className="px-1.5 py-0.5 hover:bg-slate-100 dark:hover:bg-slate-800"
                title="Increase Font Size"
              >
                A+
              </button>
            </div>

            {/* Theme Palette Switcher Dropdown */}
            <div className="relative">
              <button
                id="header-btn-theme-palette"
                onClick={() => {
                  setShowThemeMenu(!showThemeMenu);
                  setShowLangMenu(false);
                  setShowRoleMenu(false);
                }}
                className="flex items-center gap-1.5 px-2 py-0.5 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-[11px] font-medium hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                title="Change Color Theme"
              >
                <Palette className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                <span className="hidden md:inline capitalize">{colorTheme} Theme</span>
              </button>

              {showThemeMenu && (
                <>
                  <div
                    className="fixed inset-0 z-40 bg-black/30 sm:bg-transparent"
                    onClick={() => setShowThemeMenu(false)}
                  />
                  <div className="fixed left-2 right-2 top-14 sm:absolute sm:top-full sm:mt-1 sm:left-auto sm:right-0 sm:w-56 max-w-xs mx-auto sm:mx-0 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 shadow-2xl py-2 z-50 animate-in fade-in zoom-in-95 duration-100">
                    <div className="px-3 py-1 text-[10px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-100 dark:border-slate-800">
                      Select Color Theme
                    </div>
                    <div className="p-1 space-y-1">
                      {colorThemes.map((ct) => (
                        <button
                          key={ct.id}
                          onClick={() => {
                            setColorTheme(ct.id);
                            setShowThemeMenu(false);
                          }}
                          className={`w-full text-left px-2.5 py-2 rounded-lg text-xs flex items-center justify-between transition ${
                            colorTheme === ct.id
                              ? 'bg-slate-100 dark:bg-slate-800 font-bold text-slate-900 dark:text-white'
                              : 'text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/60'
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            <span
                              className="w-3.5 h-3.5 rounded-full border border-slate-300 shadow-xs"
                              style={{ backgroundColor: ct.primaryColor }}
                            />
                            <span>{ct.name}</span>
                          </div>
                          {colorTheme === ct.id && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />}
                        </button>
                      ))}
                    </div>

                    <div className="px-3 pt-2 pb-1 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                      <span className="text-xs text-slate-600 dark:text-slate-300 font-medium">Dark Mode</span>
                      <button
                        onClick={toggleTheme}
                        className="p-1 rounded border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200"
                      >
                        {theme === 'dark' ? <Sun className="w-3.5 h-3.5 text-amber-400" /> : <Moon className="w-3.5 h-3.5 text-slate-600" />}
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* Direct Light / Dark Mode Toggle */}
            <button
              id="topbar-btn-theme"
              onClick={toggleTheme}
              className="p-1 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
              title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
              aria-label="Toggle Theme"
            >
              {theme === 'dark' ? (
                <Sun className="w-3.5 h-3.5 text-amber-400" />
              ) : (
                <Moon className="w-3.5 h-3.5 text-slate-600" />
              )}
            </button>

            {/* Language Selector Dropdown */}
            <div className="relative">
              <button
                id="topbar-btn-lang"
                onClick={() => {
                  setShowLangMenu(!showLangMenu);
                  setShowThemeMenu(false);
                  setShowRoleMenu(false);
                }}
                className="flex items-center gap-1 px-2 py-0.5 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-[11px] font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                title="Select Language (13 Indian Languages)"
              >
                <Globe className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                <span className="uppercase">{language}</span>
                <span className="text-[9px] opacity-70">▾</span>
              </button>

              {showLangMenu && (
                <>
                  <div
                    className="fixed inset-0 z-40 bg-black/30 sm:bg-transparent"
                    onClick={() => setShowLangMenu(false)}
                  />
                  <div className="fixed left-2 right-2 top-14 sm:absolute sm:top-full sm:mt-1 sm:left-auto sm:right-0 sm:w-52 max-w-xs mx-auto sm:mx-0 max-h-80 overflow-y-auto rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 shadow-2xl py-1.5 z-50 animate-in fade-in zoom-in-95 duration-100">
                    <div className="px-3 py-1 text-[10px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-100 dark:border-slate-800">
                      Select Language / भाषा चुनें
                    </div>
                    {languages.map((l) => (
                      <button
                        key={l.code}
                        onClick={() => {
                          setLanguage(l.code);
                          setShowLangMenu(false);
                        }}
                        className={`w-full text-left px-3 py-2 text-xs flex items-center justify-between hover:bg-slate-100 dark:hover:bg-slate-800 transition ${
                          language === l.code
                            ? 'font-bold text-emerald-700 dark:text-emerald-400 bg-emerald-50/70 dark:bg-slate-800/80'
                            : 'text-slate-700 dark:text-slate-300'
                        }`}
                      >
                        <span className="font-medium">{l.nativeName}</span>
                        <span className="text-[10px] text-slate-400">({l.name})</span>
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>

            {/* Role Switcher (For Demo Testing) */}
            <div className="relative">
              <button
                id="topbar-btn-role"
                onClick={() => {
                  setShowRoleMenu(!showRoleMenu);
                  setShowThemeMenu(false);
                  setShowLangMenu(false);
                }}
                className={`flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold transition ${currentRoleInfo.color}`}
                title="Switch User Role"
              >
                <RoleIcon className="w-3 h-3" />
                <span className="hidden md:inline">{currentRoleInfo.label}</span>
                <span className="text-[9px] opacity-80">▾</span>
              </button>

              {showRoleMenu && (
                <>
                  <div
                    className="fixed inset-0 z-40 bg-black/30 sm:bg-transparent"
                    onClick={() => setShowRoleMenu(false)}
                  />
                  <div className="fixed left-2 right-2 top-14 sm:absolute sm:top-full sm:mt-1 sm:left-auto sm:right-0 sm:w-64 max-w-xs mx-auto sm:mx-0 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 shadow-2xl py-2 z-50 animate-in fade-in zoom-in-95 duration-100">
                    <div className="px-3 pb-2 border-b border-slate-100 dark:border-slate-800">
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                        Role Switcher
                      </p>
                      <p className="text-xs text-slate-600 dark:text-slate-300 mt-0.5">
                        User: <strong className="text-slate-900 dark:text-white">{user?.fullName || 'User'}</strong>
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
                            className={`w-full text-left px-3 py-2 text-xs flex items-center gap-2 hover:bg-slate-100 dark:hover:bg-slate-800 transition ${
                              role === r ? 'font-bold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-slate-800' : 'text-slate-700 dark:text-slate-300'
                            }`}
                          >
                            <Icon className="w-3.5 h-3.5" />
                            <span>{info.label}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* 3. Main Government Masthead */}
      <div className="max-w-7xl mx-auto px-3 sm:px-6 py-3.5 flex items-center justify-between gap-4">
        {/* Brand & Emblem */}
        <div
          onClick={() => handleNavClick('home')}
          className="flex items-center gap-3 cursor-pointer select-none shrink-0"
        >
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-slate-900 via-emerald-950 to-slate-900 flex items-center justify-center text-white shadow-md ring-1 ring-emerald-600/40 shrink-0">
            <span className="text-2xl font-bold font-serif text-amber-400">₹</span>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-extrabold text-lg sm:text-xl tracking-tight text-slate-900 dark:text-white leading-tight">
                {t('portalTitle', 'Farmer Loan & Subsidy Finder')}
              </h1>
              <span className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 rounded border border-emerald-300 dark:border-emerald-800">
                <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                GoI Verified
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-medium hidden md:block">
              {t('tagline', 'Find Your Eligible Schemes. Apply with Confidence.')}
            </p>
          </div>
        </div>

        {/* Search Bar (Website Standard) */}
        <form onSubmit={handleSearchSubmit} className="hidden lg:flex flex-1 max-w-md mx-4">
          <div className="relative w-full">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search schemes, e.g. solar pump, KCC, drip irrigation..."
              className="w-full pl-9 pr-20 py-2 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-600"
            />
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <button
              type="submit"
              className="absolute right-1 top-1 px-2.5 py-1 text-[11px] font-semibold bg-emerald-700 hover:bg-emerald-800 text-white rounded transition"
            >
              {t('btnSearch', 'Search')}
            </button>
          </div>
        </form>

        {/* Right Tools: Krishi Sahayak AI, Notifications, Profile, Mobile Menu */}
        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          {/* AI Assistant Button */}
          <button
            id="header-btn-ai"
            onClick={onOpenAI}
            className="flex items-center gap-1.5 px-3 py-2 text-xs sm:text-sm font-bold rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white shadow-sm transition-all hover:scale-[1.02] active:scale-[0.98]"
            title="Ask Krishi Sahayak AI"
          >
            <Bot className="w-4 h-4 text-amber-300 animate-pulse" />
            <span className="hidden sm:inline">Krishi Sahayak AI</span>
            <span className="sm:hidden">AI</span>
          </button>

          {/* Notifications Bell */}
          <button
            id="header-btn-notifications"
            onClick={onOpenNotifications}
            className="relative p-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 transition"
            title="Notifications"
          >
            <Bell className="w-4 h-4" />
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 flex items-center justify-center min-w-[18px] h-[18px] px-1 text-[10px] font-bold text-white bg-rose-600 rounded-full ring-2 ring-white dark:ring-slate-900">
                {unreadCount}
              </span>
            )}
          </button>

          {/* Saved Schemes Bookmark Shortcut */}
          <button
            id="header-btn-saved-schemes"
            onClick={() => handleNavClick('saved-schemes')}
            className={`relative p-2 rounded-lg border transition ${
              activeTab === 'saved-schemes'
                ? 'border-emerald-600 bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300'
                : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700'
            }`}
            title="Saved Government Schemes"
          >
            <Bookmark className="w-4 h-4" />
            {savedCount > 0 && (
              <span className="absolute -top-1 -right-1 flex items-center justify-center min-w-[18px] h-[18px] px-1 text-[10px] font-bold text-white bg-emerald-600 rounded-full ring-2 ring-white dark:ring-slate-900">
                {savedCount}
              </span>
            )}
          </button>

          {/* Real-Time SMS Center Button */}
          <button
            id="header-btn-sms"
            onClick={onOpenSMS}
            className="relative flex items-center gap-1.5 p-2 sm:px-2.5 sm:py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 transition"
            title="Real-Time SMS Center (Auto Updates to Phone in Online & Offline Mode)"
          >
            <MessageSquare className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            <span className="hidden md:inline text-xs font-semibold">SMS Alert</span>
          </button>

          {/* Official Gmail Communications & Kisan Mail Desk Button */}
          <button
            id="header-btn-gmail"
            onClick={() => handleNavClick('gmail')}
            className={`relative flex items-center gap-1.5 p-2 sm:px-2.5 sm:py-2 rounded-lg border transition ${
              activeTab === 'gmail'
                ? 'border-red-600 bg-red-50 text-red-700 dark:bg-red-950/60 dark:text-red-300'
                : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700'
            }`}
            title="Official Gmail Communications & Kisan Mail Desk"
          >
            <Mail className="w-4 h-4 text-red-600 dark:text-red-400" />
            <span className="hidden md:inline text-xs font-semibold">Gmail</span>
          </button>

          {/* User Profile / Auth Button */}
          {!user ? (
            <button
              id="header-btn-login"
              onClick={() => handleNavClick('login')}
              className="flex items-center gap-1.5 px-3 py-2 text-xs font-bold rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white shadow-xs transition active:scale-95"
            >
              <Lock className="w-3.5 h-3.5" />
              <span>{t('btnLogin', 'Farmer Login')}</span>
            </button>
          ) : (
            <div className="flex items-center gap-1.5">
              <button
                id="header-btn-auth"
                onClick={() => handleNavClick('dashboard')}
                className="hidden sm:flex items-center gap-1.5 px-2.5 py-2 text-xs font-semibold rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 transition"
                title="Open Farmer Dashboard"
              >
                <Tractor className="w-4 h-4 text-emerald-600" />
                <span className="max-w-[110px] truncate">{user.fullName}</span>
              </button>
              <button
                id="header-btn-logout"
                onClick={() => {
                  logout();
                  handleNavClick('home');
                }}
                className="p-2 text-xs font-semibold rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-slate-100 dark:hover:bg-slate-700 transition"
                title="Sign Out"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* Mobile Hamburger Toggle for Website Navigation */}
          <button
            id="header-btn-mobile-nav"
            onClick={() => setShowMobileNav(!showMobileNav)}
            className="lg:hidden p-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200"
            aria-label="Toggle Website Navigation Menu"
          >
            {showMobileNav ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* 4. Primary Horizontal Website Navigation Bar */}
      <nav className="hidden lg:block bg-slate-900 text-white dark:bg-slate-950 border-t border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 flex items-center overflow-x-auto no-scrollbar">
          {navMenuItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                id={`website-nav-${item.id}`}
                onClick={() => handleNavClick(item.id)}
                className={`flex items-center gap-1.5 px-3.5 py-2.5 text-xs font-semibold whitespace-nowrap transition-colors border-b-2 ${
                  isActive
                    ? 'border-amber-400 text-amber-300 bg-slate-800/80'
                    : 'border-transparent text-slate-300 hover:text-white hover:bg-slate-800/40'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{item.label}</span>
              </button>
            );
          })}
        </div>
      </nav>

      {/* 5. Mobile Navigation Menu Dropdown (Website Style, not app bar) */}
      {showMobileNav && (
        <div className="lg:hidden bg-slate-900 text-white dark:bg-slate-950 border-t border-slate-800 px-4 py-3 animate-in fade-in duration-150">
          <form onSubmit={handleSearchSubmit} className="mb-3">
            <div className="relative w-full">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search schemes or subsidies..."
                className="w-full pl-8 pr-16 py-1.5 text-xs rounded border border-slate-700 bg-slate-800 text-white placeholder:text-slate-400"
              />
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2" />
              <button
                type="submit"
                className="absolute right-1 top-1 px-2 py-0.5 text-[10px] bg-emerald-600 rounded font-semibold text-white"
              >
                Go
              </button>
            </div>
          </form>

          <div className="grid grid-cols-2 gap-1">
            {navMenuItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => handleNavClick(item.id)}
                  className={`flex items-center gap-2 px-3 py-2 rounded text-xs text-left transition ${
                    isActive
                      ? 'bg-emerald-800 text-amber-300 font-bold'
                      : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                  }`}
                >
                  <Icon className="w-4 h-4 shrink-0" />
                  <span className="truncate">{item.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* 6. Gazette News Ticker Marquee Banner */}
      <div className="bg-amber-50 dark:bg-amber-950/40 border-t border-b border-amber-200/80 dark:border-amber-900/60 py-1.5 px-3 sm:px-6 text-xs text-amber-900 dark:text-amber-300 flex items-center gap-2">
        <span className="inline-flex items-center gap-1 font-bold text-[11px] uppercase tracking-wider text-amber-950 dark:text-amber-200 shrink-0 bg-amber-200 dark:bg-amber-900/80 px-2 py-0.5 rounded">
          📢 {t('latestAnnouncements', 'National Updates')}
        </span>
        <div className="overflow-hidden whitespace-nowrap text-[11px] sm:text-xs">
          <p className="truncate">
            {t('newsTickerText', 'PM-KISAN 17th DBT Installment credited • PM-KUSUM 60% Solar Pump applications active • KCC 3% prompt repayment subvention ongoing • New Drone Didi guidelines released')}
          </p>
        </div>
      </div>
    </header>
  );
};
