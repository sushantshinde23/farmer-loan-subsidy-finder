import React from 'react';
import {
  ShieldCheck,
  Calculator,
  ArrowRight,
  SunMedium,
  Droplets,
  Coins,
  Tractor,
  FileCheck2,
  TrendingUp,
  Sparkles,
  ExternalLink,
  ChevronRight,
  Lock,
  PhoneCall,
  Bot,
  Search,
  CheckCircle2,
  Building2,
  Users,
  Award,
  Globe,
  HelpCircle,
  FolderOpen
} from 'lucide-react';
import { ActiveTab } from '../components/Sidebar';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';

interface PortalHomePageProps {
  onNavigateTab: (tab: ActiveTab) => void;
  onOpenAI: () => void;
  onSelectSchemeToApply: (schemeId: string, schemeName: string) => void;
}

export const PortalHomePage: React.FC<PortalHomePageProps> = ({
  onNavigateTab,
  onOpenAI,
  onSelectSchemeToApply
}) => {
  const { user, loginWithGoogle } = useAuth();
  const { t } = useLanguage();

  const handleGoogleQuickSignIn = async () => {
    try {
      await loginWithGoogle('sushantshinde5598@gmail.com', 'Sushant Shinde');
      onNavigateTab('dashboard');
    } catch (err: any) {
      console.error('Google sign-in error:', err);
      onNavigateTab('login');
    }
  };

  const featuredSchemes = [
    {
      id: 'SCHEME-PMKISAN',
      code: 'PM-KISAN',
      name: 'Pradhan Mantri Kisan Samman Nidhi',
      category: 'CENTRAL',
      subsidy: '₹6,000 / Year',
      benefitType: '100% Central Cash DBT',
      dept: 'Department of Agriculture & Farmers Welfare, GoI',
      desc: 'Direct income support credited directly to Aadhaar-seeded bank accounts in three 4-monthly installments of ₹2,000 each.',
      icon: Coins,
      accent: 'emerald'
    },
    {
      id: 'SCHEME-KUSUM-B',
      code: 'PM-KUSUM',
      name: 'PM-KUSUM Solar Agriculture Pumps',
      category: 'SOLAR',
      subsidy: 'Up to 60% Subsidy',
      benefitType: 'Capital Grant (MNRE + State)',
      dept: 'Ministry of New & Renewable Energy, GoI',
      desc: 'Subsidies for standalone solar pumps (3 HP to 7.5 HP) to replace diesel pumps and eliminate agricultural electric bills.',
      icon: SunMedium,
      accent: 'amber'
    },
    {
      id: 'SCHEME-SMAM',
      code: 'SMAM-MACHINERY',
      name: 'Sub-Mission on Agricultural Mechanization',
      category: 'MACHINERY',
      subsidy: '40% to 50% Subsidy',
      benefitType: 'Equipment Capital Subsidy',
      dept: 'Ministry of Agriculture & Farmers Welfare',
      desc: 'Financial assistance for purchasing new tractors, rotavators, power tillers, and laser land levelers for small & marginal farmers.',
      icon: Tractor,
      accent: 'purple'
    },
    {
      id: 'LOAN-KCC-CROP',
      code: 'KCC-LOAN',
      name: 'Kisan Credit Card (KCC) Crop Finance',
      category: 'FINANCE',
      subsidy: '4.00% Effective Interest',
      benefitType: '3% Prompt Repayment Subvention',
      dept: 'NABARD & Commercial / Cooperative Banks',
      desc: 'Flexible credit limit up to ₹3 Lakh for seasonal cultivation, inputs, and post-harvest expenses with zero collateral up to ₹1.6 Lakh.',
      icon: Coins,
      accent: 'blue'
    },
    {
      id: 'SCHEME-PMFBY',
      code: 'PMFBY',
      name: 'Pradhan Mantri Fasal Bima Yojana',
      category: 'INSURANCE',
      subsidy: '1.5% to 2% Low Premium',
      benefitType: 'Comprehensive Crop Insurance',
      dept: 'Ministry of Agriculture & Insurance Companies',
      desc: 'Complete financial safety cover against non-preventable natural risks, drought, floods, pest attack, and unseasonal rainfall.',
      icon: ShieldCheck,
      accent: 'emerald'
    },
    {
      id: 'SCHEME-PDMC',
      code: 'PDMC-IRRIGATION',
      name: 'Per Drop More Crop (Micro Irrigation)',
      category: 'IRRIGATION',
      subsidy: '45% to 55% Subsidy',
      benefitType: 'Direct Equipment Subsidy',
      dept: 'Department of Agriculture & State Horticulture',
      desc: 'Assistance for installation of drip and sprinkler micro-irrigation systems to optimize water usage and boost crop harvest.',
      icon: Droplets,
      accent: 'cyan'
    }
  ];

  return (
    <div className="space-y-10 pb-12">
      {/* 1. Logged-in Quick Jump Banner (if already authenticated) */}
      {user && (
        <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-300 dark:border-emerald-800 flex flex-col sm:flex-row items-center justify-between gap-3 shadow-xs">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-700 text-white flex items-center justify-center font-bold">
              <Tractor className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs text-emerald-800 dark:text-emerald-300 font-medium">
                Active Session Detected
              </p>
              <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white">
                Welcome back, {user.fullName} ({user.role})
              </h3>
            </div>
          </div>
          <button
            onClick={() => onNavigateTab('dashboard')}
            className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs sm:text-sm font-bold flex items-center justify-center gap-2 shadow-sm transition active:scale-95"
          >
            <span>Open Farmer Dashboard</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* 2. Hero Section: Official Government Portal Header & CTAs */}
      <section className="relative overflow-hidden rounded-3xl bg-linear-to-b from-slate-900 via-slate-900 to-emerald-950 text-white border border-slate-800 shadow-xl p-6 sm:p-10 lg:p-12">
        {/* Tricolor Government Indicator Bar */}
        <div className="absolute top-0 left-0 right-0 h-1.5 flex">
          <div className="flex-1 bg-amber-500" />
          <div className="flex-1 bg-white" />
          <div className="flex-1 bg-emerald-600" />
        </div>

        <div className="relative z-10 max-w-3xl space-y-6">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-800/90 border border-slate-700 text-slate-200 text-xs font-semibold">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span>{t('ministryName', 'Ministry of Agriculture & Farmers Welfare • Government of India')}</span>
          </div>

          <div className="space-y-3">
            <h1 className="text-2xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight leading-tight text-white">
              {t('portalTitle', 'National Agriculture & Farmer Subsidy Portal')}
            </h1>
            <p className="text-sm sm:text-lg text-slate-300 font-normal leading-relaxed">
              {t('heroDesc', 'Find eligible government subsidies, solar water pumps, low-interest crop loans, and agricultural machinery. Check rule-based eligibility, manage documents, and receive direct benefit transfers (DBT).')}
            </p>
          </div>

          {/* Primary Action Buttons: Login vs Google vs Eligibility */}
          <div className="flex flex-wrap items-center gap-3 sm:gap-4 pt-2">
            {!user ? (
              <>
                <button
                  id="hero-btn-login"
                  onClick={() => onNavigateTab('login')}
                  className="px-6 py-3.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-sm sm:text-base font-bold flex items-center gap-2 shadow-lg shadow-emerald-950/40 transition active:scale-95"
                >
                  <Lock className="w-4 h-4" />
                  <span>{t('btnLogin', 'Farmer Login / Sign In')}</span>
                  <ArrowRight className="w-4 h-4" />
                </button>

                {/* Google Sign-in Fast Option */}
                <button
                  id="hero-btn-google-login"
                  onClick={handleGoogleQuickSignIn}
                  className="px-5 py-3.5 rounded-xl bg-white hover:bg-slate-100 text-slate-800 text-sm sm:text-base font-bold flex items-center gap-2.5 shadow-md transition active:scale-95 border border-slate-300"
                  title="Continue with Google account"
                >
                  <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
                    <path
                      fill="#4285F4"
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    />
                    <path
                      fill="#34A853"
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    />
                    <path
                      fill="#FBBC05"
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                    />
                    <path
                      fill="#EA4335"
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                    />
                  </svg>
                  <span>{t('btnGoogleLogin', 'Continue with Google')}</span>
                </button>
              </>
            ) : (
              <button
                onClick={() => onNavigateTab('dashboard')}
                className="px-6 py-3.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-sm sm:text-base font-bold flex items-center gap-2 shadow-lg transition active:scale-95"
              >
                <span>{t('navDashboard', 'Go to Farmer Dashboard')}</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            )}

            <button
              onClick={() => onNavigateTab('eligibility')}
              className="px-5 py-3.5 rounded-xl bg-slate-800/90 hover:bg-slate-700/90 text-slate-100 text-sm sm:text-base font-semibold border border-slate-700 flex items-center gap-2 transition"
            >
              <Calculator className="w-4 h-4 text-emerald-400" />
              <span>{t('navEligibility', 'Check Eligibility')}</span>
            </button>

            <button
              onClick={() => onNavigateTab('schemes')}
              className="px-4 py-3.5 rounded-xl text-slate-300 hover:text-white text-sm font-semibold transition"
            >
              <span>{t('navSchemes', 'Browse Scheme Directory')}</span>
            </button>
          </div>

          {/* Quick Metrics Bar */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-4 border-t border-slate-800 text-left">
            <div>
              <p className="text-xs text-slate-400">Total DBT Disbursed</p>
              <p className="text-base sm:text-lg font-bold text-emerald-400">₹2.81 Lakh Cr+</p>
            </div>
            <div>
              <p className="text-xs text-slate-400">Active Schemes</p>
              <p className="text-base sm:text-lg font-bold text-white">14+ Central & State</p>
            </div>
            <div>
              <p className="text-xs text-slate-400">Direct Bank Transfer</p>
              <p className="text-base sm:text-lg font-bold text-amber-400">100% Aadhaar-Linked</p>
            </div>
            <div>
              <p className="text-xs text-slate-400">Kisan AI Helpline</p>
              <p className="text-base sm:text-lg font-bold text-cyan-400">12 Indian Languages</p>
            </div>
          </div>
        </div>
      </section>

      {/* 3. The 3-Step Journey to Benefits */}
      <section className="space-y-4">
        <div className="text-center max-w-2xl mx-auto space-y-1">
          <span className="text-xs font-bold text-emerald-700 dark:text-emerald-400 uppercase tracking-wider">
            Simple 3-Step Process
          </span>
          <h2 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white">
            How the National Portal Works for Every Farmer
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
            Transparent, paperless, and direct access from scheme discovery to bank account credit.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Step 1 */}
          <div className="p-6 rounded-2xl bg-white dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 shadow-xs flex flex-col justify-between">
            <div className="space-y-3">
              <div className="w-10 h-10 rounded-xl bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 font-black flex items-center justify-center text-sm">
                01
              </div>
              <h3 className="font-bold text-base text-slate-900 dark:text-white">
                Explore & Check Eligibility
              </h3>
              <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                Browse official schemes for solar pumps, drip irrigation, crop insurance, and machinery. Run rule-based checks matching your land size and crops.
              </p>
            </div>
            <button
              onClick={() => onNavigateTab('eligibility')}
              className="mt-4 inline-flex items-center gap-1.5 text-xs font-bold text-emerald-700 dark:text-emerald-400 hover:underline"
            >
              <span>Test Your Eligibility</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Step 2 */}
          <div className="p-6 rounded-2xl bg-white dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 shadow-xs flex flex-col justify-between">
            <div className="space-y-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 font-black flex items-center justify-center text-sm">
                02
              </div>
              <h3 className="font-bold text-base text-slate-900 dark:text-white">
                Sign In with Gmail & Mobile
              </h3>
              <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                Sign in securely with your Gmail or Continue with Google, and verify your 10-digit mobile number for direct SMS alerts and Aadhaar eKYC synchronization.
              </p>
            </div>
            <button
              onClick={() => onNavigateTab('login')}
              className="mt-4 inline-flex items-center gap-1.5 text-xs font-bold text-emerald-700 dark:text-emerald-400 hover:underline"
            >
              <span>Proceed to Login Page</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Step 3 */}
          <div className="p-6 rounded-2xl bg-white dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 shadow-xs flex flex-col justify-between">
            <div className="space-y-3">
              <div className="w-10 h-10 rounded-xl bg-blue-100 dark:bg-blue-950/60 text-blue-800 dark:text-blue-300 font-black flex items-center justify-center text-sm">
                03
              </div>
              <h3 className="font-bold text-base text-slate-900 dark:text-white">
                Dashboard & 1-Click Apply
              </h3>
              <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                Your personalized Dashboard activates with match scores, saved schemes, automated document vault auto-fill, and live DBT status tracking.
              </p>
            </div>
            <button
              onClick={() => onNavigateTab(user ? 'dashboard' : 'login')}
              className="mt-4 inline-flex items-center gap-1.5 text-xs font-bold text-emerald-700 dark:text-emerald-400 hover:underline"
            >
              <span>{user ? 'Open Your Dashboard' : 'Login to Access Dashboard'}</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </section>

      {/* 4. Featured Government Schemes Preview */}
      <section className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h2 className="text-xl font-bold text-slate-900 dark:text-white">
              Featured Central & State Subsidies
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Verified active schemes currently accepting online applications
            </p>
          </div>
          <button
            onClick={() => onNavigateTab('schemes')}
            className="text-xs font-bold text-emerald-700 dark:text-emerald-400 hover:underline inline-flex items-center gap-1"
          >
            <span>View All 14+ Schemes in Directory</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {featuredSchemes.map((scheme) => {
            const Icon = scheme.icon;
            return (
              <div
                key={scheme.id}
                className="p-5 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-xs hover:border-emerald-500/50 transition flex flex-col justify-between group"
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                      {scheme.category}
                    </span>
                    <span className="text-xs font-black text-emerald-700 dark:text-emerald-400">
                      {scheme.subsidy}
                    </span>
                  </div>

                  <h3 className="font-bold text-sm sm:text-base text-slate-900 dark:text-white group-hover:text-emerald-700 dark:group-hover:text-emerald-400 transition">
                    {scheme.name}
                  </h3>

                  <p className="text-xs text-slate-600 dark:text-slate-300 line-clamp-3">
                    {scheme.desc}
                  </p>

                  <div className="pt-2 border-t border-slate-100 dark:border-slate-700/60 text-[11px] text-slate-500 dark:text-slate-400">
                    <span className="font-medium text-slate-700 dark:text-slate-300">Benefit:</span> {scheme.benefitType}
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-700/60 flex items-center justify-between gap-2">
                  <button
                    onClick={() => onNavigateTab('schemes')}
                    className="text-xs font-semibold text-slate-600 dark:text-slate-300 hover:text-emerald-700"
                  >
                    View Guidelines
                  </button>

                  <button
                    onClick={() => {
                      if (!user) {
                        onNavigateTab('login');
                      } else {
                        onSelectSchemeToApply(scheme.id, scheme.name);
                      }
                    }}
                    className="px-3.5 py-1.5 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold flex items-center gap-1 shadow-xs transition active:scale-95"
                  >
                    <span>{user ? 'Apply Now' : 'Login to Apply'}</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* 5. Multilingual Krishi Sahayak AI Banner */}
      <section className="p-6 sm:p-8 rounded-3xl bg-linear-to-r from-emerald-900 to-slate-900 text-white border border-emerald-800/80 shadow-md flex flex-col sm:flex-row items-center justify-between gap-6">
        <div className="space-y-2 max-w-xl">
          <div className="inline-flex items-center gap-1.5 text-xs font-bold text-amber-300 bg-amber-950/60 border border-amber-500/30 px-2.5 py-0.5 rounded-full">
            <Bot className="w-3.5 h-3.5" />
            <span>AI Voice & Chat Companion</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-bold text-white">
            Questions about scheme eligibility or documentation?
          </h2>
          <p className="text-xs sm:text-sm text-slate-300">
            Krishi Sahayak AI assists in Hindi, Marathi, English, Bengali, Tamil, Telugu, and 6 other Indian languages. Ask by typing or voice!
          </p>
        </div>

        <button
          onClick={onOpenAI}
          className="shrink-0 px-6 py-3 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-extrabold text-sm flex items-center gap-2 shadow-lg transition active:scale-95"
        >
          <Bot className="w-4 h-4" />
          <span>Ask Krishi Sahayak AI</span>
        </button>
      </section>

      {/* 6. Ready to Begin CTA Banner */}
      <section className="p-8 text-center rounded-3xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-xs space-y-4">
        <h2 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white">
          Ready to Check Your Personalized Government Subsidies?
        </h2>
        <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 max-w-xl mx-auto">
          Login with your Gmail, password, and mobile number, or continue with Google to access your farmer dashboard.
        </p>
        <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
          {!user ? (
            <>
              <button
                onClick={() => onNavigateTab('login')}
                className="px-6 py-3 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-sm flex items-center gap-2 shadow-xs transition active:scale-95"
              >
                <Lock className="w-4 h-4" />
                <span>Go to Farmer Login Page</span>
                <ArrowRight className="w-4 h-4" />
              </button>

              <button
                onClick={handleGoogleQuickSignIn}
                className="px-5 py-3 rounded-xl bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 text-slate-800 dark:text-white font-bold text-sm flex items-center gap-2 shadow-xs transition hover:bg-slate-50"
              >
                <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
                  <path
                    fill="#4285F4"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                  />
                </svg>
                <span>Continue with Google</span>
              </button>
            </>
          ) : (
            <button
              onClick={() => onNavigateTab('dashboard')}
              className="px-6 py-3 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-sm flex items-center gap-2 shadow-xs transition active:scale-95"
            >
              <span>Open Farmer Dashboard</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          )}
        </div>
      </section>
    </div>
  );
};
