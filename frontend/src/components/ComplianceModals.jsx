import React from 'react';
import { X, ShieldAlert, FileText, Mail, RefreshCw } from 'lucide-react';

export default function ComplianceModal({ type, isOpen, onClose }) {
  if (!isOpen || !type) return null;

  const contentMap = {
    terms: {
      title: 'Terms & Conditions',
      icon: <FileText className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />,
      content: (
        <div className="space-y-4 text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
          <p>
            Welcome to <strong>NoteCraft AI</strong>. By accessing or using our services, you agree to be bound by these terms.
          </p>
          <h4 className="text-slate-900 dark:text-white font-semibold">1. Service Description</h4>
          <p>
            NoteCraft AI provides AI-assisted note restructuring, revision summaries, and structured 2, 3, and 6-mark Q&amp;A generation powered by advanced AI LLM models. The service is provided on an educational basis.
          </p>
          <h4 className="text-slate-900 dark:text-white font-semibold">2. Pay-Per-PDF Pricing (₹9)</h4>
          <p>
            Access is provided under a frictionless on-demand micro-payment model priced at <strong>₹9 per generated study guide / PDF</strong>. There are no recurring subscription fees, automatic renewals, or hidden charges.
          </p>
          <h4 className="text-slate-900 dark:text-white font-semibold">3. Zero Password &amp; Data Privacy</h4>
          <p>
            No student account password is required to generate study materials. All payments are verified via encrypted UPI transaction signatures.
          </p>
        </div>
      ),
    },
    privacy: {
      title: 'Privacy Policy',
      icon: <ShieldAlert className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />,
      content: (
        <div className="space-y-4 text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
          <p>
            At <strong>NoteCraft AI</strong>, your privacy and academic confidentiality are our top priorities.
          </p>
          <h4 className="text-slate-900 dark:text-white font-semibold">1. No Passwords Stored</h4>
          <p>
            We do not store passwords. We only process the study notes you submit to generate your requested revision material.
          </p>
          <h4 className="text-slate-900 dark:text-white font-semibold">2. Payment Security</h4>
          <p>
            All ₹9 payments are securely processed by <strong>Razorpay</strong>. NoteCraft AI does not store credit card numbers, CVVs, or UPI PINs.
          </p>
          <h4 className="text-slate-900 dark:text-white font-semibold">3. AI Data Processing</h4>
          <p>
            Study notes are transmitted strictly to secure encrypted AI endpoints to produce the study guide. We never sell your study materials to advertisers.
          </p>
        </div>
      ),
    },
    refund: {
      title: 'Refund & Cancellation Policy',
      icon: <RefreshCw className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />,
      content: (
        <div className="space-y-4 text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
          <p>
            We strive to provide seamless AI study services to all students.
          </p>
          <h4 className="text-slate-900 dark:text-white font-semibold">1. Instant Digital Delivery</h4>
          <p>
            Since the AI study guide is generated and delivered immediately upon payment capture, payments of ₹9 are generally non-refundable once generation begins.
          </p>
          <h4 className="text-slate-900 dark:text-white font-semibold">2. Failed Generations or Double Debits</h4>
          <p>
            If ₹9 was debited from your bank/UPI but the study guide failed to generate due to a network glitch, contact our support team with your Razorpay Payment ID for an immediate refund within 3-5 business days.
          </p>
        </div>
      ),
    },
    contact: {
      title: 'Contact Us',
      icon: <Mail className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />,
      content: (
        <div className="space-y-4 text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
          <p>
            Have feedback, bug reports, or queries? We are here to help students!
          </p>
          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-2 text-slate-700 dark:text-slate-300">
            <p><strong>Merchant Legal Entity:</strong> NoteCraft AI Technologies</p>
            <p><strong>Customer Support Email:</strong> support@notecraft.ai</p>
            <p><strong>Support Window:</strong> Monday – Saturday (9:00 AM – 7:00 PM IST)</p>
            <p><strong>Response Time:</strong> Typically within 12 hours</p>
          </div>
        </div>
      ),
    },
  };

  const item = contentMap[type] || contentMap.terms;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl transition-colors">
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-1.5 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3 mb-5">
          <div className="w-10 h-10 rounded-2xl bg-emerald-100 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-500/30 flex items-center justify-center">
            {item.icon}
          </div>
          <h3 className="text-xl font-bold text-slate-900 dark:text-white">{item.title}</h3>
        </div>

        <div className="max-h-[60vh] overflow-y-auto pr-2">
          {item.content}
        </div>
      </div>
    </div>
  );
}
