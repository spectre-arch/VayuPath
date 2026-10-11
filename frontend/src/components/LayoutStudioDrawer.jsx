import React, { useState } from 'react';
import { Sliders, Copy, Check, RotateCcw, X, Eye, EyeOff, Sparkles, Layers } from 'lucide-react';

export const LAYOUT_PRESETS = {
  elevated: {
    name: 'Elevated & Clear (Balanced)',
    heroY: 4,
    pillMarginBottom: 8,
    titleSize: 84,
    titleOffsetY: -4,
    submarkMarginTop: 8,
    mottoMarginTop: 12,
    mottoMarginBottom: 16,
    mottoSize: 18,
    cardsMarginTop: 8,
    buttonsMarginTop: 18,
  },
  mockup: {
    name: 'Original Pixel Mockup',
    heroY: 12,
    pillMarginBottom: 12,
    titleSize: 104,
    titleOffsetY: 0,
    submarkMarginTop: 8,
    mottoMarginTop: 16,
    mottoMarginBottom: 20,
    mottoSize: 19,
    cardsMarginTop: 8,
    buttonsMarginTop: 24,
  },
  compact: {
    name: 'Compact Sky View',
    heroY: -12,
    pillMarginBottom: 4,
    titleSize: 72,
    titleOffsetY: -12,
    submarkMarginTop: 4,
    mottoMarginTop: 6,
    mottoMarginBottom: 10,
    mottoSize: 15,
    cardsMarginTop: 4,
    buttonsMarginTop: 12,
  },
};

export function LayoutStudioDrawer({
  isOpen,
  onClose,
  layout,
  onChange,
  onApplyPreset,
  showOutlines,
  onToggleOutlines,
  onReset,
}) {
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const handleCopy = () => {
    const text = JSON.stringify(layout, null, 2);
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleLockAdmin = () => {
    try {
      localStorage.removeItem('vayupath_admin');
      window.location.href = window.location.origin + window.location.pathname;
    } catch {}
  };

  const controls = [
    { key: 'heroY', label: 'Hero Top Margin (Y)', min: -30, max: 60, step: 2, unit: 'px' },
    { key: 'titleOffsetY', label: 'VayuPath Title Y-Offset', min: -40, max: 40, step: 2, unit: 'px' },
    { key: 'titleSize', label: 'VayuPath Font Size', min: 48, max: 130, step: 2, unit: 'px' },
    { key: 'pillMarginBottom', label: 'Status Pill Margin Bottom', min: 0, max: 32, step: 1, unit: 'px' },
    { key: 'submarkMarginTop', label: 'Submark ("THE CLEAN-AIR...") Top', min: 0, max: 28, step: 1, unit: 'px' },
    { key: 'mottoMarginTop', label: 'Motto ("Google Maps...") Top Margin', min: 0, max: 40, step: 1, unit: 'px' },
    { key: 'mottoMarginBottom', label: 'Motto Margin Bottom (to Cards)', min: 0, max: 48, step: 1, unit: 'px' },
    { key: 'mottoSize', label: 'Motto Text Size', min: 13, max: 24, step: 1, unit: 'px' },
    { key: 'cardsMarginTop', label: 'Comparison Cards Top Margin', min: 0, max: 40, step: 1, unit: 'px' },
    { key: 'buttonsMarginTop', label: 'CTA Buttons Top Margin', min: 0, max: 48, step: 2, unit: 'px' },
  ];

  return (
    <div className="fixed top-20 right-4 sm:right-6 z-[600] w-84 sm:w-96 max-h-[82vh] bg-white/95 backdrop-blur-xl border border-slate-200/90 rounded-3xl shadow-2xl flex flex-col overflow-hidden animate-in fade-in slide-in-from-right-4 duration-200 select-none">
      {/* Header */}
      <div className="p-4 bg-slate-900 text-white flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
            <Sliders className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-xs font-black tracking-wide">Layout Studio & Alignment</h3>
            <p className="text-[10px] text-slate-400">Live-tweak spacing & export to chat</p>
          </div>
        </div>
        <button
          onClick={onClose}
          className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Body with Controls */}
      <div className="p-4 overflow-y-auto space-y-4 flex-1 text-xs">
        {/* Presets */}
        <div>
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1.5">
            Quick Alignment Presets:
          </span>
          <div className="grid grid-cols-3 gap-1.5">
            <button
              onClick={() => onApplyPreset('elevated')}
              className="px-2 py-1.5 bg-slate-100 hover:bg-emerald-50 hover:text-emerald-700 hover:border-emerald-300 border border-slate-200 rounded-xl text-[10px] font-bold text-slate-700 transition-all text-center"
            >
              Elevated
            </button>
            <button
              onClick={() => onApplyPreset('mockup')}
              className="px-2 py-1.5 bg-slate-100 hover:bg-sky-50 hover:text-sky-700 hover:border-sky-300 border border-slate-200 rounded-xl text-[10px] font-bold text-slate-700 transition-all text-center"
            >
              Original
            </button>
            <button
              onClick={() => onApplyPreset('compact')}
              className="px-2 py-1.5 bg-slate-100 hover:bg-amber-50 hover:text-amber-700 hover:border-amber-300 border border-slate-200 rounded-xl text-[10px] font-bold text-slate-700 transition-all text-center"
            >
              Compact
            </button>
          </div>
        </div>

        {/* Highlight Toggle */}
        <div className="flex items-center justify-between p-2.5 bg-slate-50 border border-slate-200 rounded-xl">
          <div className="flex items-center gap-2 text-[11px] font-semibold text-slate-700">
            <Layers className="w-3.5 h-3.5 text-sky-600" />
            <span>Highlight Element Boxes</span>
          </div>
          <button
            onClick={onToggleOutlines}
            className={`px-2 py-1 rounded-lg font-bold text-[10px] flex items-center gap-1 transition-all ${
              showOutlines ? 'bg-amber-500 text-white' : 'bg-slate-200 text-slate-600 hover:bg-slate-300'
            }`}
          >
            {showOutlines ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
            <span>{showOutlines ? 'Outlines ON' : 'Outlines OFF'}</span>
          </button>
        </div>

        {/* Sliders */}
        <div className="space-y-3 pt-1">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
            Fine Alignment Sliders (Drag live):
          </span>
          {controls.map((ctrl) => (
            <div key={ctrl.key} className="space-y-1">
              <div className="flex justify-between items-center text-[11px]">
                <span className="font-medium text-slate-700">{ctrl.label}</span>
                <span className="font-mono font-bold text-sky-700 bg-sky-50 px-1.5 py-0.2 rounded border border-sky-100 text-[10px]">
                  {layout[ctrl.key]} {ctrl.unit}
                </span>
              </div>
              <input
                type="range"
                min={ctrl.min}
                max={ctrl.max}
                step={ctrl.step}
                value={layout[ctrl.key] ?? 0}
                onChange={(e) => onChange(ctrl.key, e.target.value)}
                className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-sky-600"
              />
            </div>
          ))}
        </div>
      </div>

      {/* Footer Actions */}
      <div className="p-3 bg-slate-50 border-t border-slate-200 flex items-center justify-between gap-2">
        <button
          onClick={onReset}
          className="flex items-center gap-1.5 px-2.5 py-2 text-slate-600 hover:text-slate-900 hover:bg-slate-200/60 rounded-xl text-[11px] font-bold transition-all"
          title="Reset to default alignment"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span>Reset</span>
        </button>

        <button
          onClick={handleCopy}
          className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-[11px] font-bold shadow-sm transition-all"
          title="Copy JSON configuration to clipboard"
        >
          {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
          <span>{copied ? 'Copied to Clipboard!' : 'Copy Config'}</span>
        </button>

        <button
          onClick={handleLockAdmin}
          className="text-[10px] text-slate-400 hover:text-rose-600 font-semibold px-2 py-1.5 rounded transition-colors"
          title="Exit Admin Mode and return to public view"
        >
          🔒 Lock
        </button>
      </div>
    </div>
  );
}
