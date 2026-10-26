import React, { useState, useEffect, useMemo } from 'react';
import {
  Sparkles,
  CheckCircle2,
  AlertCircle,
  Coins,
  Droplets,
  SunMedium,
  Tractor,
  ShieldCheck,
  FileText,
  ArrowRight,
  ExternalLink,
  SlidersHorizontal,
  RefreshCw,
  BadgeCheck,
  Percent,
  Landmark,
  FileCheck,
  UploadCloud,
  X,
  ChevronDown,
  ChevronUp,
  Info,
  TrendingUp,
  Building2,
  Clock,
  Bookmark,
  BookmarkCheck
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { useSavedSchemes } from '../context/SavedSchemesContext';
import { api } from '../services/api';
import { computeFarmerRecommendations, RecommendationInputProfile } from '../services/recommendationEngine';
import {
  RecommendationItem,
  FarmerRecommendationsResponse,
  GovernmentScheme,
  AgriculturalLoan,
  UserDocument,
  DocumentType
} from '../types';
import { ActiveTab } from './Sidebar';

interface FarmerRecommendationsProps {
  setActiveTab: (tab: ActiveTab) => void;
  onSelectSchemeToApply: (schemeId: string, schemeName: string) => void;
  onOpenAI: () => void;
}

const COMMON_CROPS = [
  'Sugarcane', 'Soybean', 'Wheat', 'Cotton', 'Onion', 'Paddy / Rice',
  'Gram / Chana', 'Tomato', 'Vegetables', 'Mango', 'Grapes', 'Pomegranate',
  'Mustard', 'Maize', 'Groundnut', 'Banana'
];

export const FarmerRecommendations: React.FC<FarmerRecommendationsProps> = ({
  setActiveTab,
  onSelectSchemeToApply,
  onOpenAI
}) => {
  const { user, farmerProfile, updateUserProfile, updateFarmerProfile } = useAuth();
  const { isSaved, toggleSaveScheme } = useSavedSchemes();
  const { t } = useLanguage();

  const [loading, setLoading] = useState(true);
  const [recommendationsData, setRecommendationsData] = useState<FarmerRecommendationsResponse | null>(null);
  const [activeFilter, setActiveFilter] = useState<'ALL' | 'SUBSIDIES' | 'LOANS' | 'HIGH_MATCH' | 'DOC_READY'>('ALL');
  const [showTuner, setShowTuner] = useState(false);
  const [selectedItemForBreakdown, setSelectedItemForBreakdown] = useState<RecommendationItem | null>(null);
  const [isSavingProfile, setIsSavingProfile] = useState(false);

  // Tuner form state
  const [tunerState, setTunerState] = useState<RecommendationInputProfile>({
    state: user?.state || 'Maharashtra',
    district: user?.district || 'Pune',
    landAreaAcres: farmerProfile?.landAreaAcres ?? 3.5,
    farmerCategory: farmerProfile?.farmerCategory || 'SMALL',
    primaryCrops: farmerProfile?.primaryCrops || ['Sugarcane', 'Soybean', 'Wheat', 'Onion'],
    annualIncome: farmerProfile?.annualIncome ?? 180000,
    irrigationType: farmerProfile?.irrigationType || 'DRIP',
    farmingType: farmerProfile?.farmingType || 'CONVENTIONAL',
    hasKisanCreditCard: farmerProfile?.hasKisanCreditCard ?? true,
    hasWaterSource: true
  });

  // Keep local copies of raw schemes, loans, and documents for offline/instant client simulation
  const [schemes, setSchemes] = useState<GovernmentScheme[]>([]);
  const [loans, setLoans] = useState<AgriculturalLoan[]>([]);
  const [documents, setDocuments] = useState<UserDocument[]>([]);

  // Initial load
  const loadData = async () => {
    setLoading(true);
    try {
      // Fetch server recommendations + underlying entities
      const [recRes, sRes, lRes, docRes] = await Promise.allSettled([
        api.getRecommendations(),
        api.getSchemes(),
        api.getLoans(),
        api.getDocuments()
      ]);

      if (sRes.status === 'fulfilled') setSchemes(sRes.value);
      if (lRes.status === 'fulfilled') setLoans(lRes.value);
      if (docRes.status === 'fulfilled') setDocuments(docRes.value);

      if (recRes.status === 'fulfilled') {
        setRecommendationsData(recRes.value);
      } else if (sRes.status === 'fulfilled' && lRes.status === 'fulfilled') {
        // Fallback to local computation
        const computed = computeFarmerRecommendations(
          {
            name: user?.fullName,
            state: user?.state || 'Maharashtra',
            district: user?.district || 'Pune',
            landAreaAcres: farmerProfile?.landAreaAcres ?? 3.5,
            farmerCategory: farmerProfile?.farmerCategory || 'SMALL',
            primaryCrops: farmerProfile?.primaryCrops || ['Sugarcane', 'Soybean', 'Wheat', 'Onion'],
            annualIncome: farmerProfile?.annualIncome ?? 180000,
            irrigationType: farmerProfile?.irrigationType || 'DRIP',
            farmingType: farmerProfile?.farmingType || 'CONVENTIONAL',
            hasKisanCreditCard: farmerProfile?.hasKisanCreditCard ?? true
          },
          sRes.value,
          lRes.value,
          docRes.status === 'fulfilled' ? docRes.value : []
        );
        setRecommendationsData(computed);
      }
    } catch (err) {
      console.error('Error loading recommendations:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [user?.id, farmerProfile?.landAreaAcres]);

  // Sync tuner state when user/farmerProfile updates
  useEffect(() => {
    if (farmerProfile && user) {
      setTunerState({
        state: user.state || 'Maharashtra',
        district: user.district || 'Pune',
        landAreaAcres: farmerProfile.landAreaAcres ?? 3.5,
        farmerCategory: farmerProfile.farmerCategory || 'SMALL',
        primaryCrops: farmerProfile.primaryCrops || ['Sugarcane', 'Soybean', 'Wheat', 'Onion'],
        annualIncome: farmerProfile.annualIncome ?? 180000,
        irrigationType: farmerProfile.irrigationType || 'DRIP',
        farmingType: farmerProfile.farmingType || 'CONVENTIONAL',
        hasKisanCreditCard: farmerProfile.hasKisanCreditCard ?? true,
        hasWaterSource: true
      });
    }
  }, [farmerProfile, user]);

  // Re-calculate recommendations when tuner changes
  const applyTuning = () => {
    if (schemes.length > 0 && loans.length > 0) {
      const recomputed = computeFarmerRecommendations(
        tunerState,
        schemes,
        loans,
        documents
      );
      setRecommendationsData(recomputed);
    }
  };

  // Filter recommendations
  const filteredRecommendations = useMemo(() => {
    if (!recommendationsData) return [];
    return recommendationsData.recommendations.filter(item => {
      if (activeFilter === 'SUBSIDIES') return item.itemType === 'SCHEME';
      if (activeFilter === 'LOANS') return item.itemType === 'LOAN';
      if (activeFilter === 'HIGH_MATCH') return item.matchScore >= 90;
      if (activeFilter === 'DOC_READY') return item.readinessPercentage === 100;
      return true;
    });
  }, [recommendationsData, activeFilter]);

  // Save tuned profile permanently
  const handleSaveTunedProfile = async () => {
    setIsSavingProfile(true);
    try {
      if (tunerState.state || tunerState.district) {
        await updateUserProfile({
          state: tunerState.state,
          district: tunerState.district
        });
      }
      await updateFarmerProfile({
        landAreaAcres: tunerState.landAreaAcres,
        farmerCategory: tunerState.farmerCategory,
        primaryCrops: tunerState.primaryCrops,
        annualIncome: tunerState.annualIncome,
        irrigationType: tunerState.irrigationType,
        farmingType: tunerState.farmingType,
        hasKisanCreditCard: tunerState.hasKisanCreditCard
      });
      setShowTuner(false);
      applyTuning();
    } catch (err) {
      console.error('Failed to save tuned profile:', err);
    } finally {
      setIsSavingProfile(false);
    }
  };

  const getBadgeVisuals = (badge?: string) => {
    switch (badge) {
      case 'DIRECT_CASH':
        return { label: 'Direct DBT Cash Transfer', color: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border-emerald-300/40' };
      case 'TOP_SUBSIDY':
        return { label: 'Top Capital Subsidy (50-75%)', color: 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 border-amber-300/40' };
      case 'LOW_INTEREST':
        return { label: 'Concessional Interest (4.00%)', color: 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300 border-blue-300/40' };
      case 'EQUIPMENT_GRANT':
        return { label: 'Farm Mechanization Grant', color: 'bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300 border-purple-300/40' };
      case 'CROP_PROTECTION':
        return { label: 'Subsidized Crop Insurance', color: 'bg-teal-100 text-teal-800 dark:bg-teal-950 dark:text-teal-300 border-teal-300/40' };
      default:
        return { label: 'Recommended Fit', color: 'bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-300 border-slate-300/40' };
    }
  };

  return (
    <div id="personalized-recommendations-section" className="space-y-6">
      {/* Header Container */}
      <div className="rounded-2xl bg-gradient-to-r from-emerald-900 via-emerald-800 to-teal-900 text-white p-6 sm:p-8 shadow-lg relative overflow-hidden border border-emerald-700/40">
        <div className="absolute right-0 top-0 w-80 h-80 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10">
          <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold bg-amber-400/20 text-amber-300 border border-amber-400/30">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Intelligent Krishi Recommendation Engine</span>
            </div>

            <button
              onClick={() => setShowTuner(!showTuner)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-white/10 hover:bg-white/20 text-white border border-white/20 transition backdrop-blur-xs active:scale-95"
            >
              <SlidersHorizontal className="w-3.5 h-3.5" />
              <span>{showTuner ? 'Close Profile Tuner' : 'Tune Profile / What-If Scenario'}</span>
            </button>
          </div>

          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h2 className="text-xl sm:text-2xl lg:text-3xl font-extrabold tracking-tight text-white">
                Personalized Schemes & Subsidies for Your Land
              </h2>
              <p className="mt-1.5 text-xs sm:text-sm text-emerald-100/90 max-w-2xl leading-relaxed">
                Calculated dynamically for{' '}
                <span className="font-bold text-amber-300">{recommendationsData?.farmerProfileSummary.name || user?.fullName || 'Ramesh Patil'}</span>{' '}
                • {recommendationsData?.farmerProfileSummary.landAreaAcres ?? 3.5} Acres ({recommendationsData?.farmerProfileSummary.farmerCategory || 'Small'} Farmer) •{' '}
                {recommendationsData?.farmerProfileSummary.district}, {recommendationsData?.farmerProfileSummary.state}
              </p>
            </div>
          </div>

          {/* KPI Metrics Strip */}
          <div className="mt-6 pt-5 border-t border-emerald-700/50 grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-3 rounded-xl bg-emerald-950/40 border border-emerald-600/30">
              <div className="text-xs text-emerald-300 font-medium">Estimated Value Unlocked</div>
              <div className="text-lg sm:text-2xl font-black text-amber-300 mt-0.5">
                {recommendationsData?.metrics.totalEstimatedAnnualBenefitValue || '₹2.8 Lakhs+'}
              </div>
              <div className="text-[10px] text-emerald-200/80">Subsidies, grants & subvention</div>
            </div>

            <div className="p-3 rounded-xl bg-emerald-950/40 border border-emerald-600/30">
              <div className="text-xs text-emerald-300 font-medium">Top Match Score</div>
              <div className="text-lg sm:text-2xl font-black text-white mt-0.5 flex items-center gap-1">
                <span>{recommendationsData?.metrics.highestMatchScore || 98}%</span>
                <BadgeCheck className="w-5 h-5 text-amber-400" />
              </div>
              <div className="text-[10px] text-emerald-200/80">Rule-aligned with Gazette</div>
            </div>

            <div className="p-3 rounded-xl bg-emerald-950/40 border border-emerald-600/30">
              <div className="text-xs text-emerald-300 font-medium">Eligible Programs</div>
              <div className="text-lg sm:text-2xl font-black text-white mt-0.5">
                {recommendationsData?.metrics.totalEligibleRecommendations || 8}
              </div>
              <div className="text-[10px] text-emerald-200/80">Schemes, subsidies & loans</div>
            </div>

            <div className="p-3 rounded-xl bg-emerald-950/40 border border-emerald-600/30">
              <div className="text-xs text-emerald-300 font-medium">Document Readiness</div>
              <div className="text-lg sm:text-2xl font-black text-emerald-200 mt-0.5">
                {recommendationsData?.metrics.fullyDocumentedCount || 4} Ready
              </div>
              <div className="text-[10px] text-emerald-200/80">100% verified in vault</div>
            </div>
          </div>
        </div>
      </div>

      {/* Profile Tuner Drawer (What-If Interactive Simulation) */}
      {showTuner && (
        <div className="p-5 sm:p-6 rounded-2xl bg-white dark:bg-slate-800 border-2 border-amber-400/40 shadow-xl transition-all">
          <div className="flex items-center justify-between pb-4 border-b border-slate-200 dark:border-slate-700">
            <div>
              <div className="flex items-center gap-2">
                <SlidersHorizontal className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                <h3 className="font-bold text-base text-slate-900 dark:text-white">
                  Profile Tuner & Subsidy Simulator
                </h3>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Test how changing your land area, crop selection, or irrigation changes your subsidy eligibility in real time.
              </p>
            </div>
            <button
              onClick={() => setShowTuner(false)}
              className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-500"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-5">
            {/* Land Area */}
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Landholding (Acres): <span className="text-emerald-600 font-extrabold">{tunerState.landAreaAcres} ac</span>
              </label>
              <input
                type="range"
                min="0.5"
                max="25"
                step="0.5"
                value={tunerState.landAreaAcres}
                onChange={(e) => {
                  const val = parseFloat(e.target.value);
                  let cat: 'MARGINAL' | 'SMALL' | 'MEDIUM' | 'LARGE' = 'SMALL';
                  if (val < 2.5) cat = 'MARGINAL';
                  else if (val <= 5) cat = 'SMALL';
                  else if (val <= 25) cat = 'MEDIUM';
                  else cat = 'LARGE';

                  setTunerState(prev => ({
                    ...prev,
                    landAreaAcres: val,
                    farmerCategory: cat
                  }));
                }}
                className="w-full accent-emerald-600 cursor-pointer"
              />
              <div className="flex justify-between text-[10px] text-slate-400 mt-1 font-mono">
                <span>0.5 ac (Marginal)</span>
                <span>5 ac (Small)</span>
                <span>25 ac (Medium)</span>
              </div>
            </div>

            {/* State Selection */}
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                State
              </label>
              <select
                value={tunerState.state}
                onChange={(e) => setTunerState(prev => ({ ...prev, state: e.target.value }))}
                className="w-full text-xs p-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-700 text-slate-900 dark:text-white"
              >
                <option value="Maharashtra">Maharashtra (Namo Shetkari Active)</option>
                <option value="Punjab">Punjab</option>
                <option value="Karnataka">Karnataka</option>
                <option value="Uttar Pradesh">Uttar Pradesh</option>
                <option value="Gujarat">Gujarat</option>
                <option value="Madhya Pradesh">Madhya Pradesh</option>
                <option value="Rajasthan">Rajasthan</option>
              </select>
            </div>

            {/* Irrigation Type */}
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Irrigation Source
              </label>
              <select
                value={tunerState.irrigationType}
                onChange={(e) => setTunerState(prev => ({ ...prev, irrigationType: e.target.value as any }))}
                className="w-full text-xs p-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-700 text-slate-900 dark:text-white"
              >
                <option value="DRIP">Drip Irrigation (PDMC)</option>
                <option value="SPRINKLER">Sprinkler System</option>
                <option value="BOREWELL">Borewell (Solar Pump Fit)</option>
                <option value="CANAL">Canal Surface Water</option>
                <option value="RAINFED">Rainfed (Dryland)</option>
              </select>
            </div>

            {/* Credit Card Status */}
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Kisan Credit Card (KCC)
              </label>
              <select
                value={tunerState.hasKisanCreditCard ? 'yes' : 'no'}
                onChange={(e) => setTunerState(prev => ({ ...prev, hasKisanCreditCard: e.target.value === 'yes' }))}
                className="w-full text-xs p-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-700 text-slate-900 dark:text-white"
              >
                <option value="yes">Active KCC Card Holder</option>
                <option value="no">No KCC (Needs 4% Concession)</option>
              </select>
            </div>
          </div>

          {/* Primary Crops Selector */}
          <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-700">
            <div className="text-xs font-bold text-slate-700 dark:text-slate-300 mb-2">
              Cultivated Crops (click to toggle):
            </div>
            <div className="flex flex-wrap gap-1.5">
              {COMMON_CROPS.map(crop => {
                const isSelected = (tunerState.primaryCrops || []).includes(crop);
                return (
                  <button
                    key={crop}
                    type="button"
                    onClick={() => {
                      const current = tunerState.primaryCrops || [];
                      const updated = isSelected
                        ? current.filter(c => c !== crop)
                        : [...current, crop];
                      setTunerState(prev => ({ ...prev, primaryCrops: updated }));
                    }}
                    className={`px-2.5 py-1 rounded-full text-xs font-semibold transition ${
                      isSelected
                        ? 'bg-emerald-700 text-white shadow-xs'
                        : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600'
                    }`}
                  >
                    {crop} {isSelected && '✓'}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Tuner Actions */}
          <div className="mt-5 flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-200 dark:border-slate-700">
            <div className="text-xs text-slate-500 dark:text-slate-400 font-medium">
              Simulating: <span className="font-bold text-slate-800 dark:text-slate-200">{tunerState.landAreaAcres} Acres</span> •{' '}
              <span className="font-bold text-slate-800 dark:text-slate-200">{tunerState.farmerCategory} Farmer</span> •{' '}
              <span className="font-bold text-slate-800 dark:text-slate-200">{tunerState.state}</span>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={applyTuning}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-emerald-700 hover:bg-emerald-800 text-white transition flex items-center gap-1.5 shadow-xs"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Simulate Recommendations</span>
              </button>

              <button
                onClick={handleSaveTunedProfile}
                disabled={isSavingProfile}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-amber-400 hover:bg-amber-300 text-slate-950 transition flex items-center gap-1.5 shadow-xs disabled:opacity-50"
              >
                <span>{isSavingProfile ? 'Saving...' : 'Save Permanently To My Profile'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Filter Tabs Strip */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-1.5 p-1 rounded-xl bg-slate-100 dark:bg-slate-800/90 border border-slate-200 dark:border-slate-700">
          <button
            onClick={() => setActiveFilter('ALL')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
              activeFilter === 'ALL'
                ? 'bg-white dark:bg-slate-700 text-emerald-800 dark:text-emerald-300 shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            All Suggestions ({recommendationsData?.recommendations.length || 0})
          </button>

          <button
            onClick={() => setActiveFilter('SUBSIDIES')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
              activeFilter === 'SUBSIDIES'
                ? 'bg-white dark:bg-slate-700 text-emerald-800 dark:text-emerald-300 shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            Subsidies & Grants ({recommendationsData?.recommendations.filter(r => r.itemType === 'SCHEME').length || 0})
          </button>

          <button
            onClick={() => setActiveFilter('LOANS')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
              activeFilter === 'LOANS'
                ? 'bg-white dark:bg-slate-700 text-emerald-800 dark:text-emerald-300 shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            Concessional Loans ({recommendationsData?.recommendations.filter(r => r.itemType === 'LOAN').length || 0})
          </button>

          <button
            onClick={() => setActiveFilter('HIGH_MATCH')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
              activeFilter === 'HIGH_MATCH'
                ? 'bg-white dark:bg-slate-700 text-emerald-800 dark:text-emerald-300 shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            High Match (90%+)
          </button>

          <button
            onClick={() => setActiveFilter('DOC_READY')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
              activeFilter === 'DOC_READY'
                ? 'bg-white dark:bg-slate-700 text-emerald-800 dark:text-emerald-300 shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            Document Ready (100%)
          </button>
        </div>

        <button
          onClick={onOpenAI}
          className="text-xs font-semibold text-emerald-700 dark:text-emerald-400 hover:underline flex items-center gap-1"
        >
          <Sparkles className="w-3.5 h-3.5 text-amber-500" />
          <span>Ask AI Assistant for Advice</span>
        </button>
      </div>

      {/* Recommendation Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {loading ? (
          <div className="col-span-2 p-12 text-center text-slate-500 dark:text-slate-400">
            <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-3 text-emerald-600" />
            <p className="font-semibold text-sm">Evaluating 10+ Central & State agricultural schemes against your profile...</p>
          </div>
        ) : filteredRecommendations.length === 0 ? (
          <div className="col-span-2 p-10 text-center rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
            <AlertCircle className="w-8 h-8 text-amber-500 mx-auto mb-2" />
            <h4 className="font-bold text-slate-800 dark:text-slate-200 text-sm">No schemes match this filter</h4>
            <p className="text-xs text-slate-500 mt-1">Switch to 'All Suggestions' or adjust your acreage and crops in the Profile Tuner.</p>
          </div>
        ) : (
          filteredRecommendations.map((item) => {
            const badgeInfo = getBadgeVisuals(item.urgencyOrBadge);
            const isScheme = item.itemType === 'SCHEME';

            return (
              <div
                key={item.id}
                className="p-5 sm:p-6 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700/80 hover:border-emerald-500/50 hover:shadow-lg transition-all flex flex-col justify-between group"
              >
                <div>
                  {/* Top Row: Match Score & Badge */}
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className={`text-[11px] font-extrabold px-2.5 py-1 rounded-full border ${badgeInfo.color}`}>
                        {badgeInfo.label}
                      </span>
                      {item.governmentLevel === 'STATE' && (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-orange-100 text-orange-800 dark:bg-orange-950 dark:text-orange-300">
                          State Govt Top-up
                        </span>
                      )}
                    </div>

                    {/* Match Score Badge & Bookmark */}
                    <div className="flex items-center gap-1.5 shrink-0">
                      <div className="flex items-center gap-1.5 bg-emerald-50 dark:bg-emerald-950/60 px-3 py-1 rounded-xl border border-emerald-500/30">
                        <span className="text-sm font-black text-emerald-700 dark:text-emerald-400">
                          {item.matchScore}%
                        </span>
                        <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-500 uppercase tracking-wider">
                          Match
                        </span>
                      </div>

                      {isScheme && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            const sId = item.schemeId || item.id;
                            toggleSaveScheme({
                              id: sId,
                              code: sId,
                              name: item.title,
                              department: item.departmentOrBank,
                              category: (item.category as any) || 'CENTRAL',
                              benefits: item.keyBenefits,
                              subsidyAmountOrPercent: item.estimatedBenefitAmount || 'Direct Assistance',
                              description: item.keyBenefits || item.title,
                              governmentLevel: item.governmentLevel || 'CENTRAL',
                              rules: [],
                              requiredDocuments: item.requiredDocuments,
                              eligibilitySummary: item.personalizedReasons,
                              applicationProcess: [],
                              officialSourceUrl: '',
                              lastVerifiedDate: new Date().toISOString().split('T')[0],
                              version: '1.0',
                              status: 'ACTIVE'
                            });
                          }}
                          title={isSaved(item.schemeId || item.id) ? 'Remove bookmark' : 'Bookmark this scheme'}
                          className={`p-1.5 rounded-lg transition active:scale-95 ${
                            isSaved(item.schemeId || item.id)
                              ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300'
                              : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700'
                          }`}
                        >
                          {isSaved(item.schemeId || item.id) ? (
                            <BookmarkCheck className="w-4 h-4 fill-emerald-600 text-emerald-600 dark:fill-emerald-400 dark:text-emerald-400" />
                          ) : (
                            <Bookmark className="w-4 h-4" />
                          )}
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Title & Authority */}
                  <h3 className="font-bold text-base text-slate-900 dark:text-white group-hover:text-emerald-700 dark:group-hover:text-emerald-400 transition leading-snug">
                    {item.title}
                  </h3>
                  <div className="text-xs text-slate-500 dark:text-slate-400 font-medium mt-1">
                    {item.departmentOrBank}
                  </div>

                  {/* Benefit Highlight Box */}
                  <div className="mt-3.5 p-3 rounded-xl bg-emerald-50/60 dark:bg-emerald-950/30 border border-emerald-200/60 dark:border-emerald-900/40 flex items-start gap-2.5">
                    <Coins className="w-4 h-4 text-emerald-700 dark:text-emerald-400 shrink-0 mt-0.5" />
                    <div>
                      <div className="text-xs font-bold text-emerald-900 dark:text-emerald-200">
                        Benefit: {item.estimatedBenefitAmount}
                      </div>
                      <div className="text-[11px] text-emerald-800/80 dark:text-emerald-300/80 mt-0.5 line-clamp-2">
                        {item.keyBenefits}
                      </div>
                    </div>
                  </div>

                  {/* Personalized AI Reasons */}
                  <div className="mt-3.5 space-y-1.5">
                    <div className="text-[11px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider">
                      Why Recommended For You:
                    </div>
                    {item.personalizedReasons.map((reason, idx) => (
                      <div key={idx} className="flex items-start gap-2 text-xs text-slate-700 dark:text-slate-300">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                        <span className="leading-tight">{reason}</span>
                      </div>
                    ))}
                  </div>

                  {/* Document Readiness Bar */}
                  <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-700/60">
                    <div className="flex items-center justify-between text-xs mb-1.5">
                      <span className="text-slate-500 dark:text-slate-400 font-medium flex items-center gap-1">
                        <FileText className="w-3.5 h-3.5 text-slate-400" />
                        <span>Vault Readiness:</span>
                      </span>
                      <span className={`font-bold ${
                        item.readinessPercentage === 100
                          ? 'text-emerald-600 dark:text-emerald-400'
                          : 'text-amber-600 dark:text-amber-400'
                      }`}>
                        {item.readyDocuments.length} / {item.requiredDocuments.length} Docs Ready ({item.readinessPercentage}%)
                      </span>
                    </div>

                    <div className="w-full h-1.5 rounded-full bg-slate-100 dark:bg-slate-700 overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all ${
                          item.readinessPercentage === 100
                            ? 'bg-emerald-500'
                            : 'bg-amber-400'
                        }`}
                        style={{ width: `${item.readinessPercentage}%` }}
                      />
                    </div>

                    {item.missingDocuments.length > 0 && (
                      <div className="mt-1.5 flex items-center justify-between text-[11px] text-amber-700 dark:text-amber-400">
                        <span className="truncate">Missing: {item.missingDocuments.map(d => d.replace(/_/g, ' ')).join(', ')}</span>
                        <button
                          onClick={() => setActiveTab('vault')}
                          className="shrink-0 font-bold hover:underline ml-2"
                        >
                          Upload
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                {/* Bottom Card Actions */}
                <div className="mt-5 pt-3.5 border-t border-slate-100 dark:border-slate-700/60 flex items-center justify-between gap-2">
                  <button
                    onClick={() => setSelectedItemForBreakdown(item)}
                    className="text-xs font-semibold text-slate-600 dark:text-slate-400 hover:text-emerald-700 dark:hover:text-emerald-400 transition flex items-center gap-1"
                  >
                    <Info className="w-3.5 h-3.5" />
                    <span>View Rule Breakdown</span>
                  </button>

                  <div className="flex items-center gap-2">
                    {isScheme ? (
                      <button
                        onClick={() => onSelectSchemeToApply(item.schemeId || item.id, item.title)}
                        className="px-4 py-2 rounded-xl text-xs font-bold bg-emerald-700 hover:bg-emerald-800 text-white transition flex items-center gap-1.5 shadow-xs active:scale-95"
                      >
                        <span>Apply Online</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                    ) : (
                      <button
                        onClick={() => setActiveTab('loans')}
                        className="px-4 py-2 rounded-xl text-xs font-bold bg-emerald-700 hover:bg-emerald-800 text-white transition flex items-center gap-1.5 shadow-xs active:scale-95"
                      >
                        <span>Calculate Loan EMI</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Detailed Rule Breakdown Modal */}
      {selectedItemForBreakdown && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs">
          <div className="w-full max-w-lg rounded-2xl bg-white dark:bg-slate-800 p-6 shadow-2xl border border-slate-200 dark:border-slate-700 max-h-[90vh] overflow-y-auto">
            <div className="flex items-start justify-between pb-3 border-b border-slate-100 dark:border-slate-700">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
                  Eligibility Breakdown
                </span>
                <h3 className="font-bold text-base sm:text-lg text-slate-900 dark:text-white mt-0.5">
                  {selectedItemForBreakdown.title}
                </h3>
              </div>
              <button
                onClick={() => setSelectedItemForBreakdown(null)}
                className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-400 hover:text-slate-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="mt-4 space-y-3">
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-700/50 flex items-center justify-between">
                <span className="text-xs font-medium text-slate-600 dark:text-slate-300">
                  Algorithmic Suitability Score:
                </span>
                <span className="text-base font-extrabold text-emerald-600 dark:text-emerald-400">
                  {selectedItemForBreakdown.matchScore}% Match
                </span>
              </div>

              <div className="space-y-2">
                <div className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  Detailed Criteria Evaluation:
                </div>
                {selectedItemForBreakdown.criteriaBreakdown.map((criterion, idx) => (
                  <div
                    key={idx}
                    className="p-3 rounded-xl border border-slate-200 dark:border-slate-700/70 flex items-start gap-2.5 text-xs"
                  >
                    {criterion.matched ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                    ) : (
                      <AlertCircle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                    )}
                    <div>
                      <div className="font-bold text-slate-800 dark:text-slate-200">
                        {criterion.label}
                      </div>
                      <div className="text-slate-600 dark:text-slate-400 mt-0.5 leading-relaxed">
                        {criterion.explanation}
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Required Documents List */}
              <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-700">
                <div className="text-xs font-bold text-slate-700 dark:text-slate-300 mb-2">
                  Document Vault Compliance:
                </div>
                <div className="space-y-1.5">
                  {selectedItemForBreakdown.requiredDocuments.map((doc, idx) => {
                    const isReady = selectedItemForBreakdown.readyDocuments.includes(doc);
                    return (
                      <div
                        key={idx}
                        className="flex items-center justify-between text-xs p-2 rounded-lg bg-slate-50 dark:bg-slate-700/40"
                      >
                        <span className="text-slate-700 dark:text-slate-300 font-medium">
                          {doc.replace(/_/g, ' ')}
                        </span>
                        {isReady ? (
                          <span className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>Verified</span>
                          </span>
                        ) : (
                          <span className="text-[11px] font-bold text-amber-600 dark:text-amber-400 flex items-center gap-1">
                            <AlertCircle className="w-3.5 h-3.5" />
                            <span>Missing</span>
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            <div className="mt-6 pt-3 border-t border-slate-100 dark:border-slate-700 flex items-center justify-end gap-2">
              <button
                onClick={() => setSelectedItemForBreakdown(null)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700"
              >
                Close
              </button>
              {selectedItemForBreakdown.itemType === 'SCHEME' ? (
                <button
                  onClick={() => {
                    const id = selectedItemForBreakdown.schemeId || selectedItemForBreakdown.id;
                    const name = selectedItemForBreakdown.title;
                    setSelectedItemForBreakdown(null);
                    onSelectSchemeToApply(id, name);
                  }}
                  className="px-4 py-2 rounded-xl text-xs font-bold bg-emerald-700 hover:bg-emerald-800 text-white transition"
                >
                  Proceed to Application
                </button>
              ) : (
                <button
                  onClick={() => {
                    setSelectedItemForBreakdown(null);
                    setActiveTab('loans');
                  }}
                  className="px-4 py-2 rounded-xl text-xs font-bold bg-emerald-700 hover:bg-emerald-800 text-white transition"
                >
                  Open Loan Calculator
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
