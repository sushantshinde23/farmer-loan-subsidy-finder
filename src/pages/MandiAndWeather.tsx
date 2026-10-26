import React, { useState, useEffect } from 'react';
import {
  CloudSun,
  Search,
  Sparkles,
  MapPin,
  Droplets,
  Wind,
  Thermometer
} from 'lucide-react';
import { api } from '../services/api';
import { MandiPrice, WeatherData } from '../types';
import {
  FarmerServiceMapExplorer,
  ServiceCategoryOption
} from '../components/FarmerServiceMapExplorer';

const DISTRICT_COORDINATES: Record<string, { lat: number; lng: number }> = {
  Pune: { lat: 18.5204, lng: 73.8567 },
  Nashik: { lat: 19.9975, lng: 73.7898 },
  Nagpur: { lat: 21.1458, lng: 79.0882 },
  Amravati: { lat: 20.9320, lng: 77.7523 },
  Latur: { lat: 18.4088, lng: 76.5604 },
  Kolhapur: { lat: 16.7050, lng: 74.2433 },
  Indore: { lat: 22.7196, lng: 75.8577 },
  Ludhiana: { lat: 30.9010, lng: 75.8573 }
};

const MANDI_MAP_CATEGORIES: ServiceCategoryOption[] = [
  {
    id: 'APMC_MANDI',
    label: 'APMC Mandis & Market Yards',
    query: 'APMC Krishi Utpanna Bazar Samiti Agricultural Market Yard Mandi',
    pinColor: '#7c3aed',
    borderColor: '#4c1d95',
    glyphColor: '#ffffff',
    badgeClass: 'bg-purple-700 text-white border-purple-700'
  },
  {
    id: 'WAREHOUSE_STORAGE',
    label: 'Cold Storage & Warehouses',
    query: 'Agricultural Cold Storage FCI Godown Warehouse Grain Storage',
    pinColor: '#0284c7',
    borderColor: '#0c4a6e',
    glyphColor: '#ffffff',
    badgeClass: 'bg-sky-700 text-white border-sky-700'
  },
  {
    id: 'AGRO_WEATHER_KVK',
    label: 'KVK & Agro-Met Stations',
    query: 'Krishi Vigyan Kendra Agricultural Research Station Seed Testing Lab',
    pinColor: '#059669',
    borderColor: '#064e3b',
    glyphColor: '#ffffff',
    badgeClass: 'bg-emerald-700 text-white border-emerald-700'
  },
  {
    id: 'KRISHI_INPUTS',
    label: 'Krishi Seva & Weighbridges',
    query: 'Krishi Seva Kendra Dharma Kanta Weighbridge Fertilizer Center',
    pinColor: '#d97706',
    borderColor: '#78350f',
    glyphColor: '#ffffff',
    badgeClass: 'bg-amber-600 text-white border-amber-600'
  }
];

interface LiveGoogleWeather {
  tempC: number;
  feelsLikeC: number;
  conditionText: string;
  humidity: number;
  windKmh: number;
  uvIndex?: number;
  precipProb?: number;
}

export const MandiAndWeather: React.FC = () => {
  const [mandiPrices, setMandiPrices] = useState<MandiPrice[]>([]);
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [liveGmpWeather, setLiveGmpWeather] = useState<LiveGoogleWeather | null>(null);
  const [selectedDistrict, setSelectedDistrict] = useState('Pune');
  const [commoditySearch, setCommoditySearch] = useState('');
  const [loading, setLoading] = useState(true);

  const districts = ['Pune', 'Nashik', 'Nagpur', 'Amravati', 'Latur', 'Kolhapur', 'Indore', 'Ludhiana'];
  const activeCoords = DISTRICT_COORDINATES[selectedDistrict] || DISTRICT_COORDINATES.Pune;

  const loadData = async () => {
    setLoading(true);
    try {
      const [prices, wData] = await Promise.all([
        api.getMandiPrices(),
        api.getWeather(selectedDistrict)
      ]);
      setMandiPrices(prices);
      setWeather(wData);
    } catch (err) {
      console.error('Failed to load Mandi & Weather data:', err);
    } finally {
      setLoading(false);
    }
  };

  // Fetch live Google Maps Platform Weather API currentConditions when available
  useEffect(() => {
    const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
    if (!apiKey) return;

    const coords = DISTRICT_COORDINATES[selectedDistrict] || DISTRICT_COORDINATES.Pune;
    const url = `https://weather.googleapis.com/v1/currentConditions:lookup?key=${encodeURIComponent(
      apiKey
    )}&location.latitude=${coords.lat}&location.longitude=${coords.lng}&unitsSystem=METRIC`;

    fetch(url)
      .then(async (res) => {
        if (res.status === 429) {
          window.dispatchEvent(new CustomEvent('gmp-quota-exceeded'));
          return null;
        }
        if (!res.ok) return null;
        return res.json();
      })
      .then((data) => {
        if (data && data.temperature) {
          setLiveGmpWeather({
            tempC: Math.round(data.temperature.degrees ?? 28),
            feelsLikeC: Math.round(data.feelsLikeTemperature?.degrees ?? data.temperature.degrees ?? 29),
            conditionText: data.weatherCondition?.description?.text || 'Clear Sky',
            humidity: data.relativeHumidity ?? 55,
            windKmh: Math.round(data.wind?.speed?.value ?? 12),
            uvIndex: data.uvIndex,
            precipProb: data.precipitation?.probability?.percent ?? 10
          });
        } else {
          setLiveGmpWeather(null);
        }
      })
      .catch(() => {
        setLiveGmpWeather(null);
      });
  }, [selectedDistrict]);

  useEffect(() => {
    loadData();
  }, [selectedDistrict]);

  const filteredPrices = mandiPrices.filter(p => {
    const name = p.crop || p.commodity || '';
    const market = p.marketName || p.market || '';
    return name.toLowerCase().includes(commoditySearch.toLowerCase()) ||
      market.toLowerCase().includes(commoditySearch.toLowerCase());
  });

  const displayTemp = liveGmpWeather?.tempC ?? weather?.temperatureC ?? weather?.current?.temperatureCelsius ?? 29;
  const displayCondition = liveGmpWeather?.conditionText ?? weather?.condition ?? weather?.current?.condition ?? 'Sunny';
  const displayHumidity = liveGmpWeather?.humidity ?? weather?.humidityPercent ?? weather?.current?.humidity ?? 52;
  const displayWind = liveGmpWeather?.windKmh ?? weather?.windSpeedKmh ?? weather?.current?.windSpeedKmH ?? 14;
  const displayRainProb = liveGmpWeather?.precipProb ?? weather?.rainProbabilityPercent ?? 10;

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="border-b border-slate-200 dark:border-slate-800 pb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white">
            Daily APMC Mandi Rates, Market Map & Farm Weather
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
            Real-time daily modal prices from e-NAM, live APMC market locator map, and localized agricultural weather advisories.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <label className="text-xs font-semibold text-slate-600 dark:text-slate-300">
            Select District Hub:
          </label>
          <select
            value={selectedDistrict}
            onChange={(e) => setSelectedDistrict(e.target.value)}
            className="text-xs py-1.5 px-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-semibold"
          >
            {districts.map(d => (
              <option key={d} value={d}>{d}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Weather & Farm Advisory Banner */}
      {weather && (
        <div className="p-5 rounded-2xl bg-gradient-to-br from-emerald-800 via-emerald-900 to-slate-950 text-white shadow-md border border-emerald-700/40 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-xl bg-white/10 text-amber-300 backdrop-blur-xs">
                <CloudSun className="w-8 h-8" />
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="text-lg font-bold">{selectedDistrict} Agro-Weather</h3>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-700 text-emerald-100 font-semibold">
                    {liveGmpWeather ? 'Google Weather + IMD Live' : 'IMD Agro-Advisory'}
                  </span>
                </div>
                <div className="text-xs text-emerald-100 flex flex-wrap items-center gap-3 mt-1">
                  <span>{displayCondition}</span>
                  <span className="inline-flex items-center gap-1">
                    <Droplets className="w-3.5 h-3.5 text-sky-300" />
                    Humidity {displayHumidity}%
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <Wind className="w-3.5 h-3.5 text-emerald-300" />
                    Wind {displayWind} km/h
                  </span>
                  {liveGmpWeather?.feelsLikeC !== undefined && (
                    <span className="inline-flex items-center gap-1">
                      <Thermometer className="w-3.5 h-3.5 text-amber-300" />
                      Feels like {liveGmpWeather.feelsLikeC}°C
                    </span>
                  )}
                </div>
              </div>
            </div>

            <div className="text-right">
              <div className="text-3xl font-black text-amber-300 font-mono">
                {displayTemp}°C
              </div>
              <div className="text-[11px] text-emerald-200">
                Rainfall Prob: {displayRainProb}%
              </div>
            </div>
          </div>

          {/* 5-Day Forecast Strip */}
          <div className="grid grid-cols-5 gap-2 pt-2 border-t border-emerald-800/80 text-center">
            {weather.forecast.map((f, idx) => (
              <div key={idx} className="p-2 rounded-xl bg-white/5 text-xs">
                <div className="text-[10px] text-emerald-300 font-bold">{f.day || f.date}</div>
                <div className="font-mono font-black text-sm text-white mt-0.5">{f.temp ?? f.tempMaxCelsius}°</div>
                <div className="text-[10px] text-emerald-200 truncate">{f.condition}</div>
              </div>
            ))}
          </div>

          {/* Agro Advisory Note */}
          <div className="p-3 rounded-xl bg-amber-500/20 border border-amber-400/40 text-xs text-amber-200 flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-amber-300 shrink-0" />
            <span>
              <strong>KVK Agro Advisory: </strong> {weather.advisory}
            </span>
          </div>
        </div>
      )}

      {/* Interactive APMC Mandi & Storage Map */}
      <FarmerServiceMapExplorer
        title={`Nearby APMC Mandis, Cold Storage & Weighbridges (${selectedDistrict} Region)`}
        subtitle="Locate nearby APMC market yards, cold storages, FCI warehouses, and KVK weather centers. Check travel distance for crop transport and get directions."
        categories={MANDI_MAP_CATEGORIES}
        defaultCategoryId="APMC_MANDI"
        initialCenter={activeCoords}
        initialZoom={11}
      />

      {/* APMC Mandi Rates Table */}
      <div className="space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <h3 className="font-bold text-base text-slate-900 dark:text-white flex items-center gap-2">
            <MapPin className="w-4 h-4 text-emerald-600" />
            <span>Official APMC Market Rates (₹ per Quintal / 100 kg)</span>
          </h3>

          <div className="relative w-full sm:w-64">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={commoditySearch}
              onChange={(e) => setCommoditySearch(e.target.value)}
              placeholder="Search crop or market..."
              className="w-full text-xs py-2 pl-9 pr-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
            />
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden bg-white dark:bg-slate-800">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-slate-900/60 text-slate-500 font-bold border-b border-slate-200 dark:border-slate-700">
                <tr>
                  <th className="p-3">Commodity</th>
                  <th className="p-3">Market / APMC</th>
                  <th className="p-3">Min Price</th>
                  <th className="p-3">Modal Price (Benchmark)</th>
                  <th className="p-3">Max Price</th>
                  <th className="p-3">Arrival</th>
                  <th className="p-3">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-700/60">
                {filteredPrices.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-750">
                    <td className="p-3 font-bold text-slate-900 dark:text-white">
                      {item.crop || item.commodity}
                    </td>
                    <td className="p-3 text-slate-600 dark:text-slate-300">
                      {item.marketName || item.market}, {item.state}
                    </td>
                    <td className="p-3 font-mono text-slate-600 dark:text-slate-400">
                      ₹{(item.minPrice || item.minPricePerQuintal || 0).toLocaleString()}
                    </td>
                    <td className="p-3 font-mono font-bold text-emerald-700 dark:text-emerald-400 text-sm">
                      ₹{item.modalPricePerQuintal.toLocaleString()}
                    </td>
                    <td className="p-3 font-mono text-slate-600 dark:text-slate-400">
                      ₹{(item.maxPrice || item.maxPricePerQuintal || 0).toLocaleString()}
                    </td>
                    <td className="p-3 text-slate-500">
                      {item.arrivalTons ? `${item.arrivalTons} Tons` : 'Normal'}
                    </td>
                    <td className="p-3 text-slate-400 text-[11px]">
                      {item.date}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};
