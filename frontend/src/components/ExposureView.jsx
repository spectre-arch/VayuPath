import React, { useState, useEffect } from 'react';
import { Shield, Cigarette, Clock, Navigation, CheckCircle, AlertCircle, ArrowRight, UserCheck, Heart, Baby, Sparkles, MapPin, ChevronDown, ChevronUp, Route } from 'lucide-react';
import { MapContainer, TileLayer, Polyline, Marker, Popup, useMap } from 'react-leaflet';
import { api } from '../services/api';
import { PlaceSearchInput } from './PlaceSearchInput';

function ChangeMapView({ coords, zoom }) {
  const map = useMap();
  useEffect(() => {
    if (coords && coords[0] && coords[1]) {
      map.setView(coords, zoom || map.getZoom());
    }
  }, [coords, zoom, map]);
  return null;
}

export function ExposureView({ t, userProfile, setUserProfile }) {
  const [profiles, setProfiles] = useState({});
  const [activities, setActivities] = useState([
    { id: 1, mode: 'walk', duration_minutes: 35, pm25: 180, location: 'Morning Metro Commute' },
    { id: 2, mode: 'indoor', duration_minutes: 420, pm25: 35, location: 'Air-Filtered Office' },
    { id: 3, mode: 'bike', duration_minutes: 25, pm25: 220, location: 'Evening Roadside Transit' },
  ]);
  const [exposureResult, setExposureResult] = useState(null);
  const [calculating, setCalculating] = useState(false);

  // Safe-Route Navigator State
  const [routeMode, setRouteMode] = useState('car');
  const [routeOrigin, setRouteOrigin] = useState('Connaught Place, Central Hub');
  const [routeDestination, setRouteDestination] = useState('DTU, Rohini North Campus');
  const [showTurnSteps, setShowTurnSteps] = useState(false);
  const [selectedRouteIndex, setSelectedRouteIndex] = useState(0);
  const [startCoords, setStartCoords] = useState({ lat: 28.632, lon: 77.219 });
  const [endCoords, setEndCoords] = useState({ lat: 28.750, lon: 77.118 });
  const [navData, setNavData] = useState(null);
  const [navLoading, setNavLoading] = useState(false);

  useEffect(() => {
    api.getProfiles().then(setProfiles).catch(console.error);
    runExposureCalc();
    fetchRoutes(startCoords, endCoords, routeMode);
  }, [userProfile]);

  async function runExposureCalc() {
    setCalculating(true);
    try {
      const res = await api.calculateExposure(activities, userProfile);
      setExposureResult(res);
    } catch (e) {
      console.error(e);
    } finally {
      setCalculating(false);
    }
  }

  async function fetchRoutes(start = startCoords, end = endCoords, mode = routeMode) {
    setNavLoading(true);
    try {
      const res = await api.navigateRoutes({
        start_lat: start.lat,
        start_lon: start.lon,
        end_lat: end.lat,
        end_lon: end.lon,
        mode: mode,
        profile: userProfile,
      });
      setNavData(res);
    } catch (e) {
      console.error(e);
    } finally {
      setNavLoading(false);
    }
  }

  function handleSelectOrigin(place) {
    setRouteOrigin(place.name.split(',')[0]);
    const coords = { lat: place.lat, lon: place.lon };
    setStartCoords(coords);
    fetchRoutes(coords, endCoords, routeMode);
  }

  function handleSelectDestination(place) {
    setRouteDestination(place.name.split(',')[0]);
    const coords = { lat: place.lat, lon: place.lon };
    setEndCoords(coords);
    fetchRoutes(startCoords, coords, routeMode);
  }

  function handleAddActivity() {
    const newAct = {
      id: Date.now(),
      mode: 'walk',
      duration_minutes: 30,
      pm25: 150,
      location: 'Outdoor Walking',
    };
    setActivities([...activities, newAct]);
  }

  function handleUpdateActivity(id, field, value) {
    setActivities(activities.map(a => a.id === id ? { ...a, [field]: value } : a));
  }

  function handleRemoveActivity(id) {
    setActivities(activities.filter(a => a.id !== id));
  }

  const profileIcons = {
    adult: UserCheck,
    child: Baby,
    senior: Clock,
    pregnant: Heart,
    asthma_heart: AlertCircle,
    outdoor_worker: Navigation,
  };

  return (
    <div className="space-y-8">
      {/* Module Banner */}
      <div className="bg-gradient-to-r from-sky-700 via-sky-600 to-teal-600 rounded-3xl p-6 sm:p-8 text-white shadow-md">
        <div className="max-w-3xl">
          <span className="px-3 py-1 rounded-full text-xs font-bold bg-white/20 backdrop-blur-md uppercase tracking-wider">
            Module 2 • Vulnerability Protection
          </span>
          <h2 className="text-2xl sm:text-3xl font-black mt-2 tracking-tight">
            Personal Pollution Exposure & Safe Corridors
          </h2>
          <p className="text-sky-100 text-sm mt-2 leading-relaxed">
            Different bodies breathe different amounts of air. A child or asthmatic individual absorbs up to 2.2× higher toxic particulate doses in identical ambient smog.
          </p>
        </div>
      </div>

      {/* 1. Vulnerability Profile Selector */}
      <div className="bg-white rounded-2xl p-6 shadow-xs border border-slate-200">
        <h3 className="text-base font-bold text-slate-900 mb-1">{t.exposure.selectProfile}</h3>
        <p className="text-xs text-slate-500 mb-4">Select the profile of the person traveling to calibrate physiological risk factors.</p>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {Object.entries(profiles).map(([k, p]) => {
            const Icon = profileIcons[k] || UserCheck;
            const isSelected = userProfile === k;
            return (
              <button
                key={k}
                onClick={() => setUserProfile(k)}
                className={`p-3.5 rounded-xl border text-left transition-all flex flex-col justify-between ${
                  isSelected
                    ? 'border-sky-500 bg-sky-50/70 shadow-xs ring-2 ring-sky-500/30'
                    : 'border-slate-200 hover:border-slate-300 bg-white'
                }`}
              >
                <div>
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center mb-2 ${
                    isSelected ? 'bg-sky-600 text-white' : 'bg-slate-100 text-slate-600'
                  }`}>
                    <Icon className="w-4 h-4" />
                  </div>
                  <h4 className="text-xs font-bold text-slate-900 leading-tight">{p.label}</h4>
                </div>
                <div className="mt-3 flex items-center justify-between text-[11px]">
                  <span className="text-slate-400">Multiplier</span>
                  <span className={`font-black ${isSelected ? 'text-sky-700' : 'text-slate-700'}`}>
                    {p.factor}×
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* 2. Personal Exposure Tracker & Cigarette Equivalence */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Log Activities */}
        <div className="lg:col-span-7 bg-white rounded-2xl p-6 shadow-xs border border-slate-200">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-base font-bold text-slate-900">{t.exposure.logActivity}</h3>
              <p className="text-xs text-slate-500">Record micro-environments and travel modes today.</p>
            </div>
            <button
              onClick={handleAddActivity}
              className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-colors"
            >
              + {t.exposure.addActivity}
            </button>
          </div>

          <div className="space-y-3">
            {activities.map((act) => (
              <div key={act.id} className="p-3 bg-slate-50 rounded-xl border border-slate-200/80 flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                <input
                  type="text"
                  value={act.location}
                  onChange={(e) => handleUpdateActivity(act.id, 'location', e.target.value)}
                  placeholder="Activity / Place"
                  className="flex-1 text-xs bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 font-medium"
                />
                <div className="flex items-center gap-2">
                  <select
                    value={act.mode}
                    onChange={(e) => handleUpdateActivity(act.id, 'mode', e.target.value)}
                    className="text-xs bg-white border border-slate-200 rounded-lg px-2 py-1.5 font-semibold text-slate-700"
                  >
                    <option value="walk">Walking (High Inhalation)</option>
                    <option value="cycle">Cycling (Very High)</option>
                    <option value="bike">Motorcycle</option>
                    <option value="car">Car / AC Cabin</option>
                    <option value="transit">Metro / Bus</option>
                    <option value="indoor">Indoor (Home/Office)</option>
                  </select>
                  <div className="flex items-center gap-1">
                    <input
                      type="number"
                      value={act.duration_minutes}
                      onChange={(e) => handleUpdateActivity(act.id, 'duration_minutes', e.target.value)}
                      className="w-14 text-xs bg-white border border-slate-200 rounded-lg px-1.5 py-1.5 text-center font-bold"
                    />
                    <span className="text-[10px] text-slate-400">min</span>
                  </div>
                  <button
                    onClick={() => handleRemoveActivity(act.id)}
                    className="text-slate-400 hover:text-rose-600 text-xs px-1.5"
                  >
                    ✕
                  </button>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-4 pt-3 border-t border-slate-100 flex justify-end">
            <button
              onClick={runExposureCalc}
              disabled={calculating}
              className="px-4 py-2 bg-sky-600 hover:bg-sky-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs"
            >
              {calculating ? 'Computing Dose...' : 'Update Exposure Dose'}
            </button>
          </div>
        </div>

        {/* Right: Calculated Dose & Cigarette Metric */}
        <div className="lg:col-span-5 bg-white rounded-2xl p-6 shadow-xs border border-slate-200 flex flex-col justify-between">
          <div>
            <span className="text-[11px] font-bold tracking-wider text-slate-400 uppercase">
              Physiological Toxic Inhalation
            </span>
            <h3 className="text-lg font-black text-slate-900 mt-1">{t.exposure.calculatedDose}</h3>

            {exposureResult && (
              <div className="mt-4 space-y-4">
                {/* Cigarettes equivalent hero metric */}
                <div className="p-4 rounded-2xl bg-amber-50/70 border border-amber-200/80 flex items-center justify-between">
                  <div>
                    <div className="text-3xl font-black text-amber-900 flex items-baseline gap-1.5">
                      <span>{exposureResult.cigarettes_equivalent}</span>
                      <span className="text-xs font-bold text-amber-700">Cigarettes Equiv.</span>
                    </div>
                    <p className="text-[11px] text-amber-800 font-semibold mt-0.5">
                      Threat Level: <span className="font-black" style={{ color: exposureResult.threat_color }}>{exposureResult.threat_level}</span>
                    </p>
                  </div>
                  <div className="w-12 h-12 rounded-xl bg-amber-100 flex items-center justify-center text-amber-700">
                    <Cigarette className="w-6 h-6" />
                  </div>
                </div>

                {/* Metrics Breakdown */}
                <div className="grid grid-cols-2 gap-3 text-center">
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                    <span className="text-[10px] text-slate-400 font-bold">Logged Exposure</span>
                    <p className="text-base font-extrabold text-slate-900 mt-0.5">{exposureResult.total_logged_hours} hrs</p>
                  </div>
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                    <span className="text-[10px] text-slate-400 font-bold">Average Ambient PM2.5</span>
                    <p className="text-base font-extrabold text-slate-900 mt-0.5">{exposureResult.average_pm25} µg/m³</p>
                  </div>
                </div>

                {/* Actionable Health Advice */}
                <div className="p-3 bg-slate-100/70 rounded-xl text-xs text-slate-700">
                  <span className="font-bold text-slate-900 block mb-1">Health Notice for {exposureResult.profile}:</span>
                  {exposureResult.actionable_advice}
                </div>
              </div>
            )}
          </div>

          <p className="text-[10px] text-slate-400 mt-4 leading-relaxed">
            {t.exposure.approxNote}
          </p>
        </div>
      </div>

      {/* 3. Safe-Route Navigator (Safest vs Fastest) */}
      <div className="bg-white rounded-2xl p-6 shadow-xs border border-slate-200">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            <div className="flex items-center gap-2">
              <Navigation className="w-5 h-5 text-sky-600" />
              <h3 className="text-lg font-black text-slate-900">{t.exposure.routeNavigator}</h3>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Compares arterial highways with high diesel soot against green corridors with lower particulate density.
            </p>
          </div>

          {/* Mode Selector */}
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl">
            {['car', 'walk', 'cycle'].map((m) => (
              <button
                key={m}
                onClick={() => { setRouteMode(m); fetchRoutes(startCoords, endCoords, m); }}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold capitalize transition-all ${
                  routeMode === m ? 'bg-white text-sky-700 shadow-xs' : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                {m}
              </button>
            ))}
          </div>
        </div>

        {/* Origin & Destination Autocomplete Inputs */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-6 p-4 bg-slate-50 rounded-2xl border border-slate-200/80">
          <div>
            <label className="text-[11px] font-bold text-slate-600 block mb-1">Trip Origin (Building / Place / Metro):</label>
            <PlaceSearchInput
              value={routeOrigin}
              onChange={setRouteOrigin}
              onSelectPlace={handleSelectOrigin}
              placeholder="e.g. Connaught Place, AIIMS, Cyber City..."
            />
          </div>
          <div>
            <label className="text-[11px] font-bold text-slate-600 block mb-1">Destination (Building / Campus / Hub):</label>
            <PlaceSearchInput
              value={routeDestination}
              onChange={setRouteDestination}
              onSelectPlace={handleSelectDestination}
              placeholder="e.g. DTU Rohini, IIT Delhi, Noida Sec 62..."
            />
          </div>
        </div>

        {/* Route Details and Map Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left: Interactive Route Map */}
          <div className="lg:col-span-7 h-80 rounded-xl overflow-hidden border border-slate-200 relative">
            <MapContainer
              center={[28.69, 77.16]}
              zoom={11}
              className="h-full w-full z-10"
            >
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />
              <ChangeMapView coords={[(startCoords.lat + endCoords.lat) / 2, (startCoords.lon + endCoords.lon) / 2]} zoom={11} />

              {navData?.routes?.map((r, i) => {
                const color = i === 0 ? '#ef4444' : '#10b981';
                return (
                  <Polyline
                    key={i}
                    positions={r.geometry || []}
                    pathOptions={{
                      color: color,
                      weight: i === 1 ? 5 : 4,
                      opacity: 0.85,
                      dashArray: i === 0 ? '4, 4' : null,
                    }}
                  >
                    <Popup>
                      <div className="text-xs p-1">
                        <p className="font-bold">{r.name}</p>
                        <p>Distance: {r.distance_km} km</p>
                        <p>Est Time: {r.duration_minutes} min</p>
                        <p className="font-bold text-sky-700">Exposure Score: {r.exposure_score}</p>
                      </div>
                    </Popup>
                  </Polyline>
                );
              })}
            </MapContainer>

            {/* Map Polyline Legend */}
            <div className="absolute bottom-3 left-3 z-[400] bg-white/95 backdrop-blur-md px-3 py-1.5 rounded-lg shadow-md border border-slate-200 text-[10px] font-semibold flex items-center gap-3">
              <span className="flex items-center gap-1.5"><span className="w-3 h-1 bg-red-500 inline-block"></span>Route A (Outer Arterial)</span>
              <span className="flex items-center gap-1.5"><span className="w-3 h-1 bg-emerald-500 inline-block"></span>Route B (VayuPath Clean Corridor)</span>
            </div>
          </div>

          {/* Right: Route Comparison Card */}
          <div className="lg:col-span-5 flex flex-col justify-between space-y-4">
            {navData && (
              <div className="space-y-4">
                {/* Clean Corridor Dose Savings Badge */}
                <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black text-emerald-800 uppercase tracking-wide">
                      Safe Route Benefit
                    </span>
                    <span className="text-lg font-black text-emerald-700">
                      -{navData.dose_saved_percentage}% Toxic Dose
                    </span>
                  </div>
                  <p className="text-xs text-emerald-900 mt-2 font-medium">
                    {navData.comparison_card?.dose_difference}
                  </p>
                  <p className="text-[11px] text-emerald-700 mt-0.5">
                    ({navData.comparison_card?.time_difference})
                  </p>
                </div>

                {/* Departure Time Optimization */}
                {navData.departure_optimizer && (
                  <div className="p-4 bg-sky-50 border border-sky-200 rounded-2xl">
                    <div className="flex items-center gap-2 mb-1">
                      <Clock className="w-4 h-4 text-sky-600" />
                      <h4 className="text-xs font-bold text-sky-900">{t.exposure.departureOptimization}</h4>
                    </div>
                    <p className="text-xs text-sky-800 leading-relaxed">
                      {navData.departure_optimizer.recommendation}
                    </p>
                  </div>
                )}

                {/* Streets & GPS Waypoint Inspector */}
                {navData?.routes && (
                  <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4">
                    <button
                      type="button"
                      onClick={() => setShowTurnSteps(!showTurnSteps)}
                      className="w-full flex items-center justify-between text-left group"
                    >
                      <div className="flex items-center gap-2">
                        <Route className="w-4 h-4 text-sky-600" />
                        <span className="text-xs font-bold text-slate-800 group-hover:text-sky-700">
                          Streets & Precise GPS Waypoints
                        </span>
                      </div>
                      <div className="flex items-center gap-1 text-[11px] text-slate-500 font-semibold">
                        <span>{showTurnSteps ? 'Hide' : 'Inspect'}</span>
                        {showTurnSteps ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                      </div>
                    </button>

                    {showTurnSteps && (
                      <div className="mt-3 pt-3 border-t border-slate-200 space-y-3">
                        <div className="flex gap-2">
                          {navData.routes.map((r, idx) => (
                            <button
                              key={idx}
                              type="button"
                              onClick={() => setSelectedRouteIndex(idx)}
                              className={`text-[11px] font-bold px-3 py-1.5 rounded-lg transition-all ${
                                selectedRouteIndex === idx
                                  ? idx === 0 ? 'bg-red-500 text-white' : 'bg-emerald-600 text-white'
                                  : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-100'
                              }`}
                            >
                              Route {String.fromCharCode(65 + idx)} {idx === 0 ? '(Arterial)' : '(Clean Corridor)'}
                            </button>
                          ))}
                        </div>

                        {/* Major Streets Summary */}
                        {navData.routes[selectedRouteIndex]?.major_streets?.length > 0 && (
                          <div className="p-2.5 bg-white rounded-xl border border-slate-200 text-[11px]">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                              Major Thoroughfares:
                            </span>
                            <div className="flex flex-wrap gap-1">
                              {navData.routes[selectedRouteIndex].major_streets.map((st, i) => (
                                <span key={i} className="px-2 py-0.5 bg-slate-100 rounded text-slate-700 font-medium text-[10px]">
                                  {st}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* List of Turn-by-Turn GPS Steps */}
                        <div className="max-h-56 overflow-y-auto space-y-2 pr-1 divide-y divide-slate-100">
                          {navData.routes[selectedRouteIndex]?.turn_by_turn?.map((step, sIdx) => (
                            <div key={sIdx} className="pt-2 first:pt-0 text-[11px] flex items-start justify-between gap-2">
                              <div>
                                <p className="font-semibold text-slate-800">{step.street}</p>
                                <p className="text-[10px] text-slate-500 capitalize">{step.instruction} • {step.distance_meters}m</p>
                              </div>
                              <div className="text-right shrink-0">
                                <span className="font-mono text-[10px] text-sky-700 bg-sky-50 px-1.5 py-0.5 rounded border border-sky-100">
                                  {step.gps ? `${step.gps[0]}, ${step.gps[1]}` : 'N/A'}
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            <div className="text-[11px] text-slate-500">
              *Route segments sampled every ~500m against localized traffic micro-environment models and OpenStreetMap geometries.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
