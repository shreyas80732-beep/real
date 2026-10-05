import React, { useState } from 'react';
import { X, Sparkles, Check, ShieldCheck, Zap, AlertCircle, Loader2 } from 'lucide-react';
import { createPaymentOrder, verifyPayment } from '../services/api';
import { launchRazorpayPayment } from '../services/razorpay';

export default function SubscriptionModal({
  isOpen,
  onClose,
  user,
  onRequireAuth,
  onSubscriptionSuccess,
}) {
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  if (!isOpen) return null;

  const handleInitiatePayment = async () => {
    setErrorMsg('');

    if (!user) {
      onClose();
      onRequireAuth('login');
      return;
    }

    setIsLoading(true);

    try {
      // 1. Create order on server
      const orderData = await createPaymentOrder();

      // 2. Launch Razorpay Checkout Modal
      await launchRazorpayPayment({
        orderData,
        currentUser: user,
        onSuccess: async (razorpayResponse) => {
          try {
            // 3. Verify payment on server
            const verifyResult = await verifyPayment(razorpayResponse);
            onSubscriptionSuccess?.(verifyResult);
            onClose();
          } catch (verifyErr) {
            console.error('Verification error:', verifyErr);
            setErrorMsg(verifyErr.message || 'Payment confirmation failed. If debited, please contact support.');
          } finally {
            setIsLoading(false);
          }
        },
        onFailure: (err) => {
          console.error('Checkout error:', err);
          setErrorMsg(err.description || err.message || 'Payment was cancelled or failed.');
          setIsLoading(false);
        },
      });
    } catch (err) {
      console.error('Order creation failed:', err);
      setErrorMsg(err.message || 'Failed to initialize payment gateway.');
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl overflow-hidden">
        {/* Ambient Glow */}
        <div className="absolute top-0 right-0 w-48 h-48 bg-emerald-500/10 blur-[80px] pointer-events-none rounded-full" />

        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Modal Header */}
        <div className="flex items-center gap-2 mb-2">
          <div className="w-8 h-8 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
            <Zap className="w-4 h-4 fill-current" />
          </div>
          <span className="text-xs font-bold uppercase tracking-wider text-emerald-400">NoteCraft Pro Pass</span>
        </div>

        <h3 className="text-2xl font-extrabold text-white tracking-tight">
          Unlock 15-Day Unlimited Access
        </h3>
        <p className="text-xs text-slate-400 mt-1">
          Generate as many revision guides, summaries, and exam-standard Q&amp;As as you need.
        </p>

        {/* Price Card */}
        <div className="mt-5 p-4 rounded-2xl bg-slate-950 border border-emerald-500/30">
          <div className="flex items-baseline justify-between">
            <div>
              <span className="text-xs font-medium text-slate-400">Fixed Micro-Price</span>
              <div className="flex items-baseline gap-1 mt-0.5">
                <span className="text-3xl font-extrabold text-white">₹20</span>
                <span className="text-xs text-slate-400">/ 15 days</span>
              </div>
            </div>
            <div className="px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-[11px] font-semibold">
              Instant UPI Activation
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-800/80 space-y-2 text-xs text-slate-300">
            <div className="flex items-center gap-2">
              <Check className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />
              <span>Full syllabus breakdowns &amp; theory summaries</span>
            </div>
            <div className="flex items-center gap-2">
              <Check className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />
              <span>Standard 2, 3, and 6-mark Q&amp;A structured for exams</span>
            </div>
            <div className="flex items-center gap-2">
              <Check className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />
              <span>Real-time Google Gemini 2.5 Flash streaming</span>
            </div>
            <div className="flex items-center gap-2">
              <Check className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />
              <span>Permanent cloud note history &amp; markdown exports</span>
            </div>
          </div>
        </div>

        {/* Error notification */}
        {errorMsg && (
          <div className="mt-4 p-3 rounded-xl bg-rose-950/60 border border-rose-500/40 text-rose-300 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0 text-rose-400" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Payment CTA Button */}
        <div className="mt-6">
          <button
            type="button"
            onClick={handleInitiatePayment}
            disabled={isLoading}
            className="w-full py-3.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-400 hover:from-emerald-400 hover:to-teal-300 text-slate-950 font-extrabold text-sm flex items-center justify-center gap-2 transition-all shadow-lg shadow-emerald-500/20 disabled:opacity-50"
          >
            {isLoading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <>
                <Sparkles className="w-4 h-4" />
                <span>Pay ₹20 via UPI / Card (Razorpay)</span>
              </>
            )}
          </button>

          <div className="mt-3 flex items-center justify-center gap-2 text-[11px] text-slate-500">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            <span>Encrypted 256-bit bank grade transaction via Razorpay</span>
          </div>
        </div>
      </div>
    </div>
  );
}
