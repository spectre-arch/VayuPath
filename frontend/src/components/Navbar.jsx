import React from 'react';
import { Wind, Shield, Bell, MapPin, Globe, Sparkles, AlertTriangle, Sliders, Cpu } from 'lucide-react';
import { VayupathLogo } from './VayupathLogo';

export function Navbar({ activeTab, setActiveTab, lang, setLang, t, userProfile, setUserProfile, onOpenAlerts, onOpenAwsHackathon }) {
  // Private Admin Mode Check (URL ?admin=true or shortcut Ctrl+Shift+L)
  const [isAdmin, setIsAdmin] = React.useState(() => {
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

  React.useEffect(() => {
    const handleKey = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && (e.key === 'L' || e.key === 'l')) {
        e.preventDefault();
        setIsAdmin((prev) => {
          const next = !prev;
          try {
            if (next) localStorage.setItem('vayupath_admin', 'true');
            else localStorage.removeItem('vayupath_admin');
          } catch {}
          return next;
        });
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, []);

  const tabs = [
    { id: 'home', label: 'Home', icon: Wind },
    { id: 'tracker', label: t.nav.tracker, icon: Wind },
    { id: 'exposure', label: t.nav.exposure, icon: Shield },
    { id: 'schools', label: t.nav.schools, icon: AlertTriangle },
    { id: 'stubble', label: t.nav.stubble, icon: Sparkles },
    { id: 'indoor', label: t.nav.indoor, icon: Wind },
    { id: 'advisor', label: t.nav.advisor, icon: Sparkles, highlight: true },
    { id: 'about', label: t.nav.about, icon: Globe },
  ];

  return (
    <header className="sticky top-0 z-50 bg-white/95 backdrop-blur-md border-b border-slate-200 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Official VayuPath Logo */}
          <div className="flex items-center gap-2 cursor-pointer group" onClick={() => setActiveTab('home')}>
            <VayupathLogo variant="full" size="sm" animated={true} />
            <span className="text-[11px] font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200/60 hidden xl:inline font-['Noto_Sans_Devanagari']">
              वायुपथ
            </span>
          </div>

          {/* Desktop Nav Tabs */}
          <nav className="hidden lg:flex items-center gap-1">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                    isActive
                      ? 'bg-sky-50 text-sky-700 shadow-sm border border-sky-200/60 font-semibold'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/70'
                  } ${tab.highlight && !isActive ? 'text-teal-600 font-semibold' : ''}`}
                >
                  <Icon className={`w-4 h-4 ${isActive ? 'text-sky-600' : ''}`} />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </nav>

          {/* Right Action Controls */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Language Selector */}
            <div className="flex items-center bg-slate-100 rounded-lg p-0.5 border border-slate-200">
              <button
                onClick={() => setLang('en')}
                className={`px-2 py-1 text-xs font-bold rounded-md transition-all ${
                  lang === 'en' ? 'bg-white text-sky-700 shadow-xs' : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                EN
              </button>
              <button
                onClick={() => setLang('hi')}
                className={`px-2 py-1 text-xs font-bold rounded-md transition-all font-['Noto_Sans_Devanagari'] ${
                  lang === 'hi' ? 'bg-white text-sky-700 shadow-xs' : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                हिंदी
              </button>
            </div>

            {/* Quick Layout Studio Button (Private to Admin/Developer only) */}
            {isAdmin && (
              <button
                onClick={() => {
                  setActiveTab('home');
                  setTimeout(() => window.dispatchEvent(new CustomEvent('open-layout-studio')), 50);
                }}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-amber-50 text-amber-800 border border-amber-300 hover:bg-amber-100 transition-colors shadow-xs"
                title="Admin Layout Studio (Ctrl+Shift+L to toggle)"
              >
                <Sliders className="w-3.5 h-3.5 text-amber-700" />
                <span className="hidden sm:inline">📐 Layout Studio</span>
              </button>
            )}

            {/* WeMakeDevs x AWS Hackathon Stack Button */}
            <button
              onClick={onOpenAwsHackathon}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-amber-500/10 text-amber-900 border border-amber-300 hover:bg-amber-500/20 transition-all shadow-xs"
              title="WeMakeDevs x AWS Hackathon Stack & Open Source Verification"
            >
              <Cpu className="w-3.5 h-3.5 text-amber-700" />
              <span className="hidden sm:inline">AWS Stack</span>
              <span className="sm:hidden">AWS</span>
            </button>

            {/* Subscribe Alerts Button */}
            <button
              onClick={onOpenAlerts}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-200 hover:bg-slate-200 transition-colors"
            >
              <Bell className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Alerts</span>
            </button>
          </div>
        </div>

        {/* Mobile Horizontal Subnav */}
        <div className="lg:hidden flex overflow-x-auto py-2 gap-2 border-t border-slate-100 no-scrollbar">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs whitespace-nowrap font-medium transition-all ${
                  isActive
                    ? 'bg-sky-600 text-white font-semibold shadow-xs'
                    : 'bg-slate-100 text-slate-700'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>
    </header>
  );
}
