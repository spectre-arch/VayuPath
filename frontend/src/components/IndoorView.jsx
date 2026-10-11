import React, { useState, useEffect } from 'react';
import { Home, Sliders, Wind, Flame, Cpu, Wrench, Clock, CheckCircle2, AlertCircle, Sparkles } from 'lucide-react';
import { api } from '../services/api';

export function IndoorView({ t }) {
  // Model Parameters
  const [outdoorPm25, setOutdoorPm25] = useState(160);
  const [windowsOpen, setWindowsOpen] = useState(false);
  const [purifierActive, setPurifierActive] = useState(true);
  const [cadr, setCadr] = useState(280);
  const [cooking, setCooking] = useState(false);
  const [buildingType, setBuildingType] = useState('standard');
  const [modelResult, setModelResult] = useState(null);
  const [actionTips, setActionTips] = useState([]);
  const [diyGuide, setDiyGuide] = useState(null);

  // DIY Hardware Sensor State
  const [userSensorPm25, setUserSensorPm25] = useState('');
  const [diySensorData, setDiySensorData] = useState(null);
  const [submittingSensor, setSubmittingSensor] = useState(false);

  useEffect(() => {
    recalculateModel();
  }, [outdoorPm25, windowsOpen, purifierActive, cadr, cooking, buildingType]);

  async function recalculateModel() {
    try {
      const res = await api.calculateIndoorModel({
        outdoor_pm25: outdoorPm25,
        windows_open: windowsOpen,
        purifier_active: purifierActive,
        cadr: cadr,
        is_cooking: cooking,
        building_type: buildingType,
        room_volume_m3: 45.0,
      });
      setModelResult(res.indoor_model);
      setActionTips(res.action_tips || []);
      setDiyGuide(res.diy_box_fan_guide);
    } catch (e) {
      console.error(e);
    }
  }

  async function handleRegisterDiySensor(e) {
    e.preventDefault();
    if (!userSensorPm25) return;
    setSubmittingSensor(true);
    try {
      const res = await api.ingestDiySensor({
        device_id: 'home_esp32_01',
        pm25: parseFloat(userSensorPm25),
      });
      setDiySensorData(res);
    } catch (e) {
      alert('Error updating sensor: ' + e.message);
    } finally {
      setSubmittingSensor(false);
    }
  }

  return (
    <div className="space-y-8">
      {/* Module Banner */}
      <div className="bg-gradient-to-r from-teal-700 via-emerald-700 to-sky-700 rounded-3xl p-6 sm:p-8 text-white shadow-md">
        <div className="max-w-3xl">
          <span className="px-3 py-1 rounded-full text-xs font-bold bg-white/20 backdrop-blur-md uppercase tracking-wider">
            Module 4 • Indoor Microenvironments
          </span>
          <h2 className="text-2xl sm:text-3xl font-black mt-2 tracking-tight">
            Indoor Air Quality & Infiltration Physics
          </h2>
          <p className="text-teal-100 text-sm mt-2 leading-relaxed">
            Indoor air is not safe by default. Fine particulate leaks through window frames while cooking generates extreme sudden spikes. Model your room conditions or sync DIY sensors.
          </p>
        </div>
      </div>

      {/* Main Interactive Infiltration Model & Result Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Interactive Controls */}
        <div className="lg:col-span-6 bg-white rounded-2xl p-6 border border-slate-200 shadow-xs space-y-5">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-bold text-slate-900">Room Infiltration Parameters</h3>
            <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-sky-100 text-sky-800">
              Interactive Physics Sim
            </span>
          </div>

          {/* Outdoor PM2.5 Slider */}
          <div>
            <div className="flex justify-between text-xs font-bold text-slate-700 mb-1.5">
              <span>Outdoor Ambient PM2.5:</span>
              <span className="text-sky-700 font-black">{outdoorPm25} µg/m³</span>
            </div>
            <input
              type="range"
              min="20"
              max="450"
              value={outdoorPm25}
              onChange={(e) => setOutdoorPm25(Number(e.target.value))}
              className="w-full accent-sky-600 cursor-pointer"
            />
          </div>

          {/* Window Condition Toggle */}
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80 flex items-center justify-between">
            <div>
              <span className="text-xs font-bold text-slate-800 block">Window State</span>
              <span className="text-[11px] text-slate-500">Affects air change rate (0.7 vs 3.0 ACH)</span>
            </div>
            <button
              onClick={() => setWindowsOpen(!windowsOpen)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                windowsOpen ? 'bg-amber-100 text-amber-900 border border-amber-300' : 'bg-white text-slate-700 border border-slate-200'
              }`}
            >
              {windowsOpen ? 'Windows Open (High Influx)' : 'Windows Sealed'}
            </button>
          </div>

          {/* Air Purifier Toggle & CADR */}
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-xs font-bold text-slate-800 block">HEPA Purifier</span>
                <span className="text-[11px] text-slate-500">Active mechanical filtration</span>
              </div>
              <button
                onClick={() => setPurifierActive(!purifierActive)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  purifierActive ? 'bg-emerald-100 text-emerald-800 border border-emerald-300' : 'bg-slate-200 text-slate-600'
                }`}
              >
                {purifierActive ? 'Purifier Running' : 'Purifier Off'}
              </button>
            </div>

            {purifierActive && (
              <div>
                <div className="flex justify-between text-[11px] font-bold text-slate-600 mb-1">
                  <span>Clean Air Delivery Rate (CADR):</span>
                  <span className="text-emerald-700">{cadr} m³/h</span>
                </div>
                <input
                  type="range"
                  min="100"
                  max="600"
                  step="20"
                  value={cadr}
                  onChange={(e) => setCadr(Number(e.target.value))}
                  className="w-full accent-emerald-600 cursor-pointer"
                />
              </div>
            )}
          </div>

          {/* Cooking Toggle */}
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80 flex items-center justify-between">
            <div>
              <span className="text-xs font-bold text-slate-800 block">Indoor Cooking / Frying</span>
              <span className="text-[11px] text-slate-500">Produces sudden emission of ~2200 µg/h</span>
            </div>
            <button
              onClick={() => setCooking(!cooking)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                cooking ? 'bg-rose-100 text-rose-800 border border-rose-300' : 'bg-white text-slate-700 border border-slate-200'
              }`}
            >
              {cooking ? 'Cooking Active' : 'No Cooking'}
            </button>
          </div>

          {/* Building Seal Type */}
          <div>
            <label className="text-xs font-bold text-slate-700 block mb-1.5">Building Construction Type:</label>
            <div className="grid grid-cols-3 gap-2">
              {[
                { id: 'tight_sealed', label: 'Tight / Double-Glazed' },
                { id: 'standard', label: 'Standard Indian Apartment' },
                { id: 'leaky', label: 'Leaky / Old Construction' },
              ].map((b) => (
                <button
                  key={b.id}
                  onClick={() => setBuildingType(b.id)}
                  className={`p-2 rounded-xl text-center text-xs font-medium border transition-all ${
                    buildingType === b.id ? 'border-sky-500 bg-sky-50 text-sky-800 font-bold' : 'border-slate-200 bg-white text-slate-600'
                  }`}
                >
                  {b.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Right: Modelled Infiltration Output */}
        <div className="lg:col-span-6 bg-white rounded-2xl p-6 border border-slate-200 shadow-xs flex flex-col justify-between space-y-5">
          {modelResult ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="px-2.5 py-1 rounded-full text-[10px] font-black tracking-wider uppercase bg-amber-100 text-amber-800 border border-amber-200">
                  {modelResult.model_label}
                </span>
                <span className="text-xs font-bold text-emerald-600">
                  {modelResult.reduction_percentage}% Lower than Outdoor
                </span>
              </div>

              {/* Indoor Hero Metric */}
              <div
                className="p-5 rounded-2xl border flex items-center justify-between"
                style={{
                  backgroundColor: `${modelResult.indoor_color}15`,
                  borderColor: `${modelResult.indoor_color}60`,
                }}
              >
                <div>
                  <span className="text-xs font-bold text-slate-500 uppercase">Estimated Indoor PM2.5</span>
                  <div className="text-4xl font-black mt-1" style={{ color: modelResult.indoor_color }}>
                    {modelResult.indoor_pm25} <span className="text-sm font-semibold">µg/m³</span>
                  </div>
                  <div className="text-xs font-bold uppercase mt-1" style={{ color: modelResult.indoor_color }}>
                    AQI {modelResult.indoor_aqi} ({modelResult.indoor_category})
                  </div>
                </div>

                <div className="text-right">
                  <span className="text-xs font-bold text-slate-400 block">Outdoor Ambient</span>
                  <span className="text-2xl font-black text-slate-700">{modelResult.outdoor_pm25} µg/m³</span>
                </div>
              </div>

              {/* Physical Parameters Breakdown */}
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                  <span className="text-[10px] text-slate-400 font-bold block">Air Exchange Rate</span>
                  <span className="font-extrabold text-slate-800">{modelResult.parameters?.air_exchange_rate_ach} ACH</span>
                </div>
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                  <span className="text-[10px] text-slate-400 font-bold block">Envelope Penetration</span>
                  <span className="font-extrabold text-slate-800">{Math.round((modelResult.parameters?.penetration_fraction || 0.75) * 100)}%</span>
                </div>
              </div>

              <p className="text-[10px] text-slate-400 leading-relaxed font-mono">
                {modelResult.formula_reference}
              </p>
            </div>
          ) : null}

          {/* User DIY Sensor Comparison */}
          <div className="p-4 bg-sky-50/70 rounded-2xl border border-sky-200/80">
            <div className="flex items-center gap-2 mb-2">
              <Cpu className="w-4 h-4 text-sky-600" />
              <h4 className="text-xs font-bold text-sky-950">{t.indoor.diySensorTitle}</h4>
            </div>
            <p className="text-[11px] text-sky-800 mb-3 leading-relaxed">
              Have an ESP32 with PMS5003 or Sensirion SPS30 sensor? Enter your actual hardware reading to compare modeled physics against ground truth:
            </p>

            <form onSubmit={handleRegisterDiySensor} className="flex gap-2">
              <input
                type="number"
                placeholder="Enter PM2.5 (e.g. 42)"
                value={userSensorPm25}
                onChange={(e) => setUserSensorPm25(e.target.value)}
                className="w-40 text-xs px-3 py-1.5 bg-white border border-sky-200 rounded-xl font-bold"
              />
              <button
                type="submit"
                disabled={submittingSensor}
                className="px-3 py-1.5 bg-sky-600 hover:bg-sky-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs"
              >
                Sync DIY Reading
              </button>
            </form>

            {diySensorData && (
              <div className="mt-3 p-2 bg-white rounded-xl border border-sky-200 text-xs flex items-center justify-between">
                <span className="font-semibold text-slate-700">{diySensorData.source}</span>
                <span className="font-black text-sky-700">{diySensorData.pm25} µg/m³ (AQI {diySensorData.aqi})</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Action Tips Engine & DIY Filter Blueprint */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Action Tips */}
        <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs space-y-4">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-amber-600" />
            <h3 className="text-sm font-bold text-slate-900">{t.indoor.actionTips}</h3>
          </div>

          <div className="space-y-3">
            {actionTips.map((tip, i) => (
              <div key={i} className="p-3 bg-slate-50 rounded-xl border border-slate-100 flex items-start gap-3">
                <div className="w-7 h-7 rounded-lg bg-amber-100 text-amber-800 flex items-center justify-center shrink-0 mt-0.5">
                  <Sparkles className="w-3.5 h-3.5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h4 className="text-xs font-bold text-slate-900">{tip.title}</h4>
                    <span className="text-[9px] px-1.5 py-0.2 rounded font-bold bg-amber-100 text-amber-800">{tip.badge}</span>
                  </div>
                  <p className="text-xs text-slate-600 mt-1 leading-relaxed">{tip.details}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* DIY Box-Fan Filter Guide */}
        {diyGuide && (
          <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-2 mb-3">
                <Wrench className="w-4 h-4 text-teal-600" />
                <h3 className="text-sm font-bold text-slate-900">{t.indoor.boxFanGuide}</h3>
              </div>
              <p className="text-xs text-slate-600 mb-4 leading-relaxed">
                Build an emergency Corsi-Rosenthal clean air cleaner using locally available components for ~80% less cost than commercial branded purifiers.
              </p>

              <div className="p-4 bg-teal-50/70 border border-teal-200 rounded-xl space-y-2 mb-4">
                <div className="flex justify-between text-xs">
                  <span className="text-teal-900 font-bold">Estimated Cost:</span>
                  <span className="font-extrabold text-teal-800">{diyGuide.estimated_cost_inr}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-teal-900 font-bold">Commercial Equivalent:</span>
                  <span className="text-slate-500 line-through">{diyGuide.commercial_cost_inr}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-teal-900 font-bold">Efficiency:</span>
                  <span className="font-bold text-teal-800">{diyGuide.cadr_performance}</span>
                </div>
              </div>

              <ul className="text-xs text-slate-700 space-y-1.5 list-disc pl-4">
                {diyGuide.materials?.map((m, idx) => (
                  <li key={idx}>{m}</li>
                ))}
              </ul>
            </div>

            <div className="mt-4 pt-3 border-t border-slate-100 text-[10px] text-slate-400">
              *Verified by UC Davis and EPA aerosol physics research for particulate air cleaning.
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
