import React from 'react';
import { Sparkles, CheckCircle2, Zap, Award, FileText } from 'lucide-react';

export default function HeroPricingBanner({ user, onOpenSubscription, onScrollToWorkspace }) {
  return (
    <section className="relative overflow-hidden py-10 sm:py-14 border-b border-slate-800 bg-gradient-to-b from-slate-900 via-slate-900/60 to-slate-950">
      {/* Decorative background glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[550px] h-[300px] bg-emerald-500/10 blur-[120px] pointer-events-none rounded-full" />

      <div className="max-w-5xl mx-auto px-4 text-center relative z-10">
        {/* Micro-badge */}
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-semibold mb-6">
          <Zap className="w-3.5 h-3.5 fill-current" />
          <span>Powered by Google Gemini 2.5 Flash</span>
        </div>

        {/* Headline */}
        <h1 className="text-3xl sm:text-5xl font-extrabold text-white tracking-tight leading-tight sm:leading-tight">
          Turn Raw Study Notes into <br className="hidden sm:inline" />
          <span className="bg-gradient-to-r from-emerald-400 via-teal-300 to-cyan-400 bg-clip-text text-transparent">
            High-Scoring Exam Revision Guides
          </span>
        </h1>

        <p className="mt-4 text-slate-300 text-sm sm:text-base max-w-2xl mx-auto leading-relaxed">
          Upload messy lecture slides, handouts, or textbook snippets. Get instant summaries with structured
          <strong className="text-white"> 2, 3, and 6-mark Q&amp;As</strong> crafted for top college &amp; school exam scores.
        </p>

        {/* Pricing Card Highlight */}
        <div className="mt-8 max-w-md mx-auto p-4 rounded-2xl bg-gradient-to-r from-emerald-950/60 to-slate-900/90 border border-emerald-500/40 shadow-xl shadow-emerald-950/40 backdrop-blur-sm">
          <div className="flex items-center justify-between gap-4">
            <div className="text-left">
              <span className="text-xs uppercase font-bold tracking-wider text-emerald-400">Micro-Pass</span>
              <div className="flex items-baseline gap-1 mt-0.5">
                <span className="text-3xl font-extrabold text-white">₹20</span>
                <span className="text-xs text-slate-400">/ 15 days access</span>
              </div>
              <p className="text-[11px] text-slate-400">Pay via GooglePay, PhonePe, Paytm, or any UPI</p>
            </div>

            {user?.isSubscribed ? (
              <button
                onClick={onScrollToWorkspace}
                className="px-4 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs transition-all shadow-md flex items-center gap-1.5"
              >
                <FileText className="w-4 h-4" />
                <span>Open Studio</span>
              </button>
            ) : (
              <button
                onClick={onOpenSubscription}
                className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-400 hover:from-emerald-400 hover:to-teal-300 text-slate-950 font-bold text-xs transition-all shadow-lg shadow-emerald-500/20 flex items-center gap-1.5 group"
              >
                <Sparkles className="w-4 h-4 transition-transform group-hover:scale-110" />
                <span>Unlock for ₹20</span>
              </button>
            )}
          </div>
        </div>

        {/* Feature Badges */}
        <div className="mt-6 flex flex-wrap items-center justify-center gap-y-2 gap-x-6 text-xs text-slate-400">
          <div className="flex items-center gap-1.5">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            <span>Core Theory Summary</span>
          </div>
          <div className="flex items-center gap-1.5">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            <span>2, 3 &amp; 6-Mark Exam Q&amp;As</span>
          </div>
          <div className="flex items-center gap-1.5">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            <span>Real-time SSE Streaming</span>
          </div>
          <div className="flex items-center gap-1.5">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            <span>Instant Cloud Save</span>
          </div>
        </div>
      </div>
    </section>
  );
}
