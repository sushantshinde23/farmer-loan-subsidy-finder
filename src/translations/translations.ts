import { SupportedLanguage } from '../types';
import { en } from './en';
import { hi } from './hi';
import { mr } from './mr';
import { bn } from './bn';
import { gu } from './gu';
import { ta } from './ta';
import { te } from './te';
import { kn } from './kn';
import { ml } from './ml';
import { pa } from './pa';
import { as } from './as';
import { or } from './or';
import { ur } from './ur';

export interface LanguageMeta {
  code: SupportedLanguage;
  name: string;
  nativeName: string;
}

export const SUPPORTED_LANGUAGES: LanguageMeta[] = [
  { code: 'en', name: 'English', nativeName: 'English' },
  { code: 'hi', name: 'Hindi', nativeName: 'हिन्दी' },
  { code: 'mr', name: 'Marathi', nativeName: 'मराठी' },
  { code: 'bn', name: 'Bengali', nativeName: 'বাংলা' },
  { code: 'gu', name: 'Gujarati', nativeName: 'ગુજરાતી' },
  { code: 'ta', name: 'Tamil', nativeName: 'தமிழ்' },
  { code: 'te', name: 'Telugu', nativeName: 'తెలుగు' },
  { code: 'kn', name: 'Kannada', nativeName: 'ಕನ್ನಡ' },
  { code: 'ml', name: 'Malayalam', nativeName: 'മലയാളം' },
  { code: 'pa', name: 'Punjabi', nativeName: 'ਪੰਜਾਬੀ' },
  { code: 'as', name: 'Assamese', nativeName: 'অসমীয়া' },
  { code: 'or', name: 'Odia', nativeName: 'ଓଡ଼ିଆ' },
  { code: 'ur', name: 'Urdu', nativeName: 'اردو' }
];

export const translations: Record<SupportedLanguage, Record<string, string>> = {
  en,
  hi,
  mr,
  bn,
  gu,
  ta,
  te,
  kn,
  ml,
  pa,
  as,
  or,
  ur
};
