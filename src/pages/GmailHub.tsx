import React, { useState, useEffect } from 'react';
import {
  Mail,
  Inbox,
  Send,
  Trash2,
  RefreshCw,
  Search,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  FileText,
  Clock,
  ExternalLink,
  ShieldCheck,
  User,
  Building2,
  Coins,
  Zap,
  CornerUpLeft,
  ArrowRight,
  Loader2,
  X
} from 'lucide-react';
import {
  fetchGmailMessages,
  fetchGmailMessageDetails,
  trashGmailMessage,
  markGmailMessageAsRead,
  getGmailUserProfile,
  GmailMessageSummary,
  GmailMessageDetail,
  GmailUserProfile
} from '../services/gmailService';
import {
  signInWithGoogleWorkspace,
  getWorkspaceAccessToken,
  logoutGoogle
} from '../lib/firebase';
import { GoogleSignInButton } from '../components/GoogleSignInButton';
import { GmailComposeModal } from '../components/GmailComposeModal';
import { GmailConfirmModal } from '../components/GmailConfirmModal';
import { useAuth } from '../context/AuthContext';

export const GmailHub: React.FC = () => {
  const { user } = useAuth();
  const [accessToken, setAccessToken] = useState<string | null>(getWorkspaceAccessToken());
  const [userProfile, setUserProfile] = useState<GmailUserProfile | null>(null);
  const [isSigningIn, setIsSigningIn] = useState(false);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [messages, setMessages] = useState<GmailMessageSummary[]>([]);
  const [selectedMessage, setSelectedMessage] = useState<GmailMessageDetail | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<'ALL' | 'SUBSIDY' | 'SANCTION' | 'SENT'>('ALL');
  const [authError, setAuthError] = useState<string | null>(null);

  // Modals
  const [showCompose, setShowCompose] = useState(false);
  const [composeTo, setComposeTo] = useState('');
  const [composeSubject, setComposeSubject] = useState('');
  const [composeBody, setComposeBody] = useState('');

  // Trash Confirmation (Mandatory Workspace confirmation)
  const [trashTargetId, setTrashTargetId] = useState<string | null>(null);
  const [trashTargetSubject, setTrashTargetSubject] = useState<string>('');
  const [isTrashing, setIsTrashing] = useState(false);

  // Initialize and check token
  useEffect(() => {
    const token = getWorkspaceAccessToken();
    if (token) {
      setAccessToken(token);
      loadProfileAndMessages(token);
    }
  }, []);

  const handleSignIn = async () => {
    setIsSigningIn(true);
    setAuthError(null);
    try {
      const res = await signInWithGoogleWorkspace();
      setAccessToken(res.accessToken);
      await loadProfileAndMessages(res.accessToken);
    } catch (err: any) {
      console.error('Failed to sign in to Google Workspace:', err);
      setAuthError(err.message || 'Google sign-in was interrupted. Please try again.');
    } finally {
      setIsSigningIn(false);
    }
  };

  const handleSignOut = async () => {
    await logoutGoogle();
    setAccessToken(null);
    setUserProfile(null);
    setMessages([]);
    setSelectedMessage(null);
  };

  const loadProfileAndMessages = async (token: string, queryOverride?: string) => {
    setLoadingMessages(true);
    try {
      // Load user profile
      try {
        const prof = await getGmailUserProfile(token);
        setUserProfile(prof);
      } catch (e) {
        console.warn('Could not load profile:', e);
      }

      // Determine query filter
      let q = queryOverride !== undefined ? queryOverride : searchQuery;
      if (!q) {
        if (activeFilter === 'SUBSIDY') {
          q = 'subsidy OR loan OR kcc OR dbt OR kisan OR agri';
        } else if (activeFilter === 'SANCTION') {
          q = 'approved OR sanction OR scrutiny OR verification OR notice';
        } else if (activeFilter === 'SENT') {
          q = 'in:sent';
        }
      }

      const list = await fetchGmailMessages(token, q || undefined, 25);
      setMessages(list);

      // Auto-select first message if none selected
      if (list.length > 0 && !selectedMessage) {
        handleSelectMessage(list[0].id, token);
      } else if (list.length === 0) {
        setSelectedMessage(null);
      }
    } catch (err: any) {
      console.error('Failed to load Gmail messages:', err);
      if (err.message?.includes('401') || err.message?.includes('token')) {
        setAuthError('Your Google session has expired. Please sign in again.');
        setAccessToken(null);
      }
    } finally {
      setLoadingMessages(false);
    }
  };

  const handleSelectMessage = async (id: string, tokenParam?: string) => {
    const token = tokenParam || accessToken;
    if (!token) return;

    setLoadingDetail(true);
    try {
      const detail = await fetchGmailMessageDetails(token, id);
      setSelectedMessage(detail);

      // Mark as read in background if unread
      if (detail.isUnread) {
        markGmailMessageAsRead(token, id);
        setMessages((prev) =>
          prev.map((m) => (m.id === id ? { ...m, isUnread: false } : m))
        );
      }
    } catch (err) {
      console.error('Failed to load message details:', err);
    } finally {
      setLoadingDetail(false);
    }
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (accessToken) {
      loadProfileAndMessages(accessToken, searchQuery);
    }
  };

  const handleFilterChange = (filter: 'ALL' | 'SUBSIDY' | 'SANCTION' | 'SENT') => {
    setActiveFilter(filter);
    setSearchQuery('');
    if (accessToken) {
      let q = '';
      if (filter === 'SUBSIDY') q = 'subsidy OR loan OR kcc OR dbt OR kisan OR agri';
      if (filter === 'SANCTION') q = 'approved OR sanction OR scrutiny OR verification OR notice';
      if (filter === 'SENT') q = 'in:sent';
      loadProfileAndMessages(accessToken, q);
    }
  };

  const handleInitiateTrash = (id: string, subject: string) => {
    setTrashTargetId(id);
    setTrashTargetSubject(subject);
  };

  const handleConfirmTrash = async () => {
    if (!accessToken || !trashTargetId) return;
    setIsTrashing(true);
    try {
      await trashGmailMessage(accessToken, trashTargetId);
      setMessages((prev) => prev.filter((m) => m.id !== trashTargetId));
      if (selectedMessage?.id === trashTargetId) {
        setSelectedMessage(null);
      }
      setTrashTargetId(null);
    } catch (err: any) {
      alert(`Failed to move email to Trash: ${err.message || err}`);
    } finally {
      setIsTrashing(false);
    }
  };

  const handleReply = () => {
    if (!selectedMessage) return;
    setComposeTo(selectedMessage.from.match(/<([^>]+)>/)?.[1] || selectedMessage.from);
    setComposeSubject(selectedMessage.subject.startsWith('Re:') ? selectedMessage.subject : `Re: ${selectedMessage.subject}`);
    setComposeBody(`\n\n--- On ${selectedMessage.date}, ${selectedMessage.from} wrote:\n> ${selectedMessage.bodyText.slice(0, 300)}...`);
    setShowCompose(true);
  };

  return (
    <div className="space-y-6">
      {/* Official Masthead Card */}
      <div className="p-5 sm:p-6 rounded-3xl bg-gradient-to-br from-red-700 via-rose-800 to-amber-900 text-white shadow-xl relative overflow-hidden">
        <div className="absolute right-0 top-0 w-80 h-80 bg-white/5 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-white/20 text-white border border-white/30 backdrop-blur-xs flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-amber-300" />
                Google Workspace Verified
              </span>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-400 text-slate-900">
                Official Kisan Mail
              </span>
            </div>
            <h2 className="text-xl sm:text-2xl font-extrabold tracking-tight">
              Official Gmail Communications & Kisan Mail Desk
            </h2>
            <p className="text-xs sm:text-sm text-red-100 max-w-2xl leading-relaxed">
              Read, compose, and manage your official government scheme correspondence, Direct Benefit Transfer (DBT) sanction letters, and grievance notices directly with verified Google Workspace integration.
            </p>
          </div>

          <div className="shrink-0 flex items-center gap-2">
            {accessToken && (
              <button
                onClick={() => {
                  setComposeTo('');
                  setComposeSubject('');
                  setComposeBody('');
                  setShowCompose(true);
                }}
                className="px-4 py-2 text-xs sm:text-sm font-bold rounded-xl bg-white text-red-700 hover:bg-red-50 shadow-md transition active:scale-95 flex items-center gap-1.5"
              >
                <Send className="w-4 h-4 text-red-600" />
                <span>Compose Email</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Auth Gate: If not connected to Gmail */}
      {!accessToken ? (
        <div className="p-8 sm:p-12 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-center shadow-sm space-y-6 max-w-2xl mx-auto">
          <div className="w-16 h-16 mx-auto rounded-2xl bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-400 flex items-center justify-center shadow-inner">
            <Mail className="w-8 h-8" />
          </div>

          <div className="space-y-2">
            <h3 className="text-lg sm:text-xl font-extrabold text-slate-900 dark:text-white">
              Connect Your Google Workspace Account
            </h3>
            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 max-w-md mx-auto leading-relaxed">
              Sign in with your Google account to access your official correspondence, receive DBT credit notices, send applications to agriculture desk officers, and track scheme updates directly in Gmail.
            </p>
          </div>

          {authError && (
            <div className="p-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-900/60 text-rose-700 dark:text-rose-300 text-xs flex items-center justify-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
              <span>{authError}</span>
            </div>
          )}

          {/* Official Google Sign-in button format */}
          <div className="flex flex-col items-center gap-3">
            <GoogleSignInButton
              onClick={handleSignIn}
              disabled={isSigningIn}
              label={isSigningIn ? 'Connecting to Google Workspace...' : 'Sign in with Google'}
              className="py-3 px-6 shadow-md"
            />
            <p className="text-[11px] text-slate-400">
              Only authorized Gmail scopes will be accessed with permission from you.
            </p>
          </div>

          {/* Feature Highlights Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-4 border-t border-slate-100 dark:border-slate-800 text-left">
            <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-700">
              <Coins className="w-4 h-4 text-emerald-600 mb-1" />
              <div className="text-xs font-bold text-slate-900 dark:text-white">DBT Credit Alerts</div>
              <div className="text-[11px] text-slate-500 mt-0.5">Direct notifications when PM-KISAN or subsidies credit.</div>
            </div>
            <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-700">
              <Building2 className="w-4 h-4 text-blue-600 mb-1" />
              <div className="text-xs font-bold text-slate-900 dark:text-white">Officer Scrutiny</div>
              <div className="text-[11px] text-slate-500 mt-0.5">Communicate directly with Block/District agriculture desk.</div>
            </div>
            <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-700">
              <FileText className="w-4 h-4 text-amber-600 mb-1" />
              <div className="text-xs font-bold text-slate-900 dark:text-white">Receipt Delivery</div>
              <div className="text-[11px] text-slate-500 mt-0.5">Email high-res DBT slips & sanction dossiers instantly.</div>
            </div>
          </div>
        </div>
      ) : (
        /* Connected Mailbox Interface */
        <div className="space-y-4">
          {/* Top Session / Search Bar */}
          <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col md:flex-row items-center justify-between gap-4">
            {/* Account Status Badge */}
            <div className="flex items-center gap-3 w-full md:w-auto">
              <div className="w-10 h-10 rounded-full bg-red-100 text-red-600 dark:bg-red-950/60 dark:text-red-400 flex items-center justify-center font-bold text-sm shrink-0">
                {userProfile?.emailAddress?.charAt(0).toUpperCase() || 'G'}
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="text-xs sm:text-sm font-extrabold text-slate-900 dark:text-white truncate">
                    {userProfile?.emailAddress || 'Connected Google Workspace'}
                  </span>
                  <span className="px-1.5 py-0.5 text-[10px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 rounded">
                    Active
                  </span>
                </div>
                <div className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-2">
                  <span>Messages: {userProfile?.messagesTotal || messages.length}</span>
                  <span>•</span>
                  <button
                    onClick={handleSignOut}
                    className="text-red-600 hover:text-red-700 hover:underline font-semibold"
                  >
                    Disconnect
                  </button>
                </div>
              </div>
            </div>

            {/* Live Search Form */}
            <form onSubmit={handleSearchSubmit} className="flex items-center gap-2 w-full md:w-auto flex-1 max-w-md">
              <div className="relative w-full">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search emails in Gmail (e.g. subsidy, KCC, bank, SBI)..."
                  className="w-full pl-9 pr-4 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-red-500"
                />
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              </div>
              <button
                type="submit"
                className="px-3.5 py-2 text-xs font-bold rounded-xl bg-slate-800 dark:bg-slate-700 hover:bg-slate-900 text-white transition shrink-0"
              >
                Search
              </button>
              <button
                type="button"
                onClick={() => loadProfileAndMessages(accessToken)}
                title="Refresh Inbox"
                className="p-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 transition shrink-0"
              >
                <RefreshCw className={`w-4 h-4 ${loadingMessages ? 'animate-spin text-red-600' : ''}`} />
              </button>
            </form>
          </div>

          {/* Filter Pills */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs">
            <button
              onClick={() => handleFilterChange('ALL')}
              className={`px-3 py-1.5 rounded-xl font-bold transition shrink-0 flex items-center gap-1.5 ${
                activeFilter === 'ALL'
                  ? 'bg-red-600 text-white shadow-xs'
                  : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-50'
              }`}
            >
              <Inbox className="w-3.5 h-3.5" />
              <span>All Mailbox</span>
            </button>
            <button
              onClick={() => handleFilterChange('SUBSIDY')}
              className={`px-3 py-1.5 rounded-xl font-bold transition shrink-0 flex items-center gap-1.5 ${
                activeFilter === 'SUBSIDY'
                  ? 'bg-emerald-700 text-white shadow-xs'
                  : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-50'
              }`}
            >
              <Coins className="w-3.5 h-3.5 text-amber-300" />
              <span>Subsidies & Loans</span>
            </button>
            <button
              onClick={() => handleFilterChange('SANCTION')}
              className={`px-3 py-1.5 rounded-xl font-bold transition shrink-0 flex items-center gap-1.5 ${
                activeFilter === 'SANCTION'
                  ? 'bg-blue-700 text-white shadow-xs'
                  : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-50'
              }`}
            >
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Sanction & Scrutiny Notices</span>
            </button>
            <button
              onClick={() => handleFilterChange('SENT')}
              className={`px-3 py-1.5 rounded-xl font-bold transition shrink-0 flex items-center gap-1.5 ${
                activeFilter === 'SENT'
                  ? 'bg-purple-700 text-white shadow-xs'
                  : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-50'
              }`}
            >
              <Send className="w-3.5 h-3.5" />
              <span>Sent Messages</span>
            </button>
          </div>

          {/* Mailbox Two-Column View */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 min-h-[580px]">
            {/* Left Column: Email List (5 cols) */}
            <div className="lg:col-span-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden flex flex-col max-h-[640px]">
              <div className="px-4 py-3 border-b border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-950/40 flex items-center justify-between text-xs font-semibold text-slate-600 dark:text-slate-300">
                <span>Conversations ({messages.length})</span>
                {loadingMessages && <span className="text-red-600 animate-pulse text-[11px]">Syncing...</span>}
              </div>

              <div className="flex-1 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800">
                {loadingMessages && messages.length === 0 ? (
                  <div className="p-8 text-center text-slate-400 space-y-2">
                    <Loader2 className="w-6 h-6 animate-spin mx-auto text-red-600" />
                    <p className="text-xs">Fetching Gmail conversations...</p>
                  </div>
                ) : messages.length === 0 ? (
                  <div className="p-8 text-center text-slate-400 space-y-2">
                    <Mail className="w-8 h-8 mx-auto text-slate-300 dark:text-slate-600" />
                    <p className="text-xs font-semibold text-slate-600 dark:text-slate-300">No emails found</p>
                    <p className="text-[11px]">No messages matching current criteria.</p>
                  </div>
                ) : (
                  messages.map((msg) => {
                    const isSelected = selectedMessage?.id === msg.id;
                    return (
                      <div
                        key={msg.id}
                        onClick={() => handleSelectMessage(msg.id)}
                        className={`p-3.5 cursor-pointer transition text-xs space-y-1 relative ${
                          isSelected
                            ? 'bg-red-50/80 dark:bg-red-950/30 border-l-4 border-red-600'
                            : 'hover:bg-slate-50 dark:hover:bg-slate-800/60'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span
                            className={`font-semibold truncate max-w-[200px] ${
                              msg.isUnread
                                ? 'text-slate-900 dark:text-white font-extrabold'
                                : 'text-slate-700 dark:text-slate-300'
                            }`}
                          >
                            {msg.from.replace(/<[^>]+>/g, '').trim()}
                          </span>
                          <span className="text-[10px] text-slate-400 shrink-0">
                            {msg.date ? new Date(msg.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) : ''}
                          </span>
                        </div>

                        <div
                          className={`font-medium truncate ${
                            msg.isUnread
                              ? 'text-slate-900 dark:text-white font-bold'
                              : 'text-slate-800 dark:text-slate-200'
                          }`}
                        >
                          {msg.isUnread && (
                            <span className="inline-block w-2 h-2 rounded-full bg-red-600 mr-1.5" />
                          )}
                          {msg.subject || '(No Subject)'}
                        </div>

                        <p className="text-slate-500 dark:text-slate-400 line-clamp-2 text-[11px] leading-relaxed">
                          {msg.snippet}
                        </p>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {/* Right Column: Message Reading Pane (7 cols) */}
            <div className="lg:col-span-7 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden flex flex-col max-h-[640px]">
              {loadingDetail ? (
                <div className="flex-1 flex flex-col items-center justify-center p-8 text-slate-400 space-y-2">
                  <Loader2 className="w-8 h-8 animate-spin text-red-600" />
                  <p className="text-xs">Loading email content from Gmail...</p>
                </div>
              ) : selectedMessage ? (
                <div className="flex-1 flex flex-col min-h-0">
                  {/* Reading Header */}
                  <div className="p-4 sm:p-5 border-b border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-950/40 space-y-3">
                    <div className="flex items-start justify-between gap-3">
                      <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white leading-tight">
                        {selectedMessage.subject || '(No Subject)'}
                      </h3>
                      {/* Action buttons */}
                      <div className="flex items-center gap-1.5 shrink-0">
                        <button
                          onClick={handleReply}
                          className="px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 text-xs font-semibold flex items-center gap-1 shadow-2xs transition"
                          title="Reply to message"
                        >
                          <CornerUpLeft className="w-3.5 h-3.5" />
                          <span className="hidden sm:inline">Reply</span>
                        </button>
                        <button
                          onClick={() => handleInitiateTrash(selectedMessage.id, selectedMessage.subject)}
                          className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/50 text-xs font-semibold shadow-2xs transition"
                          title="Move to Trash"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-600 dark:text-slate-300">
                      <div>
                        <span className="font-semibold text-slate-400">From: </span>
                        <span className="font-mono text-slate-800 dark:text-slate-200">{selectedMessage.from}</span>
                      </div>
                      <div className="text-[11px] text-slate-400">
                        {selectedMessage.date}
                      </div>
                    </div>

                    {selectedMessage.to && (
                      <div className="text-xs text-slate-500">
                        <span className="font-semibold text-slate-400">To: </span>
                        <span className="font-mono">{selectedMessage.to}</span>
                      </div>
                    )}
                  </div>

                  {/* Reading Body */}
                  <div className="flex-1 overflow-y-auto p-5 text-xs sm:text-sm text-slate-800 dark:text-slate-200 leading-relaxed font-sans">
                    {selectedMessage.bodyHtml ? (
                      <div
                        className="prose dark:prose-invert max-w-none text-xs sm:text-sm"
                        dangerouslySetInnerHTML={{ __html: selectedMessage.bodyHtml }}
                      />
                    ) : (
                      <div className="whitespace-pre-wrap font-sans">
                        {selectedMessage.bodyText}
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-slate-400 space-y-3">
                  <Mail className="w-12 h-12 text-slate-300 dark:text-slate-700" />
                  <div className="space-y-1">
                    <p className="text-sm font-bold text-slate-600 dark:text-slate-300">No message selected</p>
                    <p className="text-xs text-slate-400">Select an email from the left pane to preview its full content.</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Quick Compose Modal */}
      <GmailComposeModal
        isOpen={showCompose}
        onClose={() => setShowCompose(false)}
        accessToken={accessToken}
        defaultTo={composeTo}
        defaultSubject={composeSubject}
        defaultBody={composeBody}
        senderEmail={userProfile?.emailAddress}
        onSuccess={() => {
          if (accessToken) {
            loadProfileAndMessages(accessToken);
          }
        }}
      />

      {/* Mandatory User Confirmation Dialog before moving email to trash */}
      <GmailConfirmModal
        isOpen={Boolean(trashTargetId)}
        onClose={() => setTrashTargetId(null)}
        onConfirm={handleConfirmTrash}
        type="TRASH"
        title="Move Email to Trash?"
        description="Are you sure you want to move this message from your Gmail inbox into your Gmail Trash? This can be undone from your Gmail Trash folder."
        details={{
          subject: trashTargetSubject
        }}
        confirmButtonText="Move to Trash"
        isLoading={isTrashing}
      />
    </div>
  );
};
