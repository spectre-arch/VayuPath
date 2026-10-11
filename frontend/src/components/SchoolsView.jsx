import React, { useState, useEffect } from 'react';
import { AlertTriangle, ShieldAlert, Send, Download, Upload, CheckSquare, Users, School, ArrowUpRight, BellRing } from 'lucide-react';
import { api } from '../services/api';
import { CedarPolicyInspector } from './CedarPolicyInspector';

export function SchoolsView({ t, lang }) {
  const [dashboard, setDashboard] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedSchool, setSelectedSchool] = useState(null);
  const [sendingAlert, setSendingAlert] = useState(false);
  const [alertSuccess, setAlertSuccess] = useState(null);
  const [showUdiseModal, setShowUdiseModal] = useState(false);
  const [udiseCsvText, setUdiseCsvText] = useState('');
  const [uploadStatus, setUploadStatus] = useState(null);

  useEffect(() => {
    loadSchools();
  }, []);

  async function loadSchools() {
    setLoading(true);
    try {
      const data = await api.getSchoolsDashboard();
      setDashboard(data);
      if (data.schools && data.schools.length > 0) {
        setSelectedSchool(data.schools[0]);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  async function handleSendParentAlert(school) {
    if (!school) return;
    setSendingAlert(true);
    setAlertSuccess(null);
    try {
      const message = lang === 'hi' ? school.parent_alert_hi : school.parent_alert_en;
      const res = await api.sendSchoolAlert(school.id, message);
      setAlertSuccess(`Alert successfully dispatched via AWS SNS to enrolled parents of ${school.name}!`);
    } catch (e) {
      alert('Error sending alert: ' + e.message);
    } finally {
      setSendingAlert(false);
    }
  }

  async function handleUdiseUpload(e) {
    e.preventDefault();
    if (!udiseCsvText.trim()) return;
    try {
      const res = await api.uploadUdiseCsv(udiseCsvText);
      setUploadStatus(`Imported ${res.uploaded_count} schools successfully.`);
      setTimeout(() => {
        setShowUdiseModal(false);
        loadSchools();
      }, 1500);
    } catch (e) {
      alert('Upload failed: ' + e.message);
    }
  }

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-gradient-to-r from-purple-800 via-indigo-700 to-sky-700 rounded-3xl p-6 sm:p-8 text-white shadow-md">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="max-w-2xl">
            <span className="px-3 py-1 rounded-full text-xs font-bold bg-white/20 backdrop-blur-md uppercase tracking-wider">
              Module 5 • School Safety on Bad-Air Days
            </span>
            <h2 className="text-2xl sm:text-3xl font-black mt-2 tracking-tight">
              School Campus GRAP Protocol Engine
            </h2>
            <p className="text-purple-100 text-sm mt-2 leading-relaxed">
              Automated safety checklists, morning assembly restrictions, and one-tap bilingual parent notifications triggered by real-time air quality.
            </p>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <button
              onClick={() => setShowUdiseModal(true)}
              className="flex items-center gap-1.5 px-4 py-2.5 bg-white/10 hover:bg-white/20 text-white rounded-xl text-xs font-bold transition-all border border-white/20 backdrop-blur-sm"
            >
              <Upload className="w-4 h-4" />
              <span>{t.schools.uploadUdise}</span>
            </button>
            <a
              href={api.getReportCsvUrl()}
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-1.5 px-4 py-2.5 bg-white text-indigo-900 hover:bg-purple-50 rounded-xl text-xs font-bold transition-all shadow-md"
            >
              <Download className="w-4 h-4" />
              <span>{t.schools.exportReport}</span>
            </a>
          </div>
        </div>
      </div>

      {/* Aggregate Metric Stats */}
      {dashboard?.summary && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white rounded-2xl p-4 shadow-xs border border-slate-200">
            <span className="text-[11px] font-bold text-slate-400 uppercase">Closure / Hybrid Advisory</span>
            <div className="text-2xl font-black text-purple-900 mt-1">
              {dashboard.summary.closure_advisory_count} <span className="text-xs font-medium text-slate-500">Campuses</span>
            </div>
            <p className="text-[10px] text-purple-700 mt-1 font-semibold">GRAP Stage IV Trigger</p>
          </div>

          <div className="bg-white rounded-2xl p-4 shadow-xs border border-slate-200">
            <span className="text-[11px] font-bold text-slate-400 uppercase">Restrict Outdoor PE</span>
            <div className="text-2xl font-black text-red-600 mt-1">
              {dashboard.summary.restricted_outdoor_count} <span className="text-xs font-medium text-slate-500">Campuses</span>
            </div>
            <p className="text-[10px] text-red-700 mt-1 font-semibold">GRAP Stage III Trigger</p>
          </div>

          <div className="bg-white rounded-2xl p-4 shadow-xs border border-slate-200">
            <span className="text-[11px] font-bold text-slate-400 uppercase">Caution / Indoor Sports</span>
            <div className="text-2xl font-black text-amber-600 mt-1">
              {dashboard.summary.caution_indoor_pe_count} <span className="text-xs font-medium text-slate-500">Campuses</span>
            </div>
            <p className="text-[10px] text-amber-700 mt-1 font-semibold">GRAP Stage II Trigger</p>
          </div>

          <div className="bg-white rounded-2xl p-4 shadow-xs border border-slate-200">
            <span className="text-[11px] font-bold text-slate-400 uppercase">Protected Students</span>
            <div className="text-2xl font-black text-sky-700 mt-1">
              {dashboard.summary.total_affected_students?.toLocaleString() || 0}
            </div>
            <p className="text-[10px] text-slate-500 mt-1 font-semibold">Under Active Health Protocols</p>
          </div>
        </div>
      )}

      {/* Main Interactive Grid: Schools Table & Principal Action Card */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Schools List */}
        <div className="lg:col-span-7 bg-white rounded-2xl p-5 shadow-xs border border-slate-200">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold text-slate-900">Registered School Campuses</h3>
            <span className="text-xs text-slate-500">{dashboard?.schools?.length || 0} Monitored</span>
          </div>

          <div className="space-y-2.5 max-h-[500px] overflow-y-auto pr-1">
            {dashboard?.schools?.map((s) => {
              const isSelected = selectedSchool?.id === s.id;
              return (
                <div
                  key={s.id}
                  onClick={() => { setSelectedSchool(s); setAlertSuccess(null); }}
                  className={`p-4 rounded-xl border cursor-pointer transition-all ${
                    isSelected
                      ? 'border-indigo-500 bg-indigo-50/50 shadow-xs ring-2 ring-indigo-500/20'
                      : 'border-slate-200 hover:border-slate-300 bg-white'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="text-xs font-bold text-slate-900">{s.name}</h4>
                        <span className="text-[10px] text-slate-400 font-mono">({s.udise_code})</span>
                      </div>
                      <p className="text-[11px] text-slate-500 mt-0.5">{s.district}, {s.state} • {s.student_count} Students</p>
                    </div>
                    <div className="text-right shrink-0">
                      <span className="text-sm font-black text-slate-900">AQI {s.live_aqi ?? 'N/A'}</span>
                      <p className="text-[10px] font-semibold text-slate-500">{s.category}</p>
                    </div>
                  </div>

                  {/* Status Badge */}
                  <div className="mt-3 flex items-center justify-between pt-2 border-t border-slate-100">
                    <span className={`text-[10px] px-2 py-0.5 rounded-md font-bold uppercase tracking-wider ${s.badge_class}`}>
                      {s.status_badge}
                    </span>
                    <span className="text-[10px] text-slate-500">
                      Tomorrow Risk: <strong className="text-slate-700">{s.tomorrow_badge}</strong>
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right: Selected School Action Checklist & 1-Tap Parent Alert */}
        <div className="lg:col-span-5 bg-white rounded-2xl p-6 shadow-xs border border-slate-200 flex flex-col justify-between">
          {selectedSchool ? (
            <div className="space-y-5">
              {/* Header */}
              <div>
                <span className={`text-[10px] px-2.5 py-0.5 rounded-full font-bold uppercase tracking-wider ${selectedSchool.badge_class}`}>
                  {selectedSchool.status_badge}
                </span>
                <h3 className="text-lg font-black text-slate-900 mt-2">{selectedSchool.name}</h3>
                <p className="text-xs text-slate-500">{selectedSchool.district} • Contact: {selectedSchool.contact_email}</p>
              </div>

              {/* Protocol Requirement */}
              <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200/80">
                <span className="text-[11px] font-bold text-slate-700 block mb-1">
                  Trigger Reason ({selectedSchool.grap_stage}):
                </span>
                <p className="text-xs text-slate-800 leading-relaxed font-medium">
                  {selectedSchool.action_required}
                </p>
              </div>

              {/* Action Checklist for Principals & Teachers */}
              <div>
                <div className="flex items-center gap-1.5 mb-2">
                  <CheckSquare className="w-4 h-4 text-indigo-600" />
                  <h4 className="text-xs font-bold text-slate-900">{t.schools.checklistTitle}</h4>
                </div>
                <ul className="space-y-1.5 text-xs text-slate-700">
                  {selectedSchool.principal_checklist?.map((item, idx) => (
                    <li key={idx} className="flex items-start gap-2 bg-slate-50 p-2 rounded-lg border border-slate-100">
                      <span className="w-4 h-4 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5">
                        {idx + 1}
                      </span>
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* One-Tap Parent Notification Card */}
              <div className="p-4 bg-indigo-50/70 border border-indigo-200 rounded-2xl">
                <div className="flex items-center gap-2 mb-2">
                  <BellRing className="w-4 h-4 text-indigo-600" />
                  <h4 className="text-xs font-bold text-indigo-900">Parent Advisory Draft (SNS Push)</h4>
                </div>
                <p className="text-xs text-indigo-950 font-medium italic bg-white/80 p-2.5 rounded-xl border border-indigo-100 mb-3">
                  "{lang === 'hi' ? selectedSchool.parent_alert_hi : selectedSchool.parent_alert_en}"
                </p>

                <button
                  onClick={() => handleSendParentAlert(selectedSchool)}
                  disabled={sendingAlert}
                  className="w-full flex items-center justify-center gap-2 py-2.5 px-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>{sendingAlert ? 'Broadcasting via SNS...' : t.schools.sendAlert}</span>
                </button>

                {alertSuccess && (
                  <p className="mt-2 text-[11px] text-emerald-700 font-semibold text-center">
                    ✓ {alertSuccess}
                  </p>
                )}
              </div>
            </div>
          ) : (
            <div className="h-full flex items-center justify-center text-slate-400 text-xs">
              Select a school campus to review automated protocols.
            </div>
          )}

          <div className="pt-4 border-t border-slate-100 text-[10px] text-slate-400 leading-relaxed">
            *Protocols aligned with Central Pollution Control Board (CPCB) advisories and Delhi GRAP guidelines. Intended as safety recommendations, not official statutory closures.
          </div>
        </div>
      </div>

      {/* AWS Open Source: Cedar Policy Engine Interactive Section */}
      <CedarPolicyInspector selectedSchool={selectedSchool} />

      {/* UDISE+ CSV Upload Modal */}
      {showUdiseModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-bold text-slate-900">Upload UDISE+ School Records</h3>
              <button onClick={() => setShowUdiseModal(false)} className="text-slate-400 hover:text-slate-700">✕</button>
            </div>
            <p className="text-xs text-slate-500 mb-3">
              Paste CSV with columns: <code>school_name, udise_code, district, state, lat, lon, student_count, contact_email</code>
            </p>
            <form onSubmit={handleUdiseUpload} className="space-y-4">
              <textarea
                rows={6}
                value={udiseCsvText}
                onChange={(e) => setUdiseCsvText(e.target.value)}
                placeholder="school_name,udise_code,district,state,lat,lon,student_count,contact_email&#10;St. Xavier Senior Sec,0701019999,Central Delhi,Delhi,28.67,77.22,2500,principal@stxavier.edu"
                className="w-full text-xs font-mono p-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
              {uploadStatus && (
                <p className="text-xs text-emerald-700 font-bold">{uploadStatus}</p>
              )}
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowUdiseModal(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-bold bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 shadow-xs"
                >
                  Import Schools
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
