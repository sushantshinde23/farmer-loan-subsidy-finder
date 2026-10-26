import React, { useState, useEffect } from 'react';
import {
  ArrowRight,
  Sliders
} from 'lucide-react';
import { api } from '../services/api';
import { AgriculturalLoan } from '../types';
import {
  FarmerServiceMapExplorer,
  ServiceCategoryOption
} from '../components/FarmerServiceMapExplorer';

const LOAN_BANK_CATEGORIES: ServiceCategoryOption[] = [
  {
    id: 'ALL_AGRI_BANKS',
    label: 'All Agricultural Bank Branches',
    query: 'Agricultural Bank Branch State Bank of India Bank of Maharashtra PNB Bank of Baroda',
    includedType: 'bank',
    pinColor: '#1d4ed8',
    borderColor: '#1e3a8a',
    glyphColor: '#ffffff',
    badgeClass: 'bg-blue-700 text-white border-blue-700'
  },
  {
    id: 'SBI_KCC',
    label: 'SBI & Nationalized Banks',
    query: 'State Bank of India Punjab National Bank Bank of India Canara Bank branch',
    includedType: 'bank',
    pinColor: '#0284c7',
    borderColor: '#0c4a6e',
    glyphColor: '#ffffff',
    badgeClass: 'bg-sky-700 text-white border-sky-700'
  },
  {
    id: 'COOP_GRAMIN_BANK',
    label: 'District Co-op & Gramin Banks',
    query: 'District Central Cooperative Bank Gramin Bank NABARD PACS agricultural credit society',
    includedType: 'bank',
    pinColor: '#059669',
    borderColor: '#064e3b',
    glyphColor: '#ffffff',
    badgeClass: 'bg-emerald-700 text-white border-emerald-700'
  },
  {
    id: 'CSC_LOAN_DESK',
    label: 'CSC KCC Application Centers',
    query: 'Common Service Centre CSC Digital Seva Kisan Credit Card center',
    pinColor: '#d97706',
    borderColor: '#78350f',
    glyphColor: '#ffffff',
    badgeClass: 'bg-amber-600 text-white border-amber-600'
  }
];

interface LoanFinderProps {
  onApplyForLoan: (loanId: string, loanName: string) => void;
}

export const LoanFinder: React.FC<LoanFinderProps> = ({ onApplyForLoan }) => {
  const [loans, setLoans] = useState<AgriculturalLoan[]>([]);
  const [loading, setLoading] = useState(true);

  // EMI Calculator State
  const [loanAmount, setLoanAmount] = useState<number>(150000);
  const [interestRate, setInterestRate] = useState<number>(4.0); // 4% KCC rate default
  const [tenureYears, setTenureYears] = useState<number>(1);

  useEffect(() => {
    api.getLoans()
      .then(data => setLoans(data))
      .catch(err => console.error('Failed to load loans:', err))
      .finally(() => setLoading(false));
  }, []);

  // Simple annual agricultural loan interest calculation (standard for crop loans with yearly harvest cycle)
  const annualInterestAmount = Math.round(loanAmount * (interestRate / 100));
  const totalRepayment = loanAmount + (annualInterestAmount * tenureYears);

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="border-b border-slate-200 dark:border-slate-800 pb-4">
        <div className="flex items-center gap-2">
          <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white">
            Agricultural Loan & Kisan Credit Card (KCC) Finder
          </h2>
          <span className="px-2 py-0.5 text-[11px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 rounded-md">
            4.00% Subsidized
          </span>
        </div>
        <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
          Compare institutional crop loans, gold loans, and term credits across public and cooperative banks with Government Interest Subvention.
        </p>
      </div>

      {/* Loan Comparison Matrix */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {loans.map((loan) => (
          <div
            key={loan.id}
            className="p-5 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700/80 shadow-xs hover:border-emerald-500/50 hover:shadow-md transition flex flex-col justify-between"
          >
            <div className="space-y-3">
              <div className="flex items-start justify-between gap-2">
                <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300">
                  {loan.bankName}
                </span>
                <span className="text-xs font-bold text-emerald-700 dark:text-emerald-400">
                  {loan.interestRatePercent}% p.a.
                </span>
              </div>

              <div>
                <h3 className="font-bold text-sm sm:text-base text-slate-900 dark:text-white">
                  {loan.loanName}
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  {loan.purpose}
                </p>
              </div>

              <div className="space-y-1.5 text-xs text-slate-600 dark:text-slate-300 pt-1">
                <div className="flex justify-between">
                  <span className="text-slate-400">Max Loan Limit:</span>
                  <span className="font-semibold text-slate-900 dark:text-white">{loan.maxAmount}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Collateral Free:</span>
                  <span className="font-semibold text-slate-900 dark:text-white">{loan.collateralRequirement}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Repayment Period:</span>
                  <span className="font-semibold text-slate-900 dark:text-white">{loan.repaymentPeriod}</span>
                </div>
              </div>

              {loan.subsidyOrSubvention && (
                <div className="p-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200/60 dark:border-emerald-800/40 text-[11px] font-semibold text-emerald-900 dark:text-emerald-200">
                  {loan.subsidyOrSubvention}
                </div>
              )}
            </div>

            <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-700 flex items-center justify-between">
              <button
                onClick={() => {
                  setInterestRate(loan.interestRatePercent || parseFloat(loan.interestRate) || 4);
                  setLoanAmount(150000);
                }}
                className="text-xs font-semibold text-slate-600 dark:text-slate-300 hover:text-emerald-700 transition"
              >
                Calculate Cost
              </button>

              <button
                onClick={() => onApplyForLoan(loan.id, loan.loanName)}
                className="px-3.5 py-1.5 text-xs font-bold rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white transition active:scale-95 flex items-center gap-1 shadow-xs"
              >
                <span>Apply</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Interactive Agricultural Loan Cost Calculator */}
      <div className="p-6 rounded-2xl bg-gradient-to-br from-slate-900 to-slate-950 text-white shadow-xl border border-slate-800 space-y-4">
        <div className="flex items-center gap-2">
          <Sliders className="w-5 h-5 text-amber-400" />
          <h3 className="font-bold text-base text-white">
            KCC Subsidized Crop Loan Repayment Calculator
          </h3>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 pt-2">
          {/* Slider 1: Loan Amount */}
          <div className="space-y-2">
            <div className="flex justify-between text-xs font-semibold">
              <span className="text-slate-300">Sanction Amount:</span>
              <span className="font-mono text-amber-300 text-sm">₹{loanAmount.toLocaleString()}</span>
            </div>
            <input
              type="range"
              min="25000"
              max="500000"
              step="5000"
              value={loanAmount}
              onChange={(e) => setLoanAmount(parseInt(e.target.value))}
              className="w-full accent-emerald-500"
            />
            <div className="flex justify-between text-[10px] text-slate-400 font-mono">
              <span>₹25k</span>
              <span>₹1.6L (Collateral Free)</span>
              <span>₹5L</span>
            </div>
          </div>

          {/* Slider 2: Interest Rate */}
          <div className="space-y-2">
            <div className="flex justify-between text-xs font-semibold">
              <span className="text-slate-300">Effective Interest Rate:</span>
              <span className="font-mono text-emerald-400 text-sm">{interestRate.toFixed(2)}% p.a.</span>
            </div>
            <input
              type="range"
              min="3"
              max="12"
              step="0.25"
              value={interestRate}
              onChange={(e) => setInterestRate(parseFloat(e.target.value))}
              className="w-full accent-emerald-500"
            />
            <div className="flex justify-between text-[10px] text-slate-400 font-mono">
              <span>4.0% (KCC Prompt)</span>
              <span>7.0% (Base)</span>
              <span>12.0%</span>
            </div>
          </div>

          {/* Output Card */}
          <div className="p-4 rounded-xl bg-slate-800/80 border border-slate-700 flex flex-col justify-between">
            <div>
              <div className="text-[11px] text-slate-400 font-semibold uppercase tracking-wider">
                Total Annual Interest Payable
              </div>
              <div className="text-2xl font-black text-amber-300 font-mono mt-0.5">
                ₹{annualInterestAmount.toLocaleString()} / year
              </div>
              <p className="text-[11px] text-slate-300 mt-1">
                Total Repayment with Principal: <strong className="text-white">₹{totalRepayment.toLocaleString()}</strong>
              </p>
            </div>
            <div className="text-[10px] text-emerald-300 pt-2 border-t border-slate-700/60 mt-2">
              ✓ Save ~₹4,500/year compared to commercial loans thanks to GoI Interest Subvention.
            </div>
          </div>
        </div>
      </div>

      {/* Map-Based Nearby Bank Branches Locator */}
      <FarmerServiceMapExplorer
        title="Nearby Participating Agricultural Bank Branches & KCC Desks"
        subtitle="Locate your nearest SBI, Nationalized, District Co-operative, or Gramin Bank branch to complete KCC land record (7/12) verification or submit loan documents."
        categories={LOAN_BANK_CATEGORIES}
        defaultCategoryId="ALL_AGRI_BANKS"
        compact
      />
    </div>
  );
};
