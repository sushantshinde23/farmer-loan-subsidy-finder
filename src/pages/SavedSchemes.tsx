import React, { useState, useMemo } from 'react';
import {
  Bookmark,
  BookmarkCheck,
  Search,
  Filter,
  Trash2,
  ArrowRight,
  ExternalLink,
  ShieldCheck,
  Sparkles,
  FileText,
  Calendar,
  Building,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  Clock,
  X
} from 'lucide-react';
import { useSavedSchemes } from '../context/SavedSchemesContext';
import { useLanguage } from '../context/LanguageContext';
import { GovernmentScheme, SavedScheme } from '../types';

interface SavedSchemesProps {
  onApplyForScheme: (schemeId: string, schemeName: string) => void;
  onBrowseSchemes: () => void;
}

export const SavedSchemes: React.FC<SavedSchemesProps> = ({
  onApplyForScheme,
  onBrowseSchemes
}) => {
  const { savedSchemes, unsaveScheme, isLoading } = useSavedSchemes();
  const { t } = useLanguage();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [selectedSchemeDetail, setSelectedSchemeDetail] = useState<GovernmentScheme | null>(null);

  const categories = [
    { id: 'ALL', label: 'All Saved' },
    { id: 'CENTRAL', label: 'Central GoI' },
    { id: 'SOLAR', label: 'Solar Pumps' },
    { id: 'IRRIGATION', label: 'Irrigation' },
    { id: 'FINANCE_LOAN', label: 'Credit & Loans' },
    { id: 'EQUIPMENT', label: 'Machinery' }
  ];

  const filteredSchemes = useMemo(() => {
    return savedSchemes.filter(item => {
      const q = searchQuery.toLowerCase().trim();
      const matchesQuery =
        !q ||
        item.schemeName.toLowerCase().includes(q) ||
        item.department?.toLowerCase().includes(q) ||
        item.benefits?.toLowerCase().includes(q) ||
        item.notes?.toLowerCase().includes(q);

      const matchesCat =
        selectedCategory === 'ALL' ||
        item.category === selectedCategory ||
        item.scheme?.category === selectedCategory;

      return matchesQuery && matchesCat;
    });
  }, [savedSchemes, searchQuery, selectedCategory]);

  return (
    <div className="space-y-6 pb-16">
      {/* Header */}
      <div className="border-b border-slate-200 dark:border-slate-800 pb-5">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 flex items-center justify-center">
                <BookmarkCheck className="w-4 h-4" />
              </div>
              <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white">
                {t('savedSchemesTitle', 'Saved Government Schemes')}
              </h1>
              <span className="px-2 py-0.5 text-xs font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 rounded-full">
                {savedSchemes.length} {t('bookmarkedBadge', 'Bookmarked')}
              </span>
            </div>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
              {t('savedSchemesSubtitle', 'Your personal library of bookmarked government subsidies, DBT financial grants, and low-interest agri-credit programs.')}
            </p>
          </div>

          <button
            onClick={onBrowseSchemes}
            className="self-start sm:self-auto px-4 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-xs sm:text-sm font-semibold text-slate-700 dark:text-slate-200 flex items-center gap-2 transition active:scale-95 shadow-xs"
          >
            <span>{t('btnBrowseAllSchemes', 'Browse All Schemes')}</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Metrics Summary Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="p-4 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700/80 shadow-xs flex items-center justify-between">
          <div>
            <div className="text-xs font-medium text-slate-500 dark:text-slate-400">{t('totalBookmarked', 'Total Bookmarked')}</div>
            <div className="text-2xl font-black text-slate-900 dark:text-white mt-0.5">
              {savedSchemes.length}
            </div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 flex items-center justify-center">
            <Bookmark className="w-5 h-5" />
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700/80 shadow-xs flex items-center justify-between">
          <div>
            <div className="text-xs font-medium text-slate-500 dark:text-slate-400">{t('dbtDirectBenefit', 'DBT Direct Benefit')}</div>
            <div className="text-2xl font-black text-emerald-700 dark:text-emerald-400 mt-0.5">
              {t('verifiedHundredPercent', 'Verified 100%')}
            </div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-950/50 text-blue-700 dark:text-blue-300 flex items-center justify-center">
            <ShieldCheck className="w-5 h-5" />
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700/80 shadow-xs flex items-center justify-between">
          <div>
            <div className="text-xs font-medium text-slate-500 dark:text-slate-400">{t('instantApplication', 'Instant Application')}</div>
            <div className="text-2xl font-black text-slate-900 dark:text-white mt-0.5">
              {t('fastTrack', 'Fast-Track')}
            </div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-amber-50 dark:bg-amber-950/50 text-amber-700 dark:text-amber-300 flex items-center justify-center">
            <Sparkles className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Filter and Search */}
      {savedSchemes.length > 0 && (
        <div className="space-y-3">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search within your saved schemes..."
                className="w-full text-xs sm:text-sm py-2.5 pl-9 pr-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-white text-xs"
                >
                  Clear
                </button>
              )}
            </div>
          </div>

          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar">
            {categories.map((cat) => (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                className={`shrink-0 px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                  selectedCategory === cat.id
                    ? 'bg-emerald-700 text-white shadow-xs'
                    : 'bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700'
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Main Content Area */}
      {isLoading ? (
        <div className="p-12 text-center text-slate-400 text-sm">
          Loading your bookmarked schemes...
        </div>
      ) : savedSchemes.length === 0 ? (
        /* Empty State */
        <div className="p-8 sm:p-12 rounded-3xl bg-white dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-center max-w-xl mx-auto shadow-xs">
          <div className="w-16 h-16 rounded-2xl bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto mb-4">
            <Bookmark className="w-8 h-8" />
          </div>
          <h3 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white">
            {t('noSavedSchemesTitle', 'No Saved Schemes Yet')}
          </h3>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-2 leading-relaxed">
            {t('noSavedSchemesDesc', "You haven't bookmarked any government schemes yet. Explore our verified Central & State scheme directory and click the bookmark button on any scheme to save it for quick review and one-click application.")}
          </p>
          <div className="mt-6 flex flex-col sm:flex-row items-center justify-center gap-3">
            <button
              onClick={onBrowseSchemes}
              className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs sm:text-sm transition active:scale-95 shadow-md flex items-center justify-center gap-2"
            >
              <span>{t('btnExploreSchemes', 'Explore Government Schemes')}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      ) : filteredSchemes.length === 0 ? (
        <div className="p-8 text-center bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700">
          <p className="text-sm text-slate-500 dark:text-slate-400">
            {t('noSavedMatch', 'No saved schemes match your search filter')} "{searchQuery}".
          </p>
          <button
            onClick={() => {
              setSearchQuery('');
              setSelectedCategory('ALL');
            }}
            className="mt-3 text-xs font-bold text-emerald-700 dark:text-emerald-400 hover:underline"
          >
            {t('btnResetFilters', 'Reset Filters')}
          </button>
        </div>
      ) : (
        /* Saved Schemes Grid */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredSchemes.map((item) => {
            const schemeData = item.scheme;
            return (
              <div
                key={item.id}
                className="p-5 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-xs hover:border-emerald-500/50 hover:shadow-md transition flex flex-col justify-between"
              >
                <div className="space-y-2.5">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                        {item.category || schemeData?.category || 'SCHEME'}
                      </span>
                      <span className="text-[10px] text-slate-400 font-mono">
                        {schemeData?.code || item.schemeId}
                      </span>
                    </div>

                    <button
                      onClick={() => unsaveScheme(item.schemeId)}
                      title="Remove from saved bookmarks"
                      className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>

                  <h3 className="font-bold text-sm sm:text-base text-slate-900 dark:text-white leading-snug">
                    {item.schemeName}
                  </h3>

                  {schemeData?.hindiName && (
                    <div className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                      {schemeData.hindiName}
                    </div>
                  )}

                  <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-1">
                    {item.department || schemeData?.department || 'Government of India'}
                  </p>

                  <div className="p-2.5 rounded-xl bg-emerald-50/80 dark:bg-emerald-950/30 border border-emerald-200/60 dark:border-emerald-800/40 text-xs font-semibold text-emerald-900 dark:text-emerald-200">
                    Grant / Benefit: {item.subsidyAmountOrPercent || schemeData?.subsidyAmountOrPercent || 'Direct Grant / Subsidy'}
                  </div>

                  {item.notes && (
                    <div className="p-2 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200/50 text-[11px] text-amber-900 dark:text-amber-300">
                      <span className="font-bold">Note: </span>
                      {item.notes}
                    </div>
                  )}

                  <div className="flex items-center gap-1.5 text-[11px] text-slate-400">
                    <Clock className="w-3.5 h-3.5" />
                    <span>Saved {new Date(item.savedAt).toLocaleDateString()}</span>
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-700 flex items-center justify-between gap-2">
                  <button
                    onClick={() => {
                      if (schemeData) {
                        setSelectedSchemeDetail(schemeData);
                      } else {
                        // Fallback synthesized scheme
                        setSelectedSchemeDetail({
                          id: item.schemeId,
                          code: item.schemeId,
                          name: item.schemeName,
                          department: item.department || 'Govt Department',
                          governmentLevel: 'CENTRAL',
                          category: (item.category as any) || 'CENTRAL',
                          description: item.benefits || 'Official government scheme for farmer financial assistance.',
                          benefits: item.benefits || item.subsidyAmountOrPercent || '',
                          subsidyAmountOrPercent: item.subsidyAmountOrPercent || 'DBT Assistance',
                          eligibilitySummary: ['Cultivable agricultural landholding in applicant name', 'Aadhaar-seeded bank account'],
                          rules: [],
                          requiredDocuments: ['AADHAAR', '7_12_EXTRACT', 'BANK_PASSBOOK'],
                          applicationProcess: ['Apply online with attached documents or visit nearest CSC/Kisan Kendra.'],
                          officialSourceUrl: item.officialSourceUrl || 'https://agricoop.nic.in',
                          lastVerifiedDate: new Date().toISOString().split('T')[0],
                          version: '1.0',
                          status: 'ACTIVE'
                        });
                      }
                    }}
                    className="text-xs font-semibold text-slate-600 dark:text-slate-300 hover:text-emerald-700 dark:hover:text-emerald-400 transition"
                  >
                    View Details
                  </button>

                  <button
                    onClick={() => onApplyForScheme(item.schemeId, item.schemeName)}
                    className="px-3.5 py-1.5 text-xs font-bold rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white transition active:scale-95 flex items-center gap-1.5 shadow-xs"
                  >
                    <span>Apply Now</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Detail Modal for Selected Scheme */}
      {selectedSchemeDetail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="w-full max-w-2xl bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 max-h-[85vh] overflow-y-auto flex flex-col">
            <div className="p-5 border-b border-slate-200 dark:border-slate-800 flex items-start justify-between gap-4 sticky top-0 bg-white dark:bg-slate-900 z-10">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                    {selectedSchemeDetail.category}
                  </span>
                  <span className="text-xs text-slate-400 font-mono">
                    Code: {selectedSchemeDetail.code}
                  </span>
                </div>
                <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white mt-1">
                  {selectedSchemeDetail.name}
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {selectedSchemeDetail.department}
                </p>
              </div>

              <button
                onClick={() => setSelectedSchemeDetail(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 space-y-4 text-xs sm:text-sm text-slate-700 dark:text-slate-300 flex-1">
              <div>
                <h4 className="font-bold text-slate-900 dark:text-white mb-1">Official Benefit & Financial Grant</h4>
                <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-900 dark:text-emerald-200 font-medium">
                  {selectedSchemeDetail.subsidyAmountOrPercent}
                </div>
              </div>

              <div>
                <h4 className="font-bold text-slate-900 dark:text-white mb-1">Description</h4>
                <p className="leading-relaxed">{selectedSchemeDetail.description}</p>
              </div>

              {selectedSchemeDetail.eligibilitySummary && (
                <div>
                  <h4 className="font-bold text-slate-900 dark:text-white mb-1.5">Eligibility Criteria</h4>
                  <ul className="space-y-1.5">
                    {selectedSchemeDetail.eligibilitySummary.map((item, i) => (
                      <li key={i} className="flex items-start gap-2">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {selectedSchemeDetail.requiredDocuments && (
                <div>
                  <h4 className="font-bold text-slate-900 dark:text-white mb-1.5">Required Documents</h4>
                  <div className="flex flex-wrap gap-1.5">
                    {selectedSchemeDetail.requiredDocuments.map((doc, idx) => (
                      <span
                        key={idx}
                        className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-mono text-[11px]"
                      >
                        {doc.replace(/_/g, ' ')}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="p-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 flex items-center justify-between gap-3">
              {selectedSchemeDetail.officialSourceUrl && (
                <a
                  href={selectedSchemeDetail.officialSourceUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="text-xs font-semibold text-emerald-700 dark:text-emerald-400 hover:underline flex items-center gap-1"
                >
                  <span>Official Portal</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              )}

              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    unsaveScheme(selectedSchemeDetail.id);
                    setSelectedSchemeDetail(null);
                  }}
                  className="px-3 py-2 text-xs font-semibold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-xl transition"
                >
                  Unsave Scheme
                </button>
                <button
                  onClick={() => {
                    const id = selectedSchemeDetail.id;
                    const name = selectedSchemeDetail.name;
                    setSelectedSchemeDetail(null);
                    onApplyForScheme(id, name);
                  }}
                  className="px-4 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs transition"
                >
                  Apply for this Scheme
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
