import React, { useState } from 'react';
import {
  SunMedium,
  Droplets,
  Tractor,
  Warehouse,
  Milk,
  Calculator,
  ArrowRight,
  CheckCircle2
} from 'lucide-react';
import {
  FarmerServiceMapExplorer,
  ServiceCategoryOption
} from '../components/FarmerServiceMapExplorer';

const SUBSIDY_SERVICE_CATEGORIES: ServiceCategoryOption[] = [
  {
    id: 'AGRI_GOVT_OFFICE',
    label: 'Agriculture & Horticulture Offices',
    query: 'District Agriculture Office Taluka Krishi Adhikari Horticulture Office Krishi Bhavan',
    includedType: 'local_government_office',
    pinColor: '#15803d',
    borderColor: '#14532d',
    glyphColor: '#ffffff',
    badgeClass: 'bg-green-700 text-white border-green-700'
  },
  {
    id: 'CSC_SEVA_KENDRA',
    label: 'CSC & Maha e-Seva Centres',
    query: 'Common Service Centre CSC Digital Seva Kendra Jan Seva Kendra',
    pinColor: '#059669',
    borderColor: '#064e3b',
    glyphColor: '#ffffff',
    badgeClass: 'bg-emerald-700 text-white border-emerald-700'
  },
  {
    id: 'KVK_SOIL_LAB',
    label: 'Krishi Vigyan Kendra (KVK)',
    query: 'Krishi Vigyan Kendra KVK Soil Testing Lab Agricultural Extension Center',
    pinColor: '#4f46e5',
    borderColor: '#312e81',
    glyphColor: '#ffffff',
    badgeClass: 'bg-indigo-700 text-white border-indigo-700'
  },
  {
    id: 'AUTHORIZED_AGRO_DEALER',
    label: 'Authorized Pump / Drip / Tractor Dealers',
    query: 'Krishi Seva Kendra Solar Water Pump Drip Irrigation Tractor Authorized Dealer',
    pinColor: '#d97706',
    borderColor: '#78350f',
    glyphColor: '#ffffff',
    badgeClass: 'bg-amber-600 text-white border-amber-600'
  },
  {
    id: 'VETERINARY_DAIRY',
    label: 'Dairy & Livestock Offices',
    query: 'Animal Husbandry Office Government Veterinary Hospital Dairy Cooperative Society',
    pinColor: '#0284c7',
    borderColor: '#0c4a6e',
    glyphColor: '#ffffff',
    badgeClass: 'bg-sky-700 text-white border-sky-700'
  }
];

interface SubsidyFinderProps {
  onApplyForScheme: (schemeId: string, schemeName: string) => void;
}

export const SubsidyFinder: React.FC<SubsidyFinderProps> = ({ onApplyForScheme }) => {
  // Calculator states
  const [selectedCategory, setSelectedCategory] = useState<'solar' | 'irrigation' | 'tractor' | 'polyhouse' | 'dairy'>('solar');
  const [solarHp, setSolarHp] = useState<number>(5);
  const [irrigationAcres, setIrrigationAcres] = useState<number>(3);
  const [equipmentCost, setEquipmentCost] = useState<number>(650000);
  const [farmerCategory, setFarmerCategory] = useState<'SMALL' | 'GENERAL'>('SMALL');

  // Subsidy calculations
  // Solar: ~₹55,000 per HP benchmark. 60% Govt subsidy (30% central + 30% state). Farmer pays 40%.
  const solarBenchmark = solarHp * 55000;
  const solarSubsidyAmount = Math.round(solarBenchmark * 0.60);
  const solarFarmerShare = solarBenchmark - solarSubsidyAmount;

  // Drip Irrigation: Benchmark ~₹45,000 per acre for sugarcane/row crops. Small farmer gets 55%, General gets 45%.
  const dripBenchmark = irrigationAcres * 45000;
  const dripSubsidyRate = farmerCategory === 'SMALL' ? 0.55 : 0.45;
  const dripSubsidyAmount = Math.round(dripBenchmark * dripSubsidyRate);
  const dripFarmerShare = dripBenchmark - dripSubsidyAmount;

  // Tractor: 50% for small/women (max ₹1,25,000 subsidy cap) or 40% (max ₹1,00,000).
  const tractorSubsidyAmount = farmerCategory === 'SMALL' ? Math.min(125000, equipmentCost * 0.5) : Math.min(100000, equipmentCost * 0.4);
  const tractorFarmerShare = equipmentCost - tractorSubsidyAmount;

  // Polyhouse: Benchmark ₹935 per sq. meter. 50% subsidy under MIDH.
  const polyhouseCost = 1000 * 935; // 1,000 sq. meter standard unit
  const polyhouseSubsidy = Math.round(polyhouseCost * 0.50);

  // Dairy: 50% capital subsidy under NLM up to ₹50 Lakh.
  const dairyUnitCost = 800000; // 10 cow modern dairy shed
  const dairySubsidy = Math.round(dairyUnitCost * 0.50);

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="border-b border-slate-200 dark:border-slate-800 pb-4">
        <div className="flex items-center gap-2">
          <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white">
            Agricultural Subsidy Finder & Grant Calculator
          </h2>
          <span className="px-2 py-0.5 text-[11px] font-bold bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 rounded-md">
            Direct Grant
          </span>
        </div>
        <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
          Calculate official government grants, Central & State contributions, and farmer net investment for farm modernization.
        </p>
      </div>

      {/* Category Tabs */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
        {[
          { id: 'solar', label: 'Solar Water Pump', sub: '60% Subsidy', icon: SunMedium },
          { id: 'irrigation', label: 'Drip & Sprinkler', sub: '45-55% Subsidy', icon: Droplets },
          { id: 'tractor', label: 'Farm Machinery', sub: '40-50% Subsidy', icon: Tractor },
          { id: 'polyhouse', label: 'Greenhouse/Polyhouse', sub: '50% Subsidy', icon: Warehouse },
          { id: 'dairy', label: 'Dairy & Livestock', sub: '50% Subsidy', icon: Milk }
        ].map((item) => {
          const Icon = item.icon;
          const isSelected = selectedCategory === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setSelectedCategory(item.id as any)}
              className={`p-3 rounded-xl border text-left transition flex flex-col justify-between ${
                isSelected
                  ? 'bg-emerald-700 text-white border-emerald-700 shadow-sm'
                  : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:border-emerald-500/50'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <Icon className={`w-5 h-5 ${isSelected ? 'text-amber-300' : 'text-emerald-600'}`} />
                <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                  isSelected ? 'bg-emerald-800 text-emerald-100' : 'bg-emerald-50 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                }`}>
                  {item.sub}
                </span>
              </div>
              <div>
                <div className="font-bold text-xs leading-snug">{item.label}</div>
              </div>
            </button>
          );
        })}
      </div>

      {/* Interactive Calculator Section */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Inputs */}
        <div className="lg:col-span-6 p-5 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-xs space-y-4">
          <h3 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
            <Calculator className="w-4 h-4 text-emerald-600" />
            <span>Customize Equipment Specifications</span>
          </h3>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Farmer Category
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setFarmerCategory('SMALL')}
                className={`py-2 px-3 rounded-lg text-xs font-semibold border transition ${
                  farmerCategory === 'SMALL'
                    ? 'bg-emerald-50 border-emerald-600 text-emerald-900 dark:bg-emerald-950 dark:text-emerald-300'
                    : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300'
                }`}
              >
                Small / Marginal (&lt; 2 Hectares)
              </button>
              <button
                type="button"
                onClick={() => setFarmerCategory('GENERAL')}
                className={`py-2 px-3 rounded-lg text-xs font-semibold border transition ${
                  farmerCategory === 'GENERAL'
                    ? 'bg-emerald-50 border-emerald-600 text-emerald-900 dark:bg-emerald-950 dark:text-emerald-300'
                    : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300'
                }`}
              >
                Other / Large (&gt; 2 Hectares)
              </button>
            </div>
          </div>

          {selectedCategory === 'solar' && (
            <div className="space-y-3">
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                Solar Pump Capacity (Horse Power): <strong className="text-emerald-700 dark:text-emerald-400">{solarHp} HP</strong>
              </label>
              <div className="grid grid-cols-3 gap-2">
                {[3, 5, 7.5].map((hp) => (
                  <button
                    key={hp}
                    onClick={() => setSolarHp(hp)}
                    className={`py-2 text-xs font-bold rounded-lg border transition ${
                      solarHp === hp
                        ? 'bg-emerald-700 text-white border-emerald-700'
                        : 'border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200'
                    }`}
                  >
                    {hp} HP Pump
                  </button>
                ))}
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                3 HP suitable for up to 3 acres; 5 HP for 3-6 acres; 7.5 HP for deep borewells (&gt;250 ft).
              </p>
            </div>
          )}

          {selectedCategory === 'irrigation' && (
            <div className="space-y-3">
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                Land to be covered with Micro-Irrigation: <strong className="text-emerald-700 dark:text-emerald-400">{irrigationAcres} Acres</strong>
              </label>
              <input
                type="range"
                min="0.5"
                max="10"
                step="0.5"
                value={irrigationAcres}
                onChange={(e) => setIrrigationAcres(parseFloat(e.target.value))}
                className="w-full accent-emerald-600"
              />
              <div className="flex justify-between text-[11px] text-slate-400 font-mono">
                <span>0.5 Acre</span>
                <span>5 Acres</span>
                <span>10 Acres</span>
              </div>
            </div>
          )}

          {selectedCategory === 'tractor' && (
            <div className="space-y-3">
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                Estimated Tractor / Implement Cost: <strong className="text-emerald-700 dark:text-emerald-400">₹{equipmentCost.toLocaleString()}</strong>
              </label>
              <input
                type="range"
                min="200000"
                max="1000000"
                step="25000"
                value={equipmentCost}
                onChange={(e) => setEquipmentCost(parseInt(e.target.value))}
                className="w-full accent-emerald-600"
              />
              <div className="flex justify-between text-[11px] text-slate-400 font-mono">
                <span>₹2,00,000</span>
                <span>₹6,00,000</span>
                <span>₹10,00,000</span>
              </div>
            </div>
          )}

          {selectedCategory === 'polyhouse' && (
            <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800 text-xs text-slate-600 dark:text-slate-300">
              <div className="font-bold text-slate-900 dark:text-white mb-1">Standard Naturally Ventilated Polyhouse:</div>
              Unit Size: 1,000 sq. meters. GoI Benchmark cost: ₹935 / sq. meter. 50% subsidy under MIDH.
            </div>
          )}

          {selectedCategory === 'dairy' && (
            <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800 text-xs text-slate-600 dark:text-slate-300">
              <div className="font-bold text-slate-900 dark:text-white mb-1">Modern Dairy & Cattle Shed Setup:</div>
              Unit Size: 10 crossbred dairy cows with automated milking & silage unit. 50% capital subsidy under NLM.
            </div>
          )}
        </div>

        {/* Right Financial Breakdown */}
        <div className="lg:col-span-6 p-5 rounded-2xl bg-gradient-to-br from-emerald-900 via-emerald-950 to-slate-950 text-white shadow-lg space-y-4 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-emerald-800/80">
              <div>
                <span className="text-[10px] font-bold tracking-wider uppercase text-emerald-300">
                  Government Sanction Estimate
                </span>
                <h4 className="text-base sm:text-lg font-bold text-white">
                  {selectedCategory === 'solar' ? `PM-KUSUM ${solarHp} HP Solar Pump` :
                   selectedCategory === 'irrigation' ? `PDMC ${irrigationAcres} Acres Drip System` :
                   selectedCategory === 'tractor' ? 'SMAM Tractor / Implement Subsidy' :
                   selectedCategory === 'polyhouse' ? 'MIDH 1,000 sqm Polyhouse Subsidy' :
                   'NLM Dairy Infrastructure Subsidy'}
                </h4>
              </div>
              <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-amber-400 text-slate-950">
                Official Grant
              </span>
            </div>

            {/* Price Table Breakdown */}
            <div className="mt-4 space-y-2.5 text-xs">
              <div className="flex justify-between text-emerald-200">
                <span>Total Benchmark Project Cost:</span>
                <span className="font-mono font-bold text-white">
                  ₹{(
                    selectedCategory === 'solar' ? solarBenchmark :
                    selectedCategory === 'irrigation' ? dripBenchmark :
                    selectedCategory === 'tractor' ? equipmentCost :
                    selectedCategory === 'polyhouse' ? polyhouseCost : dairyUnitCost
                  ).toLocaleString()}
                </span>
              </div>

              <div className="flex justify-between text-emerald-300 font-semibold p-2.5 rounded-xl bg-emerald-800/50 border border-emerald-600/40">
                <span className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-amber-300" />
                  Government Non-Repayable Subsidy:
                </span>
                <span className="font-mono font-bold text-amber-300 text-sm">
                  + ₹{(
                    selectedCategory === 'solar' ? solarSubsidyAmount :
                    selectedCategory === 'irrigation' ? dripSubsidyAmount :
                    selectedCategory === 'tractor' ? tractorSubsidyAmount :
                    selectedCategory === 'polyhouse' ? polyhouseSubsidy : dairySubsidy
                  ).toLocaleString()}
                </span>
              </div>

              <div className="flex justify-between text-emerald-200 pt-1">
                <span>Farmer Contribution (Net Share):</span>
                <span className="font-mono font-bold text-white">
                  ₹{(
                    selectedCategory === 'solar' ? solarFarmerShare :
                    selectedCategory === 'irrigation' ? dripFarmerShare :
                    selectedCategory === 'tractor' ? tractorFarmerShare :
                    selectedCategory === 'polyhouse' ? (polyhouseCost - polyhouseSubsidy) : (dairyUnitCost - dairySubsidy)
                  ).toLocaleString()}
                </span>
              </div>

              <div className="text-[11px] text-emerald-200/70 pt-2 border-t border-emerald-800/60 leading-relaxed">
                *Farmer share can be financed via bank agricultural loan (e.g. SBI/PNB) at subsidized 4% to 7% interest rates.
              </div>
            </div>
          </div>

          <button
            onClick={() => {
              const schemeMap: Record<string, { id: string; name: string }> = {
                solar: { id: 'SCHEME-KUSUM-B', name: 'PM-KUSUM Component B: Standalone Solar Agriculture Pumps' },
                irrigation: { id: 'SCHEME-PDMC', name: 'Per Drop More Crop (PDMC) - Micro Irrigation Subsidy' },
                tractor: { id: 'SCHEME-SMAM', name: 'Sub-Mission on Agricultural Mechanization (SMAM)' },
                polyhouse: { id: 'SCHEME-MIDH-HORTI', name: 'Mission for Integrated Development of Horticulture (MIDH)' },
                dairy: { id: 'SCHEME-NLM-DAIRY', name: 'National Livestock Mission (NLM) & Animal Husbandry' }
              };
              const target = schemeMap[selectedCategory];
              onApplyForScheme(target.id, target.name);
            }}
            className="w-full py-3 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 text-xs sm:text-sm font-bold shadow-md transition-all active:scale-[0.98] flex items-center justify-center gap-2"
          >
            <span>Apply for This Subsidy Online</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Map-Based Relevant Government & Subsidy Service Centres */}
      <FarmerServiceMapExplorer
        title="Nearby Government Agriculture Offices, CSCs & Empaneled Dealers"
        subtitle="Find your nearest Taluka Krishi Adhikari office, Common Service Centre (CSC), KVK, or authorized equipment vendor for physical verification and subsidy inspection."
        categories={SUBSIDY_SERVICE_CATEGORIES}
        defaultCategoryId="AGRI_GOVT_OFFICE"
        compact
      />
    </div>
  );
};
