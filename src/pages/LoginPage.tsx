import React, { useState, useEffect } from 'react';
import {
  Lock,
  Mail,
  Phone,
  User,
  MapPin,
  Eye,
  EyeOff,
  ArrowRight,
  ShieldCheck,
  Tractor,
  Building2,
  Laptop,
  UserCheck,
  ArrowLeft,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Save,
  Check,
  Info
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { UserRole } from '../types';
import { ActiveTab } from '../components/Sidebar';

interface LoginPageProps {
  onLoginSuccess: (role: UserRole) => void;
  onBackToHome: () => void;
  onNavigateTab?: (tab: ActiveTab) => void;
}

const SAVED_LOGIN_STORAGE_KEY = 'krishi_saved_login_info';

export const LoginPage: React.FC<LoginPageProps> = ({
  onLoginSuccess,
  onBackToHome,
  onNavigateTab
}) => {
  const { login, loginWithGoogle } = useAuth();
  const { t } = useLanguage();

  // 1. Role Selection
  const [selectedRole, setSelectedRole] = useState<UserRole>('FARMER');

  // 2. Verified User Information Fields
  const [fullName, setFullName] = useState('Sushant Shinde');
  const [email, setEmail] = useState('sushantshinde5598@gmail.com');
  const [password, setPassword] = useState('');
  const [mobile, setMobile] = useState('9822014589');
  const [state, setState] = useState('Maharashtra');
  const [district, setDistrict] = useState('Pune');
  const [village, setVillage] = useState('Baramati');

  // 3. UI states
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successToast, setSuccessToast] = useState<string | null>(null);
  const [savedRestored, setSavedRestored] = useState(false);

  // Restore saved login information from previous real-time logins
  useEffect(() => {
    try {
      const saved = localStorage.getItem(SAVED_LOGIN_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.email) setEmail(parsed.email);
        if (parsed.mobile) setMobile(parsed.mobile.replace(/\D/g, '').slice(-10));
        if (parsed.fullName) setFullName(parsed.fullName);
        if (parsed.role) setSelectedRole(parsed.role as UserRole);
        if (parsed.state) setState(parsed.state);
        if (parsed.district) setDistrict(parsed.district);
        if (parsed.village) setVillage(parsed.village);
        setSavedRestored(true);
      }
    } catch {
      // ignore
    }
  }, []);

  const handleClearSavedInfo = () => {
    localStorage.removeItem(SAVED_LOGIN_STORAGE_KEY);
    setSavedRestored(false);
    setEmail('');
    setMobile('');
    setPassword('');
    setFullName('');
  };

  // Role details configuration
  const roleOptions: {
    id: UserRole;
    title: string;
    subTitle: string;
    description: string;
    icon: React.ComponentType<{ className?: string }>;
    accent: string;
    badge: string;
  }[] = [
    {
      id: 'FARMER',
      title: 'Farmer / Beneficiary',
      subTitle: 'किसान / लाभार्थी',
      description: 'Access PM-KISAN DBT, solar pump subsidies, crop loans, and DigiLocker documents.',
      icon: Tractor,
      accent: 'emerald',
      badge: 'Citizen Portal'
    },
    {
      id: 'BANK_OFFICER',
      title: 'Bank Officer (SBI / NABARD)',
      subTitle: 'बैंक अधिकारी',
      description: 'Evaluate Kisan Credit Card (KCC) loans, verify land revenue records, and clear credit sanctions.',
      icon: Building2,
      accent: 'blue',
      badge: 'Credit Officer'
    },
    {
      id: 'AGRICULTURE_OFFICER',
      title: 'Agriculture Officer',
      subTitle: 'कृषि अधिकारी',
      description: 'District / Taluka physical verification, SMAM machinery inspection, and subsidy disbursement approval.',
      icon: ShieldCheck,
      accent: 'amber',
      badge: 'State Govt'
    },
    {
      id: 'CSC_OPERATOR',
      title: 'CSC Operator / VLE',
      subTitle: 'जन सेवा केंद्र (VLE)',
      description: 'Assisted farmer registration, biometric Aadhaar eKYC, scanning, and fast application filing.',
      icon: Laptop,
      accent: 'purple',
      badge: 'CSC Kiosk'
    },
    {
      id: 'SYSTEM_ADMIN',
      title: 'System Administrator',
      subTitle: 'प्रशासनिक सेल',
      description: 'National agriculture registry administration, DBT quota oversight, and audit logs.',
      icon: UserCheck,
      accent: 'slate',
      badge: 'NIC Admin'
    }
  ];

  // Save verified login information locally for real-time persistence
  const persistLoginData = (data: {
    email: string;
    mobile: string;
    fullName: string;
    role: UserRole;
    state: string;
    district: string;
    village: string;
  }) => {
    if (rememberMe) {
      try {
        localStorage.setItem(
          SAVED_LOGIN_STORAGE_KEY,
          JSON.stringify({
            ...data,
            savedAt: new Date().toISOString()
          })
        );
      } catch (err) {
        console.error('Failed to save login data locally:', err);
      }
    }
  };

  // Submit Verified Login
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    const cleanEmail = email.trim();
    const cleanMobile = mobile.trim();
    const cleanName = fullName.trim();

    if (!cleanEmail) {
      setErrorMessage('Please enter your Gmail / Official Email address.');
      return;
    }

    if (!password) {
      setErrorMessage('Please enter your account password.');
      return;
    }

    if (!cleanMobile) {
      setErrorMessage('Please enter your 10-digit mobile number.');
      return;
    }

    const digitsOnly = cleanMobile.replace(/\D/g, '');
    if (digitsOnly.length < 10) {
      setErrorMessage('Please enter a valid 10-digit mobile number (e.g. 98220 14589).');
      return;
    }

    setIsLoading(true);
    try {
      const formattedMobile = cleanMobile.startsWith('+91')
        ? cleanMobile
        : `+91 ${digitsOnly.slice(-10)}`;

      // Call backend API with all verified real-time information
      const loggedUser = await login(
        cleanEmail,
        password,
        formattedMobile,
        selectedRole,
        cleanName || undefined,
        state,
        district,
        village
      );

      // Save verified login information persistently
      persistLoginData({
        email: cleanEmail,
        mobile: formattedMobile,
        fullName: cleanName || loggedUser.fullName,
        role: selectedRole,
        state,
        district,
        village
      });

      const roleObj = roleOptions.find((r) => r.id === selectedRole);
      setSuccessToast(
        `Verified authentication successful as ${roleObj?.title || selectedRole}! Opening your dashboard...`
      );

      setTimeout(() => {
        onLoginSuccess(selectedRole);
      }, 500);
    } catch (err: any) {
      console.error('Login error:', err);
      setErrorMessage(err.message || 'Login failed. Please verify your credentials and try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // Continue with Google as Selected Role
  const handleContinueWithGoogle = async () => {
    setErrorMessage(null);
    setGoogleLoading(true);

    try {
      const targetGmail = email.trim().toLowerCase().includes('gmail.com')
        ? email.trim()
        : 'sushantshinde5598@gmail.com';

      const targetName = fullName.trim() || 'Sushant Shinde';
      const cleanMobile = mobile.replace(/\D/g, '') || '9822014589';
      const formattedMobile = `+91 ${cleanMobile.slice(-10)}`;

      // Authenticate with Google for the chosen role
      const loggedUser = await loginWithGoogle(
        targetGmail,
        targetName,
        selectedRole,
        formattedMobile
      );

      // Save verified login information
      persistLoginData({
        email: targetGmail,
        mobile: formattedMobile,
        fullName: targetName,
        role: selectedRole,
        state,
        district,
        village
      });

      const roleObj = roleOptions.find((r) => r.id === selectedRole);
      setSuccessToast(
        `Authenticated via Google as ${roleObj?.title || selectedRole}! Opening your dashboard...`
      );

      setTimeout(() => {
        onLoginSuccess(selectedRole);
      }, 500);
    } catch (err: any) {
      console.error('Google Sign-In error:', err);
      setErrorMessage('Google authentication failed. Please enter your credentials manually.');
    } finally {
      setGoogleLoading(false);
    }
  };

  const currentRole = roleOptions.find((r) => r.id === selectedRole) || roleOptions[0];

  return (
    <div className="max-w-3xl mx-auto py-4 sm:py-8 space-y-6">
      {/* Top Breadcrumb & Return to Portal Home */}
      <div className="flex items-center justify-between">
        <button
          onClick={onBackToHome}
          className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-600 dark:text-slate-400 hover:text-emerald-700 dark:hover:text-emerald-400 transition"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to National Portal Home</span>
        </button>

        {savedRestored && (
          <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-300 dark:border-emerald-800 text-[11px] font-semibold text-emerald-800 dark:text-emerald-300">
            <Save className="w-3.5 h-3.5" />
            <span>Saved Login Information Restored</span>
            <button
              onClick={handleClearSavedInfo}
              className="text-slate-400 hover:text-rose-600 ml-1 underline text-[10px]"
            >
              Clear
            </button>
          </div>
        )}
      </div>

      {/* Main Container Card */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xl overflow-hidden">
        {/* Tricolor Government Stripe */}
        <div className="h-1.5 flex">
          <div className="flex-1 bg-amber-500" />
          <div className="flex-1 bg-white" />
          <div className="flex-1 bg-emerald-600" />
        </div>

        <div className="p-6 sm:p-10 space-y-8">
          {/* Header Banner */}
          <div className="text-center space-y-2 max-w-xl mx-auto">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 text-xs font-bold">
              <ShieldCheck className="w-4 h-4" />
              <span>{t('singleSignOnBadge', 'National Single Sign-On • Aadhaar & PFMS Linkage')}</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
              {t('loginTitle', 'Real-Time Portal Login')}
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
              {t('loginSubtitle', 'Select your official role below, enter your verified credentials, and securely access your designated dashboard.')}
            </p>
          </div>

          {/* Feedback Messages */}
          {successToast && (
            <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/80 border border-emerald-300 dark:border-emerald-700 flex items-center gap-3 text-emerald-900 dark:text-emerald-200 text-xs sm:text-sm font-bold animate-in fade-in shadow-xs">
              <CheckCircle2 className="w-5 h-5 shrink-0 text-emerald-600" />
              <span>{successToast}</span>
            </div>
          )}

          {errorMessage && (
            <div className="p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/80 border border-rose-300 dark:border-rose-700 flex items-center gap-3 text-rose-900 dark:text-rose-200 text-xs sm:text-sm font-semibold animate-in fade-in shadow-xs">
              <AlertCircle className="w-5 h-5 shrink-0 text-rose-600" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* STEP 1: Interactive Role Selection */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <label className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <span className="flex items-center justify-center w-5 h-5 rounded-full bg-emerald-700 text-white text-xs font-black">
                    1
                  </span>
                  <span>Select Your Portal Role (अपनी भूमिका चुनें)</span>
                  <span className="text-rose-500">*</span>
                </label>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 ml-7">
                  You will be logged in with verified privileges according to this role.
                </p>
              </div>
              <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                Selected: <strong>{currentRole.title}</strong>
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 pt-1">
              {roleOptions.map((role) => {
                const Icon = role.icon;
                const isSelected = selectedRole === role.id;

                return (
                  <button
                    key={role.id}
                    type="button"
                    onClick={() => {
                      setSelectedRole(role.id);
                      setErrorMessage(null);
                    }}
                    className={`p-3.5 rounded-2xl border text-left transition flex flex-col justify-between relative group ${
                      isSelected
                        ? 'border-emerald-600 bg-emerald-50/60 dark:bg-emerald-950/40 ring-2 ring-emerald-500/30 shadow-xs'
                        : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-850 hover:border-slate-300 dark:hover:border-slate-700 hover:bg-slate-50/50'
                    }`}
                  >
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <div
                          className={`w-8 h-8 rounded-xl flex items-center justify-center ${
                            isSelected
                              ? 'bg-emerald-700 text-white shadow-xs'
                              : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
                          }`}
                        >
                          <Icon className="w-4 h-4" />
                        </div>
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                            isSelected
                              ? 'bg-emerald-200 text-emerald-900 dark:bg-emerald-900 dark:text-emerald-100'
                              : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400'
                          }`}
                        >
                          {role.badge}
                        </span>
                      </div>

                      <div>
                        <h3 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white">
                          {role.title}
                        </h3>
                        <p className="text-[11px] text-emerald-700 dark:text-emerald-400 font-medium">
                          {role.subTitle}
                        </p>
                      </div>

                      <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-snug line-clamp-2">
                        {role.description}
                      </p>
                    </div>

                    <div className="mt-3 pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-[11px]">
                      <span className={`font-semibold ${isSelected ? 'text-emerald-700 dark:text-emerald-300' : 'text-slate-400'}`}>
                        {isSelected ? 'Role Active' : 'Click to select'}
                      </span>
                      {isSelected && (
                        <div className="w-4 h-4 rounded-full bg-emerald-600 text-white flex items-center justify-center">
                          <Check className="w-3 h-3 stroke-[3]" />
                        </div>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* STEP 2: Authenticate with Selected Role */}
          <div className="space-y-4 pt-2 border-t border-slate-100 dark:border-slate-800">
            <div className="flex items-center justify-between">
              <label className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <span className="flex items-center justify-center w-5 h-5 rounded-full bg-emerald-700 text-white text-xs font-black">
                  2
                </span>
                <span>Enter Verified Information for {currentRole.title}</span>
              </label>
              <span className="text-[11px] text-emerald-700 dark:text-emerald-400 font-semibold flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>Verified DBT / Gov ID</span>
              </span>
            </div>

            {/* Option A: One-Click Continue with Google */}
            <div className="space-y-2">
              <button
                id="btn-google-login-role"
                type="button"
                disabled={googleLoading || isLoading}
                onClick={handleContinueWithGoogle}
                className="w-full py-3.5 px-4 rounded-2xl bg-white dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 hover:border-emerald-500/40 text-slate-800 dark:text-white font-bold text-sm flex items-center justify-center gap-3 shadow-xs hover:shadow-md transition active:scale-[0.99] disabled:opacity-60"
              >
                {googleLoading ? (
                  <Loader2 className="w-5 h-5 animate-spin text-slate-600" />
                ) : (
                  <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24">
                    <path
                      fill="#4285F4"
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    />
                    <path
                      fill="#34A853"
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    />
                    <path
                      fill="#FBBC05"
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                    />
                    <path
                      fill="#EA4335"
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                    />
                  </svg>
                )}
                <span>{t('btnGoogleLoginRole', 'Continue with Google as')} {currentRole.title}</span>
              </button>
              <p className="text-[11px] text-center text-slate-400">
                {t('googleConnectNote', 'Instantly connects your Google account and saves your login')}
              </p>
            </div>

            {/* Divider */}
            <div className="relative flex items-center justify-center py-1">
              <div className="border-t border-slate-200 dark:border-slate-800 w-full" />
              <span className="bg-white dark:bg-slate-900 px-3 text-[11px] font-bold text-slate-400 uppercase tracking-wider shrink-0">
                {t('orCredentials', 'Or enter verified credentials')}
              </span>
            </div>

            {/* Option B: Real-Time Verified Form */}
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Full Name & Gmail */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label
                    htmlFor="input-fullname"
                    className="block text-xs font-bold text-slate-700 dark:text-slate-300"
                  >
                    Full Name (As per Aadhaar / Official ID) <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <input
                      id="input-fullname"
                      type="text"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder="e.g. Sushant Shinde"
                      required
                      className="w-full pl-10 pr-4 py-2.5 text-xs sm:text-sm rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-850 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-600 focus:bg-white"
                    />
                    <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label
                    htmlFor="input-gmail"
                    className="block text-xs font-bold text-slate-700 dark:text-slate-300"
                  >
                    Gmail / Registered Email Address <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <input
                      id="input-gmail"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="sushantshinde5598@gmail.com"
                      required
                      className="w-full pl-10 pr-4 py-2.5 text-xs sm:text-sm rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-850 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-600 focus:bg-white"
                    />
                    <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                  </div>
                </div>
              </div>

              {/* Password & Mobile Number */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label
                      htmlFor="input-password"
                      className="block text-xs font-bold text-slate-700 dark:text-slate-300"
                    >
                      Password <span className="text-rose-500">*</span>
                    </label>
                  </div>
                  <div className="relative">
                    <input
                      id="input-password"
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Enter account password"
                      required
                      className="w-full pl-10 pr-10 py-2.5 text-xs sm:text-sm rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-850 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-600 focus:bg-white"
                    />
                    <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-3 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label
                    htmlFor="input-mobile"
                    className="block text-xs font-bold text-slate-700 dark:text-slate-300"
                  >
                    Mobile Number (10 Digits) <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative flex">
                    <span className="inline-flex items-center px-3 text-xs font-bold bg-slate-100 dark:bg-slate-800 border border-r-0 border-slate-300 dark:border-slate-700 rounded-l-xl text-slate-700 dark:text-slate-300 select-none">
                      🇮🇳 +91
                    </span>
                    <input
                      id="input-mobile"
                      type="tel"
                      maxLength={10}
                      value={mobile}
                      onChange={(e) => setMobile(e.target.value.replace(/\D/g, ''))}
                      placeholder="98220 14589"
                      required
                      className="flex-1 min-w-0 pl-3 pr-4 py-2.5 text-xs sm:text-sm rounded-r-xl border border-slate-300 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-850 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-600 focus:bg-white"
                    />
                  </div>
                </div>
              </div>

              {/* Location Verification: State & District */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-3.5 rounded-2xl bg-slate-50/80 dark:bg-slate-850 border border-slate-200 dark:border-slate-800">
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-600 dark:text-slate-400">
                    State (राज्य)
                  </label>
                  <input
                    type="text"
                    value={state}
                    onChange={(e) => setState(e.target.value)}
                    className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-600 dark:text-slate-400">
                    District (जिला)
                  </label>
                  <input
                    type="text"
                    value={district}
                    onChange={(e) => setDistrict(e.target.value)}
                    className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-600 dark:text-slate-400">
                    Taluka / Village (तहसील / गांव)
                  </label>
                  <input
                    type="text"
                    value={village}
                    onChange={(e) => setVillage(e.target.value)}
                    className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
                  />
                </div>
              </div>

              {/* Save Login Information Checkbox */}
              <div className="flex items-center justify-between pt-1">
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 border-slate-300"
                  />
                  <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    {t('rememberMeLabel', 'Save verified login information securely on this device')}
                  </span>
                </label>
              </div>

              {/* Primary Action: Sign In and Open Designated Dashboard */}
              <button
                id="btn-submit-login"
                type="submit"
                disabled={isLoading || googleLoading}
                className="w-full py-3.5 px-4 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-sm flex items-center justify-center gap-2 shadow-md shadow-emerald-950/20 transition active:scale-[0.99] disabled:opacity-60"
              >
                {isLoading ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <>
                    <span>{t('btnSignInRole', 'Sign In & Open Dashboard')} ({currentRole.title})</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>
          </div>

          {/* Security & Verification Notice */}
          <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3 text-[11px] text-slate-500 dark:text-slate-400">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>256-Bit SSL Encrypted • Ministry of Agriculture & Farmers Welfare, GoI</span>
            </div>
            <div className="flex items-center gap-3">
              <span>DBT / PFMS Verified</span>
              <span>•</span>
              <span>SMS Gateway Active</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
