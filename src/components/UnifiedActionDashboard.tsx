import React, { useState } from 'react';
import {
  Calculator,
  Zap,
  Coins,
  FolderOpen,
  FileCheck2,
  TrendingUp,
  CloudSun,
  MapPin,
  Bot,
  Sliders,
  Printer,
  ShieldCheck,
  ArrowRight,
  Sparkles,
  LayoutGrid,
  Cloud,
  WifiOff,
  Database,
  Lock
} from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { ActiveTab } from './Sidebar';
import { isOfflineModeActive } from '../services/offlineStorage';
import { useRealtime } from '../context/RealtimeContext';

interface UnifiedActionDashboardProps {
  onNavigate: (tab: ActiveTab) => void;
  onOpenAI: () => void;
  onOpenTuner?: () => void;
  onPrintDossier?: () => void;
}

type ActionCategory = 'all' | 'financial' | 'tools' | 'market' | 'docs';

interface ActionItem {
  id: string;
  category: ActionCategory;
  titleKey: string;
  defaultTitle: string;
  descKey: string;
  defaultDesc: string;
  badgeKey: string;
  defaultBadge: string;
  icon: React.ComponentType<{ className?: string }>;
  iconBg: string;
  iconColor: string;
  badgeColor: string;
  onClick: () => void;
  primaryActionLabel: string;
}

export const UnifiedActionDashboard: React.FC<UnifiedActionDashboardProps> = ({
  onNavigate,
  onOpenAI,
  onOpenTuner,
  onPrintDossier
}) => {
  const { t } = useLanguage();
  const { isConnected } = useRealtime();
  const [selectedCategory, setSelectedCategory] = useState<ActionCategory>('all');
  const isOffline = isOfflineModeActive();

  const actions: ActionItem[] = [
    {
      id: 'eligibility',
      category: 'tools',
      titleKey: 'actionCheckEligibilityTitle',
      defaultTitle: 'Check Scheme Eligibility',
      descKey: 'actionCheckEligibilityDesc',
      defaultDesc: 'Instant rule-based evaluation based on your land size, crops, and state.',
      badgeKey: 'actionCheckEligibilityBadge',
      defaultBadge: 'Rule Verified',
      icon: Calculator,
      iconBg: 'bg-[#E8EFE5] dark:bg-[#253822]',
      iconColor: 'text-[#253F1E] dark:text-[#A2DB72]',
      badgeColor: 'bg-[#E8EFE5] text-[#253F1E] dark:bg-[#263D23] dark:text-[#A2DB72]',
      onClick: () => onNavigate('eligibility'),
      primaryActionLabel: t('btnCheckEligibility', 'Check Eligibility')
    },
    {
      id: 'subsidies',
      category: 'financial',
      titleKey: 'actionApplySubsidiesTitle',
      defaultTitle: 'Apply for Subsidies',
      descKey: 'actionApplySubsidiesDesc',
      defaultDesc: 'Access PM-KUSUM Solar, PDMC Drip Irrigation, and Farm Machinery grants.',
      badgeKey: 'actionApplySubsidiesBadge',
      defaultBadge: 'Up to 75% Subsidy',
      icon: Zap,
      iconBg: 'bg-amber-50 dark:bg-amber-950/50',
      iconColor: 'text-amber-700 dark:text-amber-400',
      badgeColor: 'bg-amber-100 text-amber-900 dark:bg-amber-900/60 dark:text-amber-300',
      onClick: () => onNavigate('subsidies'),
      primaryActionLabel: t('btnExploreSchemes', 'Explore Subsidies')
    },
    {
      id: 'loans',
      category: 'financial',
      titleKey: 'actionLoanFinderTitle',
      defaultTitle: 'KCC & Crop Loans',
      descKey: 'actionLoanFinderDesc',
      defaultDesc: 'Compare low-interest crop credit lines with 3% prompt repayment subvention.',
      badgeKey: 'actionLoanFinderBadge',
      defaultBadge: '4% Effective Rate',
      icon: Coins,
      iconBg: 'bg-[#E8EFE5] dark:bg-[#253822]',
      iconColor: 'text-[#253F1E] dark:text-[#A2DB72]',
      badgeColor: 'bg-[#E8EFE5] text-[#253F1E] dark:bg-[#263D23] dark:text-[#A2DB72]',
      onClick: () => onNavigate('loans'),
      primaryActionLabel: t('btnCompareLoans', 'Compare Loans')
    },
    {
      id: 'vault',
      category: 'docs',
      titleKey: 'actionVaultTitle',
      defaultTitle: 'DigiLocker Document Vault',
      descKey: 'actionVaultDesc',
      defaultDesc: 'Manage and verify land 7/12, 8A extracts, Aadhaar, and bank passbooks securely.',
      badgeKey: 'actionVaultBadge',
      defaultBadge: 'Cloud SQL Encrypted',
      icon: FolderOpen,
      iconBg: 'bg-[#E8EFE5] dark:bg-[#253822]',
      iconColor: 'text-[#253F1E] dark:text-[#A2DB72]',
      badgeColor: 'bg-[#E8EFE5] text-[#253F1E] dark:bg-[#263D23] dark:text-[#A2DB72]',
      onClick: () => onNavigate('vault'),
      primaryActionLabel: t('btnUploadDocument', 'Open Vault')
    },
    {
      id: 'drive',
      category: 'docs',
      titleKey: 'actionDriveTitle',
      defaultTitle: 'Google Drive Integration',
      descKey: 'actionDriveDesc',
      defaultDesc: 'Sync, import, and backup land 7/12 extracts and certificates with Google Drive.',
      badgeKey: 'actionDriveBadge',
      defaultBadge: 'OAuth 2.0 Live',
      icon: Cloud,
      iconBg: 'bg-blue-50 dark:bg-blue-950/50',
      iconColor: 'text-blue-700 dark:text-blue-400',
      badgeColor: 'bg-blue-100 text-blue-900 dark:bg-blue-900/60 dark:text-blue-300',
      onClick: () => onNavigate('vault'),
      primaryActionLabel: 'Open Google Drive'
    },
    {
      id: 'applications',
      category: 'docs',
      titleKey: 'actionTrackTitle',
      defaultTitle: 'Track Application Status',
      descKey: 'actionTrackDesc',
      defaultDesc: 'Check real-time departmental progress of submitted subsidy and loan requests.',
      badgeKey: 'actionTrackBadge',
      defaultBadge: isConnected ? '⚡ Live WebSocket Sync' : 'Live Department Sync',
      icon: FileCheck2,
      iconBg: 'bg-[#E8EFE5] dark:bg-[#253822]',
      iconColor: 'text-[#253F1E] dark:text-[#A2DB72]',
      badgeColor: 'bg-[#E8EFE5] text-[#253F1E] dark:bg-[#263D23] dark:text-[#A2DB72]',
      onClick: () => onNavigate('applications'),
      primaryActionLabel: t('btnViewDetails', 'Track Status')
    },
    {
      id: 'mandi',
      category: 'market',
      titleKey: 'actionMandiTitle',
      defaultTitle: 'Live Mandi APMC Rates',
      descKey: 'actionMandiDesc',
      defaultDesc: 'Real-time arrival commodity market rates across major district APMC mandis.',
      badgeKey: 'actionMandiBadge',
      defaultBadge: 'Agmarknet Live',
      icon: TrendingUp,
      iconBg: 'bg-[#E8EFE5] dark:bg-[#253822]',
      iconColor: 'text-[#253F1E] dark:text-[#A2DB72]',
      badgeColor: 'bg-[#E8EFE5] text-[#253F1E] dark:bg-[#263D23] dark:text-[#A2DB72]',
      onClick: () => onNavigate('mandi-weather'),
      primaryActionLabel: t('btnSearch', 'View Mandi Rates')
    },
    {
      id: 'weather',
      category: 'market',
      titleKey: 'actionWeatherTitle',
      defaultTitle: 'Agro-Weather Forecast',
      descKey: 'actionWeatherDesc',
      defaultDesc: '7-day local rain forecasts, temperature, and spray weather advisories.',
      badgeKey: 'actionWeatherBadge',
      defaultBadge: 'IMD Agro Forecast',
      icon: CloudSun,
      iconBg: 'bg-sky-50 dark:bg-sky-950/50',
      iconColor: 'text-sky-700 dark:text-sky-400',
      badgeColor: 'bg-sky-100 text-sky-900 dark:bg-sky-900/60 dark:text-sky-300',
      onClick: () => onNavigate('mandi-weather'),
      primaryActionLabel: t('btnViewDetails', 'Weather Advisory')
    },
    {
      id: 'nearby',
      category: 'tools',
      titleKey: 'actionNearbyTitle',
      defaultTitle: 'Find Nearby Centers',
      descKey: 'actionNearbyDesc',
      defaultDesc: 'Locate nearest Krishi Vigyan Kendra (KVK), soil testing labs, and CSC kiosks.',
      badgeKey: 'actionNearbyBadge',
      defaultBadge: 'Geo-Enabled',
      icon: MapPin,
      iconBg: 'bg-rose-50 dark:bg-rose-950/50',
      iconColor: 'text-rose-700 dark:text-rose-400',
      badgeColor: 'bg-rose-100 text-rose-900 dark:bg-rose-900/60 dark:text-rose-300',
      onClick: () => onNavigate('nearby'),
      primaryActionLabel: t('btnSearch', 'Locate Centers')
    },
    {
      id: 'ai-assistant',
      category: 'tools',
      titleKey: 'actionAiTitle',
      defaultTitle: 'Ask Krishi Sahayak AI',
      descKey: 'actionAiDesc',
      defaultDesc: 'Speak or chat in your local language about scheme eligibility and paperwork.',
      badgeKey: 'actionAiBadge',
      defaultBadge: 'Vernacular AI 24x7',
      icon: Bot,
      iconBg: 'bg-[#253F1E]',
      iconColor: 'text-[#A2DB72]',
      badgeColor: 'bg-[#253F1E] text-white',
      onClick: onOpenAI,
      primaryActionLabel: t('btnListen', 'Ask AI Assistant')
    },
    {
      id: 'offline-cloudsql',
      category: 'tools',
      titleKey: 'actionCloudSqlTitle',
      defaultTitle: 'Offline Mode & Cloud SQL',
      descKey: 'actionCloudSqlDesc',
      defaultDesc: 'PWA offline caching with automatic sync to Cloud SQL PostgreSQL database.',
      badgeKey: 'actionCloudSqlBadge',
      defaultBadge: isOffline ? 'Offline Active' : 'Cloud SQL Connected',
      icon: Database,
      iconBg: 'bg-[#E8EFE5] dark:bg-[#253822]',
      iconColor: 'text-[#253F1E] dark:text-[#A2DB72]',
      badgeColor: 'bg-[#E06D43] text-white',
      onClick: () => onNavigate('settings'),
      primaryActionLabel: 'View Sync Status'
    },
    {
      id: 'simulate',
      category: 'tools',
      titleKey: 'actionTuneTitle',
      defaultTitle: 'Simulate Land & Crop Benefits',
      descKey: 'actionTuneDesc',
      defaultDesc: 'Adjust landholding, irrigation type, and crop portfolio to discover unlocked subsidies.',
      badgeKey: 'actionTuneBadge',
      defaultBadge: 'Interactive Tool',
      icon: Sliders,
      iconBg: 'bg-purple-50 dark:bg-purple-950/50',
      iconColor: 'text-purple-700 dark:text-purple-400',
      badgeColor: 'bg-purple-100 text-purple-900 dark:bg-purple-900/60 dark:text-purple-300',
      onClick: () => {
        if (onOpenTuner) {
          onOpenTuner();
        } else {
          onNavigate('eligibility');
        }
      },
      primaryActionLabel: t('btnFilter', 'Tune Profile')
    },
    {
      id: 'dossier',
      category: 'docs',
      titleKey: 'actionDossierTitle',
      defaultTitle: 'Eligibility Dossier & PDF',
      descKey: 'actionDossierDesc',
      defaultDesc: 'Generate print-ready verified report with all qualified schemes and paperwork checklist.',
      badgeKey: 'actionDossierBadge',
      defaultBadge: 'PDF / Print Slip',
      icon: Printer,
      iconBg: 'bg-amber-50 dark:bg-amber-950/50',
      iconColor: 'text-amber-800 dark:text-amber-300',
      badgeColor: 'bg-amber-100 text-amber-900 dark:bg-amber-900/60 dark:text-amber-300',
      onClick: () => {
        if (onPrintDossier) {
          onPrintDossier();
        } else {
          onNavigate('eligibility');
        }
      },
      primaryActionLabel: 'Print / Download Slip'
    },
    {
      id: 'officer',
      category: 'tools',
      titleKey: 'actionOfficerTitle',
      defaultTitle: 'Officer Verification Desk',
      descKey: 'actionOfficerDesc',
      defaultDesc: 'Switch to Bank or Agriculture Officer review workflow for document validation.',
      badgeKey: 'actionOfficerBadge',
      defaultBadge: 'Officer Workspace',
      icon: ShieldCheck,
      iconBg: 'bg-slate-100 dark:bg-slate-800',
      iconColor: 'text-slate-800 dark:text-slate-200',
      badgeColor: 'bg-slate-200 text-slate-800 dark:bg-slate-700 dark:text-slate-200',
      onClick: () => onNavigate('officer'),
      primaryActionLabel: 'Officer Desk'
    }
  ];

  const filteredActions = selectedCategory === 'all'
    ? actions
    : actions.filter((a) => a.category === selectedCategory);

  return (
    <section id="unified-farmer-dashboard" className="w-full my-6">
      {/* Dashboard Section Header (Matches palette with #F4F5ED and #253F1E) */}
      <div className="bg-[#F4F5ED] dark:bg-[#162214] rounded-3xl p-5 sm:p-6 border border-[#D2DCD0] dark:border-[#2A3B27] shadow-xs transition-colors">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-5 border-b border-[#D2DCD0] dark:border-[#2A3B27]">
          <div className="flex items-start gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-[#253F1E] text-white flex items-center justify-center shadow-xs shrink-0">
              <LayoutGrid className="w-6 h-6 text-[#A2DB72]" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-xl sm:text-2xl font-serif font-bold tracking-tight text-[#253F1E] dark:text-emerald-300">
                  {t('actionHubTitle', 'Unified Farmer Action Center')}
                </h2>

                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full border border-[#8B9E87] bg-white text-[#253F1E] text-xs font-bold shadow-xs">
                  <Lock className="w-3 h-3 text-[#253F1E]" />
                  <span>Connected</span>
                </div>

                <span className="inline-flex items-center gap-1 px-3 py-1 text-xs font-bold rounded-full bg-[#253F1E] text-white shadow-xs">
                  <Sparkles className="w-3 h-3 text-[#A2DB72]" />
                  All Services
                </span>
              </div>
              <p className="text-xs sm:text-sm text-[#3E5637] dark:text-emerald-300/80 mt-1 max-w-2xl leading-relaxed">
                {t('actionHubSubtitle', 'All official government agricultural services, Google Drive vault, Cloud SQL sync, and financial tools in one unified dashboard')}
              </p>
            </div>
          </div>

          {/* Category Filter Capsules (Pill Style) */}
          <div className="flex items-center gap-2 flex-wrap">
            <button
              id="filter-action-all"
              onClick={() => setSelectedCategory('all')}
              className={`px-3.5 py-1.5 text-xs font-bold rounded-full transition-all ${
                selectedCategory === 'all'
                  ? 'bg-[#253F1E] text-white shadow-xs'
                  : 'bg-white dark:bg-[#1E2C1B] text-[#253F1E] dark:text-emerald-200 border border-[#C5D2C2] dark:border-[#354832] hover:bg-[#E8EFE5]'
              }`}
            >
              {t('filterAll', 'All Action Tools')} ({actions.length})
            </button>
            <button
              id="filter-action-financial"
              onClick={() => setSelectedCategory('financial')}
              className={`px-3.5 py-1.5 text-xs font-bold rounded-full transition-all ${
                selectedCategory === 'financial'
                  ? 'bg-[#253F1E] text-white shadow-xs'
                  : 'bg-white dark:bg-[#1E2C1B] text-[#253F1E] dark:text-emerald-200 border border-[#C5D2C2] dark:border-[#354832] hover:bg-[#E8EFE5]'
              }`}
            >
              {t('filterFinancial', 'Loans & Subsidies')}
            </button>
            <button
              id="filter-action-tools"
              onClick={() => setSelectedCategory('tools')}
              className={`px-3.5 py-1.5 text-xs font-bold rounded-full transition-all ${
                selectedCategory === 'tools'
                  ? 'bg-[#253F1E] text-white shadow-xs'
                  : 'bg-white dark:bg-[#1E2C1B] text-[#253F1E] dark:text-emerald-200 border border-[#C5D2C2] dark:border-[#354832] hover:bg-[#E8EFE5]'
              }`}
            >
              {t('filterTools', 'Tools & Calculators')}
            </button>
            <button
              id="filter-action-docs"
              onClick={() => setSelectedCategory('docs')}
              className={`px-3.5 py-1.5 text-xs font-bold rounded-full transition-all ${
                selectedCategory === 'docs'
                  ? 'bg-[#253F1E] text-white shadow-xs'
                  : 'bg-white dark:bg-[#1E2C1B] text-[#253F1E] dark:text-emerald-200 border border-[#C5D2C2] dark:border-[#354832] hover:bg-[#E8EFE5]'
              }`}
            >
              {t('filterDocs', 'Google Drive & Vault')}
            </button>
            <button
              id="filter-action-market"
              onClick={() => setSelectedCategory('market')}
              className={`px-3.5 py-1.5 text-xs font-bold rounded-full transition-all ${
                selectedCategory === 'market'
                  ? 'bg-[#253F1E] text-white shadow-xs'
                  : 'bg-white dark:bg-[#1E2C1B] text-[#253F1E] dark:text-emerald-200 border border-[#C5D2C2] dark:border-[#354832] hover:bg-[#E8EFE5]'
              }`}
            >
              {t('filterMarket', 'Mandi & Weather')}
            </button>
          </div>
        </div>

        {/* Unified Action Grid (All action buttons in identical, cohesive dashboard tile format) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 mt-6">
          {filteredActions.map((action) => {
            const Icon = action.icon;
            const title = t(action.titleKey, action.defaultTitle);
            const desc = t(action.descKey, action.defaultDesc);
            const badge = t(action.badgeKey, action.defaultBadge);

            return (
              <div
                key={action.id}
                id={`action-card-${action.id}`}
                onClick={action.onClick}
                className="group relative flex flex-col justify-between p-4 rounded-2xl border border-[#D2DCD0] dark:border-[#2C3E29] bg-white dark:bg-[#192617] hover:border-[#253F1E] dark:hover:border-[#A2DB72] hover:shadow-md transition-all duration-200 cursor-pointer"
              >
                <div>
                  {/* Top Bar: Icon and Status Badge */}
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${action.iconBg} ${action.iconColor} transition-transform group-hover:scale-105 shadow-2xs`}>
                      <Icon className="w-5 h-5" />
                    </div>
                    <span className={`px-2.5 py-0.5 text-[10px] font-bold rounded-full ${action.badgeColor}`}>
                      {badge}
                    </span>
                  </div>

                  {/* Title & Description */}
                  <h3 className="font-bold text-[#253F1E] dark:text-white text-sm sm:text-base group-hover:text-[#34592A] dark:group-hover:text-[#A2DB72] transition-colors line-clamp-1">
                    {title}
                  </h3>
                  <p className="text-xs text-[#526B4D] dark:text-emerald-300/70 mt-1.5 leading-relaxed line-clamp-2">
                    {desc}
                  </p>
                </div>

                {/* Bottom Action Button (Uniform Dashboard Style) */}
                <div className="mt-4 pt-3 border-t border-[#EAEFE8] dark:border-[#263724] flex items-center justify-between text-xs font-bold text-[#253F1E] dark:text-emerald-300 group-hover:text-[#34592A] transition-colors">
                  <span>{action.primaryActionLabel}</span>
                  <div className="w-6 h-6 rounded-full bg-[#E8EFE5] dark:bg-[#253723] group-hover:bg-[#253F1E] group-hover:text-white dark:group-hover:bg-[#A2DB72] dark:group-hover:text-[#162214] flex items-center justify-center transition-all duration-200">
                    <ArrowRight className="w-3.5 h-3.5" />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};
