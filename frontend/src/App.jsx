import React, { useState, useEffect } from 'react';
import Sidebar from './components/Sidebar';
import GeneratorWorkspace from './components/GeneratorWorkspace';
import ComplianceModal from './components/ComplianceModals';
import { Menu, Zap, BookOpen } from 'lucide-react';
import { getNotesHistory, deleteNoteApi } from './services/api';

const LOCAL_STORAGE_HISTORY_KEY = 'notecraft_study_history';

export default function App() {
  const [theme, setTheme] = useState(() => {
    return localStorage.getItem('notecraft_theme') || 'dark';
  });

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [activeNote, setActiveNote] = useState(null);
  const [complianceType, setComplianceType] = useState(null);

  // History state: combined local + backend notes
  const [history, setHistory] = useState(() => {
    try {
      const saved = localStorage.getItem(LOCAL_STORAGE_HISTORY_KEY);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  // Apply Light / Dark mode
  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    localStorage.setItem('notecraft_theme', theme);
  }, [theme]);

  // Load backend history on mount
  useEffect(() => {
    const loadRemoteHistory = async () => {
      try {
        const data = await getNotesHistory();
        if (data?.notes && data.notes.length > 0) {
          setHistory((prev) => {
            const combined = [...prev];
            data.notes.forEach((remoteNote) => {
              if (!combined.some((n) => n._id === remoteNote._id || n.id === remoteNote._id)) {
                combined.push(remoteNote);
              }
            });
            localStorage.setItem(LOCAL_STORAGE_HISTORY_KEY, JSON.stringify(combined));
            return combined;
          });
        }
      } catch (err) {
        console.warn('Could not fetch cloud history:', err.message);
      }
    };
    loadRemoteHistory();
  }, []);

  const toggleTheme = () => {
    setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'));
  };

  // Add newly generated note to history
  const handleNoteCreated = (newNote) => {
    setHistory((prev) => {
      const updated = [newNote, ...prev.filter((n) => n.id !== newNote.id && n._id !== newNote.id)];
      localStorage.setItem(LOCAL_STORAGE_HISTORY_KEY, JSON.stringify(updated));
      return updated;
    });
  };

  // Select note from sidebar
  const handleSelectNote = (note) => {
    setActiveNote(note);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Start fresh note
  const handleStartNew = () => {
    setActiveNote(null);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Delete note from history
  const handleDeleteNote = async (id) => {
    setHistory((prev) => {
      const updated = prev.filter((n) => n._id !== id && n.id !== id);
      localStorage.setItem(LOCAL_STORAGE_HISTORY_KEY, JSON.stringify(updated));
      return updated;
    });

    if (activeNote?._id === id || activeNote?.id === id) {
      setActiveNote(null);
    }

    try {
      if (!id.startsWith('local_')) {
        await deleteNoteApi(id);
      }
    } catch (err) {
      console.warn('Delete error:', err.message);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex transition-colors duration-200">
      {/* ChatGPT-style History Sidebar */}
      <Sidebar
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        history={history}
        activeNoteId={activeNote?._id || activeNote?.id}
        onSelectNote={handleSelectNote}
        onNewNote={handleStartNew}
        onDeleteNote={handleDeleteNote}
        theme={theme}
        onToggleTheme={toggleTheme}
        onOpenCompliance={(type) => setComplianceType(type)}
      />

      {/* Main App Content Area (Pushed right on desktop by 72 / 18rem) */}
      <div className="flex-1 flex flex-col min-w-0 lg:pl-72 transition-all">
        {/* Top Navbar */}
        <header className="sticky top-0 z-30 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 h-14 px-4 sm:px-6 flex items-center justify-between no-print">
          <div className="flex items-center gap-3">
            {/* Mobile Hamburger Menu */}
            <button
              onClick={() => setSidebarOpen(true)}
              className="p-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 lg:hidden hover:bg-slate-200"
              title="Open History Menu"
            >
              <Menu className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-2">
              <span className="font-extrabold text-sm sm:text-base text-slate-900 dark:text-white">
                NoteCraft AI
              </span>
              <span className="text-[10px] uppercase font-bold px-1.5 py-0.5 rounded bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 border border-emerald-300 dark:border-emerald-500/30">
                Exam Guide
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <div className="hidden sm:flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-300 dark:border-emerald-500/30 text-emerald-800 dark:text-emerald-300 text-xs font-bold">
              <Zap className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 fill-current" />
              <span>₹9 / PDF</span>
            </div>
          </div>
        </header>

        {/* Workspace Canvas */}
        <main className="flex-1 py-4 sm:py-6">
          <GeneratorWorkspace
            activeNote={activeNote}
            onNoteCreated={handleNoteCreated}
            onStartNew={handleStartNew}
          />
        </main>
      </div>

      {/* Compliance Policies Modal */}
      <ComplianceModal
        type={complianceType}
        isOpen={Boolean(complianceType)}
        onClose={() => setComplianceType(null)}
      />
    </div>
  );
}
