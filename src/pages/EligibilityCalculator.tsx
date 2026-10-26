import React, { useState, useEffect } from 'react';
import {
  Calculator,
  CheckCircle2,
  AlertCircle,
  XCircle,
  FileDown,
  Printer,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  RotateCcw,
  Loader2,
  HelpCircle,
  ExternalLink,
  Check
} from 'lucide-react';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { EligibilityResult } from '../types';
import { downloadEligibilityReportPDF } from '../services/pdfService';

interface EligibilityCalculatorProps {
  onApplyForScheme: (schemeId: string, schemeName: string) => void;
}

export const EligibilityCalculator: React.FC<EligibilityCalculatorProps> = ({ onApplyForScheme }) => {
  const { user, farmerProfile } = useAuth();

  // Form State initialized with user profile if available
  const [state, setState] = useState(user?.state || 'Maharashtra');
  const [district, setDistrict] = useState(user?.district || 'Pune');
  const [landArea, setLandArea] = useState<number>(farmerProfile?.landAreaAcres || 3.5);
  const [landOwnership, setLandOwnership] = useState<'OWNED' | 'LEASED' | 'SHARECROPPER'>('OWNED');
  const [waterSource, setWaterSource] = useState(true);
  const [income, setIncome] = useState<number>(farmerProfile?.annualIncome || 180000);
  const [primaryCrop, setPrimaryCrop] = useState('Sugarcane');
  const [availableDocs, setAvailableDocs] = useState<string[]>([
    'AADHAAR',
    '7_12_EXTRACT',
    'BANK_PASSBOOK',
    'SOIL_HEALTH_CARD'
  ]);

  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<EligibilityResult[]>([]);
  const [hasEvaluated, setHasEvaluated] = useState(false);

  const indianStates = [
    'Maharashtra',
    'Uttar Pradesh',
    'Madhya Pradesh',
    'Punjab',
    'Haryana',
    'Gujarat',
    'Rajasthan',
    'Karnataka',
    'Andhra Pradesh',
    'Telangana',
    'Tamil Nadu',
    'Bihar',
    'West Bengal',
    'Odisha',
    'Assam',
    'Kerala'
  ];

  const documentOptions = [
    { id: 'AADHAAR', label: 'Aadhaar Card (Linked with Bank)' },
    { id: '7_12_EXTRACT', label: '7/12 Extract / Land Record (Khata/Khasra)' },
    { id: 'BANK_PASSBOOK', label: 'Bank Passbook / Cancelled Cheque' },
    { id: 'SOIL_HEALTH_CARD', label: 'Soil Health Card' },
    { id: 'CASTE_CERTIFICATE', label: 'Caste Certificate (SC/ST/OBC)' },
    { id: 'INCOME_CERTIFICATE', label: 'Tahasildar Income Certificate' }
  ];

  const handleDocToggle = (docId: string) => {
    setAvailableDocs(prev =>
      prev.includes(docId) ? prev.filter(d => d !== docId) : [...prev, docId]
    );
  };

  const handleEvaluate = async () => {
    setLoading(true);
    try {
      const response = await api.checkEligibility({
        state,
        landAreaAcres: Number(landArea),
        farmerCategory: Number(landArea) <= 2.5 ? 'SMALL' : 'MEDIUM',
        annualIncome: Number(income),
        hasWaterSource: waterSource,
        availableDocuments: availableDocs
      });
      setResults(response.results);
      setHasEvaluated(true);
    } catch (err) {
      console.error('Eligibility evaluation error:', err);
    } finally {
      setLoading(false);
    }
  };

  // Run automatically on first render
  useEffect(() => {
    handleEvaluate();
  }, []);

  const [pdfGenerating, setPdfGenerating] = useState(false);
  const [pdfDownloaded, setPdfDownloaded] = useState(false);

  const eligibleSchemes = results.filter(r => r.isEligible);
  const ineligibleSchemes = results.filter(r => !r.isEligible);

  const handleDownloadPDF = () => {
    setPdfGenerating(true);
    try {
      downloadEligibilityReportPDF({
        farmerName: user?.fullName || 'Sushant Shinde',
        mobile: user?.mobile || '+91 98220 14589',
        state,
        district,
        landArea,
        primaryCrop,
        annualIncome: income,
        eligibleSchemes,
        ineligibleSchemes
      });
      setPdfDownloaded(true);
      setTimeout(() => setPdfDownloaded(false), 3500);
    } catch (err) {
      console.error('PDF generation error, trying fallback:', err);
      try {
        window.print();
      } catch {
        // ignore
      }
    } finally {
      setPdfGenerating(false);
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Title & Introduction */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 dark:border-slate-800 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white">
              Deterministic Scheme Eligibility Engine
            </h2>
            <span className="px-2 py-0.5 text-[11px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 rounded-md">
              Rule-Based
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
            Evaluates land records, state residency, water access, and required documents against official Government of India gazette rules.
          </p>
        </div>

        {hasEvaluated && (
          <div className="flex items-center gap-2">
            <button
              type="button"
              id="btn-download-pdf-report"
              onClick={handleDownloadPDF}
              disabled={pdfGenerating}
              className="px-3.5 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold transition flex items-center gap-2 shadow-xs active:scale-95 cursor-pointer"
            >
              {pdfGenerating ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : pdfDownloaded ? (
                <Check className="w-4 h-4 text-emerald-200" />
              ) : (
                <FileDown className="w-4 h-4" />
              )}
              <span>{pdfDownloaded ? 'Report Saved to Device!' : pdfGenerating ? 'Generating PDF...' : 'Download / Print PDF Report'}</span>
            </button>
          </div>
        )}
      </div>

      {/* Form and Results Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Agricultural Profile Input Form */}
        <div className="lg:col-span-5 space-y-4">
          <div className="p-5 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-xs space-y-4">
            <h3 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
              <Calculator className="w-4 h-4 text-emerald-600" />
              <span>Enter Farm & Cultivation Details</span>
            </h3>

            {/* State & District */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  State
                </label>
                <select
                  value={state}
                  onChange={(e) => setState(e.target.value)}
                  className="w-full text-xs py-2 px-2.5 rounded-lg border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500"
                >
                  {indianStates.map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  District
                </label>
                <input
                  type="text"
                  value={district}
                  onChange={(e) => setDistrict(e.target.value)}
                  className="w-full text-xs py-2 px-2.5 rounded-lg border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500"
                  placeholder="e.g. Pune"
                />
              </div>
            </div>

            {/* Landholding Acreage & Ownership */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Land Area (Acres)
                </label>
                <input
                  type="number"
                  step="0.1"
                  min="0.1"
                  value={landArea}
                  onChange={(e) => setLandArea(parseFloat(e.target.value) || 0)}
                  className="w-full text-xs py-2 px-2.5 rounded-lg border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500"
                />
                <div className="text-[10px] text-slate-400 mt-0.5">
                  {landArea <= 2.5 ? 'Small/Marginal (< 1 ha)' : landArea <= 5 ? 'Semi-Medium' : 'Medium/Large'}
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Land Ownership
                </label>
                <select
                  value={landOwnership}
                  onChange={(e) => setLandOwnership(e.target.value as any)}
                  className="w-full text-xs py-2 px-2.5 rounded-lg border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500"
                >
                  <option value="OWNED">Owner Cultivator</option>
                  <option value="LEASED">Registered Tenant / Lease</option>
                  <option value="SHARECROPPER">Oral Lessee / Sharecropper</option>
                </select>
              </div>
            </div>

            {/* Water Source & Primary Crop */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Primary Crop
                </label>
                <select
                  value={primaryCrop}
                  onChange={(e) => setPrimaryCrop(e.target.value)}
                  className="w-full text-xs py-2 px-2.5 rounded-lg border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500"
                >
                  <option value="Sugarcane">Sugarcane</option>
                  <option value="Soybean">Soybean</option>
                  <option value="Wheat">Wheat</option>
                  <option value="Cotton">Cotton</option>
                  <option value="Paddy">Paddy / Rice</option>
                  <option value="Onion">Onion</option>
                  <option value="Gram">Gram (Chana)</option>
                  <option value="Horticulture">Horticulture / Fruits</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Annual Farm Income (₹)
                </label>
                <input
                  type="number"
                  step="10000"
                  value={income}
                  onChange={(e) => setIncome(parseInt(e.target.value) || 0)}
                  className="w-full text-xs py-2 px-2.5 rounded-lg border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500"
                />
              </div>
            </div>

            {/* Water Source Toggle */}
            <div className="pt-1">
              <label className="flex items-center gap-2.5 text-xs text-slate-700 dark:text-slate-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={waterSource}
                  onChange={(e) => setWaterSource(e.target.checked)}
                  className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500"
                />
                <span className="font-semibold">Agricultural Water Source Available (Well / Borewell / Pond)</span>
              </label>
            </div>

            {/* Documents Checkboxes */}
            <div className="pt-2 border-t border-slate-100 dark:border-slate-700">
              <label className="block text-xs font-semibold text-slate-800 dark:text-slate-200 mb-2">
                Documents Ready in Possession:
              </label>
              <div className="space-y-2">
                {documentOptions.map((doc) => (
                  <label
                    key={doc.id}
                    className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-300 cursor-pointer hover:text-slate-900 dark:hover:text-white"
                  >
                    <input
                      type="checkbox"
                      checked={availableDocs.includes(doc.id)}
                      onChange={() => handleDocToggle(doc.id)}
                      className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500"
                    />
                    <span>{doc.label}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Evaluate Button */}
            <button
              onClick={handleEvaluate}
              disabled={loading}
              className="w-full py-2.5 text-xs sm:text-sm font-bold rounded-xl bg-emerald-700 hover:bg-emerald-800 disabled:opacity-50 text-white transition flex items-center justify-center gap-2 shadow-sm"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Evaluating Rules...</span>
                </>
              ) : (
                <>
                  <Calculator className="w-4 h-4" />
                  <span>Run Eligibility Scrutiny</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Right Column: Detailed Eligibility Results */}
        <div className="lg:col-span-7 space-y-4">
          {/* Summary Metric Header */}
          <div className="grid grid-cols-3 gap-3">
            <div className="p-3.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60">
              <div className="text-xl sm:text-2xl font-black text-emerald-700 dark:text-emerald-400">
                {eligibleSchemes.length}
              </div>
              <div className="text-[11px] font-semibold text-emerald-800 dark:text-emerald-300">
                Eligible Schemes
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
              <div className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white">
                {results.length}
              </div>
              <div className="text-[11px] font-semibold text-slate-600 dark:text-slate-400">
                Schemes Evaluated
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60">
              <div className="text-xl sm:text-2xl font-black text-amber-700 dark:text-amber-400">
                Up to 75%
              </div>
              <div className="text-[11px] font-semibold text-amber-800 dark:text-amber-300">
                Max Grant Subsidy
              </div>
            </div>
          </div>

          {/* Eligible Schemes List */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
              <span>Schemes You Are Eligible For ({eligibleSchemes.length})</span>
            </h4>

            {eligibleSchemes.map((item) => (
              <div
                key={item.schemeId}
                className="p-4 rounded-xl bg-white dark:bg-slate-800 border border-emerald-200 dark:border-emerald-800/60 shadow-xs space-y-3"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <h5 className="font-bold text-sm text-slate-900 dark:text-white">
                        {item.schemeName}
                      </h5>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                        Eligible
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                      {item.department}
                    </p>
                  </div>

                  <button
                    onClick={() => onApplyForScheme(item.schemeId, item.schemeName)}
                    className="shrink-0 px-3 py-1.5 text-xs font-bold rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white transition active:scale-95 flex items-center gap-1"
                  >
                    <span>Apply Now</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div className="p-2.5 rounded-lg bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-200/60 dark:border-emerald-800/40 text-xs text-emerald-900 dark:text-emerald-200 font-semibold">
                  Benefit / Subsidy: {item.potentialBenefit}
                </div>

                {/* Criteria matched */}
                <div className="space-y-1 text-xs">
                  <div className="font-bold text-slate-700 dark:text-slate-300 text-[11px]">
                    Matched Conditions:
                  </div>
                  {item.matchedCriteria.map((c, i) => (
                    <div key={i} className="flex items-center gap-1.5 text-slate-600 dark:text-slate-300">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                      <span>{c}</span>
                    </div>
                  ))}
                </div>

                {/* Missing documents note if any */}
                {item.missingDocuments.length > 0 && (
                  <div className="p-2 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/40 text-[11px] text-amber-900 dark:text-amber-300">
                    <span className="font-bold">Required Documents to Upload: </span>
                    {item.missingDocuments.join(', ')}
                  </div>
                )}

                <div className="pt-2 border-t border-slate-100 dark:border-slate-700/60 flex items-center justify-between text-[11px] text-slate-400">
                  <span>Last verified: {item.lastVerifiedDate}</span>
                  <a
                    href={item.officialSourceUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="hover:text-emerald-600 flex items-center gap-1"
                  >
                    <span>Official Portal</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              </div>
            ))}

            {/* Ineligible Schemes List (Collapsible/Preview) */}
            {ineligibleSchemes.length > 0 && (
              <div className="pt-3 space-y-2">
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                  <XCircle className="w-3.5 h-3.5 text-rose-500" />
                  <span>Currently Not Eligible ({ineligibleSchemes.length})</span>
                </h4>

                {ineligibleSchemes.map((item) => (
                  <div
                    key={item.schemeId}
                    className="p-3 rounded-xl bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-700 text-xs opacity-75"
                  >
                    <div className="flex items-center justify-between">
                      <h5 className="font-bold text-slate-800 dark:text-slate-200">
                        {item.schemeName}
                      </h5>
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300">
                        Criteria Unmet
                      </span>
                    </div>
                    <div className="mt-1.5 space-y-1 text-[11px] text-rose-700 dark:text-rose-300">
                      {item.missingCriteria.map((c, i) => (
                        <div key={i} className="flex items-center gap-1.5">
                          <XCircle className="w-3 h-3 text-rose-500 shrink-0" />
                          <span>{c}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
