import React, { useState, useEffect } from 'react';
import {
  ExternalLink,
  ShieldCheck,
  Search,
  CheckCircle2,
  Building2,
  Globe,
  Lock,
  Sparkles,
  Filter,
  RefreshCw,
  Info,
  Layers,
  ArrowUpRight
} from 'lucide-react';
import { api } from '../services/api';
import { OfficialPortal, PortalCategory } from '../types';
import { useLanguage } from '../context/LanguageContext';

export interface OfficialFarmerPortalsProps {
  embedded?: boolean;
  limit?: number;
  onViewAll?: () => void;
}

const CATEGORIES: { id: PortalCategory | 'ALL'; label: string; icon?: string }[] = [
  { id: 'ALL', label: 'All Portals' },
  { id: 'INCOME_SUPPORT', label: '1. Income Support' },
  { id: 'CROP_INSURANCE', label: '2. Crop Insurance' },
  { id: 'AGRICULTURAL_LOANS', label: '3. Agricultural Loans' },
  { id: 'SUBSIDIES', label: '4. Subsidies' },
  { id: 'SOLAR_IRRIGATION', label: '5. Solar & Irrigation' },
  { id: 'FARMER_REGISTRATION', label: '6. Farmer Registration' },
  { id: 'STATE_PORTALS', label: '7. State Government Portals' },
  { id: 'GRIEVANCE_SUPPORT', label: '8. Grievance & Support' }
];

export const OfficialFarmerPortals: React.FC<OfficialFarmerPortalsProps> = ({
  embedded = false,
  limit,
  onViewAll
}) => {
  const { t } = useLanguage();
  const [portals, setPortals] = useState<OfficialPortal[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<PortalCategory | 'ALL'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  const loadPortals = async () => {
    setLoading(true);
    try {
      const data = await api.getPortals({
        category: selectedCategory === 'ALL' ? undefined : selectedCategory,
        search: searchQuery.trim() || undefined
      });
      setPortals(data);
    } catch (err) {
      console.error('Failed to load official portals:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPortals();
  }, [selectedCategory, searchQuery]);

  const displayedPortals = limit ? portals.slice(0, limit) : portals;

  const getCategoryBadgeColor = (cat: PortalCategory) => {
    switch (cat) {
      case 'INCOME_SUPPORT':
        return 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800';
      case 'CROP_INSURANCE':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-950/80 dark:text-blue-300 border-blue-300 dark:border-blue-800';
      case 'AGRICULTURAL_LOANS':
        return 'bg-purple-100 text-purple-800 dark:bg-purple-950/80 dark:text-purple-300 border-purple-300 dark:border-purple-800';
      case 'SUBSIDIES':
        return 'bg-amber-100 text-amber-800 dark:bg-amber-950/80 dark:text-amber-300 border-amber-300 dark:border-amber-800';
      case 'SOLAR_IRRIGATION':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-950/80 dark:text-yellow-300 border-yellow-300 dark:border-yellow-800';
      case 'FARMER_REGISTRATION':
        return 'bg-teal-100 text-teal-800 dark:bg-teal-950/80 dark:text-teal-300 border-teal-300 dark:border-teal-800';
      case 'STATE_PORTALS':
        return 'bg-indigo-100 text-indigo-800 dark:bg-indigo-950/80 dark:text-indigo-300 border-indigo-300 dark:border-indigo-800';
      case 'GRIEVANCE_SUPPORT':
        return 'bg-rose-100 text-rose-800 dark:bg-rose-950/80 dark:text-rose-300 border-rose-300 dark:border-rose-800';
      default:
        return 'bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-200 border-slate-300 dark:border-slate-700';
    }
  };

  const getCategoryLabel = (cat: PortalCategory) => {
    switch (cat) {
      case 'INCOME_SUPPORT': return 'Income Support';
      case 'CROP_INSURANCE': return 'Crop Insurance';
      case 'AGRICULTURAL_LOANS': return 'Agricultural Loans';
      case 'SUBSIDIES': return 'Subsidies';
      case 'SOLAR_IRRIGATION': return 'Solar & Irrigation';
      case 'FARMER_REGISTRATION': return 'Farmer Registration';
      case 'STATE_PORTALS': return 'State Government Portals';
      case 'GRIEVANCE_SUPPORT': return 'Grievance & Support';
      default: return cat;
    }
  };

  const extractDomain = (url: string) => {
    try {
      const parsed = new URL(url);
      return parsed.hostname.replace('www.', '');
    } catch {
      return url;
    }
  };

  return (
    <div className={`space-y-6 ${embedded ? '' : 'pb-12'}`}>
      {/* Header Banner (Full view or Embedded view) */}
      <div className="rounded-2xl bg-gradient-to-br from-slate-900 via-emerald-950 to-slate-950 text-white p-5 sm:p-7 shadow-lg border border-emerald-900/40 relative overflow-hidden">
        <div className="absolute -right-8 -top-8 w-48 h-48 rounded-full bg-emerald-500/10 blur-3xl pointer-events-none"></div>

        <div className="relative z-10">
          <div className="flex flex-wrap items-center justify-between gap-3 mb-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-900/80 text-emerald-200 border border-emerald-500/30">
              <ShieldCheck className="w-4 h-4 text-emerald-300" />
              <span>Verified Government of India & State Portals</span>
            </div>

            <div className="flex items-center gap-2 text-[11px] font-semibold text-emerald-300/90 bg-black/40 px-3 py-1 rounded-lg border border-emerald-500/20">
              <Lock className="w-3.5 h-3.5 text-emerald-400" />
              <span>Direct Link • Zero Password Collection</span>
            </div>
          </div>

          <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight">
            Official Farmer Portals
          </h2>
          <p className="text-xs sm:text-sm text-slate-300 mt-1 max-w-3xl leading-relaxed">
            Direct authenticated gateways to verified Central and State Government digital portals for income support, crop insurance, KCC loans, solar pumps, and grievance redressal.
          </p>
        </div>
      </div>

      {/* Official Security Disclaimer Notice */}
      <div className="p-3.5 sm:p-4 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/50 flex items-start gap-3 text-xs text-amber-900 dark:text-amber-200">
        <Info className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
        <div className="leading-relaxed">
          <span className="font-bold">Official Government Link Authenticity Guarantee:</span> All portals listed below are authentic national (.gov.in / .nic.in) or state government web resources. Clicking <strong>"Open Official Portal"</strong> opens the authentic portal in a new tab. This portal never prompts for, stores, or intercepts your government portal login credentials.
        </div>
      </div>

      {/* Search and Category Filter Controls */}
      <div className="space-y-3">
        {/* Search Bar */}
        <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search portals by name, ministry, purpose, or scheme (e.g., PM-KISAN, PMFBY, KUSUM, KCC)..."
              className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs sm:text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 shadow-2xs"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 font-semibold"
              >
                Clear
              </button>
            )}
          </div>

          <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 dark:text-slate-400 shrink-0">
            <span>Showing {displayedPortals.length} of {portals.length} Portals</span>
            <button
              onClick={loadPortals}
              title="Refresh Portal Catalog"
              className="p-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 transition"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-emerald-600' : ''}`} />
            </button>
          </div>
        </div>

        {/* Category Pills (Categories 1 through 8) */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar text-xs">
          {CATEGORIES.map((cat) => {
            const isSelected = selectedCategory === cat.id;
            return (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                className={`px-3 py-1.5 rounded-lg font-semibold whitespace-nowrap transition border ${
                  isSelected
                    ? 'bg-emerald-700 text-white border-emerald-700 shadow-xs'
                    : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700'
                }`}
              >
                {cat.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Loading Skeleton */}
      {loading && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="p-5 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 animate-pulse space-y-3"
            >
              <div className="h-5 bg-slate-200 dark:bg-slate-700 rounded w-2/3"></div>
              <div className="h-3 bg-slate-200 dark:bg-slate-700 rounded w-1/2"></div>
              <div className="h-12 bg-slate-100 dark:bg-slate-750 rounded"></div>
              <div className="h-8 bg-slate-200 dark:bg-slate-700 rounded w-full"></div>
            </div>
          ))}
        </div>
      )}

      {/* Portals Cards Grid */}
      {!loading && displayedPortals.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {displayedPortals.map((portal) => {
            const domain = extractDomain(portal.officialUrl);
            return (
              <div
                key={portal.id}
                className="p-5 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-xs hover:shadow-md transition-all flex flex-col justify-between group"
              >
                <div className="space-y-3">
                  {/* Top Badges Row */}
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex flex-wrap items-center gap-1.5">
                      {/* Official Government Portal badge */}
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                        <ShieldCheck className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                        <span>Official Government Portal</span>
                      </span>

                      {/* Category Badge */}
                      <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold border ${getCategoryBadgeColor(portal.category)}`}>
                        {getCategoryLabel(portal.category)}
                      </span>
                    </div>

                    {/* Central / State tag */}
                    <span className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-700">
                      {portal.governmentLevel === 'STATE' && portal.state ? `${portal.state} Govt` : 'Central Govt'}
                    </span>
                  </div>

                  {/* Portal Name & Department */}
                  <div>
                    <h3 className="font-bold text-sm sm:text-base text-slate-900 dark:text-white group-hover:text-emerald-700 dark:group-hover:text-emerald-400 transition-colors flex items-center justify-between gap-2">
                      <span>{portal.name}</span>
                    </h3>

                    {/* Regional Names if available */}
                    {(portal.hindiName || portal.marathiName) && (
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium mt-0.5">
                        {portal.hindiName || portal.marathiName}
                      </p>
                    )}

                    <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400 mt-1 font-medium">
                      <Building2 className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span className="line-clamp-1">{portal.department}</span>
                    </div>
                  </div>

                  {/* Purpose Box */}
                  <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-750/70 border border-slate-100 dark:border-slate-700/60 text-xs">
                    <span className="font-bold text-slate-700 dark:text-slate-200 block text-[11px] uppercase tracking-wider mb-0.5 text-emerald-800 dark:text-emerald-300">
                      Purpose
                    </span>
                    <p className="text-slate-700 dark:text-slate-300 line-clamp-2 leading-relaxed">
                      {portal.purpose}
                    </p>
                  </div>

                  {/* Short Description */}
                  <p className="text-xs text-slate-600 dark:text-slate-400 line-clamp-2 leading-relaxed">
                    {portal.description}
                  </p>

                  {/* Key Services Pills */}
                  {portal.keyServices && portal.keyServices.length > 0 && (
                    <div className="space-y-1 pt-1">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                        Key Services:
                      </span>
                      <div className="flex flex-wrap gap-1">
                        {portal.keyServices.slice(0, 3).map((serv, idx) => (
                          <span
                            key={idx}
                            className="px-2 py-0.5 rounded text-[10px] font-medium bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300"
                          >
                            {serv}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Footer Action & Verification Info */}
                <div className="pt-4 mt-3 border-t border-slate-100 dark:border-slate-700 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="space-y-0.5">
                    {/* Verified Official Source badge */}
                    <div className="flex items-center gap-1.5 text-[11px] text-emerald-700 dark:text-emerald-400 font-bold">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Verified Official Source</span>
                      <span className="text-slate-400 dark:text-slate-500 font-normal">
                        ({portal.lastVerifiedDate})
                      </span>
                    </div>

                    {/* Official Domain */}
                    <div className="text-[10px] text-slate-400 font-mono flex items-center gap-1">
                      <Globe className="w-3 h-3 text-slate-400" />
                      <span className="truncate max-w-[200px]">{domain}</span>
                    </div>
                  </div>

                  {/* Open Official Portal Button */}
                  <a
                    href={portal.officialUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-emerald-700 hover:bg-emerald-800 active:scale-95 text-white transition shadow-xs group/btn shrink-0"
                    title={`Open authentic ${portal.name} government portal`}
                  >
                    <span>Open Official Portal</span>
                    <ExternalLink className="w-3.5 h-3.5 transition-transform group-hover/btn:translate-x-0.5 group-hover/btn:-translate-y-0.5" />
                  </a>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Empty State */}
      {!loading && displayedPortals.length === 0 && (
        <div className="p-8 text-center rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 space-y-3">
          <ShieldCheck className="w-10 h-10 text-slate-300 dark:text-slate-600 mx-auto" />
          <h4 className="text-sm font-bold text-slate-800 dark:text-slate-200">
            No official portals matched your filter criteria
          </h4>
          <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto">
            Try resetting your search query or choosing "All Portals" to browse all verified Government of India portals.
          </p>
          <button
            onClick={() => {
              setSearchQuery('');
              setSelectedCategory('ALL');
            }}
            className="px-4 py-2 text-xs font-bold rounded-xl bg-emerald-700 text-white hover:bg-emerald-800 transition"
          >
            Reset Filters
          </button>
        </div>
      )}

      {/* Embedded View Footer with "View All Portals" */}
      {embedded && onViewAll && (
        <div className="text-center pt-2">
          <button
            onClick={onViewAll}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold border border-emerald-600 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 transition"
          >
            <span>View All Official Portals Directory</span>
            <ArrowUpRight className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  );
};
