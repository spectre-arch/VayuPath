import React, { useState, useEffect } from 'react';
import { Flame, Wind, Compass, AlertTriangle, TrendingUp, RefreshCw, Info } from 'lucide-react';
import { MapContainer, TileLayer, CircleMarker, Popup } from 'react-leaflet';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, Legend } from 'recharts';
import { api } from '../services/api';

export function StubbleView({ t }) {
  const [firesData, setFiresData] = useState(null);
  const [trendsData, setTrendsData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);
    try {
      const [h, tr] = await Promise.all([
        api.getHotspots(),
        api.getTrends(),
      ]);
      setFiresData(h);
      setTrendsData(tr);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  const drift = firesData?.smoke_drift;

  // Chart data formatting
  const chartData = trendsData?.dates?.map((d, i) => ({
    date: d,
    lastYear: trendsData.last_year?.[i],
    currentYear: trendsData.current_year?.[i],
  })) || [];

  return (
    <div className="space-y-6">
      {/* Banner */}
      <div className="bg-gradient-to-r from-orange-700 via-amber-700 to-rose-700 rounded-3xl p-6 sm:p-8 text-white shadow-md">
        <div className="max-w-3xl">
          <span className="px-3 py-1 rounded-full text-xs font-bold bg-white/20 backdrop-blur-md uppercase tracking-wider">
            Module 3 • Agricultural Fire & Smoke Tracker
          </span>
          <h2 className="text-2xl sm:text-3xl font-black mt-2 tracking-tight">
            NASA FIRMS Active Fires & Smoke Drift
          </h2>
          <p className="text-orange-100 text-sm mt-2 leading-relaxed">
            Real-time satellite detections from NASA VIIRS & MODIS instruments across Punjab, Haryana, UP, and Rajasthan with atmospheric wind drift trajectories towards Delhi-NCR.
          </p>
        </div>
      </div>

      {/* Downwind Smoke Drift Impact Alert Banner */}
      {drift && (
        <div className="p-5 rounded-2xl bg-amber-50 border border-amber-200/90 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-200/80 text-amber-900 flex items-center justify-center shrink-0">
              <Compass className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-amber-950">{t.stubble.downwindAlert}</h3>
                <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-amber-200 text-amber-900">
                  {drift.risk_level} INFLUX RISK
                </span>
              </div>
              <p className="text-xs text-amber-900 mt-1 leading-relaxed font-medium">
                {drift.downwind_alert}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-4 bg-white/80 p-3 rounded-xl border border-amber-200/60 shrink-0 text-xs">
            <div>
              <span className="text-[10px] text-slate-400 font-bold block">Wind Speed</span>
              <span className="font-extrabold text-slate-800">{drift.wind_speed_kmh} km/h</span>
            </div>
            <div>
              <span className="text-[10px] text-slate-400 font-bold block">Wind Heading</span>
              <span className="font-extrabold text-slate-800">{Math.round(drift.wind_direction_deg)}° NW</span>
            </div>
            <div>
              <span className="text-[10px] text-slate-400 font-bold block">Arrival Window</span>
              <span className="font-extrabold text-amber-700">~{Math.round(drift.estimated_arrival_hours)} hrs</span>
            </div>
          </div>
        </div>
      )}

      {/* State Breakdown Cards */}
      {firesData?.state_counts && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {Object.entries(firesData.state_counts).map(([st, cnt]) => (
            <div key={st} className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wide">{st}</span>
              <div className="text-2xl font-black text-slate-900 mt-1 flex items-baseline gap-1.5">
                <span>{cnt}</span>
                <span className="text-xs font-semibold text-rose-600">Hotspots</span>
              </div>
              <p className="text-[10px] text-slate-400 mt-1">24h Satellite Detection</p>
            </div>
          ))}
        </div>
      )}

      {/* Map & Seasonal Trend Chart Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Active Fire Satellite Map */}
        <div className="lg:col-span-7 bg-white rounded-2xl p-4 border border-slate-200 shadow-xs flex flex-col">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Flame className="w-4 h-4 text-rose-600" />
              <h3 className="text-sm font-bold text-slate-900">NASA Active Fire Hotspot Layer</h3>
            </div>
            <span className="text-[11px] text-slate-500">
              {firesData?.total_hotspots_detected || 0} Detections Today
            </span>
          </div>

          <div className="h-[380px] w-full rounded-xl overflow-hidden border border-slate-200 relative">
            <MapContainer
              center={[30.0, 76.0]}
              zoom={7}
              className="h-full w-full z-10"
            >
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />

              {/* Fire Markers */}
              {firesData?.hotspots?.map((h, i) => (
                <CircleMarker
                  key={i}
                  center={[h.lat, h.lon]}
                  radius={5}
                  pathOptions={{
                    color: '#991b1b',
                    fillColor: '#ef4444',
                    fillOpacity: 0.85,
                    weight: 1,
                  }}
                >
                  <Popup>
                    <div className="text-xs p-1">
                      <p className="font-bold text-rose-700">Active Fire Hotspot</p>
                      <p>Location: ({h.lat.toFixed(3)}, {h.lon.toFixed(3)})</p>
                      <p>State: {h.state}</p>
                      <p>FRP: {h.frp} MW</p>
                      <p className="text-[10px] text-slate-400 mt-1">Instrument: {firesData.data_source}</p>
                    </div>
                  </Popup>
                </CircleMarker>
              ))}
            </MapContainer>

            {/* Trajectory Wind Overlay Graphic */}
            <div className="absolute top-3 right-3 z-[400] bg-white/95 backdrop-blur-md px-3 py-2 rounded-xl shadow-md border border-slate-200 text-xs">
              <div className="flex items-center gap-2 font-bold text-slate-800">
                <Wind className="w-4 h-4 text-sky-600" />
                <span>Smoke Drift Vector</span>
              </div>
              <p className="text-[10px] text-slate-500 mt-0.5">Heading: Southeast (135°)</p>
            </div>
          </div>

          <p className="text-[10px] text-slate-400 mt-3">
            Source: {firesData?.data_source} • {t.stubble.disclaimer}
          </p>
        </div>

        {/* Right: Seasonal Oct-Nov Harvest Trend Chart */}
        <div className="lg:col-span-5 bg-white rounded-2xl p-5 border border-slate-200 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp className="w-4 h-4 text-amber-600" />
              <h3 className="text-sm font-bold text-slate-900">{t.stubble.seasonalTrends}</h3>
            </div>
            <p className="text-xs text-slate-500 mb-4">
              Historical fire frequency curve during Kharif paddy residue harvesting compared to current year satellite observations.
            </p>

            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData}>
                  <XAxis dataKey="date" tick={{ fontSize: 9 }} interval={2} />
                  <YAxis tick={{ fontSize: 9 }} width={30} />
                  <Tooltip />
                  <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }} />
                  <Line type="monotone" dataKey="lastYear" name="Last Year (Baseline)" stroke="#94a3b8" strokeWidth={2} strokeDasharray="3 3" dot={false} />
                  <Line type="monotone" dataKey="currentYear" name="Current Season" stroke="#ea580c" strokeWidth={3} dot={{ r: 3 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 text-[11px] text-slate-600">
            <strong>CAQM Protocol Note:</strong> Stubble fires typically peak between Oct 25 and Nov 15 due to the tight 2-week window between rice harvesting and wheat sowing.
          </div>
        </div>
      </div>
    </div>
  );
}
