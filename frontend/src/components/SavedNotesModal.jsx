import React from 'react';
import { X, Calendar, ArrowRight, Trash2, BookOpen, Clock } from 'lucide-react';
import { deleteNote } from '../services/api';

export default function SavedNotesModal({
  isOpen,
  onClose,
  notes = [],
  onSelectNote,
  onNoteDeleted,
}) {
  if (!isOpen) return null;

  const handleDelete = async (e, id) => {
    e.stopPropagation();
    if (!confirm('Are you sure you want to delete this study note?')) return;

    try {
      await deleteNote(id);
      onNoteDeleted?.(id);
    } catch (err) {
      alert(err.message || 'Failed to delete note');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl flex flex-col max-h-[85vh]">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Modal Header */}
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
            <BookOpen className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-xl font-bold text-white">Your Saved Study Notes</h3>
            <p className="text-xs text-slate-400">Access and review all your previously generated study materials</p>
          </div>
        </div>

        {/* Notes list */}
        <div className="flex-1 overflow-y-auto pr-1 space-y-3">
          {notes.length === 0 ? (
            <div className="text-center py-12 text-slate-500">
              <Clock className="w-10 h-10 mx-auto mb-3 opacity-40" />
              <p className="text-sm font-medium text-slate-400">No notes saved yet</p>
              <p className="text-xs mt-1">Generate your first study guide to save it permanently.</p>
            </div>
          ) : (
            notes.map((note) => {
              const formattedDate = new Date(note.createdAt).toLocaleDateString(undefined, {
                year: 'numeric',
                month: 'short',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
              });

              return (
                <div
                  key={note._id}
                  onClick={() => {
                    onSelectNote(note);
                    onClose();
                  }}
                  className="p-4 rounded-2xl bg-slate-950 border border-slate-800 hover:border-emerald-500/50 transition-all cursor-pointer group flex items-start justify-between gap-4"
                >
                  <div className="flex-1 min-w-0">
                    <h4 className="text-sm font-bold text-white group-hover:text-emerald-400 transition-colors truncate">
                      {note.title}
                    </h4>
                    <p className="text-xs text-slate-400 mt-1 line-clamp-2 leading-relaxed">
                      {note.generatedContent?.slice(0, 140)}...
                    </p>
                    <div className="flex items-center gap-1.5 mt-2.5 text-[11px] text-slate-500">
                      <Calendar className="w-3.5 h-3.5" />
                      <span>{formattedDate}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    <button
                      onClick={(e) => handleDelete(e, note._id)}
                      className="p-2 rounded-xl text-slate-500 hover:text-rose-400 hover:bg-slate-800/80 transition-colors"
                      title="Delete note"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                    <div className="p-2 rounded-xl bg-slate-800/60 group-hover:bg-emerald-500 group-hover:text-slate-950 text-slate-400 transition-colors">
                      <ArrowRight className="w-4 h-4" />
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
