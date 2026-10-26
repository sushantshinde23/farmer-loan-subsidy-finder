import React, { useState, useEffect } from 'react';
import {
  MapPin,
  Phone,
  Clock,
  ShieldCheck,
  Navigation
} from 'lucide-react';
import { api } from '../services/api';
import { NearbyService } from '../types';
import {
  FarmerServiceMapExplorer,
  ServiceCategoryOption
} from '../components/FarmerServiceMapExplorer';

export const NEARBY_SERVICE_CATEGORIES: ServiceCategoryOption[] = [
  {
    id: 'BANK_BRANCH',
    label: 'Banks & Branches',
    query: 'Agricultural bank branch State Bank of India NABARD cooperative bank',
    includedType: 'bank',
    pinColor: '#1d4ed8',
    borderColor: '#1e3a8a',
    glyphColor: '#ffffff',
    badgeClass: 'bg-blue-700 text-white border-blue-700'
  },
  {
    id: 'CSC',
    label: 'CSC Centres',
    query: 'Common Service Centre CSC Digital Seva Maha e Seva Kendra',
    pinColor: '#059669',
    borderColor: '#064e3b',
    glyphColor: '#ffffff',
    badgeClass: 'bg-emerald-700 text-white border-emerald-700'
  },
  {
    id: 'AGRI_OFFICE',
    label: 'Agriculture Offices',
    query: 'Krishi Vigyan Kendra District Agriculture Office Taluka Krishi Adhikari',
    includedType: 'local_government_office',
    pinColor: '#15803d',
    borderColor: '#14532d',
    glyphColor: '#ffffff',
    badgeClass: 'bg-green-700 text-white border-green-700'
  },
  {
    id: 'GOVT_OFFICE',
    label: 'Government Offices',
    query: 'Tehsildar Office Collectorate Block Development Office Gram Panchayat',
    includedType: 'local_government_office',
    pinColor: '#4f46e5',
    borderColor: '#312e81',
    glyphColor: '#ffffff',
    badgeClass: 'bg-indigo-700 text-white border-indigo-700'
  },
  {
    id: 'KRISHI_SEVA',
    label: 'Krishi Seva Kendras',
    query: 'Krishi Seva Kendra agro fertilizer seeds agricultural inputs dealer',
    pinColor: '#d97706',
    borderColor: '#78350f',
    glyphColor: '#ffffff',
    badgeClass: 'bg-amber-600 text-white border-amber-600'
  },
  {
    id: 'APMC_MANDI',
    label: 'APMC / Mandi',
    query: 'APMC Krishi Utpanna Bazar Samiti Agricultural Market Yard Mandi',
    pinColor: '#7c3aed',
    borderColor: '#4c1d95',
    glyphColor: '#ffffff',
    badgeClass: 'bg-purple-700 text-white border-purple-700'
  },
  {
    id: 'EMERGENCY',
    label: 'Emergency Services',
    query: 'Rural Hospital Veterinary Hospital Police Station Fire Station Emergency',
    includedType: 'hospital',
    pinColor: '#dc2626',
    borderColor: '#7f1d1d',
    glyphColor: '#ffffff',
    badgeClass: 'bg-red-600 text-white border-red-600'
  }
];

export const NearbyServices: React.FC = () => {
  const [services, setServices] = useState<NearbyService[]>([]);
  const [filterType, setFilterType] = useState<string>('ALL');

  useEffect(() => {
    api.getNearbyServices().then(data => setServices(data)).catch(console.error);
  }, []);

  const types = [
    { id: 'ALL', label: 'All Verified Directory' },
    { id: 'KVK', label: 'Krishi Vigyan Kendras (KVK)' },
    { id: 'CSC', label: 'CSC Digital Seva' },
    { id: 'BANK_BRANCH', label: 'Agricultural Bank Branches' },
    { id: 'FERTILIZER_DEPOT', label: 'Cooperative Fertilizer Depots' }
  ];

  const filtered = services.filter(s => filterType === 'ALL' || s.type === filterType);

  return (
    <div className="space-y-8 pb-12">
      {/* Header */}
      <div className="border-b border-slate-200 dark:border-slate-800 pb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <MapPin className="w-5 h-5 text-emerald-600" />
            <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white">
              Nearby Agricultural Services & Seva Kendra Map
            </h2>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
            Find nearby Banks, CSC Centres, Agriculture & Government Offices, Krishi Seva Kendras, APMC Mandis, and Emergency Services with live distance and directions.
          </p>
        </div>

        <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200/80 dark:border-emerald-800/60 text-[11px] font-bold text-emerald-800 dark:text-emerald-300 shrink-0">
          <ShieldCheck className="w-4 h-4 text-emerald-600" />
          <span>Location Privacy Protected</span>
        </div>
      </div>

      {/* Live Google Maps Explorer */}
      <FarmerServiceMapExplorer
        title="Live Farmer Service & Facility Map"
        subtitle="Select a service category below, search any village/district, or use your current GPS location to view nearby facilities, phone numbers, and turn-by-turn routes."
        categories={NEARBY_SERVICE_CATEGORIES}
        defaultCategoryId="BANK_BRANCH"
      />

      {/* Offline / District Nodal Reference Directory */}
      <div className="space-y-4 pt-4 border-t border-slate-200 dark:border-slate-800">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h3 className="font-bold text-base text-slate-900 dark:text-white">
              District Nodal Helpline & Reference Centers
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Verified nodal agricultural centers available for offline reference even in low-connectivity areas.
            </p>
          </div>

          {/* Filter Tabs */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
            {types.map((t) => (
              <button
                key={t.id}
                onClick={() => setFilterType(t.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition shrink-0 cursor-pointer ${
                  filterType === t.id
                    ? 'bg-emerald-700 text-white shadow-xs'
                    : 'bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>

        {/* Services Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((item) => (
            <div
              key={item.id}
              className="p-5 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-xs space-y-3 flex flex-col justify-between"
            >
              <div className="space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                    {(item.type || item.category || 'CENTER').replace(/_/g, ' ')}
                  </span>
                  <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                    {item.distanceKm} km away
                  </span>
                </div>

                <h3 className="font-bold text-sm sm:text-base text-slate-900 dark:text-white">
                  {item.name}
                </h3>

                <div className="text-xs text-slate-600 dark:text-slate-300 flex items-start gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
                  <span>{item.address}</span>
                </div>

                <div className="text-xs text-slate-600 dark:text-slate-300 flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  <span>{item.timing}</span>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 dark:border-slate-700 flex items-center justify-between gap-2">
                <a
                  href={`tel:${item.phone}`}
                  className="text-xs font-bold text-emerald-700 dark:text-emerald-400 hover:underline flex items-center gap-1.5"
                >
                  <Phone className="w-3.5 h-3.5" />
                  <span>{item.phone}</span>
                </a>

                <a
                  href={`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(
                    item.name + ' ' + item.address
                  )}&travelmode=driving`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-bold bg-emerald-50 dark:bg-emerald-950/70 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100 transition"
                >
                  <Navigation className="w-3 h-3" />
                  <span>Directions</span>
                </a>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
