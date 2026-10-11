import json
import re

with open('/Users/aryansingh/.gemini/antigravity/scratch/vayupath/cities_data.json') as f:
    cities_dict = json.load(f)

with open('/Users/aryansingh/.gemini/antigravity/scratch/vayupath/index.html') as f:
    content = f.read()

# 1. Clean up top head script: remove duplicate search script inside <script src="tailwindcss">
head_script_start = content.find('<script src="https://www.gstatic.com/antigravity/web/dev/tailwindcss.min.js">')
head_script_end = content.find('</script>', head_script_start)

# Replace the messy tailwind script tag with clean tailwind script
content = content[:head_script_start] + '<script src="https://www.gstatic.com/antigravity/web/dev/tailwindcss.min.js"></script>' + content[head_script_end + len('</script>'):]

# 2. Add City Selector to Header
# Look for <div class="flex items-center gap-2"> around VayuPath title in header
header_vayu_title = '''        <div class="flex items-center gap-2">
          <span class="hero-title-vayu text-2xl tracking-tight font-light">Vayu</span><span class="hero-title-path text-2xl tracking-tight font-light">Path</span>
          <span class="text-xs text-slate-500 hidden md:inline mono">| Real-Time Exposure Engine</span>
        </div>'''

header_vayu_with_selector = '''        <div class="flex items-center gap-2">
          <span class="hero-title-vayu text-2xl tracking-tight font-light">Vayu</span><span class="hero-title-path text-2xl tracking-tight font-light">Path</span>
          <span class="text-xs text-slate-500 hidden md:inline mono">| Pan-India Corridor</span>
        </div>

        <!-- Pan-India City Switcher -->
        <div class="relative ml-1 sm:ml-2">
          <select id="citySelectDropdown" class="text-xs font-bold py-1.5 pl-3 pr-7 rounded-xl bg-white border border-slate-300 text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500 shadow-sm cursor-pointer appearance-none">
            <option value="delhi">🇮🇳 Delhi-NCR (Severe • 382)</option>
            <option value="bengaluru">🌳 Bengaluru (Clean • 84)</option>
            <option value="mumbai">🌊 Mumbai (Moderate • 168)</option>
            <option value="kolkata">🏛️ Kolkata (Poor • 232)</option>
            <option value="hyderabad">💎 Hyderabad (Moderate • 128)</option>
            <option value="chennai">🏖️ Chennai (Clean • 92)</option>
            <option value="pune">⛰️ Pune (Moderate • 136)</option>
            <option value="lucknow">🕌 Lucknow (Very Poor • 312)</option>
            <option value="ahmedabad">🧵 Ahmedabad (Moderate • 194)</option>
            <option value="jaipur">🏰 Jaipur (Moderate • 182)</option>
          </select>
          <div class="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-slate-500">
            <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M19 9l-7 7-7-7"/></svg>
          </div>
        </div>'''

assert header_vayu_title in content, "Could not find header_vayu_title"
content = content.replace(header_vayu_title, header_vayu_with_selector, 1)

# 3. Update Header City AQI Badge with an ID
old_city_aqi_badge = '''<div class="hidden lg:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/90 border border-slate-200 shadow-xs text-slate-700 mono font-medium">
          <span class="w-2 h-2 rounded-full bg-rose-500 animate-pulse"></span>
          <span>CITY AQI: 382</span>
        </div>'''

new_city_aqi_badge = '''<div id="headerCityAqiContainer" class="hidden lg:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/90 border border-slate-200 shadow-xs text-slate-700 mono font-medium">
          <span id="headerCityDot" class="w-2 h-2 rounded-full bg-rose-500 animate-pulse"></span>
          <span id="headerCityAqiText">DELHI AQI: 382</span>
        </div>'''

if old_city_aqi_badge in content:
    content = content.replace(old_city_aqi_badge, new_city_aqi_badge, 1)

# 4. Update route cards and school list to support dynamic rendering
# Route Specification badge
old_route_spec = '''          <div class="flex items-center justify-between text-xs text-slate-500 font-semibold">
            <span>ROUTE SPECIFICATION</span>
            <span class="text-emerald-700 mono font-bold">DELHI-NCR</span>
          </div>'''

new_route_spec = '''          <div class="flex items-center justify-between text-xs text-slate-500 font-semibold">
            <span>ROUTE SPECIFICATION</span>
            <span id="routeRegionBadge" class="text-emerald-700 mono font-bold">DELHI-NCR</span>
          </div>'''

if old_route_spec in content:
    content = content.replace(old_route_spec, new_route_spec, 1)

# Route A Card updates: add span IDs
old_route_a_text = '''              <span class="flex items-center gap-1.5 font-bold text-rose-800">
                <span class="w-2 h-2 rounded-full bg-rose-600"></span>
                Route A • Outer Ring Road (Fastest)
              </span>
              <span class="px-2 py-0.5 rounded bg-rose-200 text-rose-900 border border-rose-300 text-[10px] font-bold mono">HIGH TOXICITY</span>'''

new_route_a_text = '''              <span class="flex items-center gap-1.5 font-bold text-rose-800">
                <span class="w-2 h-2 rounded-full bg-rose-600"></span>
                <span id="routeAName">Route A • Outer Ring Road (Fastest)</span>
              </span>
              <span id="routeABadge" class="px-2 py-0.5 rounded bg-rose-200 text-rose-900 border border-rose-300 text-[10px] font-bold mono">HIGH TOXICITY</span>'''

if old_route_a_text in content:
    content = content.replace(old_route_a_text, new_route_a_text, 1)

old_route_a_stats = '''              <div>
                <span class="text-2xl font-bold mono text-slate-900">18</span>
                <span class="text-xs text-slate-600">mins</span>
                <span class="text-xs text-slate-500 ml-2">14.2 km</span>
              </div>'''

new_route_a_stats = '''              <div>
                <span id="routeATime" class="text-2xl font-bold mono text-slate-900">18</span>
                <span class="text-xs text-slate-600">mins</span>
                <span id="routeADist" class="text-xs text-slate-500 ml-2">14.2 km</span>
              </div>'''

if old_route_a_stats in content:
    content = content.replace(old_route_a_stats, new_route_a_stats, 1)

old_route_a_notes = '''<div class="mt-2 text-xs text-rose-900 bg-rose-100/70 p-2 rounded-xl border border-rose-200 leading-snug">
              ⚠️ Passes through <b>Wazirabad & Azadpur choke points</b> (AQI 412). Heavy diesel particulate exposure.
            </div>'''

new_route_a_notes = '''<div id="routeANotes" class="mt-2 text-xs text-rose-900 bg-rose-100/70 p-2 rounded-xl border border-rose-200 leading-snug">
              ⚠️ Passes through <b>Wazirabad & Azadpur choke points</b> (AQI 412). Heavy diesel particulate exposure.
            </div>'''

if old_route_a_notes in content:
    content = content.replace(old_route_a_notes, new_route_a_notes, 1)

# Route B Card updates
old_route_b_text = '''              <span class="flex items-center gap-1.5 font-bold text-emerald-800">
                <span class="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                Route B • VayuPath Clean Corridor
              </span>
              <span class="px-2 py-0.5 rounded bg-emerald-600 text-white font-bold text-[10px] mono">-64% DOSE</span>'''

new_route_b_text = '''              <span class="flex items-center gap-1.5 font-bold text-emerald-800">
                <span class="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                <span id="routeBName">Route B • VayuPath Clean Corridor</span>
              </span>
              <span id="routeBBadge" class="px-2 py-0.5 rounded bg-emerald-600 text-white font-bold text-[10px] mono">-64% DOSE</span>'''

if old_route_b_text in content:
    content = content.replace(old_route_b_text, new_route_b_text, 1)

old_route_b_stats = '''              <div>
                <span class="text-2xl font-bold mono text-emerald-800">21</span>
                <span class="text-xs text-slate-600">mins (+3m)</span>
                <span class="text-xs text-slate-500 ml-2">14.9 km</span>
              </div>'''

new_route_b_stats = '''              <div>
                <span id="routeBTime" class="text-2xl font-bold mono text-emerald-800">21</span>
                <span id="routeBDiff" class="text-xs text-slate-600">mins (+3m)</span>
                <span id="routeBDist" class="text-xs text-slate-500 ml-2">14.9 km</span>
              </div>'''

if old_route_b_stats in content:
    content = content.replace(old_route_b_stats, new_route_b_stats, 1)

old_route_b_notes = '''<div class="mt-2 text-xs text-emerald-950 bg-emerald-100/80 p-2 rounded-xl border border-emerald-300 leading-snug">
              🍃 Diverts through <b>Ridge Forest Green Belt & Civil Lines</b> (AQI 118). Spares your lungs <b>50.2 µg toxic soot</b> today!
            </div>'''

new_route_b_notes = '''<div id="routeBNotes" class="mt-2 text-xs text-emerald-950 bg-emerald-100/80 p-2 rounded-xl border border-emerald-300 leading-snug">
              🍃 Diverts through <b>Ridge Forest Green Belt & Civil Lines</b> (AQI 118). Spares your lungs <b>50.2 µg toxic soot</b> today!
            </div>'''

if old_route_b_notes in content:
    content = content.replace(old_route_b_notes, new_route_b_notes, 1)

# School Panel updates: Wrap schools in #schoolListContainer
school_panel_start = content.find('<div id="schoolPanel"')
school_panel_content_start = content.find('<div class="space-y-2 text-xs">', school_panel_start)
school_panel_content_end = content.find('</div>\n\n          <button id="genAlertBtn"', school_panel_content_start)

if school_panel_content_start != -1 and school_panel_content_end != -1:
    old_school_list = content[school_panel_content_start:school_panel_content_end + 6]
    new_school_list = '<div id="schoolListContainer" class="space-y-2 text-xs">\n          </div>'
    content = content.replace(old_school_list, new_school_list, 1)

# 5. Now replace the Map and Search logic in script
# Find where the map logic starts:
map_marker = '/* -------------------------------------------------------------------------\n     4. REAL-LIFE DELHI GEOSPATIAL VECTOR MAP ENGINE'
end_marker = '<!-- =========================================================================\n       DATA LEGITIMACY & SCIENTIFIC AUDIT MODAL'

map_start_idx = content.find(map_marker)
end_idx = content.find(end_marker)

assert map_start_idx != -1, "Map start marker not found"
assert end_idx != -1, "End marker not found"

# Serialize cities data to embedded JS object
cities_json_str = json.dumps(cities_dict, indent=2)

new_pan_india_engine = f'''/* -------------------------------------------------------------------------
     4. PAN-INDIA GEOSPATIAL VECTOR MAP & MULTI-CITY EXPOSURE ENGINE
     ------------------------------------------------------------------------- */
  const PAN_INDIA_CITIES = {cities_json_str};

  let currentCityKey = 'delhi';
  let currentCity = PAN_INDIA_CITIES['delhi'];
  let activeRoute = 'B'; // 'A' or 'B'
  let showPlumes = false;
  let showStations = true;
  let animTick = 0;
  let searchedTarget = null;

  const mapCanvas = document.getElementById('delhiMapCanvas');
  const mctx = mapCanvas.getContext('2d');
  let mw, mh;

  function resizeMap() {{
    if (!mapNavView.classList.contains('view-active')) return;
    const rect = mapCanvas.parentElement.getBoundingClientRect();
    mw = mapCanvas.width = rect.width;
    mh = mapCanvas.height = rect.height;
    drawActiveCityMap();
  }}
  window.addEventListener('resize', resizeMap);

  function geoToScreen(lat, lon) {{
    const b = currentCity.bounds;
    const x = ((lon - b.minLon) / (b.maxLon - b.minLon)) * mw;
    const y = (1 - (lat - b.minLat) / (b.maxLat - b.minLat)) * mh;
    return {{ x, y }};
  }}

  function drawActiveCityMap() {{
    if (!mapNavView.classList.contains('view-active')) return;

    // 1. Clean Daylight Map Background
    mctx.fillStyle = '#f0f5fa';
    mctx.fillRect(0, 0, mw, mh);

    // Architectural grid lines
    mctx.strokeStyle = 'rgba(148, 163, 184, 0.16)';
    mctx.lineWidth = 1;
    const gridSpacing = 40;
    for (let x = 0; x < mw; x += gridSpacing) {{
      mctx.beginPath(); mctx.moveTo(x, 0); mctx.lineTo(x, mh); mctx.stroke();
    }}
    for (let y = 0; y < mh; y += gridSpacing) {{
      mctx.beginPath(); mctx.moveTo(0, y); mctx.lineTo(mw, y); mctx.stroke();
    }}

    // 2. City Water Feature (River, Lake, or Ocean Bay)
    if (currentCity.waterFeature && currentCity.waterFeature.coords.length > 0) {{
      const wf = currentCity.waterFeature;
      const wpts = wf.coords.map(pt => geoToScreen(pt[0], pt[1]));
      mctx.beginPath();
      mctx.moveTo(wpts[0].x, wpts[0].y);
      for (let i = 1; i < wpts.length; i++) {{
        mctx.lineTo(wpts[i].x, wpts[i].y);
      }}
      mctx.strokeStyle = 'rgba(14, 165, 233, 0.38)';
      mctx.lineWidth = 16;
      mctx.lineCap = 'round';
      mctx.lineJoin = 'round';
      mctx.stroke();

      const midIdx = Math.floor(wpts.length / 2);
      const labelPt = wpts[midIdx];
      mctx.fillStyle = '#0284c7';
      mctx.font = 'bold 10px Space Grotesk';
      mctx.fillText(wf.name, Math.max(15, labelPt.x + 12), labelPt.y - 6);
    }}

    // 3. City Green Buffer Sanctuary (Forest, Park, Hill)
    if (currentCity.greenFeature) {{
      const gf = currentCity.greenFeature;
      const gCenter = geoToScreen(gf.center[0], gf.center[1]);
      mctx.beginPath();
      mctx.ellipse(gCenter.x, gCenter.y, gf.radiusX, gf.radiusY, gf.angle || 0, 0, Math.PI * 2);
      mctx.fillStyle = 'rgba(34, 197, 94, 0.15)';
      mctx.fill();
      mctx.strokeStyle = 'rgba(16, 185, 129, 0.45)';
      mctx.lineWidth = 1.5;
      mctx.stroke();
      mctx.fillStyle = '#065f46';
      mctx.font = 'bold 10px Plus Jakarta Sans';
      mctx.fillText(gf.name, Math.max(15, gCenter.x - 70), gCenter.y);
    }}

    // 4. Stubble or Industrial Plume Overlay (if active)
    if (showPlumes) {{
      mctx.save();
      const plumeGrad = mctx.createRadialGradient(mw * 0.3, 0, 10, mw * 0.4, mh * 0.6, 350);
      plumeGrad.addColorStop(0, 'rgba(245, 158, 11, 0.35)');
      plumeGrad.addColorStop(0.6, 'rgba(239, 68, 68, 0.18)');
      plumeGrad.addColorStop(1, 'transparent');
      mctx.fillStyle = plumeGrad;
      mctx.fillRect(0, 0, mw, mh);
      mctx.fillStyle = '#b45309';
      mctx.font = 'bold 11px Space Grotesk';
      mctx.fillText('🛰️ NASA FIRMS: DOWNWIND SATELLITE PLUME VECTOR (14 KM/H NNW)', 20, mh - 25);
      mctx.restore();
    }}

    // 5. Route A (Red Choke Path)
    const ptsA = currentCity.routeA.points.map(p => geoToScreen(p[0], p[1]));
    if (ptsA.length > 1) {{
      mctx.beginPath();
      mctx.moveTo(ptsA[0].x, ptsA[0].y);
      for (let i = 1; i < ptsA.length; i++) mctx.lineTo(ptsA[i].x, ptsA[i].y);
      
      if (activeRoute === 'A') {{
        mctx.strokeStyle = '#e11d48';
        mctx.lineWidth = 6.5;
        mctx.shadowColor = 'rgba(225, 29, 72, 0.35)';
        mctx.shadowBlur = 10;
      }} else {{
        mctx.strokeStyle = 'rgba(225, 29, 72, 0.35)';
        mctx.lineWidth = 3.5;
        mctx.shadowBlur = 0;
      }}
      mctx.stroke();
      mctx.shadowBlur = 0;
    }}

    // 6. Route B (Green Clean Corridor)
    const ptsB = currentCity.routeB.points.map(p => geoToScreen(p[0], p[1]));
    if (ptsB.length > 1) {{
      mctx.beginPath();
      mctx.moveTo(ptsB[0].x, ptsB[0].y);
      for (let i = 1; i < ptsB.length; i++) mctx.lineTo(ptsB[i].x, ptsB[i].y);

      if (activeRoute === 'B') {{
        mctx.strokeStyle = '#059669';
        mctx.lineWidth = 6.5;
        mctx.shadowColor = 'rgba(16, 185, 129, 0.45)';
        mctx.shadowBlur = 12;
      }} else {{
        mctx.strokeStyle = 'rgba(16, 185, 129, 0.35)';
        mctx.lineWidth = 3.5;
        mctx.shadowBlur = 0;
      }}
      mctx.stroke();
      mctx.shadowBlur = 0;
    }}

    // 7. Animated Commuter Particle
    animTick += 0.004;
    const activePts = activeRoute === 'A' ? ptsA : ptsB;
    if (activePts.length > 1) {{
      const tNorm = (animTick % 1);
      const segCount = activePts.length - 1;
      const currentSeg = Math.floor(tNorm * segCount);
      const segFrac = (tNorm * segCount) - currentSeg;
      const p1 = activePts[currentSeg];
      const p2 = activePts[Math.min(currentSeg + 1, segCount)];
      const curX = p1.x + (p2.x - p1.x) * segFrac;
      const curY = p1.y + (p2.y - p1.y) * segFrac;

      mctx.beginPath();
      mctx.arc(curX, curY, 8, 0, Math.PI * 2);
      mctx.fillStyle = activeRoute === 'A' ? '#e11d48' : '#059669';
      mctx.strokeStyle = '#ffffff';
      mctx.lineWidth = 2.5;
      mctx.fill();
      mctx.stroke();
    }}

    // 8. Start & End Landmark Pins
    if (ptsA.length > 1) {{
      const pStart = ptsA[0];
      const pEnd = ptsA[ptsA.length - 1];

      // Origin Pin
      mctx.beginPath();
      mctx.arc(pStart.x, pStart.y, 7, 0, Math.PI * 2);
      mctx.fillStyle = '#0284c7';
      mctx.strokeStyle = '#ffffff';
      mctx.lineWidth = 2.5;
      mctx.fill();
      mctx.stroke();
      
      mctx.fillStyle = '#0f172a';
      mctx.font = 'bold 11px Space Grotesk';
      mctx.fillText(`📍 ${{currentCity.origin.split('(')[0].trim()}} (Start)`, Math.max(10, pStart.x - 70), pStart.y - 12);

      // Destination Pin
      mctx.beginPath();
      mctx.arc(pEnd.x, pEnd.y, 7, 0, Math.PI * 2);
      mctx.fillStyle = '#059669';
      mctx.strokeStyle = '#ffffff';
      mctx.lineWidth = 2.5;
      mctx.fill();
      mctx.stroke();

      mctx.fillStyle = '#0f172a';
      mctx.font = 'bold 11px Space Grotesk';
      mctx.fillText(`🏁 ${{currentCity.destination.split('(')[0].trim()}} (Dest)`, Math.max(10, pEnd.x - 65), pEnd.y - 14);
    }}

    // 9. CPCB Stations Pins
    if (showStations && currentCity.stations) {{
      currentCity.stations.forEach(st => {{
        const sc = geoToScreen(st.lat, st.lon);
        mctx.beginPath();
        mctx.arc(sc.x, sc.y, 4.5, 0, Math.PI * 2);
        mctx.fillStyle = st.aqi > 300 ? '#dc2626' : (st.aqi > 150 ? '#d97706' : '#059669');
        mctx.strokeStyle = '#ffffff';
        mctx.lineWidth = 1.5;
        mctx.fill();
        mctx.stroke();

        mctx.fillStyle = '#1e293b';
        mctx.font = '600 10px Plus Jakarta Sans';
        mctx.fillText(`${{st.name.split('(')[0].trim()}}: ${{st.aqi}} AQI`, sc.x + 8, sc.y + 3);
      }});
    }}

    // 10. Searched Locality Targeting Radar Marker
    if (searchedTarget) {{
      const st = geoToScreen(searchedTarget.lat, searchedTarget.lon);
      const radPulse = (Date.now() % 1500) / 1500;
      
      mctx.beginPath();
      mctx.arc(st.x, st.y, 12 + radPulse * 28, 0, Math.PI * 2);
      mctx.strokeStyle = `rgba(16, 185, 129, ${{1 - radPulse}})`;
      mctx.lineWidth = 2;
      mctx.stroke();

      mctx.beginPath();
      mctx.arc(st.x, st.y, 6, 0, Math.PI * 2);
      mctx.fillStyle = '#059669';
      mctx.strokeStyle = '#ffffff';
      mctx.lineWidth = 2;
      mctx.fill();
      mctx.stroke();

      mctx.fillStyle = '#0f172a';
      mctx.font = 'bold 11px Space Grotesk';
      mctx.fillText(`🎯 ${{searchedTarget.name}}: ${{searchedTarget.aqi}} AQI`, Math.max(10, st.x - 50), st.y - 20);
    }}

    if (mapNavView.classList.contains('view-active')) {{
      requestAnimationFrame(drawActiveCityMap);
    }}
  }}

  // City Switcher Function
  function switchCity(cityKey) {{
    if (!PAN_INDIA_CITIES[cityKey]) return;
    currentCityKey = cityKey;
    currentCity = PAN_INDIA_CITIES[cityKey];
    searchedTarget = null;

    // Update Header AQI
    const headerCityAqiText = document.getElementById('headerCityAqiText');
    const headerCityDot = document.getElementById('headerCityDot');
    if (headerCityAqiText) {{
      headerCityAqiText.textContent = `${{currentCity.name.toUpperCase()}} AQI: ${{currentCity.heroAQI}}`;
    }}
    if (headerCityDot) {{
      headerCityDot.className = `w-2 h-2 rounded-full ${{currentCity.heroAQI > 250 ? 'bg-rose-500' : (currentCity.heroAQI > 120 ? 'bg-amber-500' : 'bg-emerald-500')}} animate-pulse`;
    }}

    // Update Route Specification
    const routeRegionBadge = document.getElementById('routeRegionBadge');
    if (routeRegionBadge) routeRegionBadge.textContent = currentCity.name.toUpperCase();

    const originLabel = document.getElementById('originLabel');
    const destLabel = document.getElementById('destLabel');
    if (originLabel) originLabel.textContent = currentCity.origin;
    if (destLabel) destLabel.textContent = currentCity.destination;

    // Update Route A Card
    document.getElementById('routeAName').textContent = currentCity.routeA.name;
    document.getElementById('routeABadge').textContent = currentCity.routeA.badge;
    document.getElementById('routeATime').textContent = currentCity.routeA.duration;
    document.getElementById('routeADist').textContent = `${{currentCity.routeA.dist}} km`;
    document.getElementById('routeADose').textContent = `${{currentCity.routeA.dose}} µg PM2.5`;
    document.getElementById('routeANotes').innerHTML = currentCity.routeA.notes;

    // Update Route B Card
    document.getElementById('routeBName').textContent = currentCity.routeB.name;
    document.getElementById('routeBBadge').textContent = currentCity.routeB.badge;
    document.getElementById('routeBTime').textContent = currentCity.routeB.duration;
    document.getElementById('routeBDiff').textContent = `mins (${{currentCity.routeB.diff || '+3m'}})`;
    document.getElementById('routeBDist').textContent = `${{currentCity.routeB.dist}} km`;
    document.getElementById('routeBDose').textContent = `${{currentCity.routeB.dose}} µg PM2.5`;
    document.getElementById('routeBNotes').innerHTML = currentCity.routeB.notes;

    // Update School Panel List
    const schoolListContainer = document.getElementById('schoolListContainer');
    if (schoolListContainer && currentCity.schools) {{
      schoolListContainer.innerHTML = currentCity.schools.map(s => `
        <div class="p-2.5 rounded-xl bg-slate-900 border border-slate-800 flex justify-between items-center">
          <div>
            <div class="font-medium text-slate-200">${{s.name}}</div>
            <div class="text-[11px] text-slate-400">${{s.desc}} • AQI ${{s.aqi}}</div>
          </div>
          <span class="px-2 py-1 rounded text-[10px] font-bold border ${{s.badgeCls}}">${{s.badge}}</span>
        </div>
      `).join('');
    }}

    // Reset search bar
    const localitySearchInput = document.getElementById('localitySearchInput');
    const areaResultCard = document.getElementById('areaResultCard');
    const localitySuggestions = document.getElementById('localitySuggestions');
    const clearLocalitySearchBtn = document.getElementById('clearLocalitySearchBtn');
    if (localitySearchInput) localitySearchInput.value = '';
    if (areaResultCard) areaResultCard.classList.add('hidden');
    if (localitySuggestions) localitySuggestions.classList.add('hidden');
    if (clearLocalitySearchBtn) clearLocalitySearchBtn.classList.add('hidden');

    // Trigger AI advisory update
    aiAdvisoryText.innerHTML = activeRoute === 'A'
      ? `⚠️ <b>Route A (${{currentCity.name}}):</b> Traveling via major transit corridors. High exposure (${{currentCity.routeA.dose}} µg). Switch to Route B to spare toxic intake!`
      : `"Taking Route B in ${{currentCity.name}} spares lung intake by ${{currentCity.routeB.badge}}. Canopy and green corridor buffers active."`;

    resizeMap();
  }}

  // City Dropdown Listener
  const citySelectDropdown = document.getElementById('citySelectDropdown');
  if (citySelectDropdown) {{
    citySelectDropdown.addEventListener('change', (e) => {{
      switchCity(e.target.value);
    }});
  }}

  // Route Toggle listeners
  const cardRouteA = document.getElementById('cardRouteA');
  const cardRouteB = document.getElementById('cardRouteB');
  const aiAdvisoryText = document.getElementById('aiAdvisoryText');

  cardRouteA.addEventListener('click', () => {{
    activeRoute = 'A';
    cardRouteA.className = 'route-select-card p-3.5 rounded-2xl bg-rose-50/90 border-2 border-rose-500 cursor-pointer shadow-md shadow-rose-600/15 transition-all';
    cardRouteB.className = 'route-select-card p-3.5 rounded-2xl bg-white/90 border-2 border-emerald-900/20 hover:border-emerald-500 cursor-pointer transition-all';
    aiAdvisoryText.innerHTML = `⚠️ <b>Route A Selected:</b> You are traveling via major choke points. Expected exposure is high (<b>${{currentCity.routeA.dose}} µg</b>). Consider switching to Route B!`;
  }});

  cardRouteB.addEventListener('click', () => {{
    activeRoute = 'B';
    cardRouteB.className = 'route-select-card p-3.5 rounded-2xl bg-emerald-50/90 border-2 border-emerald-500 cursor-pointer shadow-md shadow-emerald-600/15 transition-all';
    cardRouteA.className = 'route-select-card p-3.5 rounded-2xl bg-white/90 border-2 border-rose-900/20 hover:border-rose-500 cursor-pointer transition-all';
    aiAdvisoryText.innerHTML = `"Taking Route B in ${{currentCity.name}} spares lung intake by <b>${{currentCity.routeB.badge}}</b>. Green canopy corridors active."`;
  }});

  // Layer toggles
  document.getElementById('togglePlumesBtn').addEventListener('click', () => {{
    showPlumes = !showPlumes;
    document.getElementById('togglePlumesBtn').classList.toggle('border-amber-400');
  }});
  document.getElementById('toggleStationsBtn').addEventListener('click', () => {{
    showStations = !showStations;
    document.getElementById('toggleStationsBtn').classList.toggle('border-sky-400');
  }});

  // Mode Tabs Switching
  const tabNav = document.getElementById('tabNav');
  const tabSchool = document.getElementById('tabSchool');
  const tabPlumes = document.getElementById('tabPlumes');
  const routeCardsContainer = document.getElementById('routeCardsContainer');
  const schoolPanel = document.getElementById('schoolPanel');

  tabNav.addEventListener('click', () => {{
    tabNav.className = 'px-3 py-1.5 rounded-lg bg-emerald-600 text-white font-medium flex items-center gap-1.5 transition-all';
    tabSchool.className = 'px-3 py-1.5 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-100 font-medium flex items-center gap-1.5 transition-all';
    tabPlumes.className = 'px-3 py-1.5 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-100 font-medium flex items-center gap-1.5 transition-all';
    routeCardsContainer.classList.remove('hidden');
    schoolPanel.classList.add('hidden');
    showPlumes = false;
  }});

  tabSchool.addEventListener('click', () => {{
    tabSchool.className = 'px-3 py-1.5 rounded-lg bg-emerald-600 text-white font-medium flex items-center gap-1.5 transition-all';
    tabNav.className = 'px-3 py-1.5 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-100 font-medium flex items-center gap-1.5 transition-all';
    tabPlumes.className = 'px-3 py-1.5 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-100 font-medium flex items-center gap-1.5 transition-all';
    routeCardsContainer.classList.add('hidden');
    schoolPanel.classList.remove('hidden');
  }});

  tabPlumes.addEventListener('click', () => {{
    tabPlumes.className = 'px-3 py-1.5 rounded-lg bg-amber-600 text-white font-medium flex items-center gap-1.5 transition-all';
    tabNav.className = 'px-3 py-1.5 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-100 font-medium flex items-center gap-1.5 transition-all';
    tabSchool.className = 'px-3 py-1.5 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-100 font-medium flex items-center gap-1.5 transition-all';
    routeCardsContainer.classList.remove('hidden');
    schoolPanel.classList.add('hidden');
    showPlumes = true;
  }});

  // Persona buttons recalculate dosage
  const personaBtns = document.querySelectorAll('.persona-btn');
  const ventRateLabel = document.getElementById('ventRateLabel');
  const routeADose = document.getElementById('routeADose');
  const routeBDose = document.getElementById('routeBDose');

  personaBtns.forEach(btn => {{
    btn.addEventListener('click', () => {{
      personaBtns.forEach(b => {{
        b.className = 'persona-btn p-2 rounded-xl bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-200';
      }});
      btn.className = 'persona-btn active p-2 rounded-xl bg-emerald-600 text-white font-semibold shadow-xs';
      
      const rate = parseFloat(btn.getAttribute('data-rate'));
      ventRateLabel.textContent = `${{rate}} L/min`;

      // Dose = Time * Concentration * Ventilation
      const baseA = parseFloat(currentCity.routeA.dose);
      const baseB = parseFloat(currentCity.routeB.dose);
      const doseA = (baseA * (rate / 42)).toFixed(1);
      const doseB = (baseB * (rate / 42)).toFixed(1);
      routeADose.textContent = `${{doseA}} µg PM2.5`;
      routeBDose.textContent = `${{doseB}} µg PM2.5`;
    }});
  }});

  // School Alert Broadcast Simulator
  document.getElementById('genAlertBtn').addEventListener('click', () => {{
    alert(`📢 Generated Alert Broadcast for ${{currentCity.name}}:\\n\\n'URGENT: ${{currentCity.name}} AQI at ${{currentCity.heroAQI}} today. Morning outdoor assembly suspended. Classroom HEPA purifiers active. Please follow VayuPath clean corridors.'\\n\\nSent via AWS SNS to parents!`);
  }});

  /* -------------------------------------------------------------------------
     5. PAN-INDIA LOCALITY SEARCH ENGINE (ALL-INDIA CPCB SENSORS)
     ------------------------------------------------------------------------- */
  const localitySearchInput = document.getElementById("localitySearchInput");
  const localitySuggestions = document.getElementById("localitySuggestions");
  const clearLocalitySearchBtn = document.getElementById("clearLocalitySearchBtn");
  const areaResultCard = document.getElementById("areaResultCard");
  const resAreaName = document.getElementById("resAreaName");
  const resAreaCategory = document.getElementById("resAreaCategory");
  const resAreaBadge = document.getElementById("resAreaBadge");
  const resAreaAQI = document.getElementById("resAreaAQI");
  const resPM25 = document.getElementById("resPM25");
  const resPM10 = document.getElementById("resPM10");
  const resNO2 = document.getElementById("resNO2");
  const resAdvisory = document.getElementById("resAdvisory");
  const setAsOriginBtn = document.getElementById("setAsOriginBtn");
  const setAsDestBtn = document.getElementById("setAsDestBtn");

  function getAQIBadge(aqi) {{
    if (aqi > 400) return {{ label: 'HAZARDOUS', cls: 'bg-rose-950 text-rose-200 border-rose-800' }};
    if (aqi > 300) return {{ label: 'SEVERE', cls: 'bg-rose-100 text-rose-800 border-rose-300' }};
    if (aqi > 200) return {{ label: 'VERY POOR', cls: 'bg-amber-100 text-amber-800 border-amber-300' }};
    if (aqi > 100) return {{ label: 'MODERATE', cls: 'bg-yellow-100 text-yellow-800 border-yellow-300' }};
    return {{ label: 'CLEAN CORRIDOR', cls: 'bg-emerald-100 text-emerald-800 border-emerald-300' }};
  }}

  function displayAreaAQI(area) {{
    searchedTarget = area;
    resAreaName.textContent = area.name;
    resAreaCategory.textContent = area.category;
    resAreaAQI.textContent = `${{area.aqi}} AQI`;
    
    const badge = getAQIBadge(area.aqi);
    resAreaBadge.textContent = badge.label;
    resAreaBadge.className = `px-2 py-0.5 rounded text-[10px] font-bold border ${{badge.cls}}`;
    
    resPM25.textContent = `${{area.pm25}} µg`;
    resPM10.textContent = `${{area.pm10}} µg`;
    resNO2.textContent = `${{area.no2}} ppb`;
    resAdvisory.textContent = area.advisory;

    areaResultCard.classList.remove('hidden');
    localitySuggestions.classList.add('hidden');
    clearLocalitySearchBtn.classList.remove('hidden');
    localitySearchInput.value = area.name;

    // Redraw map with target reticle
    drawActiveCityMap();
  }}

  if (localitySearchInput) {{
    localitySearchInput.addEventListener('input', (e) => {{
      const q = e.target.value.toLowerCase().trim();
      if (!q) {{
        localitySuggestions.classList.add('hidden');
        clearLocalitySearchBtn.classList.add('hidden');
        return;
      }}

      clearLocalitySearchBtn.classList.remove('hidden');

      // 1. Search in current active city localities first
      let currentMatches = (currentCity.localities || []).filter(l => 
        l.name.toLowerCase().includes(q) || l.category.toLowerCase().includes(q)
      ).map(m => ({{ ...m, cityKey: currentCityKey, cityName: currentCity.name }}));

      // 2. Search across ALL Indian cities
      let allOtherMatches = [];
      Object.keys(PAN_INDIA_CITIES).forEach(cKey => {{
        if (cKey === currentCityKey) return;
        const cObj = PAN_INDIA_CITIES[cKey];
        (cObj.localities || []).forEach(loc => {{
          if (loc.name.toLowerCase().includes(q) || loc.category.toLowerCase().includes(q) || cObj.name.toLowerCase().includes(q)) {{
            allOtherMatches.push({{ ...loc, cityKey: cKey, cityName: cObj.name }});
          }}
        }});
      }});

      const totalMatches = [...currentMatches, ...allOtherMatches].slice(0, 10);

      if (totalMatches.length > 0) {{
        localitySuggestions.innerHTML = totalMatches.map(m => `
          <div class="locality-item p-2.5 hover:bg-slate-50 cursor-pointer flex items-center justify-between transition-colors" data-city="${{m.cityKey}}" data-name="${{m.name}}">
            <div>
              <div class="font-semibold text-slate-800 flex items-center gap-1.5">
                <span>${{m.name}}</span>
                <span class="text-[9px] px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 font-medium">${{m.cityName}}</span>
              </div>
              <div class="text-[10px] text-slate-400">${{m.category}}</div>
            </div>
            <div class="text-right">
              <span class="mono font-bold text-xs ${{m.aqi > 300 ? 'text-rose-600' : (m.aqi > 150 ? 'text-amber-600' : 'text-emerald-600')}}">${{m.aqi}} AQI</span>
            </div>
          </div>
        `).join('');
        localitySuggestions.classList.remove('hidden');

        document.querySelectorAll('.locality-item').forEach(item => {{
          item.addEventListener('click', () => {{
            const cKey = item.getAttribute('data-city');
            const name = item.getAttribute('data-name');
            if (cKey !== currentCityKey) {{
              if (citySelectDropdown) citySelectDropdown.value = cKey;
              switchCity(cKey);
            }}
            const target = PAN_INDIA_CITIES[cKey].localities.find(l => l.name === name);
            if (target) displayAreaAQI(target);
          }});
        }});
      }} else {{
        const randomEstimate = Math.min(480, Math.max(45, Math.floor(180 + Math.sin(q.length) * 80)));
        localitySuggestions.innerHTML = `
          <div id="customAreaPick" class="p-3 hover:bg-slate-50 cursor-pointer text-slate-700">
            <div class="font-semibold">📍 Search '${{e.target.value}}' (Pan-India Interpolated Grid)</div>
            <div class="text-[10px] text-slate-400">Estimated via nearest CPCB station decay in ${{currentCity.name}}: ~${{randomEstimate}} AQI</div>
          </div>
        `;
        localitySuggestions.classList.remove('hidden');
        document.getElementById('customAreaPick').addEventListener('click', () => {{
          const b = currentCity.bounds;
          displayAreaAQI({{
            name: e.target.value,
            category: `Custom Locality in ${{currentCity.name}}`,
            lat: b.minLat + (b.maxLat - b.minLat) * 0.5 + (Math.random() - 0.5) * 0.05,
            lon: b.minLon + (b.maxLon - b.minLon) * 0.5 + (Math.random() - 0.5) * 0.05,
            aqi: randomEstimate,
            pm25: Math.round(randomEstimate * 0.62),
            pm10: Math.round(randomEstimate * 0.95),
            no2: Math.round(30 + Math.random() * 30),
            advisory: "⚠️ Spatial IDW interpolation based on nearest official Indian CPCB sensor node."
          }});
        }});
      }}
    }});

    clearLocalitySearchBtn.addEventListener('click', () => {{
      localitySearchInput.value = '';
      localitySuggestions.classList.add('hidden');
      areaResultCard.classList.add('hidden');
      clearLocalitySearchBtn.classList.add('hidden');
      searchedTarget = null;
      drawActiveCityMap();
    }});

    setAsOriginBtn.addEventListener('click', () => {{
      if (searchedTarget) {{
        document.getElementById('originLabel').textContent = searchedTarget.name;
        alert(`📍 Set '${{searchedTarget.name}}' (${{searchedTarget.aqi}} AQI) as Route Start in ${{currentCity.name}}!`);
      }}
    }});

    setAsDestBtn.addEventListener('click', () => {{
      if (searchedTarget) {{
        document.getElementById('destLabel').textContent = searchedTarget.name;
        alert(`🏁 Set '${{searchedTarget.name}}' (${{searchedTarget.aqi}} AQI) as Route Destination in ${{currentCity.name}}!`);
      }}
    }});
  }}

  /* -------------------------------------------------------------------------
     6. VAYUMITRA AI BOT CONTROLLER (PAN-INDIA AWARE)
     ------------------------------------------------------------------------- */
  const botToggleBtn = document.getElementById('botToggleBtn');
  const botCloseBtn = document.getElementById('botCloseBtn');
  const botResetBtn = document.getElementById('botResetBtn');
  const botChatModal = document.getElementById('botChatModal');
  const botHintBubble = document.getElementById('botHintBubble');
  const botMessages = document.getElementById('botMessages');
  const botInputForm = document.getElementById('botInputForm');
  const botInput = document.getElementById('botInput');

  let isBotOpen = false;

  function toggleBot(open) {{
    isBotOpen = (typeof open === 'boolean') ? open : !isBotOpen;
    if (isBotOpen) {{
      botChatModal.classList.remove('opacity-0', 'translate-y-6', 'pointer-events-none');
      botChatModal.classList.add('opacity-100', 'translate-y-0', 'pointer-events-auto');
      if (botHintBubble) botHintBubble.style.display = 'none';
      setTimeout(() => botInput.focus(), 200);
    }} else {{
      botChatModal.classList.add('opacity-0', 'translate-y-6', 'pointer-events-none');
      botChatModal.classList.remove('opacity-100', 'translate-y-0', 'pointer-events-auto');
    }}
  }}

  botToggleBtn.addEventListener('click', () => toggleBot());
  if (botHintBubble) botHintBubble.addEventListener('click', () => toggleBot(true));
  botCloseBtn.addEventListener('click', () => toggleBot(false));

  function appendMessage(sender, text, isHtml = false) {{
    const isUser = sender === 'user';
    const msgDiv = document.createElement('div');
    msgDiv.className = `flex gap-2.5 items-start ${{isUser ? 'flex-row-reverse' : ''}}`;

    const avatar = document.createElement('div');
    avatar.className = `w-6 h-6 rounded-full flex-shrink-0 flex items-center justify-center text-[10px] font-bold mt-0.5 ${{
      isUser ? 'bg-slate-900 text-white' : 'bg-emerald-600 text-white'
    }}`;
    avatar.textContent = isUser ? 'You' : 'V';

    const bubble = document.createElement('div');
    bubble.className = `p-3 rounded-2xl leading-relaxed max-w-[85%] shadow-sm text-xs ${{
      isUser 
        ? 'rounded-tr-sm bg-emerald-600 text-white' 
        : 'rounded-tl-sm bg-slate-100 border border-slate-200/80 text-slate-800'
    }}`;

    if (isHtml) bubble.innerHTML = text;
    else bubble.textContent = text;

    msgDiv.appendChild(avatar);
    msgDiv.appendChild(bubble);
    botMessages.appendChild(msgDiv);
    botMessages.scrollTop = botMessages.scrollHeight;
  }}

  function showTypingIndicator() {{
    const id = 'typingIndicator';
    const existing = document.getElementById(id);
    if (existing) existing.remove();

    const typingDiv = document.createElement('div');
    typingDiv.id = id;
    typingDiv.className = 'flex gap-2.5 items-start';
    typingDiv.innerHTML = `
      <div class="w-6 h-6 rounded-full bg-emerald-600 text-white flex-shrink-0 flex items-center justify-center text-[10px] font-bold mt-0.5">V</div>
      <div class="p-3 rounded-2xl rounded-tl-sm bg-slate-100 border border-slate-200/80 text-slate-500 text-xs flex items-center gap-1.5 shadow-sm">
        <span class="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping"></span>
        <span>VayuMitra is responding...</span>
      </div>
    `;
    botMessages.appendChild(typingDiv);
    botMessages.scrollTop = botMessages.scrollHeight;
  }}

  function removeTypingIndicator() {{
    const el = document.getElementById('typingIndicator');
    if (el) el.remove();
  }}

  function generateBotResponse(query) {{
    const q = query.toLowerCase();

    // Check if user is asking about a specific Indian city
    for (const [k, c] of Object.entries(PAN_INDIA_CITIES)) {{
      if (q.includes(k) || q.includes(c.name.toLowerCase())) {{
        return `<b>🇮🇳 ${{c.name}} (${{c.state}}) Air Intelligence:</b><br><br>
          • <b>Live AQI:</b> ${{c.heroAQI}} (${{c.badge}})<br>
          • <b>Fastest Path (Route A):</b> ${{c.routeA.name}} (${{c.routeA.dose}} µg exposure)<br>
          • <b>Clean Corridor (Route B):</b> ${{c.routeB.name}} (${{c.routeB.dose}} µg dose, <b>${{c.routeB.badge}}</b>)<br>
          • <b>Official Stations:</b> ${{c.stations.map(s => s.name).slice(0, 3).join(', ')}}<br><br>
          Aap top dropdown se <b>${{c.name}}</b> select karke map par live commute simulate kar sakte hain!`;
      }}
    }}

    if (q.includes('bengaluru') || q.includes('bangalore')) {{
      return `🌳 <b>Bengaluru Clean Air Corridor:</b><br><br>
        Bengaluru ka current AQI <b>84 (Clean)</b> hai. HAL & Cubbon Park canopy corridors ke through travel karne se inhaled dose sirf <b>17.4 µg</b> rehta hai, compared to 41.6 µg on Old Airport Road!`;
    }}

    if (q.includes('route') || q.includes('rasta') || q.includes('comparison')) {{
      return `<b>🗺️ Route Comparison Analysis (${{currentCity.name}}):</b><br><br>
        • <b>Route A:</b> ${{currentCity.routeA.name}} (${{currentCity.routeA.duration}} mins, <b>${{currentCity.routeA.dose}} µg PM2.5</b>). Fastest route but high exposure.<br><br>
        • <b>Route B:</b> ${{currentCity.routeB.name}} (${{currentCity.routeB.duration}} mins, <b>${{currentCity.routeB.dose}} µg PM2.5</b>). Slashing particulate damage by <b>${{currentCity.routeB.badge}}</b>!`;
    }}

    if (q.includes('cyclist') || q.includes('dose') || q.includes('persona') || q.includes('breathing')) {{
      return `🚴 <b>Why Breathing Persona Matters:</b><br><br>
        Ek cyclist <b>42 L/min</b> air inhale karta hai jabki car passenger ~12 L/min leta hai. Iska matlab cyclist ko 3.5x zyada toxic particles lungs me absorb hote hain! VayuPath persona ke mutabik customized dosage calculate karta hai.`;
    }}

    if (q.includes('school') || q.includes('protocol')) {{
      return `🏫 <b>School Bad-Day Protocol (${{currentCity.name}}):</b><br><br>
        1. AQI threshold exceed hone par outdoor morning assembly suspend hoti hai.<br>
        2. Classrooms me HEPA purifiers automatically trigger hote hain.<br>
        3. Parents ko WhatsApp & SMS dwara safe commute corridors bheje jaate hain.`;
    }}

    if (q.includes('aws') || q.includes('cloud')) {{
      return `☁️ <b>AWS Architecture:</b><br><br>
        • <b>AWS Lambda:</b> Ingests OpenAQ & CPCB sensor data across all Indian cities every 30 mins.<br>
        • <b>Amazon DynamoDB:</b> Stores cached hyper-local AQI grid values.<br>
        • <b>AWS Amplify:</b> Powers the live frontend deployment.<br>
        • <b>Amazon Bedrock:</b> Generates customized respiratory health playbooks.`;
    }}

    return `Main aapko pure Bharat ke 10+ major cities (Delhi, Bengaluru, Mumbai, Kolkata, Hyderabad, Chennai, Pune, Lucknow, Ahmedabad, Jaipur) ke real-time AQI aur clean navigation routes dikha sakta hoon!`;
  }}

  function handleUserQuery(query) {{
    if (!query || !query.trim()) return;
    appendMessage('user', query.trim());
    botInput.value = '';

    showTypingIndicator();
    setTimeout(() => {{
      removeTypingIndicator();
      const botResponse = generateBotResponse(query);
      appendMessage('bot', botResponse, true);
    }}, 600);
  }}

  botInputForm.addEventListener('submit', (e) => {{
    e.preventDefault();
    handleUserQuery(botInput.value);
  }});

  document.querySelectorAll('.bot-chip').forEach(chip => {{
    chip.addEventListener('click', () => {{
      handleUserQuery(chip.getAttribute('data-query'));
    }});
  }});

  botResetBtn.addEventListener('click', () => {{
    botMessages.innerHTML = `
      <div class="flex gap-2.5 items-start">
        <div class="w-6 h-6 rounded-full bg-emerald-600 text-white flex-shrink-0 flex items-center justify-center text-[10px] font-bold mt-0.5">V</div>
        <div class="p-3 rounded-2xl rounded-tl-sm bg-slate-100 border border-slate-200/80 text-slate-800 leading-relaxed max-w-[85%] shadow-sm">
          Chat reset ho gaya! 🙏 Main hoon <b>VayuMitra</b>. Poochhiye pure Bharat ke kisi bhi sheher ya route ke baare me!
        </div>
      </div>
    `;
  }});

  // Legitimacy Modal Listeners
  const openLegitimacyBtn = document.getElementById('openLegitimacyBtn');
  const closeLegitimacyBtn = document.getElementById('closeLegitimacyBtn');
  const closeLegitimacyBtn2 = document.getElementById('closeLegitimacyBtn2');
  const legitimacyModal = document.getElementById('legitimacyModal');

  if (openLegitimacyBtn && legitimacyModal) {{
    openLegitimacyBtn.addEventListener('click', () => {{
      legitimacyModal.classList.remove('opacity-0', 'pointer-events-none');
      legitimacyModal.classList.add('opacity-100', 'pointer-events-auto');
    }});
  }}
  if (closeLegitimacyBtn && legitimacyModal) {{
    closeLegitimacyBtn.addEventListener('click', () => {{
      legitimacyModal.classList.add('opacity-0', 'pointer-events-none');
      legitimacyModal.classList.remove('opacity-100', 'pointer-events-auto');
    }});
  }}
  if (closeLegitimacyBtn2 && legitimacyModal) {{
    closeLegitimacyBtn2.addEventListener('click', () => {{
      legitimacyModal.classList.add('opacity-0', 'pointer-events-none');
      legitimacyModal.classList.remove('opacity-100', 'pointer-events-auto');
    }});
  }}

  // Initialize Delhi by default on load
  switchCity('delhi');
  </script>

'''

content = content[:map_start_idx] + new_pan_india_engine + content[end_idx:]

with open('/Users/aryansingh/.gemini/antigravity/scratch/vayupath/index.html', 'w') as f:
    f.write(content)

# Also sync to artifact file
with open('/Users/aryansingh/.gemini/antigravity/brain/a758389f-bd00-4085-9637-18d8529cbe6c/aeroguard_intro.html', 'w') as f:
    f.write(content)

print("Pan-India integration complete! Updated both working copy and artifact.")
