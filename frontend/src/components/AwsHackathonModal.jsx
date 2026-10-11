import React from 'react';
import { Award, CheckCircle2, ShieldCheck, Sparkles, Server, Terminal, ExternalLink, X, ArrowRight } from 'lucide-react';

export function AwsHackathonModal({ isOpen, onClose, onNavigateTab }) {
  if (!isOpen) return null;

  const stackItems = [
    {
      category: "Agents and AI",
      track: "BUILD IT: Open source, on your machine",
      tool: "Strands Agents SDK (strands-agents)",
      description: "Autonomous Air Advisor agent with Amazon Bedrock conversational reasoning and multi-tool calling.",
      status: "Implemented & Active",
      actionLabel: "Try AI Advisor",
      tab: "advisor"
    },
    {
      category: "Auth and policy",
      track: "BUILD IT: Open source, on your machine",
      tool: "Cedar Policy Engine (cedar-policy)",
      description: "Evaluates legal school closures, outdoor sports bans, and emergency parent alerts using formal Cedar language rules.",
      status: "Implemented & Active",
      actionLabel: "Inspect Cedar Policies",
      tab: "schools"
    },
    {
      category: "Serverless",
      track: "BUILD IT & SHIP IT: SAM CLI & LocalStack",
      tool: "AWS SAM + LocalStack + Lambda",
      description: "7 microservice Lambdas emulated with LocalStack offline and packaged with AWS SAM template.yaml.",
      status: "Implemented & Active",
      actionLabel: "Review Architecture",
      tab: "about"
    },
    {
      category: "The plumbing",
      track: "SHIP IT: Deployed with AWS Cloud Services",
      tool: "Amazon SNS, EventBridge, CloudFront, S3",
      description: "Automated 30-minute EventBridge cron worker, SNS emergency parent broadcast, and CloudFront CDN.",
      status: "Production Ready",
      actionLabel: "View Verified Sources",
      tab: "about"
    }
  ];

  return (
    <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl max-w-2xl w-full shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white p-6 relative">
          <button
            onClick={onClose}
            className="absolute top-5 right-5 p-1.5 rounded-full bg-white/10 hover:bg-white/20 text-white/80 hover:text-white transition-all"
          >
            <X className="w-4 h-4" />
          </button>

          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black tracking-wider uppercase bg-amber-400 text-slate-950">
              WeMakeDevs x AWS
            </span>
            <span className="text-xs font-mono text-slate-300">Hackathon Compliance</span>
          </div>

          <h2 className="text-xl sm:text-2xl font-black mt-2 tracking-tight">
            AWS Open Source & Cloud Architecture
          </h2>
          <p className="text-xs text-slate-300 mt-1">
            "To be eligible for prizes, your project needs to either use at least one AWS open source tool or be deployed on AWS."
          </p>
          <div className="mt-3 inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-xs font-bold">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
            Verified: Exceeds Criteria (3 Open Source Tools + Serverless Deployment)
          </div>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto space-y-4">
          <div className="text-xs font-bold text-slate-500 uppercase tracking-wider">
            Implemented Tools from WeMakeDevs Tech Matrix:
          </div>

          <div className="space-y-3">
            {stackItems.map((item, idx) => (
              <div
                key={idx}
                className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:border-indigo-300 transition-all"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-black text-slate-900">{item.tool}</span>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-800 font-bold">
                      {item.category}
                    </span>
                  </div>
                  <div className="text-[11px] font-mono text-indigo-600 mt-0.5">
                    {item.track}
                  </div>
                  <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                    {item.description}
                  </p>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => {
                      onClose();
                      onNavigateTab(item.tab);
                    }}
                    className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition-all shadow-xs"
                  >
                    <span>{item.actionLabel}</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>

          <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 text-xs text-amber-900 leading-relaxed">
            <strong>Judge Note:</strong> You can test the <strong>Cedar Policy Engine</strong> live under the <em>Schools & GRAP</em> tab with real-time statutory evaluation rules, or chat with the <strong>Strands Agent</strong> in the <em>AI Advisor</em> tab!
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-100 border-t border-slate-200 flex items-center justify-between">
          <a
            href="https://github.com/cedar-policy/cedar"
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-1 text-xs text-slate-600 hover:text-slate-900 font-semibold"
          >
            <span>cedar-policy (GitHub)</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-900 text-white text-xs font-bold rounded-xl hover:bg-slate-800"
          >
            Close Overview
          </button>
        </div>
      </div>
    </div>
  );
}
