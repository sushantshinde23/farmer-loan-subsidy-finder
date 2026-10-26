import React, { useState } from 'react';
import {
  X,
  Tractor,
  Building2,
  ShieldCheck,
  Laptop,
  UserCheck,
  Lock,
  Mail,
  User,
  Phone,
  ArrowRight,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Save
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { UserRole } from '../types';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const SAVED_LOGIN_STORAGE_KEY = 'krishi_saved_login_info';

export const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose }) => {
  const { login, loginWithGoogle, register } = useAuth();
  const [tab, setTab] = useState<'login' | 'register'>('login');
  const [selectedRole, setSelectedRole] = useState<UserRole>('FARMER');

  const [email, setEmail] = useState('sushantshinde5598@gmail.com');
  const [password, setPassword] = useState('');
  const [mobile, setMobile] = useState('9822014589');
  const [fullName, setFullName] = useState('Sushant Shinde');
  const [state, setState] = useState('Maharashtra');
  const [district, setDistrict] = useState('Pune');
  const [village, setVillage] = useState('Baramati');

  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const roleOptions: { id: UserRole; title: string; sub: string; icon: any; color: string }[] = [
    { id: 'FARMER', title: 'Farmer / Beneficiary', sub: 'PM-KISAN, Subsidies & Loans', icon: Tractor, color: 'bg-emerald-600' },
    { id: 'BANK_OFFICER', title: 'Bank Officer (SBI/NABARD)', sub: 'KCC Loan Sanctions', icon: Building2, color: 'bg-blue-600' },
    { id: 'AGRICULTURE_OFFICER', title: 'Agriculture Officer', sub: 'Inspections & Approvals', icon: ShieldCheck, color: 'bg-amber-600' },
    { id: 'CSC_OPERATOR', title: 'CSC Operator / VLE', sub: 'Assisted Farmer Enrollment', icon: Laptop, color: 'bg-purple-600' },
    { id: 'SYSTEM_ADMIN', title: 'System Administrator', sub: 'Policy & Scheme Admin', icon: UserCheck, color: 'bg-slate-700' }
  ];

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    const cleanEmail = email.trim();
    const cleanMobile = mobile.trim().replace(/\D/g, '');

    if (!cleanEmail || !password || cleanMobile.length < 10) {
      setErrorMsg('Please enter valid Gmail, password, and 10-digit mobile number.');
      return;
    }

    setLoading(true);
    try {
      const formattedMobile = `+91 ${cleanMobile.slice(-10)}`;
      const user = await login(
        cleanEmail,
        password,
        formattedMobile,
        selectedRole,
        fullName.trim() || undefined,
        state,
        district,
        village
      );

      // Save verified login information locally
      try {
        localStorage.setItem(
          SAVED_LOGIN_STORAGE_KEY,
          JSON.stringify({
            email: cleanEmail,
            mobile: formattedMobile,
            fullName: user.fullName,
            role: selectedRole,
            state,
            district,
            village,
            savedAt: new Date().toISOString()
          })
        );
      } catch {
        // ignore
      }

      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || 'Login failed.');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setErrorMsg(null);
    setGoogleLoading(true);
    try {
      const targetGmail = email.trim().toLowerCase().includes('gmail.com')
        ? email.trim()
        : 'sushantshinde5598@gmail.com';

      const targetName = fullName.trim() || 'Sushant Shinde';
      const cleanMobile = mobile.replace(/\D/g, '') || '9822014589';
      const formattedMobile = `+91 ${cleanMobile.slice(-10)}`;

      const user = await loginWithGoogle(
        targetGmail,
        targetName,
        selectedRole,
        formattedMobile
      );

      try {
        localStorage.setItem(
          SAVED_LOGIN_STORAGE_KEY,
          JSON.stringify({
            email: targetGmail,
            mobile: formattedMobile,
            fullName: targetName,
            role: selectedRole,
            state,
            district,
            village,
            savedAt: new Date().toISOString()
          })
        );
      } catch {
        // ignore
      }

      onClose();
    } catch (err: any) {
      setErrorMsg('Google Sign-In failed.');
    } finally {
      setGoogleLoading(false);
    }
  };

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setLoading(true);
    try {
      await register({
        fullName,
        email,
        mobile: `+91 ${mobile.replace(/\D/g, '').slice(-10)}`,
        state,
        district,
        village,
        role: selectedRole
      });
      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || 'Registration failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="w-full max-w-lg bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col max-h-[92vh]">
        {/* Government tricolor top stripe */}
        <div className="h-1 flex">
          <div className="flex-1 bg-amber-500" />
          <div className="flex-1 bg-white" />
          <div className="flex-1 bg-emerald-600" />
        </div>

        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <div>
            <h3 className="font-bold text-base text-slate-900 dark:text-white">
              Real-Time Verified Login
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Select your official role and authenticate with verified credentials
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Switcher */}
        <div className="flex border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-850 text-xs font-bold">
          <button
            onClick={() => setTab('login')}
            className={`flex-1 py-3 text-center transition ${
              tab === 'login'
                ? 'bg-white dark:bg-slate-900 text-emerald-700 dark:text-emerald-400 border-b-2 border-emerald-600'
                : 'text-slate-600 dark:text-slate-400'
            }`}
          >
            Sign In with Selected Role
          </button>
          <button
            onClick={() => setTab('register')}
            className={`flex-1 py-3 text-center transition ${
              tab === 'register'
                ? 'bg-white dark:bg-slate-900 text-emerald-700 dark:text-emerald-400 border-b-2 border-emerald-600'
                : 'text-slate-600 dark:text-slate-400'
            }`}
          >
            Register New Account
          </button>
        </div>

        {/* Content */}
        <div className="p-5 overflow-y-auto flex-1 space-y-4">
          {errorMsg && (
            <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-200 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Role selection options */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-900 dark:text-white flex items-center justify-between">
              <span>Choose Your Role:</span>
              <span className="text-[11px] text-emerald-700 dark:text-emerald-400 font-semibold">
                {roleOptions.find((r) => r.id === selectedRole)?.title}
              </span>
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {roleOptions.map((item) => {
                const isSelected = selectedRole === item.id;
                const Icon = item.icon;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setSelectedRole(item.id)}
                    className={`p-2.5 rounded-xl border text-left transition flex items-center gap-2 ${
                      isSelected
                        ? 'border-emerald-600 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-900 dark:text-emerald-200 ring-1 ring-emerald-500'
                        : 'border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300'
                    }`}
                  >
                    <div className={`w-6 h-6 rounded-lg ${item.color} text-white flex items-center justify-center shrink-0`}>
                      <Icon className="w-3.5 h-3.5" />
                    </div>
                    <span className="text-[11px] font-bold truncate leading-tight">
                      {item.title.split('(')[0].trim()}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {tab === 'login' && (
            <div className="space-y-3.5 pt-2">
              {/* Continue with Google as Selected Role */}
              <button
                type="button"
                disabled={googleLoading || loading}
                onClick={handleGoogleSignIn}
                className="w-full py-2.5 px-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-850 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-800 dark:text-white font-bold text-xs flex items-center justify-center gap-2.5 shadow-2xs transition active:scale-[0.99]"
              >
                {googleLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin text-slate-500" />
                ) : (
                  <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
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
                <span>Continue with Google as {roleOptions.find((r) => r.id === selectedRole)?.title.split('(')[0].trim()}</span>
              </button>

              <div className="relative flex items-center justify-center">
                <div className="border-t border-slate-200 dark:border-slate-800 w-full" />
                <span className="bg-white dark:bg-slate-900 px-2 text-[10px] font-bold text-slate-400 uppercase tracking-wider shrink-0">
                  Or enter credentials
                </span>
              </div>

              <form onSubmit={handleLoginSubmit} className="space-y-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Gmail / Registered Email:
                  </label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="sushantshinde5598@gmail.com"
                    className="w-full text-xs py-2 px-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Password:
                  </label>
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full text-xs py-2 px-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Mobile Number (10 digits):
                  </label>
                  <div className="flex">
                    <span className="inline-flex items-center px-2.5 text-xs font-bold bg-slate-100 dark:bg-slate-800 border border-r-0 border-slate-200 dark:border-slate-700 rounded-l-xl text-slate-600 dark:text-slate-300">
                      🇮🇳 +91
                    </span>
                    <input
                      type="tel"
                      required
                      maxLength={10}
                      value={mobile}
                      onChange={(e) => setMobile(e.target.value.replace(/\D/g, ''))}
                      placeholder="98220 14589"
                      className="flex-1 text-xs py-2 px-3 rounded-r-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-2.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs shadow-xs transition"
                >
                  {loading ? 'Authenticating & Saving...' : 'Sign In with Selected Role'}
                </button>
              </form>
            </div>
          )}

          {tab === 'register' && (
            <form onSubmit={handleRegisterSubmit} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Full Name:
                </label>
                <input
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="e.g. Sushant Shinde"
                  className="w-full text-xs py-2 px-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Email:
                  </label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="sushantshinde5598@gmail.com"
                    className="w-full text-xs py-2 px-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Mobile:
                  </label>
                  <input
                    type="tel"
                    required
                    maxLength={10}
                    value={mobile}
                    onChange={(e) => setMobile(e.target.value.replace(/\D/g, ''))}
                    placeholder="98220 14589"
                    className="w-full text-xs py-2 px-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    State:
                  </label>
                  <input
                    type="text"
                    required
                    value={state}
                    onChange={(e) => setState(e.target.value)}
                    className="w-full text-xs py-2 px-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    District:
                  </label>
                  <input
                    type="text"
                    required
                    value={district}
                    onChange={(e) => setDistrict(e.target.value)}
                    className="w-full text-xs py-2 px-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs shadow-xs transition"
              >
                {loading ? 'Creating Profile...' : 'Complete Registration'}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
