import React from 'react';
import { Link } from 'react-router-dom';
import { useNotes } from '../hooks/useNotes';
import { Archive, ChevronLeft, ChevronRight, RotateCcw, Trash2 } from 'lucide-react';
import { cn, formatRelativeTime, truncate } from '../utils';

export function ArchivedNotesPage() {
  const { notes, pagination, isLoading, fetchNotes, setPage, archiveNote, deleteNote } = useNotes({
    is_archived: true,
    sort_by: 'updated_at',
    sort_order: 'desc',
    page: 1,
    page_size: 20,
  });

  return (
    <div className="p-4 lg:p-6 space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-4">
          <Link to="/notes" className="btn-ghost p-2 lg:hidden" aria-label="Back"><ChevronLeft className="w-5 h-5" /></Link>
          <div className="w-12 h-12 rounded-xl bg-secondary-100 dark:bg-secondary-800 flex items-center justify-center"><Archive className="w-7 h-7 text-secondary-500" /></div>
          <div>
            <h1 className="text-2xl font-bold text-secondary-900 dark:text-white">Archived Notes</h1>
            <p className="text-secondary-500 dark:text-secondary-400 mt-1">{pagination.total} archived note{pagination.total !== 1 ? 's' : ''}</p>
          </div>
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3, 4, 5].map(i => (
            <div key={i} className="card p-4 animate-pulse">
              <div className="h-4 bg-secondary-200 dark:bg-secondary-700 rounded w-3/4 mb-2" />
              <div className="h-4 bg-secondary-200 dark:bg-secondary-700 rounded w-1/2" />
            </div>
          ))}
        </div>
      ) : notes.length > 0 ? (
        <div className="space-y-2">
          {notes.map(note => (
            <div key={note.id} className="card p-4 hover:shadow-md transition-shadow flex items-start gap-3 opacity-70">
              <div className={cn('w-12 h-12 rounded-lg flex items-center justify-center flex-shrink-0', note.note_type === 'flowchart' ? 'bg-purple-100 dark:bg-purple-900/30' : 'bg-primary-100 dark:bg-primary-900/30')}>
                {note.note_type === 'flowchart' ? (
                  <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>
                ) : (
                  <svg className="w-6 h-6 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-medium text-secondary-900 dark:text-white truncate">{note.title || 'Untitled'}</h3>
                <p className="text-sm text-secondary-500 dark:text-secondary-400 truncate mt-1">{truncate(note.content?.replace(/[#*`\[\]()]/g, '') || '', 150)}</p>
                <div className="flex flex-wrap items-center gap-2 mt-2 text-xs text-secondary-400">
                  {note.folder && <span className="flex items-center gap-1"><svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" /></svg>{note.folder.name}</span>}
                  {note.tags.map(tag => <span key={tag.id} className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: tag.color }} />{tag.name}</span>)}
                  <span>{formatRelativeTime(note.updated_at)}</span>
                </div>
              </div>
              <div className="flex items-center gap-1">
                <button onClick={() => archiveNote(note.id)} className="btn-secondary text-sm flex items-center gap-1" aria-label="Unarchive"><RotateCcw className="w-3.5 h-3.5" /> Restore</button>
                <button onClick={() => { if (confirm('Delete permanently?')) deleteNote(note.id); }} className="btn-danger text-sm flex items-center gap-1" aria-label="Delete"><Trash2 className="w-3.5 h-3.5" /> Delete</button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="card p-12 text-center">
          <Archive className="w-16 h-16 text-secondary-300 dark:text-secondary-600 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-secondary-900 dark:text-white mb-2">No archived notes</h2>
          <p className="text-secondary-500 dark:text-secondary-400">Archived notes will appear here</p>
        </div>
      )}

      {pagination.total_pages > 1 && (
        <div className="flex items-center justify-center gap-2 mt-6">
          <button disabled={pagination.page === 1 || isLoading} onClick={() => setPage(pagination.page - 1)} className="btn-secondary"><ChevronLeft className="w-4 h-4" /> Previous</button>
          <span className="px-4 text-sm text-secondary-600 dark:text-secondary-400">Page {pagination.page} of {pagination.total_pages}</span>
          <button disabled={pagination.page === pagination.total_pages || isLoading} onClick={() => setPage(pagination.page + 1)} className="btn-secondary">Next <ChevronRight className="w-4 h-4" /></button>
        </div>
      )}
    </div>
  );
}