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
  FileSpreadsheet,
  CheckCircle2,
  Plus,
} from 'lucide-react';
import {
  createPaymentOrder,
  verifyPayment,
  streamNoteGeneration,
  parseDocumentFile,
} from '../services/api';
import { launchRazorpayPayment } from '../services/razorpay';

export default function GeneratorWorkspace({
  activeNote,
  onNoteCreated,
  onStartNew,
}) {
  const [title, setTitle] = useState('');
  const [uploadedText, setUploadedText] = useState('');
  const [fileName, setFileName] = useState('');
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

  // Typewriter streaming queue
  const streamQueueRef = useRef('');
  const streamTimerRef = useRef(null);

  // If viewing a previous note from history
  useEffect(() => {
    if (activeNote) {
      setTitle(activeNote.title || '');
      setGeneratedOutput(activeNote.generatedContent || '');
      setUploadedText(activeNote.rawInputText || '');
      setErrorMsg('');
      setParseStatus('');
    } else {
      // New note mode
      setTitle('');
      setGeneratedOutput('');
      setUploadedText('');
      setFileName('');
      setErrorMsg('');
      setParseStatus('');
    }
  }, [activeNote]);

  // Auto-scroll output while streaming
  useEffect(() => {
    if (isStreaming && outputRef.current) {
      outputRef.current.scrollTop = outputRef.current.scrollHeight;
    }
  }, [generatedOutput, isStreaming]);

  // Clean up timer
  useEffect(() => {
    return () => {
      if (streamTimerRef.current) clearInterval(streamTimerRef.current);
    };
  }, []);

  // Smooth chunk-by-chunk streaming display
  const startChunkStreamer = () => {
    streamQueueRef.current = '';
    setGeneratedOutput('');

    if (streamTimerRef.current) clearInterval(streamTimerRef.current);

    streamTimerRef.current = setInterval(() => {
      if (streamQueueRef.current.length > 0) {
        const step = Math.max(2, Math.min(10, Math.ceil(streamQueueRef.current.length / 6)));
        const slice = streamQueueRef.current.slice(0, step);
        streamQueueRef.current = streamQueueRef.current.slice(step);
        setGeneratedOutput((prev) => prev + slice);
      }
    }, 18);
  };

  const pushChunk = (chunk) => {
    streamQueueRef.current += chunk;
  };

  const finishChunkStreamer = (finalFullText, finalTitle) => {
    const flushInterval = setInterval(() => {
      if (streamQueueRef.current.length > 0) {
        const slice = streamQueueRef.current.slice(0, 16);
        streamQueueRef.current = streamQueueRef.current.slice(16);
        setGeneratedOutput((prev) => prev + slice);
      } else {
        clearInterval(flushInterval);
        if (streamTimerRef.current) clearInterval(streamTimerRef.current);

        // Notify history parent
        if (onNoteCreated && finalFullText) {
          onNoteCreated({
            id: 'local_' + Date.now(),
            title: finalTitle || title || 'Study Guide',
            generatedContent: finalFullText,
            createdAt: new Date().toISOString(),
          });
        }
      }
    }, 10);
  };

  // Sample notes loader
  const handleLoadSample = () => {
    setTitle('Computer Science: Operating Systems & Process Scheduling');
    setUploadedText(`Operating Systems Process Scheduling & Synchronization:
1. CPU Scheduling:
- First-Come First-Served (FCFS): Non-preemptive, suffers from Convoy Effect.
- Shortest Job First (SJF): Optimal average waiting time. Preemptive version is SRTF (Shortest Remaining Time First).
- Round Robin (RR): Preemptive, uses fixed time quantum. Prevents starvation and ensures fairness for interactive systems.
- Priority Scheduling: May lead to starvation (solved using Aging technique).

2. Process Synchronization & Critical Section:
A critical section is a code segment where shared resources are accessed.
Requirements for valid solution:
- Mutual Exclusion: Only one process can execute in critical section at any time.
- Progress: Selection of next process cannot be postponed indefinitely.
- Bounded Waiting: Bound exists on the number of times other processes enter critical section before a request is granted.`);
    setFileName('Sample_Operating_Systems.txt');
    setErrorMsg('');
  };

  // Upload PDF, PPT, PPTX, or Notes
  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    e.target.value = '';
    const ext = file.name.split('.').pop()?.toLowerCase();

    setIsParsingFile(true);
    setParseStatus(`Reading ${file.name}...`);
    setFileName(file.name);
    setErrorMsg('');

    try {
      if (ext === 'pdf' || ext === 'pptx' || ext === 'ppt') {
        setParseStatus(`Extracting slides and text from ${file.name}...`);
        const result = await parseDocumentFile(file);

        if (!result.text || result.text.trim().length === 0) {
          throw new Error('No readable text found in document. If scanned image, please paste text directly.');
        }

        setUploadedText(result.text);
        if (result.title && !title) {
          setTitle(result.title);
        }
        setParseStatus(`Extracted ${result.pages || 1} pages/slides from ${file.name}!`);
        setTimeout(() => setParseStatus(''), 4000);
      } else {
        const reader = new FileReader();
        reader.onload = (event) => {
          const content = event.target?.result;
          if (typeof content === 'string') {
            setUploadedText(content);
            const autoTitle = file.name.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' ');
            if (!title) setTitle(autoTitle.charAt(0).toUpperCase() + autoTitle.slice(1));
            setParseStatus(`Loaded ${file.name} successfully!`);
            setTimeout(() => setParseStatus(''), 3000);
          }
        };
        reader.readAsText(file);
      }
    } catch (err) {
      setErrorMsg(err.message || 'Failed to read document file.');
    } finally {
      setIsParsingFile(false);
    }
  };

  // Pay ₹9 and Stream Generation
  const handlePayAndGenerate = async () => {
    setErrorMsg('');

    if (!uploadedText.trim() || uploadedText.trim().length < 20) {
      setErrorMsg('Please upload a PDF / PPT or paste study notes with at least a couple of sentences.');
      return;
    }

    const finalTitle = title.trim() || fileName.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' ') || 'Study Guide';
    setTitle(finalTitle);

    setIsProcessingPayment(true);

    try {
      const orderData = await createPaymentOrder({
        name: customerName || 'Student',
        email: customerEmail || 'student@notes.in',
        title: finalTitle,
      });

      await launchRazorpayPayment({
        orderData,
        customerName: customerName || 'Student',
        customerEmail: customerEmail || 'student@notes.in',
        onSuccess: async (razorpayResponse) => {
          try {
            const verifyResult = await verifyPayment(razorpayResponse);

            setIsProcessingPayment(false);
            setIsStreaming(true);

            startChunkStreamer();

            let fullAccumulatedText = '';

            setTimeout(() => {
              outputRef.current?.scrollIntoView({ behavior: 'smooth' });
            }, 300);

            await streamNoteGeneration({
              title: finalTitle,
              uploadedText: uploadedText.trim(),
              orderId: verifyResult.orderId,
              generationToken: verifyResult.generationToken,
              onChunk: (chunk) => {
                fullAccumulatedText += chunk;
                pushChunk(chunk);
              },
              onError: (streamErr) => {
                setErrorMsg(streamErr.message || 'Error occurred during generation.');
                setIsStreaming(false);
                finishChunkStreamer(fullAccumulatedText, finalTitle);
              },
              onDone: () => {
                setIsStreaming(false);
                finishChunkStreamer(fullAccumulatedText, finalTitle);
              },
            });
          } catch (err) {
            setErrorMsg(err.message || 'Payment verification failed.');
            setIsProcessingPayment(false);
          }
        },
        onFailure: (err) => {
          setIsProcessingPayment(false);
          if (err && err.message !== 'Payment window closed.') {
            setErrorMsg(err.description || err.message || 'Payment cancelled.');
          }
        },
      });
    } catch (err) {
      setErrorMsg(err.message || 'Failed to connect to payment gateway.');
      setIsProcessingPayment(false);
    }
  };

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
    link.download = `${(title || 'study-guide').toLowerCase().replace(/\s+/g, '-')}.md`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handlePrintPDF = () => {
    window.print();
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6 space-y-6">
      {/* Error Banner */}
      {errorMsg && (
        <div className="p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-900/60 text-rose-700 dark:text-rose-300 text-xs sm:text-sm flex items-center justify-between shadow-sm">
          <div className="flex items-center gap-2.5">
            <AlertCircle className="w-5 h-5 flex-shrink-0 text-rose-500" />
            <span>{errorMsg}</span>
          </div>
          <button onClick={() => setErrorMsg('')} className="underline text-xs hover:text-rose-900 dark:hover:text-white">
            Dismiss
          </button>
        </div>
      )}

      {/* Parsing Status Notification */}
      {parseStatus && (
        <div className="p-3 rounded-2xl bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-300 dark:border-emerald-600/40 text-emerald-800 dark:text-emerald-300 text-xs flex items-center gap-2 shadow-sm">
          {isParsingFile ? <Loader2 className="w-4 h-4 animate-spin text-emerald-600" /> : <Check className="w-4 h-4 text-emerald-600" />}
          <span>{parseStatus}</span>
        </div>
      )}

      {/* Input / Upload Card (Shown when not viewing a past finished note or when editing) */}
      {(!activeNote || isStreaming) && (
        <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xl overflow-hidden transition-colors input-section">
          {/* Header */}
          <div className="p-5 border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <FileText className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                <span>Upload PDF, PPT, or Notes</span>
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Instant Theory Breakdown + 2, 3 &amp; 6-Mark Q&amp;As (₹9 / Guide)
              </p>
            </div>

            <button
              type="button"
              onClick={handleLoadSample}
              disabled={isProcessingPayment || isStreaming || isParsingFile}
              className="text-xs font-semibold px-3 py-1.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/30 hover:bg-emerald-100 transition-colors"
            >
              Try Sample
            </button>
          </div>

          <div className="p-5 sm:p-6 space-y-4">
            {/* Big Drag & Drop File Box */}
            <div
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-slate-300 dark:border-slate-700 hover:border-emerald-500 dark:hover:border-emerald-500 rounded-2xl p-6 text-center cursor-pointer bg-slate-50/60 dark:bg-slate-950/60 hover:bg-emerald-50/30 dark:hover:bg-emerald-950/20 transition-all group"
            >
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileUpload}
                accept=".pdf,.ppt,.pptx,.txt,.md"
                className="hidden"
              />

              <div className="w-12 h-12 mx-auto rounded-2xl bg-emerald-100 dark:bg-emerald-950/60 flex items-center justify-center text-emerald-600 dark:text-emerald-400 mb-3 group-hover:scale-110 transition-transform">
                {isParsingFile ? <Loader2 className="w-6 h-6 animate-spin" /> : <FileUp className="w-6 h-6" />}
              </div>

              <h4 className="text-sm font-bold text-slate-800 dark:text-slate-200">
                {fileName ? (
                  <span className="text-emerald-600 dark:text-emerald-400 flex items-center justify-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4" /> {fileName}
                  </span>
                ) : (
                  'Click to upload PDF, PPT slides, or Notes'
                )}
              </h4>
              <p className="text-xs text-slate-500 mt-1">
                Supports <strong className="text-slate-700 dark:text-slate-300">.PDF, .PPT, .PPTX, .TXT</strong>
              </p>
            </div>

            {/* Optional Topic Title */}
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Subject or Chapter Title <span className="text-slate-400 font-normal">(Auto-detected from file)</span>
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Operating Systems: CPU Scheduling & Deadlocks"
                disabled={isProcessingPayment || isStreaming || isParsingFile}
                className="w-full px-4 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white text-sm focus:outline-none focus:border-emerald-500"
              />
            </div>

            {/* Quick Textarea for editing / pasting directly */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                  Notes Content / Extracted Slides
                </label>
                <span className="text-[11px] text-slate-400 font-mono">
                  {uploadedText.length} chars
                </span>
              </div>
              <textarea
                rows={6}
                value={uploadedText}
                onChange={(e) => setUploadedText(e.target.value)}
                placeholder="Or paste class notes, lecture slides, syllabus topics here..."
                disabled={isProcessingPayment || isStreaming || isParsingFile}
                className="w-full px-4 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-200 text-xs sm:text-sm font-mono leading-relaxed focus:outline-none focus:border-emerald-500"
              />
            </div>

            {/* Generate Button */}
            <div className="pt-2">
              <button
                type="button"
                onClick={handlePayAndGenerate}
                disabled={isProcessingPayment || isStreaming || isParsingFile}
                className="w-full py-3.5 px-6 rounded-2xl bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 hover:from-emerald-500 hover:to-teal-500 text-white font-extrabold text-sm sm:text-base flex items-center justify-center gap-2.5 shadow-lg shadow-emerald-600/25 hover:shadow-emerald-600/35 transition-all disabled:opacity-50"
              >
                {isProcessingPayment ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    <span>Opening UPI Checkout (₹9)...</span>
                  </>
                ) : isStreaming ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    <span>Streaming Study Guide...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-5 h-5 fill-current" />
                    <span>Pay ₹9 &amp; Generate Study Guide</span>
                    <ArrowRight className="w-4 h-4 ml-1" />
                  </>
                )}
              </button>
              <div className="mt-2 text-center text-[11px] text-slate-500">
                Instant UPI Access via Razorpay • No passwords required • Saves to sidebar history
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Generated Study Guide Output Card */}
      {(generatedOutput || isStreaming || activeNote) && (
        <div
          ref={outputRef}
          className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl p-6 sm:p-8 transition-colors"
        >
          {/* Action Header */}
          <div className="flex flex-wrap items-center justify-between gap-4 pb-5 border-b border-slate-200 dark:border-slate-800 no-print">
            <div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
                {isStreaming ? (
                  <>
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping inline-block" />
                    <span>Streaming Live Response...</span>
                  </>
                ) : (
                  <span>✅ Revision Study Guide</span>
                )}
              </span>
              <h3 className="text-lg sm:text-xl font-extrabold text-slate-900 dark:text-white mt-0.5">
                {title || 'Exam Study Guide'}
              </h3>
            </div>

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
                title="Copy text"
              >
                {copied ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
              </button>

              <button
                onClick={handleDownloadMarkdown}
                className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 transition-colors"
                title="Download .md"
              >
                <Download className="w-4 h-4" />
              </button>

              {activeNote && (
                <button
                  onClick={onStartNew}
                  className="px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-emerald-600 dark:text-emerald-400 text-xs font-bold flex items-center gap-1 transition-colors"
                  title="New Guide"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>New</span>
                </button>
              )}
            </div>
          </div>

          {/* Printable Header for PDF Print */}
          <div className="hidden print-only-header">
            <h1 style={{ fontSize: '20pt', fontWeight: 'bold', margin: 0, color: '#15803d' }}>
              NoteCraft AI — Exam Study Guide
            </h1>
            <p style={{ margin: '4px 0 0 0', fontSize: '10pt', color: '#4b5563' }}>
              Topic: <strong>{title || 'Study Guide'}</strong> | Date: {new Date().toLocaleDateString()}
            </p>
          </div>

          {/* Markdown Content with typewriter cursor indicator */}
          <div className="markdown-body mt-6 relative">
            <ReactMarkdown>{generatedOutput}</ReactMarkdown>
            {isStreaming && (
              <span className="inline-block w-2 h-4 bg-emerald-500 animate-pulse ml-0.5 align-middle" />
            )}
          </div>
        </div>
      )}
    </div>
  );
}
