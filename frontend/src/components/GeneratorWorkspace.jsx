import React, { useState, useRef, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import {
  Sparkles,
  Upload,
  Copy,
  Check,
  Download,
  Printer,
  Trash2,
  AlertCircle,
  FileText,
  Loader2,
  ShieldCheck,
  ArrowRight,
  FileUp,
} from 'lucide-react';
import {
  createPaymentOrder,
  verifyPayment,
  streamNoteGeneration,
  parseDocumentFile,
} from '../services/api';
import { launchRazorpayPayment } from '../services/razorpay';

export default function GeneratorWorkspace() {
  const [title, setTitle] = useState('');
  const [uploadedText, setUploadedText] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);
  const [isParsingFile, setIsParsingFile] = useState(false);
  const [parseStatus, setParseStatus] = useState('');
  const [generatedOutput, setGeneratedOutput] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [copied, setCopied] = useState(false);

  const fileInputRef = useRef(null);
  const outputRef = useRef(null);

  // Buffer queue for smooth chunk-by-chunk typewriter streaming
  const streamQueueRef = useRef('');
  const streamTimerRef = useRef(null);

  // Auto-scroll output while streaming
  useEffect(() => {
    if (isStreaming && outputRef.current) {
      outputRef.current.scrollTop = outputRef.current.scrollHeight;
    }
  }, [generatedOutput, isStreaming]);

  // Clean up interval on unmount
  useEffect(() => {
    return () => {
      if (streamTimerRef.current) clearInterval(streamTimerRef.current);
    };
  }, []);

  // Smooth chunk-by-chunk streamer engine
  const startChunkStreamer = () => {
    streamQueueRef.current = '';
    setGeneratedOutput('');

    if (streamTimerRef.current) clearInterval(streamTimerRef.current);

    streamTimerRef.current = setInterval(() => {
      if (streamQueueRef.current.length > 0) {
        // Stream 2-8 characters dynamically per tick for high fluid responsiveness
        const step = Math.max(2, Math.min(10, Math.ceil(streamQueueRef.current.length / 6)));
        const slice = streamQueueRef.current.slice(0, step);
        streamQueueRef.current = streamQueueRef.current.slice(step);
        setGeneratedOutput((prev) => prev + slice);
      }
    }, 18); // ~55fps smooth flow
  };

  const pushChunk = (chunk) => {
    streamQueueRef.current += chunk;
  };

  const finishChunkStreamer = () => {
    // Flush remaining buffer smoothly
    const flushInterval = setInterval(() => {
      if (streamQueueRef.current.length > 0) {
        const slice = streamQueueRef.current.slice(0, 16);
        streamQueueRef.current = streamQueueRef.current.slice(16);
        setGeneratedOutput((prev) => prev + slice);
      } else {
        clearInterval(flushInterval);
        if (streamTimerRef.current) clearInterval(streamTimerRef.current);
      }
    }, 10);
  };

  // Sample notes for 1-click test
  const handleLoadSample = () => {
    setTitle('Database Management: ACID Properties & Normalization');
    setUploadedText(`1. ACID Properties in DBMS:
- Atomicity: "All or nothing" execution. If any operation within a transaction fails, the entire transaction rolls back to its original state. Managed by the Transaction Manager using undo logs.
- Consistency: The database must transition from one valid consistent state to another, satisfying all integrity constraints (primary keys, foreign keys, check constraints).
- Isolation: Concurrent transactions execute independently without interfering with each other. Serializability is the gold standard. Achieved using Concurrency Control protocols like Two-Phase Locking (2PL) and Timestamp Ordering.
- Durability: Once a transaction commits, its updates are permanent and survive system crashes or power failures. Ensured by the Recovery Manager using redo logs and Write-Ahead Logging (WAL).

2. Database Normalization:
Process of organizing data to reduce data redundancy and eliminate anomalies (Insertion, Deletion, and Update anomalies).
- 1NF (First Normal Form): Each table column must contain atomic (indivisible) values, and each record must be unique. No repeating groups.
- 2NF (Second Normal Form): Must be in 1NF + No partial dependency (all non-key attributes must be fully functionally dependent on the entire primary key).
- 3NF (Third Normal Form): Must be in 2NF + No transitive dependency (non-prime attribute should not determine another non-prime attribute. X -> Y, where X is super key or Y is prime attribute).
- BCNF (Boyce-Codd Normal Form): Stricter 3NF. For every functional dependency X -> Y, X must be a super key.`);
    setErrorMsg('');
  };

  // Handle PDF, TXT, or MD upload
  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Reset input to allow re-uploading same file name if needed
    e.target.value = '';

    const ext = file.name.split('.').pop()?.toLowerCase();
    if (ext !== 'pdf' && ext !== 'txt' && ext !== 'md') {
      setErrorMsg('Please upload a PDF document (.pdf), plain text (.txt), or markdown (.md) file.');
      return;
    }

    setIsParsingFile(true);
    setParseStatus(`Uploading and parsing ${file.name}...`);
    setErrorMsg('');

    try {
      if (ext === 'pdf') {
        setParseStatus('Extracting text from PDF pages...');
        const result = await parseDocumentFile(file);

        if (!result.text || result.text.trim().length === 0) {
          throw new Error('No readable text found in this PDF. If it is a scanned image, please paste text directly.');
        }

        setUploadedText(result.text);
        if (!title) {
          const autoTitle = file.name.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' ');
          setTitle(autoTitle.charAt(0).toUpperCase() + autoTitle.slice(1));
        }
        setParseStatus(`Extracted ${result.pages || 1} pages from ${file.name}!`);
        setTimeout(() => setParseStatus(''), 4000);
      } else {
        // Plain text or Markdown file
        const reader = new FileReader();
        reader.onload = (event) => {
          const content = event.target?.result;
          if (typeof content === 'string') {
            setUploadedText(content);
            if (!title) {
              const autoTitle = file.name.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' ');
              setTitle(autoTitle.charAt(0).toUpperCase() + autoTitle.slice(1));
            }
            setParseStatus(`Loaded ${file.name} successfully!`);
            setTimeout(() => setParseStatus(''), 3000);
          }
        };
        reader.readAsText(file);
      }
    } catch (err) {
      setErrorMsg(err.message || 'Failed to read PDF document.');
    } finally {
      setIsParsingFile(false);
    }
  };

  // 1. Pay ₹9 via Razorpay -> 2. Stream chunk-by-chunk in real time
  const handlePayAndGenerate = async () => {
    setErrorMsg('');

    if (!title.trim()) {
      setErrorMsg('Please enter a subject or topic title for your study guide.');
      return;
    }

    if (!uploadedText.trim() || uploadedText.trim().length < 25) {
      setErrorMsg('Please paste study notes or upload a PDF document with at least 2-3 lines of text.');
      return;
    }

    setIsProcessingPayment(true);

    try {
      // 1. Create ₹9 Razorpay order
      const orderData = await createPaymentOrder({
        name: customerName || 'Student',
        email: customerEmail || 'student@notes.in',
        title: title.trim(),
      });

      // 2. Open UPI / Razorpay modal
      await launchRazorpayPayment({
        orderData,
        customerName: customerName || 'Student',
        customerEmail: customerEmail || 'student@notes.in',
        onSuccess: async (razorpayResponse) => {
          try {
            // 3. Verify payment signature
            const verifyResult = await verifyPayment(razorpayResponse);

            setIsProcessingPayment(false);
            setIsStreaming(true);

            // Start chunk-by-chunk typewriter streaming engine
            startChunkStreamer();

            // Smooth scroll to output
            setTimeout(() => {
              outputRef.current?.scrollIntoView({ behavior: 'smooth' });
            }, 300);

            // 4. Stream AI study guide chunk-by-chunk
            await streamNoteGeneration({
              title: title.trim(),
              uploadedText: uploadedText.trim(),
              orderId: verifyResult.orderId,
              generationToken: verifyResult.generationToken,
              onChunk: (chunk) => {
                pushChunk(chunk);
              },
              onError: (streamErr) => {
                setErrorMsg(streamErr.message || 'Error occurred during notes generation.');
                setIsStreaming(false);
                finishChunkStreamer();
              },
              onDone: () => {
                finishChunkStreamer();
                setIsStreaming(false);
              },
            });
          } catch (err) {
            setErrorMsg(err.message || 'Payment confirmation failed.');
            setIsProcessingPayment(false);
          }
        },
        onFailure: (err) => {
          setIsProcessingPayment(false);
          if (err && err.message !== 'Payment window closed.') {
            setErrorMsg(err.description || err.message || 'Payment was cancelled.');
          }
        },
      });
    } catch (err) {
      setErrorMsg(err.message || 'Unable to connect to payment gateway.');
      setIsProcessingPayment(false);
    }
  };

  // Actions
  const handleCopy = () => {
    if (!generatedOutput) return;
    navigator.clipboard.writeText(generatedOutput);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownloadMarkdown = () => {
    if (!generatedOutput) return;
    const blob = new Blob([generatedOutput], { type: 'text/markdown;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${title.toLowerCase().replace(/\s+/g, '-') || 'study-guide'}.md`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handlePrintPDF = () => {
    window.print();
  };

  const handleReset = () => {
    if (streamTimerRef.current) clearInterval(streamTimerRef.current);
    setTitle('');
    setUploadedText('');
    setGeneratedOutput('');
    setErrorMsg('');
    setParseStatus('');
  };

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8">
      {/* 3-Step Simple Roadmap Banner */}
      <div className="mb-8 grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="p-3.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 font-bold text-xs flex items-center justify-center flex-shrink-0">
            1
          </div>
          <div>
            <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200">Upload PDF or Notes</h4>
            <p className="text-[11px] text-slate-500">Upload PDF slides, book chapters, text</p>
          </div>
        </div>

        <div className="p-3.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 font-bold text-xs flex items-center justify-center flex-shrink-0">
            2
          </div>
          <div>
            <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200">Pay ₹9 via UPI</h4>
            <p className="text-[11px] text-slate-500">GPay, PhonePe, Paytm, QR (No Passwords)</p>
          </div>
        </div>

        <div className="p-3.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 font-bold text-xs flex items-center justify-center flex-shrink-0">
            3
          </div>
          <div>
            <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200">Download PDF</h4>
            <p className="text-[11px] text-slate-500">Theory + 2, 3 &amp; 6-mark Q&amp;As</p>
          </div>
        </div>
      </div>

      {/* Parsing Status Notification */}
      {parseStatus && (
        <div className="mb-4 p-3 rounded-2xl bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-300 dark:border-emerald-600/40 text-emerald-800 dark:text-emerald-300 text-xs flex items-center gap-2">
          {isParsingFile ? <Loader2 className="w-4 h-4 animate-spin text-emerald-600" /> : <Check className="w-4 h-4 text-emerald-600" />}
          <span>{parseStatus}</span>
        </div>
      )}

      {/* Error Alert */}
      {errorMsg && (
        <div className="mb-6 p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-900/60 text-rose-700 dark:text-rose-300 text-xs sm:text-sm flex items-center justify-between shadow-sm">
          <div className="flex items-center gap-2.5">
            <AlertCircle className="w-5 h-5 flex-shrink-0 text-rose-500" />
            <span>{errorMsg}</span>
          </div>
          <button onClick={() => setErrorMsg('')} className="underline text-xs hover:text-rose-900 dark:hover:text-white">
            Dismiss
          </button>
        </div>
      )}

      {/* Main Workspace Card */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xl overflow-hidden transition-colors">
        {/* Top Controls Header */}
        <div className="p-5 sm:p-6 border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <FileText className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
              <span>Study Notes &amp; PDF Input</span>
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Upload PDF documents or paste text. No account creation needed.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleLoadSample}
              disabled={isProcessingPayment || isStreaming || isParsingFile}
              className="text-xs font-semibold px-3 py-1.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/30 hover:bg-emerald-100 transition-colors"
            >
              Try Sample Notes
            </button>
            {(title || uploadedText) && (
              <button
                type="button"
                onClick={handleReset}
                disabled={isProcessingPayment || isStreaming || isParsingFile}
                className="p-1.5 rounded-xl text-slate-400 hover:text-rose-500 transition-colors"
                title="Clear all"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* Input Form Body */}
        <div className="p-5 sm:p-6 space-y-4 input-section">
          {/* Topic Title */}
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
              Subject or Topic Name
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Operating Systems: CPU Scheduling & Deadlocks"
              disabled={isProcessingPayment || isStreaming || isParsingFile}
              className="w-full px-4 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-600 text-sm focus:outline-none focus:border-emerald-500 transition-colors"
            />
          </div>

          {/* Notes Content */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                Notes, PDF Content, or Lecture Text
              </label>
              <span className="text-[11px] text-slate-400 font-mono">
                {uploadedText.length} characters
              </span>
            </div>
            <textarea
              rows={9}
              value={uploadedText}
              onChange={(e) => setUploadedText(e.target.value)}
              placeholder="Paste raw class notes, lecture slides text, book snippets, or upload a PDF above..."
              disabled={isProcessingPayment || isStreaming || isParsingFile}
              className="w-full px-4 py-3 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-200 placeholder-slate-400 dark:placeholder-slate-600 text-xs sm:text-sm font-mono leading-relaxed focus:outline-none focus:border-emerald-500 transition-colors resize-y"
            />
          </div>

          {/* Optional Details (For PDF Receipt / Email) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
            <div>
              <label className="block text-[11px] font-medium text-slate-500 dark:text-slate-400 mb-1">
                Your Name <span className="text-slate-400 text-[10px]">(Optional - appears on PDF)</span>
              </label>
              <input
                type="text"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                placeholder="e.g. Rahul Sharma"
                disabled={isProcessingPayment || isStreaming || isParsingFile}
                className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-200 text-xs focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div>
              <label className="block text-[11px] font-medium text-slate-500 dark:text-slate-400 mb-1">
                Email / UPI ID <span className="text-slate-400 text-[10px]">(Optional - for payment receipt)</span>
              </label>
              <input
                type="email"
                value={customerEmail}
                onChange={(e) => setCustomerEmail(e.target.value)}
                placeholder="student@gmail.com"
                disabled={isProcessingPayment || isStreaming || isParsingFile}
                className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-200 text-xs focus:outline-none focus:border-emerald-500"
              />
            </div>
          </div>

          {/* Action Row */}
          <div className="pt-3 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3 w-full sm:w-auto">
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileUpload}
                accept=".pdf,.txt,.md"
                className="hidden"
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={isProcessingPayment || isStreaming || isParsingFile}
                className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700/80 text-slate-700 dark:text-slate-300 text-xs font-semibold flex items-center justify-center gap-2 transition-colors border border-slate-200 dark:border-slate-700 shadow-sm"
              >
                {isParsingFile ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin text-emerald-600" />
                    <span>Extracting PDF...</span>
                  </>
                ) : (
                  <>
                    <FileUp className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                    <span>Upload PDF / Notes (.pdf, .txt, .md)</span>
                  </>
                )}
              </button>
            </div>

            {/* Pay ₹9 & Generate Button */}
            <button
              type="button"
              onClick={handlePayAndGenerate}
              disabled={isProcessingPayment || isStreaming || isParsingFile}
              className="w-full sm:w-auto flex-1 max-w-md py-3.5 px-6 rounded-2xl bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 hover:from-emerald-500 hover:to-teal-500 text-white font-extrabold text-sm sm:text-base flex items-center justify-center gap-2.5 shadow-lg shadow-emerald-600/25 hover:shadow-emerald-600/35 transition-all disabled:opacity-50"
            >
              {isProcessingPayment ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span>Opening UPI Payment (₹9)...</span>
                </>
              ) : isStreaming ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span>Generating Study Guide...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-5 h-5 fill-current" />
                  <span>Pay ₹9 &amp; Generate Study Guide</span>
                  <ArrowRight className="w-4 h-4 ml-1" />
                </>
              )}
            </button>
          </div>

          <div className="pt-2 flex items-center justify-center gap-2 text-[11px] text-slate-500">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
            <span>Instant UPI QR via Razorpay • No account or password needed • 100% Secure</span>
          </div>
        </div>
      </div>

      {/* Generated Output Card (Streams chunk-by-chunk in real time) */}
      {(generatedOutput || isStreaming) && (
        <div ref={outputRef} className="mt-8 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl p-6 sm:p-8 transition-colors">
          {/* Header Action Bar */}
          <div className="flex flex-wrap items-center justify-between gap-4 pb-6 border-b border-slate-200 dark:border-slate-800 no-print">
            <div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
                {isStreaming ? (
                  <>
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping inline-block" />
                    <span>Streaming Live Response...</span>
                  </>
                ) : (
                  <span>✅ Study Guide Ready</span>
                )}
              </span>
              <h3 className="text-lg sm:text-xl font-extrabold text-slate-900 dark:text-white mt-0.5">
                {title || 'Exam Study Guide'}
              </h3>
            </div>

            {/* Quick Actions */}
            <div className="flex items-center gap-2">
              <button
                onClick={handlePrintPDF}
                className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-1.5 shadow-md shadow-emerald-600/20 transition-all"
                title="Print or Save as PDF"
              >
                <Printer className="w-4 h-4" />
                <span>Download as PDF</span>
              </button>

              <button
                onClick={handleCopy}
                className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 transition-colors"
                title="Copy all text"
              >
                {copied ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
              </button>

              <button
                onClick={handleDownloadMarkdown}
                className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 transition-colors"
                title="Download Markdown"
              >
                <Download className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Printable Header (Visible only when user clicks 'Download as PDF' / Print) */}
          <div className="hidden print-only-header">
            <h1 style={{ fontSize: '20pt', fontWeight: 'bold', margin: 0, color: '#15803d' }}>
              NoteCraft AI — Exam Study Guide
            </h1>
            <p style={{ margin: '4px 0 0 0', fontSize: '10pt', color: '#4b5563' }}>
              Topic: <strong>{title}</strong> | Prepared for: <strong>{customerName || 'Student'}</strong> | Date: {new Date().toLocaleDateString()}
            </p>
          </div>

          {/* Formatted Markdown Content with Chunk-by-Chunk typing animation */}
          <div className="markdown-body mt-6 relative">
            <ReactMarkdown>{generatedOutput}</ReactMarkdown>
            {isStreaming && (
              <span className="inline-block w-2 h-4 bg-emerald-500 animate-pulse ml-0.5 align-middle" />
            )}
          </div>

          {/* Finish CTA */}
          {!isStreaming && (
            <div className="mt-8 pt-6 border-t border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4 no-print">
              <div className="text-xs text-slate-500 dark:text-slate-400">
                Tip: Click <strong>&quot;Download as PDF&quot;</strong> and select &quot;Save as PDF&quot; in your print dialog.
              </div>
              <button
                onClick={() => {
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
                className="text-xs font-bold text-emerald-600 dark:text-emerald-400 hover:underline flex items-center gap-1"
              >
                <span>Generate Another Study Guide (₹9)</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
