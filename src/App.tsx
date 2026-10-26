import React, { useState, useEffect } from 'react';
import { APIProvider } from '@vis.gl/react-google-maps';
import { ThemeProvider } from './context/ThemeContext';
import { LanguageProvider, useLanguage } from './context/LanguageContext';
import { AuthProvider } from './context/AuthContext';
import { RealtimeProvider } from './context/RealtimeContext';
import { SavedSchemesProvider } from './context/SavedSchemesContext';
import { WebsiteHeader } from './components/WebsiteHeader';
import { WebsiteFooter } from './components/WebsiteFooter';
import { Sidebar, ActiveTab } from './components/Sidebar';
import { OfflineIndicator } from './components/OfflineIndicator';
import { AIAssistantModal } from './components/AIAssistantModal';
import { NotificationsModal } from './components/NotificationsModal';
import { AuthModal } from './components/AuthModal';
import { SmsCenterModal } from './components/SmsCenterModal';
import { FeedbackModal } from './components/FeedbackModal';
import { ChevronRight, Home } from 'lucide-react';

import { FarmerHome } from './pages/FarmerHome';
import { PortalHomePage } from './pages/PortalHomePage';
import { LoginPage } from './pages/LoginPage';
import { EligibilityCalculator } from './pages/EligibilityCalculator';
import { SchemeDirectory } from './pages/SchemeDirectory';
import { SavedSchemes } from './pages/SavedSchemes';
import { OfficialFarmerPortals } from './pages/OfficialFarmerPortals';
import { SubsidyFinder } from './pages/SubsidyFinder';
import { LoanFinder } from './pages/LoanFinder';
import { DocumentVault } from './pages/DocumentVault';
import { ApplicationSystem } from './pages/ApplicationSystem';
import { GmailHub } from './pages/GmailHub';
import { OfficerDashboard } from './pages/OfficerDashboard';
import { CSCOperatorDashboard } from './pages/CSCOperatorDashboard';
import { AdminDashboard } from './pages/AdminDashboard';
import { MandiAndWeather } from './pages/MandiAndWeather';
import { NearbyServices } from './pages/NearbyServices';
import { FarmerProfile } from './pages/FarmerProfile';
import { SettingsPage } from './pages/SettingsPage';
import { useAuth } from './context/AuthContext';
import { UserRole } from './types';

function AppContent() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<ActiveTab>('home');
  const [showAIModal, setShowAIModal] = useState(false);
  const [showNotifModal, setShowNotifModal] = useState(false);
  const [showSmsModal, setShowSmsModal] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);
  const { t } = useLanguage();

  // Selected scheme/loan for direct application routing
  const [selectedSchemeForApply, setSelectedSchemeForApply] = useState<{ id: string; name: string } | null>(null);

  const handleApplyForScheme = (schemeId: string, schemeName: string) => {
    setSelectedSchemeForApply({ id: schemeId, name: schemeName });
    setActiveTab('applications');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleLoginSuccess = (loggedRole: UserRole) => {
    if (loggedRole === 'BANK_OFFICER' || loggedRole === 'AGRICULTURE_OFFICER') {
      setActiveTab('officer');
    } else if (loggedRole === 'CSC_OPERATOR') {
      setActiveTab('csc');
    } else if (loggedRole === 'SYSTEM_ADMIN') {
      setActiveTab('admin');
    } else {
      setActiveTab('dashboard');
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const getPageTitle = (tab: ActiveTab) => {
    switch (tab) {
      case 'home':
        return t('navHome', 'Portal Home');
      case 'login':
        return 'Farmer & Beneficiary Login';
      case 'dashboard':
        return user ? `Farmer Dashboard (${user.fullName})` : 'Farmer Dashboard';
      case 'eligibility':
        return t('navEligibility', 'Eligibility Engine');
      case 'schemes':
        return t('navSchemes', 'Government Schemes Directory');
      case 'saved-schemes':
        return t('navSavedSchemes', 'Saved Schemes & Bookmarks');
      case 'portals':
        return 'Official Farmer Portals Directory (Government of India & States)';
      case 'subsidies':
        return t('navSubsidies', 'Subsidy Finder');
      case 'loans':
        return t('navLoans', 'Crop Loans & KCC Finder');
      case 'vault':
        return t('navVault', 'DigiLocker Document Vault');
      case 'applications':
        return t('navApplications', 'Applications & Status Tracking');
      case 'gmail':
        return 'Official Gmail Communications & Kisan Mail Desk';
      case 'officer':
        return 'Officer Scrutiny & Sanction Desk';
      case 'csc':
        return 'CSC Operator Assisted Service Desk';
      case 'admin':
        return 'System Administration Portal';
      case 'mandi-weather':
        return t('navMandiWeather', 'Mandi Rates & Agro Weather');
      case 'nearby':
        return t('navNearby', 'Nearby Agricultural Centers (KVK/CSC)');
      case 'profile':
        return 'Farmer Profile & Landholdings';
      case 'settings':
        return t('navSettings', 'Portal Preferences & Regional Settings');
      default:
        return 'Government Portal';
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col font-sans transition-colors selection:bg-emerald-200 dark:selection:bg-emerald-900">
      {/* Offline Status Warning Bar */}
      <OfflineIndicator />

      {/* Official Government Website Header (Masthead, Themes, Languages, Nav Bar) */}
      <WebsiteHeader
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onOpenAI={() => setShowAIModal(true)}
        onOpenNotifications={() => setShowNotifModal(true)}
        onOpenSMS={() => setShowSmsModal(true)}
        onOpenAuth={() => setShowAuthModal(true)}
      />

      {/* Main Website Container */}
      <div className="flex-1 w-full max-w-7xl mx-auto px-3 sm:px-6 py-4 flex flex-col lg:flex-row gap-6">
        {/* Left Website Navigation Sidebar (for quick side navigation on desktop) */}
        <aside className="hidden lg:block w-64 shrink-0">
          <Sidebar
            activeTab={activeTab}
            setActiveTab={(tab) => {
              setActiveTab(tab);
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
            onOpenAI={() => setShowAIModal(true)}
          />
        </aside>

        {/* Main Workspace Area with Breadcrumbs */}
        <main className="flex-1 min-w-0">
          {/* Official Website Breadcrumb Trail */}
          <nav aria-label="Breadcrumb" className="mb-4 flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
            <button
              onClick={() => setActiveTab('home')}
              className="flex items-center gap-1 hover:text-emerald-700 dark:hover:text-emerald-400 transition"
            >
              <Home className="w-3.5 h-3.5" />
              <span>{t('portalTitle', 'National Portal')}</span>
            </button>
            <ChevronRight className="w-3 h-3 text-slate-400" />
            <span className="font-semibold text-slate-800 dark:text-slate-200 truncate">
              {getPageTitle(activeTab)}
            </span>
          </nav>

          {/* Page Routing */}
          {activeTab === 'home' && (
            <PortalHomePage
              onNavigateTab={(tab) => {
                setActiveTab(tab);
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
              onOpenAI={() => setShowAIModal(true)}
              onSelectSchemeToApply={handleApplyForScheme}
            />
          )}

          {activeTab === 'login' && (
            <LoginPage
              onLoginSuccess={handleLoginSuccess}
              onBackToHome={() => {
                setActiveTab('home');
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
              onNavigateTab={(tab) => {
                setActiveTab(tab);
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
            />
          )}

          {activeTab === 'dashboard' && (
            user ? (
              <FarmerHome
                setActiveTab={setActiveTab}
                onOpenAI={() => setShowAIModal(true)}
                onSelectSchemeToApply={handleApplyForScheme}
              />
            ) : (
              <div className="space-y-4">
                <div className="p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/50 border border-amber-300 dark:border-amber-800 text-amber-900 dark:text-amber-200 text-xs sm:text-sm font-semibold flex items-center justify-between gap-3">
                  <span>Please sign in with your verified credentials or Google to access your personalized Dashboard.</span>
                </div>
                <LoginPage
                  onLoginSuccess={handleLoginSuccess}
                  onBackToHome={() => {
                    setActiveTab('home');
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }}
                  onNavigateTab={(tab) => {
                    setActiveTab(tab);
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }}
                />
              </div>
            )
          )}

          {activeTab === 'eligibility' && (
            <EligibilityCalculator onApplyForScheme={handleApplyForScheme} />
          )}

          {activeTab === 'schemes' && (
            <SchemeDirectory onApplyForScheme={handleApplyForScheme} />
          )}

          {activeTab === 'saved-schemes' && (
            <SavedSchemes
              onApplyForScheme={handleApplyForScheme}
              onBrowseSchemes={() => {
                setActiveTab('schemes');
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
            />
          )}

          {activeTab === 'portals' && (
            <OfficialFarmerPortals />
          )}

          {activeTab === 'subsidies' && (
            <SubsidyFinder onApplyForScheme={handleApplyForScheme} />
          )}

          {activeTab === 'loans' && (
            <LoanFinder onApplyForLoan={handleApplyForScheme} />
          )}

          {activeTab === 'vault' && (
            <DocumentVault />
          )}

          {activeTab === 'applications' && (
            <ApplicationSystem
              initialSchemeId={selectedSchemeForApply?.id}
              initialSchemeName={selectedSchemeForApply?.name}
              onOpenVault={() => setActiveTab('vault')}
            />
          )}

          {activeTab === 'gmail' && (
            <GmailHub />
          )}

          {activeTab === 'officer' && (
            <OfficerDashboard />
          )}

          {activeTab === 'csc' && (
            <CSCOperatorDashboard onApplyForScheme={handleApplyForScheme} />
          )}

          {activeTab === 'admin' && (
            <AdminDashboard />
          )}

          {activeTab === 'mandi-weather' && (
            <MandiAndWeather />
          )}

          {activeTab === 'nearby' && (
            <NearbyServices />
          )}

          {activeTab === 'profile' && (
            <FarmerProfile
              onNavigateTab={(tab) => setActiveTab(tab as ActiveTab)}
              onApplyForScheme={handleApplyForScheme}
            />
          )}

          {activeTab === 'settings' && (
            <SettingsPage />
          )}
        </main>
      </div>

      {/* Official Government Website Footer */}
      <WebsiteFooter onOpenFeedback={() => setShowFeedbackModal(true)} />

      {/* Krishi Sahayak AI Assistant Dialog */}
      <AIAssistantModal
        isOpen={showAIModal}
        onClose={() => setShowAIModal(false)}
      />

      {/* Notifications Drawer */}
      <NotificationsModal
        isOpen={showNotifModal}
        onClose={() => setShowNotifModal(false)}
        onNavigate={(tab) => setActiveTab(tab as ActiveTab)}
      />

      {/* Authentication / Role Switcher Modal */}
      <AuthModal
        isOpen={showAuthModal}
        onClose={() => setShowAuthModal(false)}
      />

      {/* Real-Time SMS Alert Center Modal */}
      <SmsCenterModal
        isOpen={showSmsModal}
        onClose={() => setShowSmsModal(false)}
      />

      {/* Citizen Feedback Modal */}
      <FeedbackModal
        isOpen={showFeedbackModal}
        onClose={() => setShowFeedbackModal(false)}
      />
    </div>
  );
}

const GOOGLE_MAPS_API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || '';

export default function App() {
  const [gmpQuotaExceeded, setGmpQuotaExceeded] = useState(false);

  useEffect(() => {
    const handleQuotaExceeded = () => setGmpQuotaExceeded(true);
    window.addEventListener('gmp-quota-exceeded', handleQuotaExceeded);
    return () => window.removeEventListener('gmp-quota-exceeded', handleQuotaExceeded);
  }, []);

  return (
    <APIProvider
      apiKey={GOOGLE_MAPS_API_KEY}
      language="en"
      region="IN"
    >
      <ThemeProvider>
        <LanguageProvider>
          <AuthProvider>
            <RealtimeProvider>
              <SavedSchemesProvider>
                {gmpQuotaExceeded && (
                  <div className="bg-amber-50 border-b border-amber-200 text-amber-900 px-4 py-2.5 text-xs md:text-sm text-center sticky top-0 z-50 shadow-sm">
                    <span>
                      Google Maps Platform quota reached. If you are the app owner, visit{' '}
                      <a
                        href="https://developers.google.com/maps/ai/ai-studio?utm_campaign=gmp_mcp_codeassist_v1_aistudio#quota_exceeded_errors"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="underline font-semibold text-amber-950 hover:text-amber-800"
                      >
                        maps developer site
                      </a>{' '}
                      for instructions to update your account.
                    </span>
                  </div>
                )}
                <AppContent />
              </SavedSchemesProvider>
            </RealtimeProvider>
          </AuthProvider>
        </LanguageProvider>
      </ThemeProvider>
    </APIProvider>
  );
}
