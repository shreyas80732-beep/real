import React from 'react';
import {
  Plus,
  MessageSquare,
  Trash2,
  BookOpen,
  Sun,
  Moon,
  Zap,
  X,
  Clock,
  ShieldCheck,
} from 'lucide-react';

export default function Sidebar({
  isOpen,
  onClose,
  history,
  activeNoteId,
  onSelectNote,
  onNewNote,
  onDeleteNote,
  theme,
  onToggleTheme,
  onOpenCompliance,
}) {
  return (
    <>
      {/* Mobile Backdrop Overlay */}
      {isOpen && (
        <div
          onClick={onClose}
          className="fixed inset-0 z-40 bg-slate-950/60 backdrop-blur-sm lg:hidden transition-opacity"
        />
      )}

      {/* Sidebar Container */}
      <aside
        className={`fixed top-0 left-0 bottom-0 z-50 w-72 bg-slate-900 dark:bg-slate-950 text-slate-200 border-r border-slate-800 flex flex-col transition-transform duration-300 ease-in-out lg:translate-x-0 ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Sidebar Header */}
        <div className="p-4 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-500 flex items-center justify-center text-white shadow-md">
              <BookOpen className="w-4 h-4 stroke-[2.5]" />
            </div>
            <div>
              <span className="font-extrabold text-sm tracking-tight text-white">NoteCraft AI</span>
              <span className="text-[10px] block text-emerald-400 font-semibold">₹9 / Study Guide</span>
            </div>
          </div>

          {/* Close button on mobile */}
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 lg:hidden"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* + New Study Guide Button */}
        <div className="p-3">
          <button
            onClick={() => {
              onNewNote();
              if (window.innerWidth < 1024) onClose();
            }}
            className="w-full py-2.5 px-3.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center justify-center gap-2 shadow-md shadow-emerald-600/20 transition-all group"
          >
            <Plus className="w-4 h-4 transition-transform group-hover:rotate-90" />
            <span>New Study Guide</span>
          </button>
        </div>

        {/* Recent Study Guides (ChatGPT style history list) */}
        <div className="flex-1 overflow-y-auto px-3 py-2 space-y-1">
          <div className="px-2 py-1 text-[11px] font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
            <Clock className="w-3 h-3" />
            <span>Recent Study Guides</span>
          </div>

          {history.length === 0 ? (
            <div className="text-center py-10 px-4 text-slate-500 text-xs">
              <MessageSquare className="w-8 h-8 mx-auto mb-2 opacity-30" />
              <p>No previous guides yet.</p>
              <p className="text-[11px] mt-1 text-slate-600">Upload a PDF or PPT to generate your first revision guide!</p>
            </div>
          ) : (
            history.map((item) => {
              const isActive = activeNoteId === item._id || activeNoteId === item.id;
              const formattedDate = new Date(item.createdAt).toLocaleDateString(undefined, {
                month: 'short',
                day: 'numeric',
              });

              return (
                <div
                  key={item._id || item.id}
                  onClick={() => {
                    onSelectNote(item);
                    if (window.innerWidth < 1024) onClose();
                  }}
                  className={`group relative flex items-center justify-between gap-2 px-3 py-2 rounded-xl text-xs cursor-pointer transition-all ${
                    isActive
                      ? 'bg-slate-800 text-emerald-400 font-semibold shadow-sm'
                      : 'text-slate-300 hover:bg-slate-800/60 hover:text-white'
                  }`}
                >
                  <div className="flex items-center gap-2 min-w-0 flex-1">
                    <MessageSquare className={`w-3.5 h-3.5 flex-shrink-0 ${isActive ? 'text-emerald-400' : 'text-slate-500'}`} />
                    <span className="truncate">{item.title || 'Untitled Study Guide'}</span>
                  </div>

                  <div className="flex items-center gap-1 flex-shrink-0">
                    <span className="text-[10px] text-slate-500 group-hover:hidden">{formattedDate}</span>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onDeleteNote(item._id || item.id);
                      }}
                      className="hidden group-hover:block p-1 text-slate-400 hover:text-rose-400 rounded transition-colors"
                      title="Delete note"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Sidebar Footer Controls */}
        <div className="p-3 border-t border-slate-800 space-y-2 bg-slate-900/60">
          {/* Theme Switcher */}
          <button
            onClick={onToggleTheme}
            className="w-full py-2 px-3 rounded-xl bg-slate-800/80 hover:bg-slate-800 text-slate-300 hover:text-white text-xs font-medium flex items-center justify-between transition-colors"
          >
            <span className="flex items-center gap-2">
              {theme === 'dark' ? <Moon className="w-3.5 h-3.5 text-emerald-400" /> : <Sun className="w-3.5 h-3.5 text-amber-400" />}
              <span>{theme === 'dark' ? 'Dark Mode' : 'Light Mode'}</span>
            </span>
            <span className="text-[10px] text-slate-500 uppercase font-semibold">Toggle</span>
          </button>

          {/* Compliance Links */}
          <div className="flex flex-wrap items-center justify-between text-[11px] text-slate-500 px-1 pt-1">
            <button onClick={() => onOpenCompliance('terms')} className="hover:text-slate-300">Terms</button>
            <button onClick={() => onOpenCompliance('privacy')} className="hover:text-slate-300">Privacy</button>
            <button onClick={() => onOpenCompliance('refund')} className="hover:text-slate-300">Refund</button>
            <button onClick={() => onOpenCompliance('contact')} className="hover:text-slate-300">Contact</button>
          </div>
        </div>
      </aside>
    </>
  );
}
