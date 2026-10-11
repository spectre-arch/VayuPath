import React, { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, CircleMarker, useMap } from 'react-leaflet';
import L from 'leaflet';
import { Search, MapPin, Layers, Flame, TrendingUp, AlertTriangle, Info, CheckCircle2, RefreshCw } from 'lucide-react';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, BarChart, Bar } from 'recharts';
import { api } from '../services/api';
import { PlaceSearchInput } from './PlaceSearchInput';

// Center map view updater helper
function ChangeMapView({ coords, zoom }) {
  const map = useMap();
  useEffect(() => {
    if (coords) {
      map.setView(coords, zoom || map.getZoom());
    }
  }, [coords, zoom, map]);
  return null;
}

export function AqiTrackerView({ t, lang }) {
  const [stations, setStations] = useState([]);
  const [gridData, setGridData] = useState(null);
  const [rankings, setRankings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedStation, setSelectedStation] = useState(null);
  const [showHeatmap, setShowHeatmap] = useState(false);
  const [selectedPollutant, setSelectedPollutant] = useState('aqi');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [mapCenter, setMapCenter] = useState([23.5, 78.5]);
  const [mapZoom, setMapZoom] = useState(5);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);
    try {
      const [stRes, rankRes] = await Promise.all([
        api.getStations().catch(() => ({ stations: [] })),
        api.getRankings().catch(() => null),
      ]);
      setStations(stRes.stations || []);
      setRankings(rankRes);
      if (stRes.stations && stRes.stations.length > 0) {
        setSelectedStation(stRes.stations[0]);
      }
    } catch (e) {
      console.error('Error loading AQI data:', e);
    } finally {
      setLoading(false);
    }
  }

  async function toggleHeatmapLayer() {
    if (!showHeatmap && !gridData) {
      try {
        const g = await api.getGrid();
        setGridData(g);
      } catch (e) {
        console.error('Heatmap load error:', e);
      }
    }
    setShowHeatmap(!showHeatmap);
  }

  async function handleSearch(e) {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    setSearching(true);
    try {
      const res = await api.searchLocation(searchQuery);
      setSearchResults(res.results || []);
    } catch (err) {
      console.error(err);
    } finally {
      setSearching(false);
    }
  }

  function handleSelectSearchResult(place) {
    setSearchQuery(place.name.split(',')[0]);
    setMapCenter([place.lat, place.lon]);
    setMapZoom(13);
    setSearchResults([]);
    // Find closest station or fetch coordinate AQI
    api.getLocationAQI(place.lat, place.lon).then((data) => {
      setSelectedStation(data);
    }).catch(console.error);
  }

  function handleUseMyLocation() {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const lat = pos.coords.latitude;
          const lon = pos.coords.longitude;
          setMapCenter([lat, lon]);
          setMapZoom(12);
          api.getLocationAQI(lat, lon).then((data) => {
            setSelectedStation(data);
          }).catch(console.error);
        },
        (err) => {
          alert('Could not retrieve current location: ' + err.message);
        }
      );
    }
  }

  const pollutantExplainers = {
    pm25: { name: 'PM2.5', desc: 'Fine inhalable particles with diameters 2.5 micrometers and smaller. Penetrate deep into lung alveoli and bloodstream, causing systemic inflammation.' },
    pm10: { name: 'PM10', desc: 'Inhalable dust particles under 10 micrometers. Originates from road dust, construction, and mechanical abrasion; causes bronchial irritation.' },
    no2: { name: 'NO2 (Nitrogen Dioxide)', desc: 'Emitted from vehicle exhausts and thermal power plants. Causes airway inflammation and aggravates pediatric asthma.' },
    so2: { name: 'SO2 (Sulphur Dioxide)', desc: 'Derived from burning fossil fuels containing sulfur. Causes bronchoconstriction and acidic haze.' },
    co: { name: 'CO (Carbon Monoxide)', desc: 'Odourless gas from incomplete combustion in vehicular traffic; impairs arterial oxygen delivery to cardiac tissue.' },
    ozone: { name: 'O3 (Ground-level Ozone)', desc: 'Formed via photochemical reactions between NOx and VOCs under intense sunlight; damages lung lining.' },
  };

  return (
    <div className="space-y-6">
      {/* Top Controls Bar */}
      <div className="bg-white rounded-2xl p-4 sm:p-5 shadow-xs border border-slate-200">
        <div className="flex flex-col md:flex-row gap-4 items-stretch md:items-center justify-between">
          {/* Autocomplete City, Landmark, Building & PIN Search */}
          <PlaceSearchInput
            value={searchQuery}
            onChange={setSearchQuery}
            onSelectPlace={handleSelectSearchResult}
            placeholder="Type place or building (e.g. DTU, IIT Delhi, Connaught Place, AIIMS, Cyber City)..."
            className="flex-1 max-w-lg"
          />

          {/* Action buttons */}
          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={handleUseMyLocation}
              className="flex items-center gap-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold transition-all"
            >
              <MapPin className="w-3.5 h-3.5 text-sky-600" />
              <span>{t.aqi.useLocation}</span>
            </button>

            <button
              onClick={toggleHeatmapLayer}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold transition-all border ${
                showHeatmap
                  ? 'bg-amber-50 text-amber-800 border-amber-300'
                  : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
              }`}
            >
              <Layers className="w-3.5 h-3.5 text-amber-600" />
              <span>{showHeatmap ? t.aqi.hideHeatmap : t.aqi.showHeatmap}</span>
            </button>

            <button
              onClick={loadData}
              disabled={loading}
              className="p-2 text-slate-500 hover:text-slate-800 rounded-xl hover:bg-slate-100 border border-slate-200 transition-all"
              title="Refresh Live Data"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>
      </div>

      {/* Main Map + Station Detail View Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Interactive Map */}
        <div className="lg:col-span-8 bg-white rounded-2xl p-4 shadow-xs border border-slate-200 flex flex-col">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
              <h2 className="text-sm font-bold text-slate-800">{t.aqi.title}</h2>
            </div>
            <div className="flex items-center gap-2 text-[11px] text-slate-500">
              <span className="font-semibold text-sky-600">{stations.length}</span> Official & Model Stations Active
            </div>
          </div>

          {/* Leaflet Map Canvas */}
          <div className="h-[460px] w-full rounded-xl overflow-hidden relative border border-slate-200">
            <MapContainer
              center={mapCenter}
              zoom={mapZoom}
              scrollWheelZoom={true}
              className="h-full w-full z-10"
            >
              <ChangeMapView coords={mapCenter} zoom={mapZoom} />
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />

              {/* IDW Heatmap Matrix Grid Cells */}
              {showHeatmap && gridData?.grid && (
                gridData.grid.flatMap((row, rIdx) =>
                  row.map((cell, cIdx) => (
                    <CircleMarker
                      key={`grid-${rIdx}-${cIdx}`}
                      center={[cell.lat, cell.lon]}
                      radius={18}
                      pathOptions={{
                        color: 'transparent',
                        fillColor: cell.color,
                        fillOpacity: 0.35,
                      }}
                    />
                  ))
                )
              )}

              {/* Live Station Markers */}
              {stations.map((st) => {
                const color = st.color || '#94a3b8';
                const isSelected = selectedStation?.id === st.id;
                return (
                  <CircleMarker
                    key={st.id}
                    center={[st.lat, st.lon]}
                    radius={isSelected ? 11 : 8}
                    eventHandlers={{
                      click: () => setSelectedStation(st),
                    }}
                    pathOptions={{
                      color: isSelected ? '#0f172a' : '#ffffff',
                      weight: isSelected ? 3 : 2,
                      fillColor: color,
                      fillOpacity: 0.95,
                    }}
                  >
                    <Popup>
                      <div className="p-1 max-w-[200px]">
                        <p className="font-bold text-xs text-slate-900">{st.name}</p>
                        <p className="text-[11px] text-slate-500">{st.city}, {st.state}</p>
                        <div className="mt-2 flex items-center justify-between">
                          <span className="text-base font-extrabold" style={{ color }}>AQI {st.aqi ?? 'N/A'}</span>
                          <span className="text-[10px] px-1.5 py-0.5 rounded font-semibold bg-slate-100">{st.category}</span>
                        </div>
                        <p className="text-[10px] text-slate-400 mt-1 truncate">Source: {st.source}</p>
                      </div>
                    </Popup>
                  </CircleMarker>
                );
              })}
            </MapContainer>

            {/* Map Legend Overlay */}
            <div className="absolute bottom-3 left-3 z-[400] bg-white/95 backdrop-blur-md px-3 py-2 rounded-xl shadow-md border border-slate-200 text-[10px]">
              <p className="font-bold text-slate-700 mb-1">CPCB NAQI Scale</p>
              <div className="grid grid-cols-3 gap-x-2 gap-y-1">
                <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-[#00B050]"></span>0-50 Good</span>
                <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-[#92D050]"></span>51-100 Satisfactory</span>
                <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-[#FFFF00]"></span>101-200 Moderate</span>
                <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-[#FF9900]"></span>201-300 Poor</span>
                <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-[#FF0000]"></span>301-400 Very Poor</span>
                <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-[#C00000]"></span>401+ Severe</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Selected Station Details Drawer */}
        <div className="lg:col-span-4 bg-white rounded-2xl p-5 shadow-xs border border-slate-200 flex flex-col justify-between">
          {selectedStation ? (
            <div className="space-y-4">
              {/* Header */}
              <div>
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-semibold tracking-wider text-slate-500 uppercase">{selectedStation.city || 'Location'}</span>
                  {selectedStation.is_danger_zone && (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-100 text-red-700 border border-red-200 flex items-center gap-1">
                      <AlertTriangle className="w-3 h-3" /> Danger Zone
                    </span>
                  )}
                </div>
                <h3 className="text-lg font-black text-slate-900 mt-0.5">{selectedStation.name}</h3>
                <p className="text-xs text-slate-500">{selectedStation.state}</p>
              </div>

              {/* Main AQI Hero Metric */}
              <div
                className="p-4 rounded-xl border flex items-center justify-between"
                style={{
                  backgroundColor: `${selectedStation.color}15`,
                  borderColor: `${selectedStation.color}50`,
                }}
              >
                <div>
                  <div className="text-4xl font-black" style={{ color: selectedStation.color }}>
                    {selectedStation.aqi ?? 'N/A'}
                  </div>
                  <div className="text-xs font-bold tracking-wide mt-1 uppercase" style={{ color: selectedStation.color }}>
                    {selectedStation.category}
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-[11px] text-slate-500 font-medium">{t.aqi.prominentPollutant}</div>
                  <div className="text-base font-extrabold text-slate-800">{selectedStation.prominent_pollutant || 'PM2.5'}</div>
                </div>
              </div>

              {/* Description */}
              <p className="text-xs text-slate-600 bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                {selectedStation.description || 'Monitor regional advisories during high particulate spikes.'}
              </p>

              {/* 24h Hourly Trend Area Chart */}
              {selectedStation.hourly_forecast && selectedStation.hourly_forecast.length > 0 && (
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-xs font-bold text-slate-800">24-Hour Trend</span>
                    <span className="text-[10px] text-slate-400">Hourly Forecast</span>
                  </div>
                  <div className="h-32 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={selectedStation.hourly_forecast}>
                        <defs>
                          <linearGradient id="aqiGrad" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor={selectedStation.color} stopOpacity={0.4}/>
                            <stop offset="95%" stopColor={selectedStation.color} stopOpacity={0.0}/>
                          </linearGradient>
                        </defs>
                        <XAxis
                          dataKey="time"
                          tickFormatter={(t) => t.split('T')[1] || t}
                          tick={{ fontSize: 9 }}
                          interval={4}
                        />
                        <YAxis domain={['auto', 'auto']} tick={{ fontSize: 9 }} width={25} />
                        <Tooltip
                          labelFormatter={(t) => `Time: ${t.split('T')[1] || t}`}
                          formatter={(v) => [`AQI: ${v}`, 'Air Quality']}
                        />
                        <Area type="monotone" dataKey="aqi" stroke={selectedStation.color} strokeWidth={2} fillOpacity={1} fill="url(#aqiGrad)" />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              )}

              {/* Individual Pollutants Breakdown */}
              <div>
                <h4 className="text-xs font-bold text-slate-800 mb-2">{t.aqi.explainers}</h4>
                <div className="grid grid-cols-3 gap-2">
                  {Object.entries(selectedStation.pollutants || {}).map(([k, v]) => {
                    if (v === null || v === undefined) return null;
                    const meta = pollutantExplainers[k] || { name: k.toUpperCase() };
                    return (
                      <div key={k} className="p-2 bg-slate-50 rounded-lg border border-slate-100 text-center">
                        <div className="text-[10px] font-bold text-slate-600 truncate">{meta.name}</div>
                        <div className="text-xs font-black text-slate-900 mt-0.5">
                          {typeof v === 'number' ? v.toFixed(1) : v}
                        </div>
                        <div className="text-[9px] text-slate-400">µg/m³</div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Data Source & Timestamp Verification */}
              <div className="pt-3 border-t border-slate-100 text-[11px] text-slate-500 space-y-1">
                <div className="flex items-center justify-between">
                  <span>{t.aqi.source}:</span>
                  <span className="font-semibold text-slate-700">{selectedStation.source}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>{t.aqi.updated}:</span>
                  <span className="font-semibold text-slate-700">{new Date(selectedStation.last_updated).toLocaleTimeString()}</span>
                </div>
              </div>
            </div>
          ) : (
            <div className="h-full flex items-center justify-center text-slate-400 text-xs">
              Select a station marker on the map to inspect live metrics.
            </div>
          )}
        </div>
      </div>

      {/* Rankings & Danger Zones Grid */}
      {rankings && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Most Polluted */}
          <div className="bg-white rounded-2xl p-5 shadow-xs border border-slate-200">
            <div className="flex items-center gap-2 mb-3">
              <Flame className="w-4 h-4 text-rose-600" />
              <h3 className="text-sm font-bold text-slate-800">{t.aqi.pollutedCities}</h3>
            </div>
            <div className="divide-y divide-slate-100">
              {(rankings.top_polluted || []).map((st, i) => (
                <div
                  key={st.id}
                  onClick={() => { setSelectedStation(st); setMapCenter([st.lat, st.lon]); setMapZoom(10); }}
                  className="py-2.5 flex items-center justify-between cursor-pointer hover:bg-slate-50 px-2 rounded-lg transition-colors"
                >
                  <div className="flex items-center gap-2.5">
                    <span className="text-xs font-bold text-slate-400">#{i + 1}</span>
                    <div>
                      <p className="text-xs font-bold text-slate-800">{st.city}</p>
                      <p className="text-[10px] text-slate-500 truncate max-w-[140px]">{st.name}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-xs font-black text-rose-600">AQI {st.aqi}</span>
                    <p className="text-[9px] text-slate-400">{st.category}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Cleanest Cities */}
          <div className="bg-white rounded-2xl p-5 shadow-xs border border-slate-200">
            <div className="flex items-center gap-2 mb-3">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <h3 className="text-sm font-bold text-slate-800">{t.aqi.cleanestCities}</h3>
            </div>
            <div className="divide-y divide-slate-100">
              {(rankings.cleanest || []).map((st, i) => (
                <div
                  key={st.id}
                  onClick={() => { setSelectedStation(st); setMapCenter([st.lat, st.lon]); setMapZoom(10); }}
                  className="py-2.5 flex items-center justify-between cursor-pointer hover:bg-slate-50 px-2 rounded-lg transition-colors"
                >
                  <div className="flex items-center gap-2.5">
                    <span className="text-xs font-bold text-slate-400">#{i + 1}</span>
                    <div>
                      <p className="text-xs font-bold text-slate-800">{st.city}</p>
                      <p className="text-[10px] text-slate-500 truncate max-w-[140px]">{st.name}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-xs font-black text-emerald-600">AQI {st.aqi}</span>
                    <p className="text-[9px] text-slate-400">{st.category}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Auto-highlighted Danger Zones */}
          <div className="bg-white rounded-2xl p-5 shadow-xs border border-slate-200">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-600" />
                <h3 className="text-sm font-bold text-slate-800">{t.aqi.dangerZones}</h3>
              </div>
              <span className="text-xs px-2 py-0.5 rounded-full font-bold bg-amber-100 text-amber-800">
                {rankings.danger_zone_count || 0} Alert Zones
              </span>
            </div>
            <p className="text-xs text-slate-500 mb-2">High particulate toxicity. Vulnerable populations must wear N95 respirators.</p>
            <div className="max-h-48 overflow-y-auto space-y-1.5 pr-1">
              {(rankings.danger_zones || []).map((st) => (
                <div
                  key={st.id}
                  onClick={() => { setSelectedStation(st); setMapCenter([st.lat, st.lon]); setMapZoom(10); }}
                  className="p-2 bg-amber-50/60 hover:bg-amber-100/60 rounded-xl border border-amber-200/60 cursor-pointer flex items-center justify-between transition-colors"
                >
                  <div>
                    <span className="text-xs font-bold text-slate-800">{st.name}</span>
                    <p className="text-[10px] text-slate-500">{st.city}</p>
                  </div>
                  <span className="text-xs font-black text-red-600">AQI {st.aqi}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
