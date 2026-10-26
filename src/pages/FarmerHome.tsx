import React from 'react';
import {
  ShieldCheck,
  Calculator,
  ArrowRight,
  SunMedium,
  Droplets,
  Coins,
  Tractor,
  FileText,
  CheckCircle2,
  TrendingUp,
  Sparkles,
  ExternalLink,
  ChevronRight,
  Bookmark,
  BookmarkCheck
} from 'lucide-react';
import { ActiveTab } from '../components/Sidebar';
import { useLanguage } from '../context/LanguageContext';
import { useAuth } from '../context/AuthContext';
import { useSavedSchemes } from '../context/SavedSchemesContext';
import { FarmerRecommendations } from '../components/FarmerRecommendations';
import { UnifiedActionDashboard } from '../components/UnifiedActionDashboard';
import { LiveApplicationTracker } from '../components/LiveApplicationTracker';
import { OfficialFarmerPortals } from './OfficialFarmerPortals';

interface FarmerHomeProps {
  setActiveTab: (tab: ActiveTab) => void;
  onOpenAI: () => void;
  onSelectSchemeToApply: (schemeId: string, schemeName: string) => void;
}

export const FarmerHome: React.FC<FarmerHomeProps> = ({
  setActiveTab,
  onOpenAI,
  onSelectSchemeToApply
}) => {
  const { t } = useLanguage();
  const { user } = useAuth();
  const { isSaved, toggleSaveScheme } = useSavedSchemes();

  const keyCategories = [
    {
      id: 'solar',
      title: t('catSolarTitle', 'Solar Agriculture Pumps'),
      hindi: 'सौर कृषि पंप (PM-KUSUM)',
      subsidy: '60% to 75% Subsidy',
      desc: t('catSolarDesc', 'Stand-alone 3 HP to 10 HP solar pumps. Replace diesel pumps with zero electricity bills.'),
      icon: SunMedium,
      color: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20',
      action: () => setActiveTab('subsidies')
    },
    {
      id: 'irrigation',
      title: t('catIrrigationTitle', 'Drip & Micro Irrigation'),
      hindi: 'सूक्ष्म सिंचाई (PDMC)',
      subsidy: '45% to 55% Subsidy',
      desc: t('catIrrigationDesc', 'Per Drop More Crop subsidy for Drip and Sprinkler systems. Maximize yield with water conservation.'),
      icon: Droplets,
      color: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20',
      action: () => setActiveTab('subsidies')
    },
    {
      id: 'loans',
      title: t('catLoansTitle', 'Kisan Credit Card (KCC)'),
      hindi: 'किसान क्रेडिट कार्ड',
      subsidy: '4.00% Effective Interest',
      desc: t('catLoansDesc', 'Crop loans up to ₹3,00,000 with 3% prompt repayment incentive. Collateral-free up to ₹1.60 Lakh.'),
      icon: Coins,
      color: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20',
      action: () => setActiveTab('loans')
    },
    {
      id: 'machinery',
      title: t('catMachineryTitle', 'Farm Machinery (SMAM)'),
      hindi: 'कृषि यंत्रीकरण',
      subsidy: '40% to 50% Subsidy',
      desc: t('catMachineryDesc', 'Subsidies on tractors, power tillers, rotavators, and laser levelers for small & women farmers.'),
      icon: Tractor,
      color: 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20',
      action: () => setActiveTab('subsidies')
    }
  ];

  const featuredSchemes = [
    {
      id: 'SCHEME-PMKISAN',
      name: 'PM-KISAN Samman Nidhi',
      dept: 'Ministry of Agriculture & Farmers Welfare, GoI',
      benefit: '₹6,000 / Year in 3 Installments',
      criteria: 'All landholding farmer families with verified Aadhaar DBT',
      status: 'Active DBT Direct'
    },
    {
      id: 'SCHEME-KUSUM-B',
      name: 'PM-KUSUM Component B Solar Pumps',
      dept: 'Ministry of New and Renewable Energy (MNRE)',
      benefit: 'Up to 60% Govt Assistance (30% Central + 30% State)',
      criteria: 'Cultivable land with open well, borewell, or farm pond',
      status: 'High Demand'
    },
    {
      id: 'SCHEME-PDMC',
      name: 'Per Drop More Crop (Micro Irrigation)',
      dept: 'Department of Agriculture & Farmers Welfare, GoI',
      benefit: '55% Subsidy for Small/Marginal Farmers',
      criteria: 'Landholding with assured agricultural water source',
      status: 'Active Sanction'
    }
  ];

  return (
    <div className="space-y-6 sm:space-y-8 pb-12">
      {/* Official Government Top Banner */}
      <div className="rounded-2xl bg-gradient-to-br from-slate-900 via-slate-850 to-slate-950 text-white p-6 sm:p-10 shadow-xl relative overflow-hidden border border-slate-700/50">
        {/* Background Subtle Wheat Graphic Ring */}
        <div className="absolute -right-12 -bottom-12 w-64 h-64 rounded-full bg-emerald-600/10 blur-2xl pointer-events-none"></div>

        <div className="relative z-10 max-w-3xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-900/80 text-emerald-200 border border-emerald-500/30 mb-4">
            <ShieldCheck className="w-3.5 h-3.5 text-amber-300" />
            <span>{t('officialGovPortal', 'Official National Agricultural Welfare Portal')}</span>
          </div>

          <h2 className="text-2xl sm:text-4xl font-extrabold tracking-tight text-white leading-tight">
            {t('heroBannerTitle1', 'Find Your Eligible Schemes.')} <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-300 to-emerald-300">
              {t('heroBannerTitle2', 'Apply with Confidence.')}
            </span>
          </h2>

          <p className="mt-3 text-sm sm:text-base text-slate-200/90 leading-relaxed max-w-2xl">
            {t('heroBannerDesc', 'Discover verified Central & State agricultural subsidies, concessional crop loans, and financial assistance tailored directly to your landholding, crop pattern, and district.')}
          </p>

          <div className="mt-6 flex flex-wrap items-center gap-3">
            <button
              onClick={() => {
                const el = document.getElementById('unified-farmer-dashboard');
                el?.scrollIntoView({ behavior: 'smooth' });
              }}
              className="px-5 py-2.5 rounded-xl font-bold text-xs sm:text-sm bg-amber-400 hover:bg-amber-300 text-slate-950 shadow-md transition-all hover:scale-[1.02] active:scale-[0.98] flex items-center gap-2"
            >
              <Sparkles className="w-4 h-4 text-slate-950" />
              <span>{t('actionHubTitle', 'Unified Farmer Action Center')}</span>
              <ArrowRight className="w-4 h-4" />
            </button>

            <button
              onClick={() => setActiveTab('eligibility')}
              className="px-4 py-2.5 rounded-xl font-semibold text-xs sm:text-sm bg-white/10 hover:bg-white/20 text-white border border-white/20 transition backdrop-blur-xs flex items-center gap-1.5"
            >
              <Calculator className="w-4 h-4 text-white" />
              <span>{t('btnCheckEligibility', 'Full Eligibility Calculator')}</span>
            </button>

            <button
              onClick={() => setActiveTab('schemes')}
              className="px-4 py-2.5 rounded-xl font-semibold text-xs sm:text-sm bg-white/10 hover:bg-white/20 text-white border border-white/20 transition backdrop-blur-xs flex items-center gap-1.5"
            >
              <span>{t('btnExploreSchemes', 'Explore Schemes')}</span>
            </button>

            <button
              onClick={onOpenAI}
              className="px-4 py-2.5 rounded-xl font-semibold text-xs sm:text-sm bg-emerald-800 hover:bg-emerald-700 text-emerald-100 border border-emerald-500/40 transition flex items-center gap-1.5"
            >
              <Sparkles className="w-4 h-4 text-amber-300" />
              <span>{t('aiAssistantTitle', 'Krishi Sahayak AI')}</span>
            </button>
          </div>
        </div>

        {/* Highlight Numbers Strip */}
        <div className="mt-8 pt-6 border-t border-slate-700/60 grid grid-cols-2 sm:grid-cols-4 gap-4 text-left">
          <div>
            <div className="text-xl sm:text-2xl font-black text-amber-300">100% Verified</div>
            <div className="text-[11px] text-slate-300/80">Gazette GoI Rules</div>
          </div>
          <div>
            <div className="text-xl sm:text-2xl font-black text-white">Up to 60-75%</div>
            <div className="text-[11px] text-slate-300/80">Capital Subsidy Grants</div>
          </div>
          <div>
            <div className="text-xl sm:text-2xl font-black text-white">4.00% p.a.</div>
            <div className="text-[11px] text-slate-300/80">Subsidized KCC Loan</div>
          </div>
          <div>
            <div className="text-xl sm:text-2xl font-black text-white">Direct DBT</div>
            <div className="text-[11px] text-slate-300/80">Aadhaar Bank Transfer</div>
          </div>
        </div>
      </div>

      {/* Live Application Status Tracker (Zero-Refresh Real-Time Updates via WebSocket) */}
      <div id="live-application-status-tracker">
        <LiveApplicationTracker
          onNavigateToApplications={() => {
            setActiveTab('applications');
            window.scrollTo({ top: 0, behavior: 'smooth' });
          }}
        />
      </div>

      {/* Unified Farmer Action Center (All Action Buttons in One Dashboard Style) */}
      <UnifiedActionDashboard
        onNavigate={setActiveTab}
        onOpenAI={onOpenAI}
      />

      {/* Prominent Personalized Recommendation Engine Section */}
      <div id="personalized-recommendations-section">
        <FarmerRecommendations
          setActiveTab={setActiveTab}
          onSelectSchemeToApply={onSelectSchemeToApply}
          onOpenAI={onOpenAI}
        />
      </div>

      {/* Main Subsidy & Loan Pathways */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-lg font-bold text-slate-900 dark:text-white">
              Primary Assistance Categories
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Select an area to check rules, subsidy ratios, and document requirements
            </p>
          </div>
          <button
            onClick={() => setActiveTab('subsidies')}
            className="text-xs font-semibold text-emerald-700 dark:text-emerald-400 hover:underline flex items-center gap-1"
          >
            <span>View All Subsidies</span>
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {keyCategories.map((cat) => {
            const Icon = cat.icon;
            return (
              <div
                key={cat.id}
                onClick={cat.action}
                className="p-5 rounded-2xl bg-white dark:bg-slate-800/90 border border-slate-200 dark:border-slate-700/80 hover:border-emerald-500/50 hover:shadow-md transition-all cursor-pointer group flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <div className={`p-2.5 rounded-xl border ${cat.color}`}>
                      <Icon className="w-5 h-5" />
                    </div>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                      {cat.subsidy}
                    </span>
                  </div>
                  <h4 className="font-bold text-sm text-slate-900 dark:text-white group-hover:text-emerald-700 dark:group-hover:text-emerald-400 transition">
                    {cat.title}
                  </h4>
                  <div className="text-[11px] text-slate-500 dark:text-slate-400 font-medium mt-0.5">
                    {cat.hindi}
                  </div>
                  <p className="text-xs text-slate-600 dark:text-slate-300 mt-2 leading-relaxed">
                    {cat.desc}
                  </p>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-700/60 flex items-center justify-between text-xs font-semibold text-emerald-700 dark:text-emerald-400">
                  <span>{t('btnExploreSchemes', 'Explore Schemes')}</span>
                  <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Featured Verified Government Schemes */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-lg font-bold text-slate-900 dark:text-white">
              Featured Official Schemes (2026 Live)
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Sourced directly from GoI Ministry of Agriculture & State Portals
            </p>
          </div>
          <button
            onClick={() => setActiveTab('schemes')}
            className="text-xs font-semibold text-emerald-700 dark:text-emerald-400 hover:underline flex items-center gap-1"
          >
            <span>Full Directory (10+)</span>
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        <div className="space-y-3">
          {featuredSchemes.map((s) => (
            <div
              key={s.id}
              className="p-4 sm:p-5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700/80 hover:shadow-sm transition flex flex-col sm:flex-row sm:items-center justify-between gap-4"
            >
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <h4 className="font-bold text-sm sm:text-base text-slate-900 dark:text-white">
                    {s.name}
                  </h4>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300">
                    {s.status}
                  </span>
                </div>
                <div className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                  {s.dept}
                </div>
                <div className="flex flex-wrap items-center gap-2 text-xs text-slate-700 dark:text-slate-300 pt-1">
                  <span className="font-semibold text-emerald-700 dark:text-emerald-400">
                    Benefit: {s.benefit}
                  </span>
                  <span className="text-slate-300 dark:text-slate-600">•</span>
                  <span className="text-slate-500 dark:text-slate-400">{s.criteria}</span>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={() =>
                    toggleSaveScheme({
                      id: s.id,
                      code: s.id,
                      name: s.name,
                      department: s.dept,
                      category: 'CENTRAL',
                      benefits: s.benefit,
                      subsidyAmountOrPercent: s.benefit,
                      description: s.criteria,
                      governmentLevel: 'CENTRAL',
                      rules: [],
                      requiredDocuments: ['AADHAAR', '7_12_EXTRACT', 'BANK_PASSBOOK'],
                      eligibilitySummary: [s.criteria],
                      applicationProcess: [],
                      officialSourceUrl: 'https://agricoop.nic.in',
                      lastVerifiedDate: new Date().toISOString().split('T')[0],
                      version: '1.0',
                      status: 'ACTIVE'
                    })
                  }
                  title={isSaved(s.id) ? 'Remove from saved' : 'Bookmark this scheme'}
                  className={`p-2 rounded-lg border transition active:scale-95 ${
                    isSaved(s.id)
                      ? 'border-emerald-600 bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300'
                      : 'border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-500 dark:text-slate-400'
                  }`}
                >
                  {isSaved(s.id) ? (
                    <BookmarkCheck className="w-4 h-4 fill-emerald-600 text-emerald-600 dark:fill-emerald-400 dark:text-emerald-400" />
                  ) : (
                    <Bookmark className="w-4 h-4" />
                  )}
                </button>
                <button
                  onClick={() => setActiveTab('eligibility')}
                  className="px-3 py-1.5 text-xs font-semibold rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 transition"
                >
                  Check Rules
                </button>
                <button
                  onClick={() => onSelectSchemeToApply(s.id, s.name)}
                  className="px-3.5 py-1.5 text-xs font-bold rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white transition active:scale-95 shadow-xs"
                >
                  {t('btnApplyNow', 'Apply Now')}
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Dedicated Official Farmer Portals Section */}
      <div id="official-farmer-portals-section" className="pt-2">
        <OfficialFarmerPortals
          embedded={true}
          limit={6}
          onViewAll={() => setActiveTab('portals')}
        />
      </div>

      {/* 3 Steps Guide to Subsidies */}
      <div className="p-6 rounded-2xl bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-800">
        <h3 className="font-bold text-sm sm:text-base text-slate-900 dark:text-white mb-4">
          How to Discover & Apply for Government Assistance in 3 Steps:
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-4 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
            <div className="w-7 h-7 rounded-lg bg-emerald-700 text-white font-bold flex items-center justify-center text-xs mb-2">
              1
            </div>
            <h4 className="font-bold text-xs sm:text-sm text-slate-900 dark:text-white">
              {t('btnCheckEligibility', 'Check Rule-Based Eligibility')}
            </h4>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Enter your landholding acreage, crop type, and state to see exactly which schemes you qualify for.
            </p>
          </div>

          <div className="p-4 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
            <div className="w-7 h-7 rounded-lg bg-emerald-700 text-white font-bold flex items-center justify-center text-xs mb-2">
              2
            </div>
            <h4 className="font-bold text-xs sm:text-sm text-slate-900 dark:text-white">
              {t('actionVaultTitle', 'Upload to Document Vault')}
            </h4>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Securely store your Aadhaar, 7/12 extract, and bank passbook once, and attach them instantly to any application.
            </p>
          </div>

          <div className="p-4 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
            <div className="w-7 h-7 rounded-lg bg-emerald-700 text-white font-bold flex items-center justify-center text-xs mb-2">
              3
            </div>
            <h4 className="font-bold text-xs sm:text-sm text-slate-900 dark:text-white">
              {t('actionTrackTitle', 'Track Officer Scrutiny & Sanction')}
            </h4>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Receive live milestone updates as bank and agriculture officers review and approve your application.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

