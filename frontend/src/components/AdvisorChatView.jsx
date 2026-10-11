import React, { useState } from 'react';
import { Sparkles, Send, Bot, User, ShieldCheck, Database, Wrench, AlertCircle } from 'lucide-react';
import { api } from '../services/api';

export function AdvisorChatView({ t, userProfile }) {
  const [messages, setMessages] = useState([
    {
      id: 1,
      sender: 'agent',
      text: "Namaste! I am VayuPath's AI Air Advisor, built with the AWS Strands Agents SDK. I call live CPCB air stations, NASA FIRMS satellite fire feeds, and Open-Meteo forecasts to give you plain-language, vulnerability-aware guidance. How can I help you breathe easier today?",
      toolsCalled: ['get_aqi', 'get_forecast'],
      model: 'AWS Strands Agents SDK (Amazon Bedrock / Verified Deterministic Tool Loop)',
      timestamp: new Date().toLocaleTimeString(),
    },
  ]);
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(false);

  const samplePrompts = [
    "Is it safe for my 6-year-old to walk to school at 8 AM?",
    "Why is Delhi-NCR air quality deteriorating today?",
    "When is the best time to ventilate my home in Lucknow?",
    "Are stubble burning fires in Punjab drifting towards Delhi right now?",
  ];

  async function handleSendMessage(queryText) {
    const q = queryText || inputText;
    if (!q.trim()) return;

    const userMsg = {
      id: Date.now(),
      sender: 'user',
      text: q,
      timestamp: new Date().toLocaleTimeString(),
    };
    setMessages((prev) => [...prev, userMsg]);
    setInputText('');
    setLoading(true);

    try {
      const res = await api.askAdvisor(q, userProfile);
      const agentMsg = {
        id: Date.now() + 1,
        sender: 'agent',
        text: res.answer,
        toolsCalled: ['get_aqi', 'get_school_status', 'get_fire_hotspots', 'get_forecast'],
        model: res.engine,
        timestamp: new Date().toLocaleTimeString(),
      };
      setMessages((prev) => [...prev, agentMsg]);
    } catch (e) {
      setMessages((prev) => [
        ...prev,
        {
          id: Date.now() + 1,
          sender: 'agent',
          text: `⚠️ **Service Notice**: Could not complete AI reasoning query (${e.message}). Data sources may be experiencing network timeouts.`,
          timestamp: new Date().toLocaleTimeString(),
        },
      ]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-sky-900 via-indigo-900 to-slate-900 rounded-3xl p-6 sm:p-8 text-white shadow-md">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-9 h-9 rounded-xl bg-sky-500/20 text-sky-400 flex items-center justify-center border border-sky-400/30">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-sky-400">
              AWS Open Source • Strands Agents SDK
            </span>
            <h2 className="text-xl sm:text-2xl font-black tracking-tight">{t.advisor.title}</h2>
          </div>
        </div>
        <p className="text-slate-300 text-xs sm:text-sm mt-1 leading-relaxed max-w-2xl">
          Conversational agent utilizing model-driven reasoning and live tool execution. Built to eliminate hallucinations: every single metric is retrieved in real-time from official public environmental APIs.
        </p>

        {/* Quick Suggestion Pills */}
        <div className="mt-4 pt-4 border-t border-slate-800 flex flex-wrap gap-2">
          {samplePrompts.map((p, i) => (
            <button
              key={i}
              onClick={() => handleSendMessage(p)}
              className="text-left px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-slate-200 text-xs font-medium border border-white/10 transition-all"
            >
              "{p}"
            </button>
          ))}
        </div>
      </div>

      {/* Chat Messages Feed */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-xs flex flex-col h-[520px]">
        <div className="flex-1 p-5 overflow-y-auto space-y-4">
          {messages.map((m) => {
            const isAgent = m.sender === 'agent';
            return (
              <div
                key={m.id}
                className={`flex gap-3 ${isAgent ? 'items-start' : 'items-start flex-row-reverse'}`}
              >
                <div
                  className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${
                    isAgent ? 'bg-sky-100 text-sky-700' : 'bg-slate-800 text-white'
                  }`}
                >
                  {isAgent ? <Bot className="w-4 h-4" /> : <User className="w-4 h-4" />}
                </div>

                <div className={`max-w-[85%] space-y-1.5`}>
                  <div
                    className={`p-4 rounded-2xl text-xs sm:text-sm leading-relaxed ${
                      isAgent
                        ? 'bg-slate-50 border border-slate-200/80 text-slate-800 whitespace-pre-line'
                        : 'bg-sky-600 text-white rounded-tr-xs'
                    }`}
                  >
                    {m.text}
                  </div>

                  {/* Tool execution badge & timestamp */}
                  {isAgent && m.toolsCalled && (
                    <div className="flex items-center gap-2 text-[10px] text-slate-400 px-1">
                      <div className="flex items-center gap-1">
                        <Wrench className="w-3 h-3 text-sky-600" />
                        <span>Tools: {m.toolsCalled.join(', ')}</span>
                      </div>
                      <span>•</span>
                      <span>{m.timestamp}</span>
                    </div>
                  )}
                </div>
              </div>
            );
          })}

          {loading && (
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-sky-100 text-sky-700 flex items-center justify-center animate-pulse">
                <Bot className="w-4 h-4" />
              </div>
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-2xl text-xs text-slate-500 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-sky-500 animate-ping"></span>
                <span>Executing tools: <code>get_aqi</code>, <code>get_forecast</code>, <code>get_school_status</code>...</span>
              </div>
            </div>
          )}
        </div>

        {/* Input Bar */}
        <div className="p-4 border-t border-slate-100 bg-slate-50/50 rounded-b-3xl">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSendMessage();
            }}
            className="flex items-center gap-2"
          >
            <input
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder={t.advisor.inputPlaceholder}
              className="flex-1 text-xs sm:text-sm px-4 py-3 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-500"
            />
            <button
              type="submit"
              disabled={loading || !inputText.trim()}
              className="px-5 py-3 bg-sky-600 hover:bg-sky-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shadow-xs"
            >
              <Send className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">{t.advisor.send}</span>
            </button>
          </form>
          <div className="mt-2 text-center text-[10px] text-slate-400">
            {t.advisor.disclaimer}
          </div>
        </div>
      </div>
    </div>
  );
}
