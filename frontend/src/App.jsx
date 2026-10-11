import React, { useState } from 'react';
import { Navbar } from './components/Navbar';
import { HeroIntroView } from './components/HeroIntroView';
import { AqiTrackerView } from './components/AqiTrackerView';
import { ExposureView } from './components/ExposureView';
import { SchoolsView } from './components/SchoolsView';
import { StubbleView } from './components/StubbleView';
import { IndoorView } from './components/IndoorView';
import { AdvisorChatView } from './components/AdvisorChatView';
import { AboutView } from './components/AboutView';
import { AlertsModal } from './components/AlertsModal';
import { AwsHackathonModal } from './components/AwsHackathonModal';
import { translations } from './i18n/translations';
import { ShieldCheck, Wind, Heart, Sparkles, Cpu } from 'lucide-react';

export function App() {
  const [activeTab, setActiveTab] = useState('home');
  const [lang, setLang] = useState('en');
  const [userProfile, setUserProfile] = useState('child');
  const [isAlertsOpen, setIsAlertsOpen] = useState(false);
  const [isAwsHackathonOpen, setIsAwsHackathonOpen] = useState(false);

  const t = translations[lang] || translations.en;

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900 font-sans">
      {/* Top Navigation */}
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        lang={lang}
        setLang={setLang}
        t={t}
        userProfile={userProfile}
        setUserProfile={setUserProfile}
        onOpenAlerts={() => setIsAlertsOpen(true)}
        onOpenAwsHackathon={() => setIsAwsHackathonOpen(true)}
      />

      {/* Main View Container */}
      <main className="flex-1 w-full mx-auto">
        {activeTab === 'home' && (
          <HeroIntroView
            onExplore={() => setActiveTab('exposure')}
            onOpenAdvisor={() => setActiveTab('advisor')}
            onOpenTracker={() => setActiveTab('tracker')}
          />
        )}
        {activeTab !== 'home' && (
          <div className="max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
            {activeTab === 'tracker' && <AqiTrackerView t={t} lang={lang} />}
            {activeTab === 'exposure' && (
              <ExposureView
                t={t}
                lang={lang}
                userProfile={userProfile}
                setUserProfile={setUserProfile}
              />
            )}
            {activeTab === 'schools' && <SchoolsView t={t} lang={lang} />}
            {activeTab === 'stubble' && <StubbleView t={t} lang={lang} />}
            {activeTab === 'indoor' && <IndoorView t={t} lang={lang} />}
            {activeTab === 'advisor' && <AdvisorChatView t={t} userProfile={userProfile} />}
            {activeTab === 'about' && <AboutView t={t} />}
          </div>
        )}
      </main>

      {/* Subscription Modal */}
      <AlertsModal isOpen={isAlertsOpen} onClose={() => setIsAlertsOpen(false)} />

      {/* WeMakeDevs x AWS Hackathon Verification Modal */}
      <AwsHackathonModal
        isOpen={isAwsHackathonOpen}
        onClose={() => setIsAwsHackathonOpen(false)}
        onNavigateTab={(tab) => {
          setActiveTab(tab);
          setIsAwsHackathonOpen(false);
        }}
      />

      {/* Footer */}
      <footer className="bg-white border-t border-slate-200 mt-12 py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4 text-xs text-slate-500">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-lg bg-sky-600 text-white flex items-center justify-center font-black text-xs">
                V
              </div>
              <span className="font-bold text-slate-800">VayuPath • वायुपथ</span>
              <span>— {t.themeQuote}</span>
            </div>

            <div className="flex items-center gap-4 flex-wrap">
              <span className="flex items-center gap-1 text-slate-600">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" /> 100% Real Environmental Data
              </span>
              <span>•</span>
              <button
                onClick={() => setIsAwsHackathonOpen(true)}
                className="hover:text-amber-800 transition-colors flex items-center gap-1 font-bold text-amber-900 bg-amber-50 px-2.5 py-1 rounded-md border border-amber-300 shadow-xs"
              >
                <Cpu className="w-3 h-3 text-amber-700" />
                <span>AWS Hackathon Stack</span>
              </button>
              <span>•</span>
              <button onClick={() => setActiveTab('about')} className="hover:text-sky-600 transition-colors underline">
                Methodology & Credits
              </button>
              <span>•</span>
              <button onClick={() => setActiveTab('advisor')} className="hover:text-sky-600 transition-colors flex items-center gap-1 font-semibold text-sky-600">
                <Sparkles className="w-3 h-3" /> AWS Strands Agent
              </button>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default App;
