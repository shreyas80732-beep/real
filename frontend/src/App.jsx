import React, { useState, useEffect } from 'react';
import Navbar from './components/Navbar';
import GeneratorWorkspace from './components/GeneratorWorkspace';
import ComplianceModal from './components/ComplianceModals';
import { Sparkles, Zap, CheckCircle2, ShieldCheck, Heart } from 'lucide-react';

export default function App() {
  // Theme state: 'light' or 'dark'
  const [theme, setTheme] = useState(() => {
    return localStorage.getItem('notecraft_theme') || 'dark';
  });

  const [complianceType, setComplianceType] = useState(null);

  // Apply theme to html root
  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    localStorage.setItem('notecraft_theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'));
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 transition-colors duration-200">
      {/* Navbar with Theme Toggle */}
      <Navbar theme={theme} onToggleTheme={toggleTheme} />

      {/* Main Content */}
      <main className="flex-1">
        {/* Friendly Hero Banner */}
        <section className="pt-10 pb-6 text-center px-4 relative overflow-hidden">
          <div className="max-w-3xl mx-auto">
            {/* Pill */}
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-100 dark:bg-emerald-950/60 border border-emerald-300 dark:border-emerald-500/30 text-emerald-800 dark:text-emerald-300 text-xs font-bold mb-4 shadow-sm">
              <Zap className="w-3.5 h-3.5 fill-current text-emerald-600 dark:text-emerald-400" />
              <span>Zero Passwords • Instant UPI Access • ₹9 / PDF</span>
            </div>

            <h1 className="text-3xl sm:text-5xl font-extrabold text-slate-900 dark:text-white tracking-tight leading-tight">
              Turn Messy Notes into <br />
              <span className="bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-500 dark:from-emerald-400 dark:via-teal-300 dark:to-cyan-400 bg-clip-text text-transparent">
                High-Scoring Exam Guides
              </span>
            </h1>

            <p className="mt-3 text-sm sm:text-base text-slate-600 dark:text-slate-400 max-w-xl mx-auto leading-relaxed">
              Upload notes, slides, or chapters. Get clear <strong className="text-slate-800 dark:text-slate-200">Theory Summaries + 2, 3 &amp; 6-Mark Q&amp;As</strong> formatted for high marks.
            </p>

            {/* Feature Highlights */}
            <div className="mt-5 flex flex-wrap items-center justify-center gap-y-2 gap-x-5 text-xs text-slate-500 dark:text-slate-400">
              <div className="flex items-center gap-1">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                <span>₹9 per PDF (No Subscriptions)</span>
              </div>
              <div className="flex items-center gap-1">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                <span>Instant Q&amp;A Exam Engine</span>
              </div>
              <div className="flex items-center gap-1">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                <span>1-Click PDF Download</span>
              </div>
            </div>
          </div>
        </section>

        {/* Generator Studio */}
        <GeneratorWorkspace />
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-200 dark:border-slate-800/80 bg-white dark:bg-slate-950 py-8 mt-12 text-slate-500 dark:text-slate-400 text-xs no-print transition-colors">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="font-extrabold text-slate-800 dark:text-slate-200">NoteCraft AI</span>
            <span>&copy; {new Date().getFullYear()} • Pay-Per-PDF Exam Assistant</span>
          </div>

          {/* Compliance Links for Razorpay */}
          <div className="flex flex-wrap items-center justify-center gap-4 sm:gap-6">
            <button
              onClick={() => setComplianceType('terms')}
              className="hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors"
            >
              Terms of Service
            </button>
            <button
              onClick={() => setComplianceType('privacy')}
              className="hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors"
            >
              Privacy Policy
            </button>
            <button
              onClick={() => setComplianceType('refund')}
              className="hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors"
            >
              Refund Policy
            </button>
            <button
              onClick={() => setComplianceType('contact')}
              className="hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors"
            >
              Contact Us
            </button>
          </div>

          <div className="flex items-center gap-1 text-[11px] text-slate-400">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
            <span>Secure 256-bit UPI Payments</span>
          </div>
        </div>
      </footer>

      {/* Compliance Policies Modal */}
      <ComplianceModal
        type={complianceType}
        isOpen={Boolean(complianceType)}
        onClose={() => setComplianceType(null)}
      />
    </div>
  );
}
