import React, { useState, useEffect } from 'react';
import {
  ShieldCheck,
  Plus,
  FileCheck2,
  Users,
  Activity,
  CheckCircle2,
  ExternalLink,
  Edit,
  Database,
  Calendar,
  Lock,
  Globe,
  Trash2,
  Power,
  RefreshCw,
  Search,
  Filter
} from 'lucide-react';
import { api } from '../services/api';
import { GovernmentScheme, AuditLog, User, OfficialPortal, PortalCategory } from '../types';

export const AdminDashboard: React.FC = () => {
  const [stats, setStats] = useState<any>(null);
  const [schemes, setSchemes] = useState<GovernmentScheme[]>([]);
  const [portals, setPortals] = useState<OfficialPortal[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [activeTab, setActiveTab] = useState<'schemes' | 'portals' | 'audit'>('schemes');
  const [loading, setLoading] = useState(true);

  // New Scheme Modal
  const [showAddModal, setShowAddModal] = useState(false);
  const [newCode, setNewCode] = useState('SCHEME-STATE-NEW');
  const [newName, setNewName] = useState('');
  const [newDept, setNewDept] = useState('Department of Agriculture');
  const [newSubsidy, setNewSubsidy] = useState('50% Financial Assistance');
  const [newDesc, setNewDesc] = useState('');

  // Portal Management Modal
  const [showPortalModal, setShowPortalModal] = useState(false);
  const [editingPortalId, setEditingPortalId] = useState<string | null>(null);
  const [portalForm, setPortalForm] = useState<{
    name: string;
    department: string;
    governmentLevel: 'CENTRAL' | 'STATE';
    state: string;
    category: PortalCategory;
    purpose: string;
    description: string;
    officialUrl: string;
    status: 'ACTIVE' | 'INACTIVE';
    keyServices: string;
  }>({
    name: '',
    department: '',
    governmentLevel: 'CENTRAL',
    state: '',
    category: 'INCOME_SUPPORT',
    purpose: '',
    description: '',
    officialUrl: '',
    status: 'ACTIVE',
    keyServices: ''
  });

  const [portalSearch, setPortalSearch] = useState('');
  const [portalCategoryFilter, setPortalCategoryFilter] = useState<string>('ALL');

  const loadAdminData = async () => {
    setLoading(true);
    try {
      const [sysStats, schemeList, portalList, logs] = await Promise.all([
        api.getSystemStats(),
        api.getSchemes(),
        api.getPortals(),
        api.getAuditLogs()
      ]);
      setStats(sysStats);
      setSchemes(schemeList);
      setPortals(portalList);
      setAuditLogs(logs);
    } catch (err) {
      console.error('Failed to load admin data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAdminData();
  }, []);

  const handleCreateScheme = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;

    try {
      await api.saveScheme({
        code: newCode,
        name: newName,
        category: 'STATE',
        department: newDept,
        subsidyAmountOrPercent: newSubsidy,
        description: newDesc,
        benefits: 'Direct DBT assistance disbursed upon verification.',
        eligibilitySummary: ['Valid 7/12 Land Record', 'Aadhaar linked bank account'],
        requiredDocuments: ['7_12_EXTRACT', 'AADHAAR', 'BANK_PASSBOOK'],
        officialSourceUrl: 'https://agricoop.nic.in',
        lastVerifiedDate: new Date().toISOString().split('T')[0]
      });
      setShowAddModal(false);
      setNewName('');
      setNewDesc('');
      await loadAdminData();
      alert('Scheme successfully published and verified into government catalog.');
    } catch (err) {
      console.error('Failed to add scheme:', err);
    }
  };

  const handleOpenAddPortal = () => {
    setEditingPortalId(null);
    setPortalForm({
      name: '',
      department: 'Ministry of Agriculture & Farmers Welfare, Government of India',
      governmentLevel: 'CENTRAL',
      state: '',
      category: 'INCOME_SUPPORT',
      purpose: '',
      description: '',
      officialUrl: 'https://',
      status: 'ACTIVE',
      keyServices: ''
    });
    setShowPortalModal(true);
  };

  const handleOpenEditPortal = (p: OfficialPortal) => {
    setEditingPortalId(p.id);
    setPortalForm({
      name: p.name,
      department: p.department,
      governmentLevel: p.governmentLevel,
      state: p.state || '',
      category: p.category,
      purpose: p.purpose,
      description: p.description,
      officialUrl: p.officialUrl,
      status: p.status,
      keyServices: (p.keyServices || []).join(', ')
    });
    setShowPortalModal(true);
  };

  const handleSavePortal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!portalForm.name.trim() || !portalForm.officialUrl.trim()) return;

    if (!portalForm.officialUrl.startsWith('http://') && !portalForm.officialUrl.startsWith('https://')) {
      alert('Official portal URL must be a valid web address starting with https:// or http://');
      return;
    }

    const payload: Partial<OfficialPortal> = {
      name: portalForm.name.trim(),
      department: portalForm.department.trim(),
      governmentLevel: portalForm.governmentLevel,
      state: portalForm.governmentLevel === 'STATE' ? portalForm.state.trim() : undefined,
      category: portalForm.category,
      purpose: portalForm.purpose.trim(),
      description: portalForm.description.trim() || portalForm.purpose.trim(),
      officialUrl: portalForm.officialUrl.trim(),
      status: portalForm.status,
      keyServices: portalForm.keyServices
        ? portalForm.keyServices.split(',').map(s => s.trim()).filter(Boolean)
        : [],
      lastVerifiedDate: new Date().toISOString().split('T')[0]
    };

    try {
      if (editingPortalId) {
        await api.updatePortal(editingPortalId, payload);
        alert('Official government portal updated successfully. All changes are live.');
      } else {
        await api.savePortal(payload);
        alert('New official portal registered into database successfully.');
      }
      setShowPortalModal(false);
      await loadAdminData();
    } catch (err: any) {
      alert(`Operation failed: ${err?.message || 'Error saving portal'}`);
    }
  };

  const handleTogglePortalStatus = async (portal: OfficialPortal) => {
    const nextStatus = portal.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
    try {
      await api.updatePortal(portal.id, {
        status: nextStatus,
        lastVerifiedDate: new Date().toISOString().split('T')[0]
      });
      await loadAdminData();
    } catch (err: any) {
      alert(`Failed to change portal status: ${err?.message}`);
    }
  };

  const handleDeletePortal = async (portal: OfficialPortal) => {
    if (!confirm(`Are you sure you want to delete the portal entry "${portal.name}"?`)) {
      return;
    }
    try {
      await api.deletePortal(portal.id);
      await loadAdminData();
    } catch (err: any) {
      alert(`Failed to delete portal: ${err?.message}`);
    }
  };

  const filteredPortals = portals.filter(p => {
    const matchCat = portalCategoryFilter === 'ALL' || p.category === portalCategoryFilter;
    const matchSearch = !portalSearch.trim() ||
      p.name.toLowerCase().includes(portalSearch.toLowerCase()) ||
      p.department.toLowerCase().includes(portalSearch.toLowerCase()) ||
      p.officialUrl.toLowerCase().includes(portalSearch.toLowerCase());
    return matchCat && matchSearch;
  });

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="p-5 rounded-2xl bg-gradient-to-r from-slate-900 to-emerald-950 text-white shadow-md border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-emerald-400" />
            <h2 className="text-xl font-black">System Administration & Portal Governance</h2>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Government Scheme Catalog Governance, Official Portal Registry Management, and Real-Time Audit Logs.
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          {activeTab === 'schemes' && (
            <button
              onClick={() => setShowAddModal(true)}
              className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-1.5 shadow-sm"
            >
              <Plus className="w-4 h-4" />
              <span>Publish Verified Scheme</span>
            </button>
          )}

          {activeTab === 'portals' && (
            <button
              onClick={handleOpenAddPortal}
              className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-1.5 shadow-sm"
            >
              <Plus className="w-4 h-4" />
              <span>Register Official Portal</span>
            </button>
          )}
        </div>
      </div>

      {/* System Stats Overview */}
      {stats && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="p-4 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-xs">
            <div className="text-[11px] font-semibold text-slate-500">Active Schemes</div>
            <div className="text-2xl font-black text-slate-900 dark:text-white mt-1">
              {stats.totalSchemes}
            </div>
            <div className="text-[10px] text-emerald-600 font-bold mt-0.5">100% Verified</div>
          </div>

          <div className="p-4 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-xs">
            <div className="text-[11px] font-semibold text-slate-500">Official Portals</div>
            <div className="text-2xl font-black text-slate-900 dark:text-white mt-1">
              {portals.length}
            </div>
            <div className="text-[10px] text-blue-600 font-bold mt-0.5">
              {portals.filter(p => p.status === 'ACTIVE').length} Active Links
            </div>
          </div>

          <div className="p-4 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-xs">
            <div className="text-[11px] font-semibold text-slate-500">DBT Subsidy Disbursed</div>
            <div className="text-2xl font-black text-emerald-700 dark:text-emerald-400 mt-1 font-mono">
              ₹{(stats.totalSubsidyDisbursedRupees / 100000).toFixed(1)} Lakh
            </div>
            <div className="text-[10px] text-slate-400 mt-0.5">Aadhaar PFMS Transfer</div>
          </div>

          <div className="p-4 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-xs">
            <div className="text-[11px] font-semibold text-slate-500">Total Applications</div>
            <div className="text-2xl font-black text-slate-900 dark:text-white mt-1">
              {stats.totalApplications}
            </div>
            <div className="text-[10px] text-purple-600 font-bold mt-0.5">
              {stats.approvedApplications} Approved
            </div>
          </div>
        </div>
      )}

      {/* Tabs Switcher */}
      <div className="flex border-b border-slate-200 dark:border-slate-800">
        <button
          onClick={() => setActiveTab('schemes')}
          className={`py-2.5 px-4 text-xs font-bold border-b-2 transition ${
            activeTab === 'schemes'
              ? 'border-emerald-600 text-emerald-700 dark:text-emerald-400'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          Schemes Catalog ({schemes.length})
        </button>

        <button
          onClick={() => setActiveTab('portals')}
          className={`py-2.5 px-4 text-xs font-bold border-b-2 transition ${
            activeTab === 'portals'
              ? 'border-emerald-600 text-emerald-700 dark:text-emerald-400'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          Official Government Portals ({portals.length})
        </button>

        <button
          onClick={() => setActiveTab('audit')}
          className={`py-2.5 px-4 text-xs font-bold border-b-2 transition ${
            activeTab === 'audit'
              ? 'border-emerald-600 text-emerald-700 dark:text-emerald-400'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          System Audit Trail ({auditLogs.length})
        </button>
      </div>

      {/* TAB 1: SCHEMES CATALOG MANAGEMENT */}
      {activeTab === 'schemes' && (
        <div className="space-y-3">
          {schemes.map((s) => (
            <div
              key={s.id}
              className="p-4 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
            >
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-slate-400 text-[10px]">{s.code}</span>
                  <h4 className="font-bold text-slate-900 dark:text-white">{s.name}</h4>
                  <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                    Verified {s.lastVerifiedDate}
                  </span>
                </div>
                <div className="text-slate-500">{s.department} • Grant: <strong className="text-emerald-700 dark:text-emerald-400">{s.subsidyAmountOrPercent}</strong></div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <a
                  href={s.officialSourceUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-100 text-slate-600 dark:text-slate-300"
                  title="Official Gazette Link"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* TAB 2: OFFICIAL GOVERNMENT PORTALS MANAGEMENT */}
      {activeTab === 'portals' && (
        <div className="space-y-4">
          {/* Search & Filter Bar */}
          <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
            <div className="relative flex-1">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={portalSearch}
                onChange={(e) => setPortalSearch(e.target.value)}
                placeholder="Search official portals by name, URL, or ministry..."
                className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            <select
              value={portalCategoryFilter}
              onChange={(e) => setPortalCategoryFilter(e.target.value)}
              className="text-xs py-2 px-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
            >
              <option value="ALL">All Categories</option>
              <option value="INCOME_SUPPORT">Income Support</option>
              <option value="CROP_INSURANCE">Crop Insurance</option>
              <option value="AGRICULTURAL_LOANS">Agricultural Loans</option>
              <option value="SUBSIDIES">Subsidies</option>
              <option value="SOLAR_IRRIGATION">Solar & Irrigation</option>
              <option value="FARMER_REGISTRATION">Farmer Registration</option>
              <option value="STATE_PORTALS">State Government Portals</option>
              <option value="GRIEVANCE_SUPPORT">Grievance & Support</option>
            </select>
          </div>

          {/* Portals Table / Cards */}
          <div className="space-y-3">
            {filteredPortals.map((p) => (
              <div
                key={p.id}
                className="p-4 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs"
              >
                <div className="space-y-1.5 flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-bold text-sm text-slate-900 dark:text-white">
                      {p.name}
                    </span>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                      p.status === 'ACTIVE'
                        ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                        : 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-400'
                    }`}>
                      {p.status}
                    </span>
                    <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-blue-50 text-blue-800 dark:bg-blue-950 dark:text-blue-300 border border-blue-200 dark:border-blue-900">
                      {p.category.replace('_', ' ')}
                    </span>
                    <span className="text-[10px] text-slate-400">
                      Verified {p.lastVerifiedDate}
                    </span>
                  </div>

                  <p className="text-slate-500 dark:text-slate-400 text-xs">
                    {p.department}
                  </p>

                  <div className="flex items-center gap-2 text-xs">
                    <span className="font-semibold text-slate-600 dark:text-slate-300">Official URL:</span>
                    <a
                      href={p.officialUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-emerald-700 dark:text-emerald-400 font-mono hover:underline inline-flex items-center gap-1 truncate max-w-md"
                    >
                      <span>{p.officialUrl}</span>
                      <ExternalLink className="w-3 h-3 shrink-0" />
                    </a>
                  </div>
                </div>

                {/* Action buttons */}
                <div className="flex items-center gap-2 shrink-0 pt-2 md:pt-0 border-t md:border-t-0 border-slate-100 dark:border-slate-700">
                  <button
                    onClick={() => handleTogglePortalStatus(p)}
                    className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1 transition ${
                      p.status === 'ACTIVE'
                        ? 'bg-amber-50 hover:bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                        : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                    }`}
                    title={p.status === 'ACTIVE' ? 'Deactivate Portal' : 'Activate Portal'}
                  >
                    <Power className="w-3.5 h-3.5" />
                    <span>{p.status === 'ACTIVE' ? 'Deactivate' : 'Activate'}</span>
                  </button>

                  <button
                    onClick={() => handleOpenEditPortal(p)}
                    className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 transition"
                    title="Edit Portal Details & URL"
                  >
                    <Edit className="w-4 h-4" />
                  </button>

                  <button
                    onClick={() => handleDeletePortal(p)}
                    className="p-1.5 rounded-lg border border-rose-200 dark:border-rose-900/60 hover:bg-rose-50 dark:hover:bg-rose-950/60 text-rose-600 dark:text-rose-400 transition"
                    title="Delete Portal Entry"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}

            {filteredPortals.length === 0 && (
              <div className="p-8 text-center rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-500">
                No official portals match your filter.
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 3: AUDIT LOGS TRAIL */}
      {activeTab === 'audit' && (
        <div className="rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden bg-white dark:bg-slate-800">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-slate-900/60 text-slate-500 font-bold border-b border-slate-200 dark:border-slate-700">
                <tr>
                  <th className="p-3">Timestamp</th>
                  <th className="p-3">Action</th>
                  <th className="p-3">Actor / Role</th>
                  <th className="p-3">Entity</th>
                  <th className="p-3">Audit Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-700/60">
                {auditLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-750">
                    <td className="p-3 font-mono text-slate-400 text-[11px] whitespace-nowrap">
                      {new Date(log.timestamp).toLocaleString()}
                    </td>
                    <td className="p-3">
                      <span className="px-2 py-0.5 rounded font-semibold text-[10px] bg-slate-100 dark:bg-slate-700 text-slate-800 dark:text-slate-200">
                        {log.action}
                      </span>
                    </td>
                    <td className="p-3 font-medium text-slate-800 dark:text-slate-200">
                      {log.performedBy || log.userName || 'System'} ({log.role || log.userRole || 'SYSTEM'})
                    </td>
                    <td className="p-3 font-mono text-slate-500 text-[11px]">
                      {log.targetEntity || 'RESOURCE'} {log.targetId ? `#${log.targetId.slice(0, 12)}` : ''}
                    </td>
                    <td className="p-3 text-slate-600 dark:text-slate-300">
                      {log.details}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Publish Scheme Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs animate-in fade-in">
          <div className="w-full max-w-lg bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 p-5 space-y-4">
            <h3 className="font-bold text-base text-slate-900 dark:text-white">
              Publish New Government Scheme to Repository
            </h3>

            <form onSubmit={handleCreateScheme} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Scheme Code:
                </label>
                <input
                  type="text"
                  required
                  value={newCode}
                  onChange={(e) => setNewCode(e.target.value)}
                  className="w-full text-xs py-2 px-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Scheme Full Title:
                </label>
                <input
                  type="text"
                  required
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="e.g. Chief Minister Solar Krishi Vahini Scheme 2.0"
                  className="w-full text-xs py-2 px-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Department:
                  </label>
                  <input
                    type="text"
                    required
                    value={newDept}
                    onChange={(e) => setNewDept(e.target.value)}
                    className="w-full text-xs py-2 px-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Subsidy Grant / %:
                  </label>
                  <input
                    type="text"
                    required
                    value={newSubsidy}
                    onChange={(e) => setNewSubsidy(e.target.value)}
                    className="w-full text-xs py-2 px-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Overview & Purpose:
                </label>
                <textarea
                  rows={3}
                  required
                  value={newDesc}
                  onChange={(e) => setNewDesc(e.target.value)}
                  placeholder="Official scheme guidelines, eligible farmer categories..."
                  className="w-full text-xs p-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 rounded-lg text-xs font-semibold border border-slate-200 dark:border-slate-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg text-xs font-bold bg-emerald-700 text-white hover:bg-emerald-800"
                >
                  Publish & Verify
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Register / Edit Official Portal Modal */}
      {showPortalModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs animate-in fade-in overflow-y-auto">
          <div className="w-full max-w-xl bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 p-5 space-y-4 my-8">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Globe className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                <h3 className="font-bold text-base text-slate-900 dark:text-white">
                  {editingPortalId ? 'Edit Official Government Portal Link' : 'Register New Official Farmer Portal'}
                </h3>
              </div>
              <button
                onClick={() => setShowPortalModal(false)}
                className="text-slate-400 hover:text-slate-600 text-xs font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSavePortal} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Portal Name: *
                </label>
                <input
                  type="text"
                  required
                  value={portalForm.name}
                  onChange={(e) => setPortalForm({ ...portalForm, name: e.target.value })}
                  placeholder="e.g. PM-KISAN (Pradhan Mantri Kisan Samman Nidhi)"
                  className="w-full text-xs py-2 px-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Category: *
                  </label>
                  <select
                    value={portalForm.category}
                    onChange={(e) => setPortalForm({ ...portalForm, category: e.target.value as any })}
                    className="w-full text-xs py-2 px-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white"
                  >
                    <option value="INCOME_SUPPORT">1. Income Support</option>
                    <option value="CROP_INSURANCE">2. Crop Insurance</option>
                    <option value="AGRICULTURAL_LOANS">3. Agricultural Loans</option>
                    <option value="SUBSIDIES">4. Subsidies</option>
                    <option value="SOLAR_IRRIGATION">5. Solar & Irrigation</option>
                    <option value="FARMER_REGISTRATION">6. Farmer Registration</option>
                    <option value="STATE_PORTALS">7. State Government Portals</option>
                    <option value="GRIEVANCE_SUPPORT">8. Grievance & Support</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Government Level:
                  </label>
                  <select
                    value={portalForm.governmentLevel}
                    onChange={(e) => setPortalForm({ ...portalForm, governmentLevel: e.target.value as any })}
                    className="w-full text-xs py-2 px-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white"
                  >
                    <option value="CENTRAL">Government of India (Central)</option>
                    <option value="STATE">State Government</option>
                  </select>
                </div>
              </div>

              {portalForm.governmentLevel === 'STATE' && (
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    State Name:
                  </label>
                  <input
                    type="text"
                    value={portalForm.state}
                    onChange={(e) => setPortalForm({ ...portalForm, state: e.target.value })}
                    placeholder="e.g. Maharashtra, Andhra Pradesh, Uttar Pradesh..."
                    className="w-full text-xs py-2 px-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white"
                  />
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Department / Ministry: *
                </label>
                <input
                  type="text"
                  required
                  value={portalForm.department}
                  onChange={(e) => setPortalForm({ ...portalForm, department: e.target.value })}
                  placeholder="e.g. Ministry of Agriculture & Farmers Welfare, Government of India"
                  className="w-full text-xs py-2 px-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Official Portal URL: * (Only authentic verified government web addresses)
                </label>
                <input
                  type="url"
                  required
                  value={portalForm.officialUrl}
                  onChange={(e) => setPortalForm({ ...portalForm, officialUrl: e.target.value })}
                  placeholder="https://pmkisan.gov.in/"
                  className="w-full text-xs py-2 px-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white font-mono"
                />
                <p className="text-[10px] text-slate-400 mt-0.5">
                  Important: Enter the official .gov.in or .nic.in portal URL. The user will be taken directly to this address.
                </p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Primary Purpose: *
                </label>
                <textarea
                  rows={2}
                  required
                  value={portalForm.purpose}
                  onChange={(e) => setPortalForm({ ...portalForm, purpose: e.target.value })}
                  placeholder="Briefly state the primary benefit or function (e.g. Direct income support of ₹6,000 / year in 3 installments)"
                  className="w-full text-xs p-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Detailed Description:
                </label>
                <textarea
                  rows={2}
                  value={portalForm.description}
                  onChange={(e) => setPortalForm({ ...portalForm, description: e.target.value })}
                  placeholder="Additional details on services offered on this portal..."
                  className="w-full text-xs p-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Key Services (Comma separated):
                  </label>
                  <input
                    type="text"
                    value={portalForm.keyServices}
                    onChange={(e) => setPortalForm({ ...portalForm, keyServices: e.target.value })}
                    placeholder="e.g. New Registration, Aadhaar eKYC, Payment Status"
                    className="w-full text-xs py-2 px-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Status:
                  </label>
                  <select
                    value={portalForm.status}
                    onChange={(e) => setPortalForm({ ...portalForm, status: e.target.value as any })}
                    className="w-full text-xs py-2 px-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white"
                  >
                    <option value="ACTIVE">ACTIVE (Displayed to Farmers)</option>
                    <option value="INACTIVE">INACTIVE (Hidden / Under Maintenance)</option>
                  </select>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowPortalModal(false)}
                  className="px-4 py-2 rounded-lg text-xs font-semibold border border-slate-200 dark:border-slate-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg text-xs font-bold bg-emerald-700 text-white hover:bg-emerald-800 transition"
                >
                  {editingPortalId ? 'Save & Update Portal' : 'Register Official Portal'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
