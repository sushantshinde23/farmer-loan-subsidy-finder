import React from 'react';
import { Home, Calculator, Coins, FolderOpen, Bot, FileCheck2 } from 'lucide-react';
import { ActiveTab } from './Sidebar';

interface MobileNavProps {
  activeTab: ActiveTab;
  setActiveTab: (tab: ActiveTab) => void;
  onOpenAI: () => void;
}

export const MobileNav: React.FC<MobileNavProps> = ({ activeTab, setActiveTab, onOpenAI }) => {
  return (
    <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-[#fbfbf9]/95 dark:bg-slate-900/95 backdrop-blur-md border-t border-slate-200 dark:border-slate-800 px-2 py-1 shadow-lg">
      <div className="flex items-center justify-around">
        <button
          onClick={() => setActiveTab('home')}
          className={`flex flex-col items-center justify-center min-w-[56px] min-h-[48px] py-1 text-[10px] font-medium transition ${
            activeTab === 'home'
              ? 'text-emerald-700 dark:text-emerald-400 font-bold'
              : 'text-slate-500 dark:text-slate-400 hover:text-slate-800'
          }`}
        >
          <Home className="w-5 h-5 mb-0.5" />
          <span>Home</span>
        </button>

        <button
          onClick={() => setActiveTab('eligibility')}
          className={`flex flex-col items-center justify-center min-w-[56px] min-h-[48px] py-1 text-[10px] font-medium transition ${
            activeTab === 'eligibility'
              ? 'text-emerald-700 dark:text-emerald-400 font-bold'
              : 'text-slate-500 dark:text-slate-400 hover:text-slate-800'
          }`}
        >
          <Calculator className="w-5 h-5 mb-0.5" />
          <span>Eligibility</span>
        </button>

        {/* Central Floating AI Button */}
        <button
          onClick={onOpenAI}
          className="flex flex-col items-center justify-center -mt-4 p-2 rounded-full bg-emerald-700 text-white shadow-lg shadow-emerald-900/40 ring-4 ring-[#fbfbf9] dark:ring-slate-900 active:scale-95 transition"
          title="Krishi Sahayak AI"
        >
          <Bot className="w-6 h-6 text-amber-300" />
        </button>

        <button
          onClick={() => setActiveTab('vault')}
          className={`flex flex-col items-center justify-center min-w-[56px] min-h-[48px] py-1 text-[10px] font-medium transition ${
            activeTab === 'vault'
              ? 'text-emerald-700 dark:text-emerald-400 font-bold'
              : 'text-slate-500 dark:text-slate-400 hover:text-slate-800'
          }`}
        >
          <FolderOpen className="w-5 h-5 mb-0.5" />
          <span>Vault</span>
        </button>

        <button
          onClick={() => setActiveTab('applications')}
          className={`flex flex-col items-center justify-center min-w-[56px] min-h-[48px] py-1 text-[10px] font-medium transition ${
            activeTab === 'applications'
              ? 'text-emerald-700 dark:text-emerald-400 font-bold'
              : 'text-slate-500 dark:text-slate-400 hover:text-slate-800'
          }`}
        >
          <FileCheck2 className="w-5 h-5 mb-0.5" />
          <span>Applications</span>
        </button>
      </div>
    </nav>
  );
};
