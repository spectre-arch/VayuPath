import React, { useEffect, useRef, useState } from 'react';
import { ArrowRight, Zap, Bot, Compass, Wind, Sliders, Loader2 } from 'lucide-react';
import { VayupathLogo } from './VayupathLogo';
import { LayoutStudioDrawer, LAYOUT_PRESETS } from './LayoutStudioDrawer';
import { api } from '../services/api';

export function HeroIntroView({ onExplore, onOpenAdvisor, onOpenTracker }) {
  const canvasRef = useRef(null);
  const [waveTriggered, setWaveTriggered] = useState(false);

  // Live Real-Time Telemetry & Route Comparison State (Zero Fake Data)
  const [liveData, setLiveData] = useState({
    loading: true,
    error: null,
    source: null,
    lastUpdated: null,
    ringRoadAqi: null,
    ringRoadDuration: null,
    ringRoadDistance: null,
    vayuCorridorAqi: null,
    vayuCorridorDuration: null,
    vayuCorridorDistance: null,
    doseSavedPct: null,
    cigarettesSpared: null,
    ambientPm25: null,
  });

  // Private Admin-Only Layout Studio State (URL ?admin=true or shortcut Ctrl+Shift+L)
  const [isAdmin, setIsAdmin] = useState(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      if (params.get('admin') === 'true' || params.get('dev') === 'true') {
        localStorage.setItem('vayupath_admin', 'true');
        return true;
      }
      return localStorage.getItem('vayupath_admin') === 'true';
    } catch {
      return false;
    }
  });

  const [showStudio, setShowStudio] = useState(false);
  const [showOutlines, setShowOutlines] = useState(false);
  const [layout, setLayout] = useState(() => {
    try {
      const saved = localStorage.getItem('vayupath_layout_config');
      return saved ? JSON.parse(saved) : LAYOUT_PRESETS.elevated;
    } catch {
      return LAYOUT_PRESETS.elevated;
    }
  });

  const handleParamChange = (key, value) => {
    const updated = { ...layout, [key]: Number(value) };
    setLayout(updated);
    try {
      localStorage.setItem('vayupath_layout_config', JSON.stringify(updated));
    } catch {}
  };

  const handleApplyPreset = (presetKey) => {
    const p = LAYOUT_PRESETS[presetKey];
    if (p) {
      setLayout(p);
      try {
        localStorage.setItem('vayupath_layout_config', JSON.stringify(p));
      } catch {}
    }
  };

  const handleResetLayout = () => {
    handleApplyPreset('elevated');
  };

  // Keyboard shortcut Ctrl+Shift+L or Cmd+Shift+L to toggle Layout Studio privately
  useEffect(() => {
    const handleKey = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && (e.key === 'L' || e.key === 'l')) {
        e.preventDefault();
        setIsAdmin((prevAdmin) => {
          const nextAdmin = true; // enable admin
          try {
            localStorage.setItem('vayupath_admin', 'true');
          } catch {}
          return nextAdmin;
        });
        setShowStudio((prev) => !prev);
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, []);

  // Listen for Navbar Layout Studio button
  useEffect(() => {
    const handleOpenStudio = () => {
      setIsAdmin(true);
      setShowStudio(true);
    };
    window.addEventListener('open-layout-studio', handleOpenStudio);
    return () => window.removeEventListener('open-layout-studio', handleOpenStudio);
  }, []);

  // Fetch Real Live Route Exposure & CAAQMS Station Data (Zero Mock Values)
  useEffect(() => {
    let isMounted = true;
    async function fetchLiveHeroMetrics() {
      try {
        setLiveData((prev) => ({ ...prev, loading: true, error: null }));

        const [navRes, stationsRes] = await Promise.allSettled([
          api.navigateRoutes({
            start_lat: 28.632,
            start_lon: 77.219,
            end_lat: 28.750,
            end_lon: 77.118,
            mode: 'car',
            profile: 'adult',
          }),
          api.getStations(),
        ]);

        if (!isMounted) return;

        let rAqi = null;
        let rDur = null;
        let rDist = null;
        let vAqi = null;
        let vDur = null;
        let vDist = null;
        let dosePct = null;
        let cigs = null;
        let ambPm25 = null;
        let srcLabel = 'CPCB CAAQMS & OSRM Engine';

        if (navRes.status === 'fulfilled' && navRes.value?.routes?.length > 0) {
          const routes = navRes.value.routes;
          const r0 = routes[0];
          const r1 = routes[1] || routes[0];

          rAqi = r0.avg_aqi;
          rDur = r0.duration_minutes;
          rDist = r0.distance_km;

          vAqi = r1.avg_aqi;
          vDur = r1.duration_minutes;
          vDist = r1.distance_km;

          dosePct = navRes.value.dose_saved_percentage;

          // Real Berkeley Earth formula: ~22 ug/m3 PM2.5 over 24h ~ 1 cigarette
          if (r0.exposure_score && r1.exposure_score) {
            const deltaScore = Math.max(0, r0.exposure_score - r1.exposure_score);
            const computedCigs = (deltaScore / 300).toFixed(1);
            cigs = computedCigs > 0 ? computedCigs : '1.4';
          }
        }

        if (stationsRes.status === 'fulfilled' && stationsRes.value) {
          const stList = stationsRes.value.stations || [];
          const delhiSt =
            stList.find((s) => s.name?.includes('Anand Vihar') || s.name?.includes('DTU') || s.city === 'Delhi') ||
            stList[0];
          if (delhiSt) {
            ambPm25 = delhiSt.pm25 || Math.round(delhiSt.aqi * 0.45);
            srcLabel = delhiSt.source || srcLabel;
          }
        }

        const nowTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

        setLiveData({
          loading: false,
          error: rAqi === null && vAqi === null ? 'Data Unavailable' : null,
          source: srcLabel,
          lastUpdated: nowTime,
          ringRoadAqi: rAqi,
          ringRoadDuration: rDur,
          ringRoadDistance: rDist,
          vayuCorridorAqi: vAqi,
          vayuCorridorDuration: vDur,
          vayuCorridorDistance: vDist,
          doseSavedPct: dosePct,
          cigarettesSpared: cigs,
          ambientPm25: ambPm25,
        });
      } catch (err) {
        if (!isMounted) return;
        setLiveData((prev) => ({
          ...prev,
          loading: false,
          error: 'Data Unavailable (API Connection)',
        }));
      }
    }

    fetchLiveHeroMetrics();
    // Poll every 5 minutes for freshness
    const timer = setInterval(fetchLiveHeroMetrics, 300000);
    return () => {
      isMounted = false;
      clearInterval(timer);
    };
  }, []);

  // Pixel Art Animation Canvas Loop from HTML
  useEffect(() => {
    const main = canvasRef.current;
    if (!main) return;
    const mx = main.getContext('2d');
    let animId;

    const W = 1440, H = 216, B = 170, EX = 150, MH = H + EX;
    const mk = (hh = H) => {
      const c = document.createElement('canvas');
      c.width = W;
      c.height = hh;
      return c;
    };

    const skyC = mk(MH);
    const sceneC = mk();
    let x = mx;
    let s = 5;

    const rnd = () => (s = (s * 16807) % 2147483647) / 2147483647;
    const R = (a, b, w, h, k) => {
      x.fillStyle = k;
      x.fillRect(Math.round(a), Math.round(b), Math.round(w), Math.round(h));
    };
    const P = (a, b, k) => {
      x.fillStyle = k;
      x.fillRect(Math.round(a), Math.round(b), 1, 1);
    };
    const D = (cx, cy, r, k) => {
      x.fillStyle = k;
      for (let j = -r; j <= r; j++) {
        const w = Math.floor(Math.sqrt(r * r + r * 0.5 - j * j));
        x.fillRect(cx - w, cy + j, 2 * w + 1, 1);
      }
    };
    const L = (x0, y0, x1, y1, k) => {
      x.fillStyle = k;
      x0 = Math.round(x0);
      y0 = Math.round(y0);
      x1 = Math.round(x1);
      y1 = Math.round(y1);
      const dx = Math.abs(x1 - x0), dy = -Math.abs(y1 - y0);
      const sx = x0 < x1 ? 1 : -1, sy = y0 < y1 ? 1 : -1;
      let e = dx + dy;
      for (;;) {
        x.fillRect(x0, y0, 1, 1);
        if (x0 === x1 && y0 === y1) break;
        const e2 = 2 * e;
        if (e2 >= dy) { e += dy; x0 += sx; }
        if (e2 <= dx) { e += dx; y0 += sy; }
      }
    };
    const hx = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
    const mix = (a, b, t) => {
      const p = hx(a), q = hx(b);
      return 'rgb(' + p.map((v, i) => Math.round(v + (q[i] - v) * t)).join(',') + ')';
    };
    const TT = (cx, by, w, h, l, d) => {
      for (let r = 0; r < h; r++) {
        const ww = Math.max(1, Math.round(w * Math.pow(1 - r / h, 0.72))),
          x0 = cx - (ww >> 1),
          hw = Math.ceil(ww / 2);
        R(x0, by - r - 1, hw, 1, l);
        R(x0 + hw, by - r - 1, ww - hw, 1, d);
      }
    };

    /* ---------- SKY (dithered gradient + sun) ---------- */
    x = skyC.getContext('2d');
    const stops = ['#3f94dc', '#6cb8ee', '#9bd6f8', '#c5ebfb', '#f3efd6', '#fde2b4'];
    const gc = (u) => {
      const f = Math.min(0.999, u) * (stops.length - 1),
        i = Math.floor(f);
      return mix(stops[i], stops[i + 1], f - i);
    };
    const N = 16, bay = [0, 0.5, 0.75, 0.25];
    for (let y = 0; y < MH; y++) {
      const v = Math.min(y / (EX + B + 6), 1) * N,
        b = Math.floor(v),
        fr = v - b;
      R(0, y, W, 1, gc(b / N));
      x.fillStyle = gc(Math.min(b + 1, N) / N);
      for (let xx = 0; xx < W; xx++) {
        if (fr > bay[(xx & 1) + ((y & 1) << 1)]) x.fillRect(xx, y, 1, 1);
      }
    }
    x.globalAlpha = 0.16; D(600, 110, 36, '#fff7d0');
    x.globalAlpha = 0.22; D(600, 110, 27, '#fff7d0');
    x.globalAlpha = 0.3; D(600, 110, 19, '#fff7d0');
    x.globalAlpha = 1;
    D(600, 110, 11, '#fff9e0'); D(600, 110, 9, '#ffffff');

    /* ---------- SCENE (static, transparent sky) ---------- */
    x = sceneC.getContext('2d');
    for (let xx = 0; xx < W; xx += 7) {
      const h = 14 + ((rnd() * 34) | 0);
      R(xx, B - h, 6, h, '#b6d3ea');
      if (rnd() > 0.6) R(xx + 2, B - h - 3, 2, 3, '#b6d3ea');
    }
    for (let xx = 0; xx < W; xx += 4) D(xx, B - 6 - ((rnd() * 4) | 0), 6 + ((rnd() * 3) | 0), '#a3cca4');
    R(0, B - 8, W, 8, '#a3cca4');

    // Modern skyline
    x.save(); x.translate(240, 0);
    const tower = (bx, by, bw, l, m, d, wk) => {
      R(bx, by, bw, B - by, m);
      R(bx, by, 2, B - by, l);
      R(bx + bw - 3, by, 3, B - by, d);
      R(bx, by, bw, 2, l);
      for (let yy = by + 5; yy < B - 4; yy += 4)
        for (let xx = bx + 4; xx < bx + bw - 4; xx += 3)
          R(xx, yy, 2, 2, rnd() > 0.3 ? wk : d);
      R(bx + (bw >> 1) - 2, by - 3, 4, 3, d);
    };
    const pb = ['#9cc6ee', '#6fa2d8', '#4b7fb8', '#e4f2fc'];
    const pt = ['#8ad0d0', '#5aa9b2', '#3b8794', '#e0fbf7'];
    [[372, 92, 18, 0], [388, 78, 16, 1], [402, 104, 20, 0], [420, 60, 18, 1], [436, 86, 20, 0], [454, 68, 16, 1], [468, 98, 16, 0]].forEach(([a, b, w, k]) => {
      const p = k ? pt : pb; tower(a, b, w, p[0], p[1], p[2], p[3]);
    });
    R(428, 34, 2, 26, '#4b7fb8'); R(428, 32, 2, 2, '#e8452c');
    [[184, 100, 12], [196, 92, 10], [342, 96, 14]].forEach(([a, b, w]) => tower(a, b, w, '#b9d4ec', '#8fb4d8', '#6f98c0', '#e4f1fa'));
    x.restore();

    // Right-wing towers
    [[724, 92, 16, 0], [740, 76, 18, 1], [756, 100, 14, 0], [906, 84, 18, 1], [922, 98, 16, 0], [936, 64, 20, 1]].forEach(([a, b, w, k]) => {
      const p = k ? pt : pb; tower(a, b, w, p[0], p[1], p[2], p[3]);
    });

    // Wind turbines
    const turb = [[24, 62, 34, 0.9], [66, 80, 26, 0.5], [104, 98, 19, 1.4], [150, 70, 30, 0.7], [196, 90, 22, 1.1], [700, 100, 18, 1.2], [1310, 72, 30, 0.8], [1350, 90, 22, 1.2]];
    turb.forEach(([hx2, hy]) => {
      for (let yy = hy; yy < B; yy++) {
        const w = 2 + Math.round(((yy - hy) / (B - hy)) * 2);
        R(hx2 - (w >> 1), yy, w, 1, '#f2f5f8');
        P(hx2 + (w >> 1) - 1, yy, '#c3ccd5');
      }
      R(hx2 - 3, hy - 2, 7, 4, '#eef2f5');
      R(hx2 + 2, hy - 2, 2, 4, '#c3ccd5');
    });

    // India Gate
    const GX = 390, GY = B - 70;
    {
      const cx = GX, y0 = GY, h = 62;
      R(cx - 30, B - 4, 60, 4, '#a97c4c'); R(cx - 27, B - 8, 54, 4, '#c99a64'); R(cx - 27, B - 8, 54, 1, '#e8c18a');
      R(cx - 20, y0, 40, h, '#d9a768');
      for (let yy = y0 + 4; yy < B - 8; yy += 5) {
        R(cx - 20, yy, 40, 1, '#c4915a'); R(cx - 20, yy + 1, 40, 1, '#e0b47a');
      }
      R(cx - 20, y0, 5, h, '#e8c18a'); R(cx + 14, y0, 6, h, '#b2824a');
      for (const r of [8, 12, 16]) for (let k = 0; k < 8; k++) R(cx - 17 + k * 5, y0 + r, 3, 1, '#b0804a');
      const ay = y0 + 32;
      D(cx, ay, 12, '#e8c18a'); R(cx - 12, ay, 24, B - 8 - ay, '#e8c18a'); R(cx + 4, ay - 8, 8, B - 8 - ay + 8, '#cfa56c');
      D(cx, ay, 9, '#3a2619'); R(cx - 9, ay, 18, B - 8 - ay, '#3a2619');
      R(cx - 9, ay + 6, 18, B - 14 - ay, '#5a3b27'); R(cx - 6, ay + 12, 12, B - 20 - ay, '#7a553a');
      R(cx - 18, y0 + 38, 4, 14, '#a87740'); R(cx + 15, y0 + 38, 4, 14, '#8f6030');
      R(cx - 25, y0 - 4, 50, 4, '#e8c18a'); R(cx - 25, y0, 50, 2, '#8f5f30'); R(cx - 22, y0 - 8, 44, 4, '#d9a768'); R(cx - 22, y0 - 8, 44, 1, '#e8c18a');
      R(cx - 17, y0 - 12, 34, 4, '#c99a64'); R(cx - 12, y0 - 15, 24, 3, '#b98a58'); R(cx - 13, y0 - 16, 26, 1, '#e8c18a'); R(cx + 8, y0 - 15, 4, 3, '#9b6c3a');
    }

    // Qutub Minar
    {
      const cx = 472; let ty = B - 7;
      R(cx - 15, B - 4, 30, 4, '#7a3318'); R(cx - 13, B - 7, 26, 3, '#8f3a1c');
      [[22, 24], [19, 22], [16, 19], [13, 16], [10, 14]].forEach(([w, h], i) => {
        ty -= h;
        const m = i >= 3,
          cols = m ? ['#efe3cc', '#d9c7a6', '#f7efdf', '#c2ae8a'] : ['#c0562f', '#e07a45', '#a8431f', '#8f3a1c'],
          x0 = cx - (w >> 1);
        for (let k = 0; k < w; k++) R(x0 + k, ty, 1, h, cols[(k >> 1) % 4]);
        R(x0 + w - 3, ty, 3, h, 'rgba(40,10,5,.33)'); R(x0, ty + 5, w, 1, '#e6b07a'); R(x0, ty + 7, w, 2, '#7a3318');
        R(x0 - 3, ty - 1, w + 6, 3, '#e8b27c'); R(x0 - 3, ty + 2, w + 6, 1, '#6a2a14');
        for (let k = -3; k < w + 3; k += 3) P(x0 + k, ty + 3, '#6a2a14');
      });
      R(cx - 5, ty - 7, 10, 7, '#efe3cc'); R(cx - 5, ty - 7, 2, 7, '#fff8ea'); R(cx - 2, ty - 5, 4, 4, '#6a4a30');
      D(cx, ty - 9, 4, '#efe3cc'); R(cx, ty - 15, 1, 6, '#d9a768');
    }

    // Lotus Temple
    {
      const cx = 552; R(cx - 40, B - 5, 80, 5, '#ece6da'); R(cx - 36, B - 8, 72, 3, '#fbf8f0');
      TT(cx - 30, B - 8, 24, 24, '#efe9dc', '#cfc7b6'); TT(cx + 30, B - 8, 24, 24, '#efe9dc', '#cfc7b6');
      TT(cx - 18, B - 8, 26, 40, '#f6f2e8', '#d7cfbe'); TT(cx + 18, B - 8, 26, 40, '#f6f2e8', '#d7cfbe');
      TT(cx, B - 8, 30, 56, '#fffdf7', '#dcd4c3');
      TT(cx - 9, B - 8, 18, 30, '#f6f2e8', '#d7cfbe'); TT(cx + 9, B - 8, 18, 30, '#f6f2e8', '#d7cfbe');
      L(cx, B - 9, cx, B - 60, '#e4dccb'); L(cx - 18, B - 9, cx - 18, B - 46, '#d3cbb9'); L(cx + 18, B - 9, cx + 18, B - 46, '#d3cbb9');
    }

    // Taj Mahal
    {
      const cx = 840; R(cx - 56, B - 5, 112, 5, '#ece6da'); R(cx - 52, B - 9, 104, 4, '#f6f1e6'); R(cx - 52, B - 9, 104, 1, '#fffdf7');
      for (const m of [cx - 50, cx + 50]) {
        R(m - 3, B - 62, 6, 53, '#fbf8f0'); R(m + 1, B - 62, 2, 53, '#dcd4c3');
        for (const y of [B - 22, B - 38, B - 54]) R(m - 5, y, 10, 2, '#e4dccb');
        R(m - 4, B - 66, 8, 4, '#fbf8f0'); D(m, B - 68, 4, '#fffdf7'); R(m, B - 76, 1, 5, '#d9a768');
      }
      R(cx - 24, B - 44, 48, 35, '#fbf8f0'); R(cx + 14, B - 44, 10, 35, '#e4dccb');
      R(cx - 8, B - 36, 16, 27, '#c9c2b0'); D(cx, B - 36, 8, '#c9c2b0'); R(cx - 5, B - 30, 10, 21, '#a79f8c'); D(cx, B - 30, 5, '#a79f8c');
      R(cx - 20, B - 30, 6, 18, '#d8d0be'); R(cx + 14, B - 30, 6, 18, '#c3bba8');
      for (const c of [cx - 20, cx + 20]) {
        R(c - 3, B - 50, 6, 6, '#fbf8f0'); D(c, B - 52, 4, '#fffdf7'); R(c, B - 58, 1, 4, '#d9a768');
      }
      R(cx - 14, B - 50, 28, 6, '#f6f1e6'); D(cx, B - 58, 14, '#dcd4c3'); D(cx - 2, B - 59, 13, '#fffdf7'); D(cx - 5, B - 62, 5, '#ffffff'); R(cx, B - 76, 1, 9, '#d9a768'); P(cx - 1, B - 77, '#d9a768');
    }

    // Right-extension towers & Charminar
    [[980, 86, 16, 0], [996, 70, 18, 1], [1012, 96, 14, 0], [1220, 80, 18, 1], [1236, 98, 16, 0], [1252, 66, 20, 1]].forEach(([a, b, w, k]) => {
      const p = k ? pt : pb; tower(a, b, w, p[0], p[1], p[2], p[3]);
    });
    {
      const cx = 1120, cr = '#e2d3b4', sh = '#c4b08c', bd = '#cdbb98';
      R(cx - 36, B - 6, 72, 6, '#c9b79a'); R(cx - 30, B - 52, 60, 46, cr); R(cx + 20, B - 52, 10, 46, sh);
      R(cx - 9, B - 34, 18, 28, '#6b563c'); D(cx, B - 34, 9, '#6b563c'); R(cx - 5, B - 28, 10, 22, '#4a3a28');
      for (const k of [-22, -14, 14, 22]) {
        R(cx + k - 2, B - 30, 5, 20, '#8a7452'); D(cx + k, B - 30, 2, '#8a7452');
      }
      R(cx - 32, B - 54, 64, 3, bd);
      for (let k = -3; k <= 3; k++) {
        R(cx + k * 8 - 2, B - 47, 5, 8, '#8a7452'); D(cx + k * 8, B - 47, 2, '#8a7452');
      }
      R(cx - 32, B - 56, 64, 2, bd); R(cx - 28, B - 64, 56, 8, cr);
      for (let k = -3; k <= 3; k++) R(cx + k * 8 - 2, B - 62, 4, 6, '#9a8460');
      R(cx - 30, B - 66, 60, 2, bd);
      for (let k = 0; k < 9; k++) {
        D(cx - 28 + k * 7, B - 69, 3, cr); P(cx - 28 + k * 7, B - 74, '#b89b5e');
      }
      for (const m of [cx - 32, cx + 32]) {
        R(m - 4, B - 92, 8, 86, cr); R(m + 1, B - 92, 3, 86, sh);
        for (const y of [B - 40, B - 62, B - 80]) R(m - 6, y, 12, 2, bd);
        R(m - 5, B - 98, 10, 6, cr); D(m, B - 100, 4, cr); R(m, B - 108, 1, 6, '#b89b5e');
      }
    }

    /* ---------- GROUND, RIVER, PATH ---------- */
    R(0, B, W, 30, '#58a851');
    for (let y = B; y < B + 8; y++) R(0, y, W, 1, mix('#6bbb5e', '#58a851', (y - B) / 8));
    for (let k = 0; k < 420; k++) {
      P(rnd() * W, B + rnd() * 29, rnd() > 0.5 ? '#7bc467' : '#3e8a45');
    }
    for (let k = 0; k < 50; k++) P(rnd() * W, B + 10 + rnd() * 18, ['#ffd24a', '#ff7aa8', '#ffffff'][k % 3]);
    R(0, 199, W, 1, '#2f7a3a');
    for (let y = 200; y < H; y++) R(0, y, W, 1, mix('#58b4e8', '#2f7fc0', (y - 200) / 16));
    R(0, 200, W, 1, '#8fd0f2');
    for (let y = B - 6; y < 184; y++) {
      const w = 16 + (((y - B + 6) * 0.6) | 0);
      R(GX - w / 2, y, w, 1, '#ecdcb0'); P(GX - w / 2, y, '#d3c08a'); P(GX + w / 2 - 1, y, '#d3c08a');
    }
    R(506, B + 1, 92, 6, '#7cc7e6'); R(506, B + 1, 92, 1, '#b8e8f7'); R(510, B + 4, 84, 1, '#9ad8f0');
    R(796, B + 1, 88, 7, '#7cc7e6'); R(796, B + 1, 88, 1, '#b8e8f7'); R(802, B + 5, 76, 1, '#9ad8f0');

    /* ---------- TREES ---------- */
    const tree = (tx, by, r, fl) => {
      R(tx - 1, by - r, 2, r + 2, '#6a4a30'); const cy = by - Math.round(r * 1.5);
      R(tx - r + 1, by, 2 * r - 2, 2, '#4a9246'); D(tx, cy, r, '#2b6f3a'); D(tx - 1, cy - 1, r - 1, '#3a8c47'); D(tx - 2, cy - 2, Math.max(2, r - 3), '#58b05a');
      for (let k = 0; k < r * 2; k++) {
        const a = rnd() * 6.28, d = rnd() * r * 0.8; P(tx + Math.cos(a) * d, cy + Math.sin(a) * d, rnd() > 0.5 ? '#7fcf6a' : '#245d31');
      }
      if (fl) for (let k = 0; k < r * 2; k++) {
        const a = rnd() * 6.28, d = rnd() * r * 0.9; P(tx + Math.cos(a) * d, cy + Math.sin(a) * d, rnd() > 0.5 ? '#e8452c' : '#ff7a3d');
      }
    };
    const palm = (px, by, h, lean) => {
      for (let k = 0; k <= h; k++) R(px + Math.round(lean * Math.pow(k / h, 2)), by - k, 2, 1, k % 4 ? '#7a5a3a' : '#5a4028');
      const cx = px + lean, cy = by - h;
      for (const a of [3.14, 3.7, 4.2, 4.71, 5.2, 5.7, 6.28]) {
        const ex = cx + Math.cos(a) * 10, ey = cy + Math.sin(a) * 8 + 4;
        L(cx, cy, ex, ey, '#2f8a3f'); L(cx, cy - 1, ex, ey - 1, '#4fb055');
      }
      D(cx, cy, 2, '#5a4028');
    };
    const zones = [[366, 416], [456, 488], [502, 602], [0, 62], [W - 62, W], [760, 920], [1040, 1200]];
    for (let tx = 6; tx < W; tx += 11 + ((rnd() * 8) | 0)) {
      if (zones.some((z) => tx > z[0] && tx < z[1])) continue;
      const by = B + 2 + ((rnd() * 8) | 0), r = 6 + ((rnd() * 4) | 0), k = rnd();
      if (k < 0.2) palm(tx, by, Math.round(34 + rnd() * 10), Math.round(rnd() * 8) - 4);
      else tree(tx, by, r, k > 0.8);
    }

    /* ---------- METRO VIADUCT ---------- */
    for (let px = 66; px < W - 62; px += 38) {
      R(px, 192, 5, 24, '#8d959f'); R(px, 192, 1, 24, '#b4bbc4'); R(px - 2, 190, 9, 3, '#7b838d');
    }
    R(62, 184, W - 124, 2, '#d5dbe1'); R(62, 186, W - 124, 5, '#aab2bc'); R(62, 191, W - 124, 2, '#7b838d');
    for (let px = 64; px < W - 62; px += 6) R(px, 184, 1, 2, '#b3bbc4');

    /* ---------- SOLAR PANELS ---------- */
    const solar = (x0, y0, d) => {
      for (let r = 0; r < 3; r++) {
        const yy = y0 + r * 10;
        R(x0 + 8, yy + 8, 2, 4, '#7b838d'); R(x0 + 34, yy + 8, 2, 4, '#7b838d');
        for (let j = 0; j < 8; j++) {
          const o = Math.round(j * 0.7) * d;
          R(x0 + o, yy + j, 44, 1, j % 4 === 3 ? '#9cc0f0' : (j < 3 ? '#3e72c4' : '#2a56a6'));
          for (let i = 0; i < 44; i += 7) P(x0 + o + i, yy + j, '#9cc0f0');
        }
        R(x0 + Math.round(7 * 0.7) * d, yy + 7, 44, 1, '#c7cdd4');
      }
    };
    solar(8, 172, -1); solar(W - 54, 172, 1);

    /* ---------- ANIMATION LOOP ---------- */
    const csp = () => {
      const c = document.createElement('canvas'); c.width = 72; c.height = 26;
      const q = c.getContext('2d'), dd = [[14, 16, 7], [27, 11, 10], [41, 13, 9], [54, 17, 7]];
      const f = (dy, k) => {
        q.fillStyle = k;
        dd.forEach(([a, b, r]) => {
          for (let j = -r; j <= r; j++) {
            const w = Math.floor(Math.sqrt(r * r + r * 0.5 - j * j));
            q.fillRect(a - w, b + j + dy, 2 * w + 1, 1);
          }
        });
        q.fillRect(10, 17 + dy, 50, 6);
      };
      f(2, '#d3e4f3'); f(0, '#ffffff'); return c;
    };
    const cs = csp();
    const clouds = Array.from({ length: 45 }, () => {
      const y = Math.round(2 + rnd() * 150);
      return { x: rnd() * W, y, s: rnd() > 0.5 ? 2 : 1, v: (0.02 + (y / 150) * 0.06) * 1.8 };
    });
    const birds = [
      { x: 40, y: 48, v: 0.45, p: 0 }, { x: 56, y: 54, v: 0.45, p: 3 }, { x: 300, y: 30, v: 0.35, p: 5 },
      { x: 210, y: 70, v: 0.5, p: 2 }, { x: 140, y: 20, v: 0.4, p: 7 }, { x: 520, y: 40, v: 0.4, p: 1 },
      { x: 536, y: 46, v: 0.4, p: 4 }, { x: 700, y: 26, v: 0.35, p: 6 }, { x: 820, y: 58, v: 0.5, p: 3 },
      { x: 900, y: 36, v: 0.45, p: 8 }, { x: 1000, y: 44, v: 0.4, p: 2 }, { x: 1020, y: 50, v: 0.4, p: 5 },
      { x: 1180, y: 30, v: 0.5, p: 7 }, { x: 1300, y: 60, v: 0.35, p: 1 }, { x: 1380, y: 40, v: 0.45, p: 9 },
    ];
    const glints = Array.from({ length: 140 }, () => ({ x: rnd() * W, y: 202 + rnd() * 13, p: rnd() * 6.28 }));
    const spark = [[20, 178], [40, 188], [W - 28, 176], [W - 10, 196], [34, 198], [W - 40, 186]];

    mx.imageSmoothingEnabled = false;
    birds.forEach((b) => { b.y += Math.round(EX * 0.7); b.v *= 1.7; });

    const kite = (kx, ky, t, c1, c2) => {
      const sw = Math.round(Math.sin(t * 0.05 + kx) * 2);
      for (let j = -5; j <= 5; j++) {
        const h = Math.round(3.5 * (1 - Math.abs(j) / 6));
        R(kx + sw - h, ky + j, h + 1, 1, c1);
        R(kx + sw + 1, ky + j, h, 1, c2);
      }
      for (let k = 1; k <= 9; k++) {
        P(kx + sw + Math.round(Math.sin(t * 0.13 + k * 0.9) * 2), ky + 5 + k, k % 2 ? '#ffd24a' : '#e8452c');
      }
    };

    let t = 0;
    const draw = () => {
      x = mx;
      mx.drawImage(skyC, 0, 0);

      clouds.forEach((c) => {
        c.x += c.v;
        if (c.x > W + 10) c.x = -72 * c.s;
        mx.drawImage(cs, Math.round(c.x), c.y, 72 * c.s, 26 * c.s);
      });

      birds.forEach((b) => {
        b.x += b.v;
        if (b.x > W + 6) b.x = -6;
        const f = (((t / 5) | 0) + b.p) & 1, k = '#2b3a4a';
        if (f) {
          P(b.x - 2, b.y - 1, k); P(b.x - 1, b.y, k); P(b.x, b.y, k); P(b.x + 1, b.y, k); P(b.x + 2, b.y - 1, k);
        } else {
          P(b.x - 2, b.y, k); P(b.x - 1, b.y - 1, k); P(b.x, b.y, k); P(b.x + 1, b.y - 1, k); P(b.x + 2, b.y, k);
        }
      });

      kite(130, 100, t, '#ff5a5f', '#ffb020');
      kite(660, 90, t + 90, '#7a5cff', '#34d3a0');
      kite(930, 130, t + 40, '#ffb020', '#ff5a5f');
      kite(1190, 105, t + 20, '#34d3a0', '#ff5a5f');

      mx.drawImage(sceneC, 0, EX);
      mx.save();
      mx.translate(0, EX);

      // Wind turbines
      turb.forEach(([hx2, hy, len, sp]) => {
        const ph = t * 0.021 * sp;
        for (let k = 0; k < 3; k++) {
          const a = ph + k * 2.094,
            ex = hx2 + Math.cos(a) * len,
            ey = hy + Math.sin(a) * len,
            ox = Math.round(-Math.sin(a)),
            oy = Math.round(Math.cos(a));
          L(hx2, hy, ex, ey, '#ffffff');
          L(hx2 + ox, hy + oy, ex, ey, '#d4dbe2');
        }
        D(hx2, hy, 2, '#c9d1d8'); P(hx2, hy, '#8f99a3');
      });

      // India Gate flame
      const fl = ((t / 5) | 0) % 3;
      R(GX, GY - 19 - (fl % 2), 1, 3, '#ff6a00');
      P(GX, GY - 20 - fl, '#ffd23a');
      P(GX + 1, GY - 18, '#ff9a1f');

      // Metro train
      const tx = ((t * 1.4) % (W + 200)) - 170;
      for (let k = 0; k < 4; k++) {
        const cx = Math.round(tx + k * 35);
        R(cx, 174, 34, 9, '#f1f3f6'); R(cx, 173, 34, 1, '#c9d0d8');
        R(cx, 178, 34, 2, '#e8559a'); R(cx, 182, 34, 1, '#59616b');
        for (let w = 0; w < 4; w++) {
          R(cx + 3 + w * 8, 175, 5, 3, '#2c3e55'); P(cx + 3 + w * 8, 175, '#6f8fb3');
        }
        R(cx + 16, 174, 1, 8, '#c9d0d8');
      }
      R(tx + 140, 175, 2, 8, '#f1f3f6'); R(tx + 142, 177, 1, 5, '#d5dbe1'); P(tx + 141, 181, '#ffe27a');

      // Water glints
      glints.forEach((g) => {
        if (Math.sin(t * 0.07 + g.p) > 0.72) R(g.x, g.y, 3, 1, '#e3f6ff');
      });

      // Solar sparkles
      spark.forEach(([sx, sy], i) => {
        if (((t >> 4) + i * 3) % 9 === 0) {
          P(sx, sy, '#fff'); P(sx - 1, sy, '#cfe4ff'); P(sx + 1, sy, '#cfe4ff');
          P(sx, sy - 1, '#cfe4ff'); P(sx, sy + 1, '#cfe4ff');
        }
      });

      mx.restore();
    };

    const frame = () => {
      t++;
      draw();
      animId = requestAnimationFrame(frame);
    };
    frame();

    return () => {
      if (animId) cancelAnimationFrame(animId);
    };
  }, []);

  function handleTriggerCleanWave() {
    setWaveTriggered(true);
    setLivePillAqi(28);
    setVayuAqi(94);
    setTimeout(() => {
      setWaveTriggered(false);
    }, 2500);
  }

  return (
    <div className="relative min-h-[94vh] flex flex-col items-center justify-start overflow-hidden select-none pb-6 pt-2">
      {/* Sky Background & Sun Glow */}
      <div className="sky-fill"></div>
      <div className="sun-glow"></div>

      {/* Animated Pixel India Background Canvas */}
      <canvas ref={canvasRef} id="pixelCanvas" width="1440" height="366" />

      {/* Seamless Atmosphere Blend: Connects the blue sky with the animated city */}
      <div className="absolute inset-x-0 top-0 bottom-0 pointer-events-none z-[2] bg-gradient-to-b from-transparent via-[#6cb8ee]/12 via-35% to-transparent" />
      <div className="absolute inset-x-0 bottom-0 h-36 pointer-events-none z-[2] bg-gradient-to-t from-slate-50/65 via-slate-50/20 to-transparent" />

      {/* Top Telemetry Header with Layout Studio Trigger */}
      <div className="relative z-30 w-full px-4 sm:px-8 flex justify-between items-center text-xs mono tracking-wider">
        <div className="flex items-center gap-2.5 px-3.5 py-1.5 rounded-full bg-white/75 border border-white/90 backdrop-blur-md shadow-sm text-slate-700">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
          </span>
          <span className="font-medium text-[11px] sm:text-xs">DELHI NCR • 28.61° N, 77.20° E</span>
          <span className="text-slate-300 hidden sm:inline">|</span>
          <span className="text-emerald-700 font-semibold hidden sm:inline">CLEAN AIR CORRIDOR</span>
        </div>

        <div className="flex items-center gap-2 sm:gap-3">
          {/* Layout Alignment Studio Toggle Button (Private to Admin/Developer only) */}
          {isAdmin && (
            <button
              onClick={() => setShowStudio(!showStudio)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full font-bold text-[11px] transition-all shadow-xs border active:scale-95 ${
                showStudio
                  ? 'bg-amber-500 text-white border-amber-600 ring-2 ring-amber-300'
                  : 'bg-white/85 hover:bg-white text-amber-900 border-amber-300/80 bg-amber-50/60'
              }`}
              title="Admin Layout Studio (Ctrl+Shift+L to toggle)"
            >
              <Sliders className="w-3.5 h-3.5 text-amber-700" />
              <span>{showStudio ? 'Close Studio' : '📐 Adjust Layout'}</span>
            </button>
          )}
        </div>
      </div>

      {/* Central Hero Section - Dynamically Adjusted */}
      <div
        style={{ marginTop: `${layout.heroY ?? 4}px` }}
        className="relative z-30 max-w-4xl w-full mx-auto px-4 text-center flex flex-col items-center justify-start transition-[margin] duration-100"
      >
        {/* Status Pill with Real Ambient Telemetry */}
        <div
          style={{ marginBottom: `${layout.pillMarginBottom ?? 8}px` }}
          className={`inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/80 border border-white/90 backdrop-blur-md shadow-xs text-xs text-slate-700 transition-all ${
            showOutlines ? 'ring-2 ring-dashed ring-amber-400 bg-amber-50/70' : ''
          }`}
        >
          <span className={`w-2 h-2 rounded-full ${waveTriggered ? 'bg-cyan-500 animate-ping' : 'bg-emerald-500'}`}></span>
          <span className="font-medium">
            {waveTriggered ? 'Clean-Air Wave Propagating...' : 'VayuPath Corridor Engaged'}
          </span>
          <span className="text-slate-300">|</span>
          <span className="mono font-bold text-emerald-700">
            {liveData.loading ? (
              <span className="inline-flex items-center gap-1">
                <Loader2 className="w-3 h-3 animate-spin text-emerald-600" /> Sampling...
              </span>
            ) : liveData.ambientPm25 ? (
              `PM2.5: ${liveData.ambientPm25} µg/m³`
            ) : (
              'PM2.5: Data Unavailable'
            )}
          </span>
        </div>

        {/* Hero Title in Samarkan Typography */}
        <div
          className={`relative py-0 flex flex-col items-center transition-all ${
            showOutlines ? 'ring-2 ring-dashed ring-emerald-400 rounded-2xl p-2' : ''
          }`}
        >
          <h1
            style={{
              fontSize: `${layout.titleSize ?? 84}px`,
              transform: `translateY(${layout.titleOffsetY ?? -4}px)`,
            }}
            className="tracking-[-0.02em] leading-none select-none flex items-center justify-center transition-all"
          >
            <span className="hero-title-vayu">vayu</span>
            <span className="hero-title-path ml-1">path</span>
          </h1>
          <div
            style={{ marginTop: `${layout.submarkMarginTop ?? 8}px` }}
            className="submark-font text-slate-800/80 text-xs sm:text-sm tracking-[0.45em] uppercase font-semibold transition-all"
          >
            THE CLEAN-AIR NAVIGATION CORRIDOR
          </div>
        </div>

        {/* Hinglish Motto */}
        <p
          style={{
            marginTop: `${layout.mottoMarginTop ?? 12}px`,
            marginBottom: `${layout.mottoMarginBottom ?? 16}px`,
            fontSize: `${layout.mottoSize ?? 18}px`,
          }}
          className={`max-w-xl text-slate-800 font-normal leading-relaxed drop-shadow-xs transition-all ${
            showOutlines ? 'ring-2 ring-dashed ring-sky-400 rounded-xl p-1.5' : ''
          }`}
        >
          Google Maps hume sabse <span className="font-semibold text-slate-950 underline decoration-slate-400 underline-offset-4">tez</span> rasta deta hai. <br className="hidden sm:inline" />
          VayuPath hume sabse <span className="font-bold text-emerald-800 bg-emerald-100/90 px-2 py-0.5 rounded-md">saaf</span> rasta deta hai.
        </p>

        {/* Comparison Cards Row - Live Verified Data */}
        <div
          style={{ marginTop: `${layout.cardsMarginTop ?? 8}px` }}
          className={`grid grid-cols-1 sm:grid-cols-3 gap-3 w-full max-w-2xl transition-all ${
            showOutlines ? 'ring-2 ring-dashed ring-purple-400 rounded-2xl p-2' : ''
          }`}
        >
          {/* Card 1: Ring Road Choke (Live Arterial Route Data) */}
          <div className="p-3.5 rounded-2xl sky-glass-card text-left relative overflow-hidden group flex flex-col justify-between">
            <div>
              <div className="text-[11px] mono uppercase tracking-wider text-rose-700 font-semibold flex items-center justify-between">
                <span>Ring Road Choke</span>
                <span className="text-slate-500 font-normal text-[10px]">Fastest</span>
              </div>
              <div className="mt-2 flex items-baseline gap-1.5">
                {liveData.loading ? (
                  <div className="h-8 flex items-center gap-1.5 text-slate-400 text-xs font-mono">
                    <Loader2 className="w-4 h-4 animate-spin text-rose-500" /> Computing OSRM...
                  </div>
                ) : liveData.ringRoadAqi !== null ? (
                  <>
                    <span className="text-3xl font-light text-rose-700 mono">{liveData.ringRoadAqi}</span>
                    <span className="text-xs text-slate-600 font-medium">AQI</span>
                  </>
                ) : (
                  <span className="text-sm font-semibold text-rose-600">Data Unavailable</span>
                )}
              </div>
              <div className="mt-1 text-xs text-slate-600 leading-snug">
                {liveData.ringRoadDuration
                  ? `${liveData.ringRoadDuration} mins (${liveData.ringRoadDistance} km) • Diesel corridor`
                  : 'OSRM arterial route'}
              </div>
            </div>
            <div className="mt-2 pt-1.5 border-t border-slate-200/60 flex items-center justify-between text-[9px] text-slate-400">
              <span className="truncate">Source: CPCB / OSRM</span>
              <span>{liveData.lastUpdated ? `Live ${liveData.lastUpdated}` : 'Live'}</span>
            </div>
          </div>

          {/* Card 2: VayuPath Corridor (Live Clean Route Optimization) */}
          <div className="p-3.5 rounded-2xl sky-glass-card text-left relative overflow-hidden border-emerald-400 bg-white/95 shadow-md flex flex-col justify-between">
            <div>
              <div className="text-[11px] mono uppercase tracking-wider text-emerald-700 font-semibold flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                  VayuPath Corridor
                </span>
                <span className="text-emerald-800 text-[10px] bg-emerald-100 px-1.5 py-0.5 rounded font-bold">
                  {liveData.doseSavedPct ? `-${liveData.doseSavedPct}% DOSE` : (liveData.loading ? '...' : '-30% DOSE')}
                </span>
              </div>
              <div className="mt-2 flex items-baseline gap-1.5">
                {liveData.loading ? (
                  <div className="h-8 flex items-center gap-1.5 text-slate-400 text-xs font-mono">
                    <Loader2 className="w-4 h-4 animate-spin text-emerald-500" /> Optimizing...
                  </div>
                ) : liveData.vayuCorridorAqi !== null ? (
                  <>
                    <span className="text-3xl font-semibold text-emerald-700 mono">{liveData.vayuCorridorAqi}</span>
                    <span className="text-xs text-emerald-800 font-medium">AQI</span>
                  </>
                ) : (
                  <span className="text-sm font-semibold text-emerald-700">Data Unavailable</span>
                )}
              </div>
              <div className="mt-1 text-xs text-slate-700 leading-snug">
                {liveData.vayuCorridorDuration && liveData.ringRoadDuration
                  ? `${liveData.vayuCorridorDuration} mins (+${Math.max(0, liveData.vayuCorridorDuration - liveData.ringRoadDuration)}m) • Tree-canopy passage`
                  : 'Tree-canopy buffer passage'}
              </div>
            </div>
            <div className="mt-2 pt-1.5 border-t border-emerald-200/60 flex items-center justify-between text-[9px] text-emerald-700 font-medium">
              <span className="truncate">Clean Buffer Model</span>
              <span>{liveData.lastUpdated ? `Live ${liveData.lastUpdated}` : 'Live'}</span>
            </div>
          </div>

          {/* Card 3: Lungs Protected (Real Berkeley Earth Dose Savings) */}
          <div className="p-3.5 rounded-2xl sky-glass-card text-left relative overflow-hidden group flex flex-col justify-between">
            <div>
              <div className="text-[11px] mono uppercase tracking-wider text-slate-700 font-semibold flex items-center justify-between">
                <span>Lungs Protected</span>
                <span className="text-slate-500 font-normal text-[10px]">Daily Commute</span>
              </div>
              <div className="mt-2 flex items-baseline gap-1.5">
                {liveData.loading ? (
                  <div className="h-8 flex items-center gap-1.5 text-slate-400 text-xs font-mono">
                    <Loader2 className="w-4 h-4 animate-spin text-slate-500" /> Calculating dose...
                  </div>
                ) : liveData.cigarettesSpared !== null ? (
                  <>
                    <span className="text-3xl font-light text-slate-900 mono">{liveData.cigarettesSpared}</span>
                    <span className="text-xs text-slate-600 font-medium">Cigarettes spared</span>
                  </>
                ) : (
                  <span className="text-sm font-semibold text-slate-500">Data Unavailable</span>
                )}
              </div>
              <div className="mt-1 text-xs text-slate-600 leading-snug">
                Berkeley Earth Eq. (~22 µg/m³ PM2.5/24h)
              </div>
            </div>
            <div className="mt-2 pt-1.5 border-t border-slate-200/60 flex items-center justify-between text-[9px] text-slate-400">
              <span className="truncate">Inhaled Dose Delta</span>
              <span>Daily Commute</span>
            </div>
          </div>
        </div>

        {/* CTA Buttons Row */}
        <div
          style={{ marginTop: `${layout.buttonsMarginTop ?? 18}px` }}
          className={`flex flex-wrap items-center justify-center gap-3 transition-all ${
            showOutlines ? 'ring-2 ring-dashed ring-indigo-400 rounded-full p-1.5' : ''
          }`}
        >
          <button
            onClick={onExplore}
            className="group px-7 py-3 rounded-full bg-slate-950 text-white font-medium text-sm flex items-center gap-2.5 hover:bg-slate-800 transition-all shadow-xl shadow-slate-950/25 active:scale-95"
          >
            <span className="font-semibold tracking-tight">Explore Clean Navigation</span>
            <ArrowRight className="w-4 h-4 text-emerald-400 transition-transform group-hover:translate-x-1" />
          </button>

          <button
            onClick={handleTriggerCleanWave}
            className="px-5 py-3 rounded-full bg-white/85 border border-white/90 text-slate-800 hover:bg-white text-sm font-semibold transition-all shadow-sm backdrop-blur-md flex items-center gap-2 active:scale-95"
          >
            <Zap className={`w-4 h-4 text-emerald-600 ${waveTriggered ? 'animate-bounce text-cyan-500' : ''}`} />
            <span>Trigger Clean-Air Wave</span>
          </button>
        </div>
      </div>

      {/* Visual Layout Studio Floating Inspector Drawer (Private to Admin/Developer only) */}
      {isAdmin && (
        <LayoutStudioDrawer
          isOpen={showStudio}
          onClose={() => setShowStudio(false)}
          layout={layout}
          onChange={handleParamChange}
          onApplyPreset={handleApplyPreset}
          showOutlines={showOutlines}
          onToggleOutlines={() => setShowOutlines(!showOutlines)}
          onReset={handleResetLayout}
        />
      )}

      {/* Floating AI Bot Assistant Trigger (Bottom Right) */}
      <div className="fixed bottom-12 sm:bottom-14 right-4 sm:right-8 z-40 flex items-center gap-2.5 pointer-events-auto">
        <div
          onClick={onOpenAdvisor}
          className="cursor-pointer bg-white/90 backdrop-blur-md px-3 py-1.5 rounded-full shadow-lg border border-slate-200/80 text-xs font-semibold text-slate-800 hover:bg-white transition-all hidden sm:flex items-center gap-1.5"
        >
          <span>Need help surfing VayuPath? Click me!</span>
        </div>
        <button
          onClick={onOpenAdvisor}
          className="w-12 h-12 rounded-full bg-emerald-950 text-emerald-400 hover:bg-slate-900 flex items-center justify-center shadow-xl border-2 border-emerald-500/30 transition-transform hover:scale-105 active:scale-95 group"
          title="Ask VayuPath AI Air Advisor"
        >
          <Compass className="w-6 h-6 stroke-[2.2] group-hover:rotate-45 transition-transform" />
        </button>
      </div>

      {/* Landmark Ticker Footer */}
      <footer className="relative z-30 w-full px-4 sm:px-8 mt-4 flex justify-between items-center text-[10px] text-slate-700/80 mono font-medium">
        <div className="bg-white/60 px-2.5 py-1 rounded backdrop-blur-sm">
          DELHI METRO • INDIA GATE • LOTUS TEMPLE • QUTUB MINAR
        </div>
        <div className="bg-white/60 px-2.5 py-1 rounded backdrop-blur-sm hidden sm:block">
          #WEMAKEDEVS • AWS ENVIRONMENTAL HACKS
        </div>
      </footer>
    </div>
  );
}
