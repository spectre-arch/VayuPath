import React from 'react';
import { ShieldCheck, Database, Award, Info, AlertTriangle, Layers, Cpu } from 'lucide-react';

export function AboutView({ t }) {
  const sources = [
    {
      name: "Central Pollution Control Board (CPCB)",
      portal: "data.gov.in & CPCB Portal",
      type: "Official Government Ground Stations",
      description: "Direct real-time measurements across Continuous Ambient Air Quality Monitoring Stations (CAAQMS). Computes official Indian National AQI breakpoints.",
    },
    {
      name: "Open-Meteo Air Quality & Weather API",
      portal: "open-meteo.com",
      type: "Copernicus CAMS & ECMWF Gridded Model",
      description: "Atmospheric aerosol transport model (PM2.5, PM10, NO2, SO2, CO, O3) and boundary layer wind vectors providing continuous 5-day forecasts across coordinates without official ground sensors.",
    },
    {
      name: "NASA FIRMS (Fire Information for Resource Management System)",
      portal: "firms.modaps.eosdis.nasa.gov",
      type: "Satellite Active Fire Detection",
      description: "Thermal anomaly and Fire Radiative Power (FRP) measurements from Suomi-NPP VIIRS and Terra/Aqua MODIS satellites filtered to Indo-Gangetic Plain agricultural belts.",
    },
    {
      name: "OpenAQ Community Platform",
      portal: "openaq.org (v3 API)",
      type: "Aggregated Open Environmental Data",
      description: "Secondary verification network aggregating global sensor endpoints.",
    },
    {
      name: "OpenStreetMap & Nominatim & OSRM",
      portal: "openstreetmap.org",
      type: "Geospatial Routing & Infrastructure",
      description: "High-resolution road networks, school amenity coordinates, and multi-route topology.",
    },
    {
      name: "AWS Serverless & Strands Agents SDK",
      portal: "aws.amazon.com / strandsagents.com",
      type: "Cloud Architecture & AI Agent Framework",
      description: "Serverless execution via AWS SAM, Lambda, DynamoDB, SNS, EventBridge, with Amazon Bedrock conversational reasoning.",
    },
    {
      name: "AWS Cedar Policy Engine (Open Source)",
      portal: "github.com/cedar-policy/cedar",
      type: "Statutory Environmental Authorization",
      description: "Expressive policy language evaluating legal Graded Response Action Plan (GRAP) school campus closures, outdoor sports bans, and emergency parent dispatches.",
    },
  ];

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      {/* Header */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-xs">
        <span className="px-3 py-1 rounded-full text-xs font-bold bg-sky-100 text-sky-800 uppercase tracking-wide">
          Trust, Provenance & Scientific Methodology
        </span>
        <h2 className="text-2xl sm:text-3xl font-black text-slate-900 mt-2">
          How VayuPath Ensures 100% Data Integrity
        </h2>
        <p className="text-slate-600 text-sm mt-2 leading-relaxed">
          Air pollution decisions directly impact human health and school attendance. We operate under a strict <strong>Zero Fake Data policy</strong>: every number on this platform explicitly displays its data source and collection timestamp. If a sensor or upstream API is offline, VayuPath presents an unambiguous "Data Unavailable" state rather than synthetic guesses.
        </p>
      </div>

      {/* Verified Data Sources Catalog */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-xs space-y-5">
        <h3 className="text-base font-bold text-slate-900">Credited Environmental Data Providers</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {sources.map((s, idx) => (
            <div key={idx} className="p-4 bg-slate-50 rounded-2xl border border-slate-200/80 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between gap-2">
                  <h4 className="text-xs font-bold text-slate-900">{s.name}</h4>
                  <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-sky-50 text-sky-700 border border-sky-100 shrink-0">
                    {s.type}
                  </span>
                </div>
                <p className="text-[11px] text-slate-400 font-mono mt-0.5">{s.portal}</p>
                <p className="text-xs text-slate-600 mt-2 leading-relaxed">{s.description}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Mathematical & Physical Models Explained */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-xs space-y-4">
        <h3 className="text-base font-bold text-slate-900">Methodologies & Formulations</h3>

        <div className="space-y-4 text-xs text-slate-700 leading-relaxed">
          <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
            <h4 className="font-bold text-slate-900 text-sm mb-1">1. CPCB National AQI Calculation</h4>
            <p>
              Uses official linear piecewise interpolation based on the MoEFCC 2014 technical report. Evaluates 8 criteria pollutants (PM2.5, PM10, NO2, SO2, CO, O3, NH3, Pb). At least 3 criteria pollutants must be present, one of which must be particulate matter. The overall index represents the worst sub-index.
            </p>
          </div>

          <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
            <h4 className="font-bold text-slate-900 text-sm mb-1">2. Spatial IDW Interpolation</h4>
            <p>
              Inverse Distance Weighting (IDW with power p = 2.0) interpolates values across geographic bounding boxes to reveal continuous gradients. While effective for synoptic regional views, ground concentrations near heavy diesel traffic choke points may be significantly higher than interpolated averages.
            </p>
          </div>

          <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
            <h4 className="font-bold text-slate-900 text-sm mb-1">3. Cigarette Equivalence Approximation</h4>
            <p>
              Derived from peer-reviewed epidemiological research by Berkeley Earth (Muller et al.). Continuous 24-hour inhalation of 22 µg/m³ PM2.5 roughly equates to smoking one cigarette. This metric serves as a communicative approximation to convey risk, not a direct clinical diagnosis.
            </p>
          </div>

          <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
            <h4 className="font-bold text-slate-900 text-sm mb-1">4. Single-Zone Infiltration Model</h4>
            <p>
              Calculates indoor PM2.5 using mass-balance differential equations: C_in = (P · a · C_out + S/V) / (a + k + CADR/V). Transparently accounts for window sealing, HEPA CADR, and cooking emission spikes.
            </p>
          </div>
        </div>
      </div>

      {/* Statutory Disclaimer */}
      <div className="p-5 bg-amber-50 rounded-2xl border border-amber-200 text-amber-900 text-xs leading-relaxed flex items-start gap-3">
        <AlertTriangle className="w-5 h-5 text-amber-700 shrink-0 mt-0.5" />
        <div>
          <span className="font-bold block mb-1">Non-Statutory Advisory Notice:</span>
          VayuPath is an independent civil intelligence and technology platform designed for public protection and educational guidance. School safety protocols and downwind alerts are algorithmic recommendations based on published CPCB/GRAP guidelines and are not official administrative orders. In all circumstances, follow directives issued by state governments, CAQM, and municipal authorities.
        </div>
      </div>
    </div>
  );
}
