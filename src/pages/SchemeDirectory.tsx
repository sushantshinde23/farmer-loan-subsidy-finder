import React, { useState, useEffect } from 'react';
import {
  Search,
  Filter,
  CheckCircle2,
  ExternalLink,
  ShieldCheck,
  FileText,
  Building,
  Calendar,
  X,
  ArrowRight,
  Sparkles,
  Bookmark,
  BookmarkCheck
} from 'lucide-react';
import { api } from '../services/api';
import { GovernmentScheme, SchemeCategory } from '../types';
import { useSavedSchemes } from '../context/SavedSchemesContext';
import { useLanguage } from '../context/LanguageContext';

interface SchemeDirectoryProps {
  onApplyForScheme: (schemeId: string, schemeName: string) => void;
}

export const SchemeDirectory: React.FC<SchemeDirectoryProps> = ({ onApplyForScheme }) => {
  const { isSaved, toggleSaveScheme } = useSavedSchemes();
  const { t } = useLanguage();
  const [schemes, setSchemes] = useState<GovernmentScheme[]>([]);
  const [selectedScheme, setSelectedScheme] = useState<GovernmentScheme | null>(null);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState<string>('ALL');
  const [stateFilter, setStateFilter] = useState<string>('ALL');
  const [loading, setLoading] = useState(true);

  const categories: { id: string; label: string }[] = [
    { id: 'ALL', label: 'All Schemes' },
    { id: 'CENTRAL', label: 'Central GoI' },
    { id: 'SOLAR', label: 'Solar Pumps' },
    { id: 'IRRIGATION', label: 'Micro Irrigation' },
    { id: 'FINANCE_LOAN', label: 'Credit & Loans' },
    { id: 'EQUIPMENT', label: 'Machinery' },
    { id: 'INSURANCE', label: 'Crop Insurance' },
    { id: 'HORTICULTURE', label: 'Horticulture' },
    { id: 'DAIRY_LIVESTOCK', label: 'Livestock & Dairy' }
  ];

  const fetchSchemes = async () => {
    setLoading(true);
    try {
      const data = await api.getSchemes({
        search: search.trim() || undefined,
        category: category !== 'ALL' ? category : undefined,
        state: stateFilter !== 'ALL' ? stateFilter : undefined
      });
      setSchemes(data);
    } catch (err) {
      console.error('Failed to load schemes:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSchemes();
  }, [category, stateFilter]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchSchemes();
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="border-b border-slate-200 dark:border-slate-800 pb-4">
        <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white">
          {t('schemesDirectoryTitle', 'Verified Government Schemes Directory')}
        </h2>
        <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
          {t('schemesDirectorySubtitle', 'Explore legal rules, financial assistance amounts, and required documents across Central & State agricultural programs.')}
        </p>
      </div>

      {/* Filters & Search Toolbar */}
      <div className="space-y-3">
        <form onSubmit={handleSearchSubmit} className="flex gap-2">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t('searchPlaceholder', 'Search by scheme name, crop, tractor, subsidy or ministry...')}
              className="w-full text-xs sm:text-sm py-2.5 pl-9 pr-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>
          <button
            type="submit"
            className="px-4 py-2.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs sm:text-sm font-semibold transition"
          >
            {t('btnSearch', 'Search')}
          </button>
        </form>

        {/* Categories Bar */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar">
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setCategory(cat.id)}
              className={`shrink-0 px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                category === cat.id
                  ? 'bg-emerald-700 text-white shadow-xs'
                  : 'bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>
      </div>

      {/* Schemes Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {schemes.map((scheme) => (
          <div
            key={scheme.id}
            className="p-5 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700/80 shadow-xs hover:border-emerald-500/50 hover:shadow-md transition flex flex-col justify-between"
          >
            <div className="space-y-2.5">
              <div className="flex items-start justify-between gap-2">
                <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                  {scheme.category}
                </span>
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] text-slate-400 font-mono">
                    {scheme.code}
                  </span>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleSaveScheme(scheme);
                    }}
                    title={isSaved(scheme.id) ? 'Remove bookmark' : 'Save this scheme'}
                    className={`p-1.5 rounded-lg transition active:scale-95 ${
                      isSaved(scheme.id)
                        ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300'
                        : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700'
                    }`}
                  >
                    {isSaved(scheme.id) ? (
                      <BookmarkCheck className="w-4 h-4 fill-emerald-600 text-emerald-600 dark:fill-emerald-400 dark:text-emerald-400" />
                    ) : (
                      <Bookmark className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </div>

              <h3 className="font-bold text-sm sm:text-base text-slate-900 dark:text-white leading-snug">
                {scheme.name}
              </h3>

              {scheme.hindiName && (
                <div className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                  {scheme.hindiName}
                </div>
              )}

              <p className="text-xs text-slate-600 dark:text-slate-300 line-clamp-3 leading-relaxed">
                {scheme.description}
              </p>

              <div className="p-2.5 rounded-xl bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-200/60 dark:border-emerald-800/40 text-xs font-semibold text-emerald-900 dark:text-emerald-200">
                Grant / Benefit: {scheme.subsidyAmountOrPercent}
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-700 flex items-center justify-between gap-2">
              <button
                onClick={() => setSelectedScheme(scheme)}
                className="text-xs font-semibold text-slate-600 dark:text-slate-300 hover:text-emerald-700 dark:hover:text-emerald-400 transition"
              >
                {t('btnDetails', 'Full Details')}
              </button>

              <button
                onClick={() => onApplyForScheme(scheme.id, scheme.name)}
                className="px-3 py-1.5 text-xs font-bold rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white transition active:scale-95 flex items-center gap-1 shadow-xs"
              >
                <span>{t('btnApply', 'Apply')}</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Scheme Detail Modal */}
      {selectedScheme && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="w-full max-w-2xl bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 max-h-[85vh] overflow-y-auto flex flex-col">
            {/* Modal Header */}
            <div className="p-5 border-b border-slate-200 dark:border-slate-800 flex items-start justify-between gap-4 sticky top-0 bg-white dark:bg-slate-900 z-10">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                    {selectedScheme.category}
                  </span>
                  <span className="text-xs text-slate-400 font-mono">
                    Code: {selectedScheme.code}
                  </span>
                </div>
                <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white mt-1">
                  {selectedScheme.name}
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {selectedScheme.department}
                </p>
              </div>

              <button
                onClick={() => setSelectedScheme(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-5 space-y-4 text-xs sm:text-sm text-slate-700 dark:text-slate-200 leading-relaxed">
              <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 font-semibold text-emerald-900 dark:text-emerald-200">
                Subsidy / Assistance: {selectedScheme.subsidyAmountOrPercent}
              </div>

              <div>
                <h4 className="font-bold text-slate-900 dark:text-white mb-1">
                  Scheme Overview & Purpose:
                </h4>
                <p>{selectedScheme.description}</p>
              </div>

              <div>
                <h4 className="font-bold text-slate-900 dark:text-white mb-1">
                  Benefits & Entitlements:
                </h4>
                <p>{selectedScheme.benefits}</p>
              </div>

              <div>
                <h4 className="font-bold text-slate-900 dark:text-white mb-1">
                  Eligibility Criteria:
                </h4>
                <ul className="list-disc pl-5 space-y-1">
                  {selectedScheme.eligibilitySummary.map((e, idx) => (
                    <li key={idx}>{e}</li>
                  ))}
                </ul>
              </div>

              <div>
                <h4 className="font-bold text-slate-900 dark:text-white mb-1">
                  Required Documents:
                </h4>
                <div className="flex flex-wrap gap-1.5">
                  {selectedScheme.requiredDocuments.map((doc, idx) => (
                    <span
                      key={idx}
                      className="px-2.5 py-1 rounded-md bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-800 dark:text-slate-200"
                    >
                      {doc}
                    </span>
                  ))}
                </div>
              </div>

              <div>
                <h4 className="font-bold text-slate-900 dark:text-white mb-1">
                  Application & Sanction Steps:
                </h4>
                <ol className="list-decimal pl-5 space-y-1">
                  {(selectedScheme.applicationProcess || []).map((step, idx) => (
                    <li key={idx}>{step}</li>
                  ))}
                </ol>
              </div>

              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 flex items-center justify-between text-xs">
                <div>
                  <span className="text-slate-400">Last Verified Date: </span>
                  <strong className="text-slate-800 dark:text-white">
                    {selectedScheme.lastVerifiedDate}
                  </strong>
                </div>
                <a
                  href={selectedScheme.officialSourceUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="text-emerald-700 dark:text-emerald-400 font-semibold hover:underline flex items-center gap-1"
                >
                  <span>Official Portal</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between gap-2 bg-slate-50 dark:bg-slate-900">
              <button
                onClick={() => toggleSaveScheme(selectedScheme)}
                className={`px-3 py-2 rounded-xl text-xs font-semibold border flex items-center gap-1.5 transition active:scale-95 ${
                  isSaved(selectedScheme.id)
                    ? 'border-emerald-600 bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300'
                    : 'border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                {isSaved(selectedScheme.id) ? (
                  <>
                    <BookmarkCheck className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Saved in Bookmarks</span>
                  </>
                ) : (
                  <>
                    <Bookmark className="w-3.5 h-3.5" />
                    <span>Save Scheme</span>
                  </>
                )}
              </button>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setSelectedScheme(null)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-100"
                >
                  Close
                </button>
                <button
                  onClick={() => {
                    const s = selectedScheme;
                    setSelectedScheme(null);
                    onApplyForScheme(s.id, s.name);
                  }}
                  className="px-4 py-2 rounded-xl text-xs font-bold bg-emerald-700 hover:bg-emerald-800 text-white flex items-center gap-1.5 shadow-xs"
                >
                  <span>Proceed to Apply</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
