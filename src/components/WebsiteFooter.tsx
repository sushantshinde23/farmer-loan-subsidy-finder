import React from 'react';
import {
  PhoneCall,
  ExternalLink,
  ShieldCheck,
  Building,
  HeartHandshake,
  HelpCircle,
  Mail,
  CheckCircle2,
  MessageSquare,
  Star
} from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';

interface WebsiteFooterProps {
  onOpenFeedback?: () => void;
}

export const WebsiteFooter: React.FC<WebsiteFooterProps> = ({ onOpenFeedback }) => {
  const { t } = useLanguage();

  return (
    <footer id="official-gov-footer" className="w-full bg-slate-900 text-slate-300 dark:bg-slate-950 border-t border-slate-800 mt-16 transition-colors">
      {/* Tricolor decorative ribbon */}
      <div className="h-1 w-full flex">
        <div className="flex-1 bg-[#FF9933]"></div>
        <div className="flex-1 bg-white"></div>
        <div className="flex-1 bg-[#138808]"></div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-12">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {/* Column 1: Ministry Info */}
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-emerald-900 flex items-center justify-center text-amber-400 font-serif font-bold text-xl ring-1 ring-emerald-500/40">
                ₹
              </div>
              <div>
                <h3 className="font-bold text-white text-sm">
                  {t('portalTitle', 'Farmer Loan & Subsidy Finder')}
                </h3>
                <p className="text-[11px] text-slate-400">
                  Government of India Digital Portal
                </p>
              </div>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">
              {t('footerGovDesc', 'An integrated digital service of the Ministry of Agriculture & Farmers Welfare, Government of India, supporting transparent farmer empowerment, paperless subsidy applications, and direct benefit transfer (DBT).')}
            </p>
            <div className="pt-2 flex items-center gap-2 text-[11px] text-emerald-400">
              <ShieldCheck className="w-4 h-4" />
              <span>DigiLocker & Aadhaar DBT Compliant</span>
            </div>
          </div>

          {/* Column 2: Government Portals */}
          <div>
            <h4 className="font-bold text-white text-xs uppercase tracking-wider mb-3 pb-1 border-b border-slate-800">
              {t('footerQuickLinks', 'Quick Government Links')}
            </h4>
            <ul className="space-y-2 text-xs">
              <li>
                <a
                  href="https://india.gov.in"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-amber-400 flex items-center gap-1.5 transition"
                >
                  <ExternalLink className="w-3 h-3 text-slate-500" />
                  National Portal of India (india.gov.in)
                </a>
              </li>
              <li>
                <a
                  href="https://pmkisan.gov.in"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-amber-400 flex items-center gap-1.5 transition"
                >
                  <ExternalLink className="w-3 h-3 text-slate-500" />
                  PM-KISAN Portal (pmkisan.gov.in)
                </a>
              </li>
              <li>
                <a
                  href="https://agricoop.nic.in"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-amber-400 flex items-center gap-1.5 transition"
                >
                  <ExternalLink className="w-3 h-3 text-slate-500" />
                  Ministry of Agriculture (agricoop.nic.in)
                </a>
              </li>
              <li>
                <a
                  href="https://enam.gov.in"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-amber-400 flex items-center gap-1.5 transition"
                >
                  <ExternalLink className="w-3 h-3 text-slate-500" />
                  e-NAM National Agri Market (enam.gov.in)
                </a>
              </li>
              <li>
                <a
                  href="https://kisansuvidha.gov.in"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-amber-400 flex items-center gap-1.5 transition"
                >
                  <ExternalLink className="w-3 h-3 text-slate-500" />
                  Kisan Suvidha Portal (kisansuvidha.gov.in)
                </a>
              </li>
            </ul>
          </div>

          {/* Column 3: Helplines & Support */}
          <div>
            <h4 className="font-bold text-white text-xs uppercase tracking-wider mb-3 pb-1 border-b border-slate-800">
              {t('footerHelplineTitle', 'Farmer Support & Emergency Desk')}
            </h4>
            <div className="space-y-3 text-xs">
              <div className="p-3 rounded-lg bg-slate-800/80 border border-slate-700">
                <div className="flex items-center gap-2 text-amber-400 font-bold">
                  <PhoneCall className="w-4 h-4" />
                  <span>Kisan Call Centre (KCC)</span>
                </div>
                <p className="text-white font-mono text-sm mt-1 font-semibold">
                  1800-180-1551
                </p>
                <p className="text-[10px] text-slate-400 mt-0.5">
                  Toll-Free, 24 Hours, All 22 Scheduled Indian Languages
                </p>
              </div>

              <div className="p-3 rounded-lg bg-slate-800/80 border border-slate-700">
                <div className="flex items-center gap-2 text-emerald-400 font-bold">
                  <HelpCircle className="w-4 h-4" />
                  <span>PM-KISAN Direct Helpdesk</span>
                </div>
                <p className="text-white font-mono text-sm mt-1 font-semibold">
                  155261 / 011-24300606
                </p>
                <p className="text-[10px] text-slate-400 mt-0.5">
                  For eKYC, installment status & DBT troubleshooting
                </p>
              </div>
            </div>
          </div>

          {/* Column 4: Standards & Disclaimers */}
          <div>
            <h4 className="font-bold text-white text-xs uppercase tracking-wider mb-3 pb-1 border-b border-slate-800">
              National Portal Standards
            </h4>
            <div className="space-y-2 text-xs text-slate-400">
              <div className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <span>Compliant with Guidelines for Indian Government Websites (GIGW 3.0)</span>
              </div>
              <div className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <span>Web Content Accessibility Guidelines (WCAG 2.1 AA)</span>
              </div>
              <div className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <span>Hosted on National Cloud Infrastructure (NIC)</span>
              </div>
              <p className="text-[11px] pt-2 text-slate-500 italic">
                {t('legalDisclaimer', 'Government scheme information sourced from official government portals. This platform assists in discovery and preparation; it is not a sanctioning authority.')}
              </p>
            </div>
          </div>
        </div>

        {/* Bottom Legal Copyright Bar */}
        <div className="mt-10 pt-6 border-t border-slate-800/80 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-400">
          <p>
            {t('footerCopyright', '© 2026 Ministry of Agriculture & Farmers Welfare, Government of India. Designed for National Farmer Empowerment.')}
          </p>
          <div className="flex flex-wrap items-center gap-4 text-[11px]">
            {onOpenFeedback && (
              <button
                onClick={onOpenFeedback}
                className="px-2.5 py-1 rounded-full bg-emerald-800/80 hover:bg-emerald-700 text-emerald-200 hover:text-white flex items-center gap-1.5 transition font-semibold"
              >
                <Star className="w-3 h-3 text-amber-400 fill-amber-400" />
                <span>{t('feedbackTitle', 'Rate Website & Feedback')}</span>
              </button>
            )}
            <span className="hover:text-white cursor-pointer">{t('footerAccessibility', 'Accessibility Statement')}</span>
            <span>•</span>
            <span className="hover:text-white cursor-pointer">{t('footerTerms', 'Terms of Use')}</span>
            <span>•</span>
            <span className="hover:text-white cursor-pointer">{t('footerPrivacy', 'Privacy Policy')}</span>
          </div>
        </div>
      </div>
    </footer>
  );
};
