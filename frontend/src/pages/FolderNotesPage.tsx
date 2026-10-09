import React from 'react';
import { useParams, Link, useSearchParams } from 'react-router-dom';
import { useNotes, useFolders } from '../hooks/useNotes';
import { Folder, Plus, ChevronLeft, ChevronRight, Filter, X } from 'lucide-react';
import { cn, formatRelativeTime, truncate } from '../utils';
import type { Note, SearchParams } from '../types';
import toast from 'react-hot-toast';

export function FolderNotesPage() {
  const { id } = useParams<{ id: string }>();
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const { folder, isLoading: folderLoading } = useFolder(id);
  const { folders } = useFolders();
  const { notes, pagination, isLoading, params, fetchNotes, setSearchParams: setNotesSearchParams, setPage } = useNotes({
    folder_id: id,
    sort_by: 'updated_at',
    sort_order: 'desc',
    page: 1,
    page_size: 20,
  });

  const [showFilters, setShowFilters] = useState(false);
  const [filterTagIds, setFilterTagIds] = useState<string[]>([]);
  const [filterType, setFilterType] = useState('');

  useEffect(() => {
    const newParams: SearchParams = {
      ...params,
      folder_id: id,
      tag_ids: filterTagIds.length > 0 ? filterTagIds : undefined,
      note_type: filterType || undefined,
    };
    setNotesSearchParams(newParams);
  }, [filterTagIds, filterType]);

  if (folderLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="w-8 h-8 border-4 border-primary-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!folder) {
    return (
      <div className="p-4 lg:p-6 text-center">
        <Folder className="w-16 h-16 text-secondary-300 dark:text-secondary-600 mx-auto mb-4" />
        <h2 className="text-xl font-semibold text-secondary-900 dark:text-white mb-2">Folder not found</h2>
        <Link to="/notes" className="btn-primary inline-flex items-center gap-2">
          <ChevronLeft className="w-4 h-4" />
          Back to notes
        </Link>
      </div>
    );
  }

  return (
    <div className="p-4 lg:p-6 space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-4">
          <Link to="/notes" className="btn-ghost p-2 lg:hidden" aria-label="Back">
            <ChevronLeft className="w-5 h-5" />
          </Link>
          <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ backgroundColor: folder.color + '20' }}>
            <Folder className="w-7 h-7" style={{ color: folder.color }} />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-secondary-900 dark:text-white">{folder.name}</h1>
            <p className="text-secondary-500 dark:text-secondary-400 mt-1">
              {pagination.total} note{pagination.total !== 1 ? 's' : ''}
              {folder.description && ` · ${folder.description}`}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setShowFilters(!showFilters)} className="btn-secondary flex items-center gap-2">
            <Filter className="w-4 h-4" />
            Filters
          </button>
          <Link to="/notes/new" className="btn-primary flex items-center gap-2">
            <Plus className="w-4 h-4" />
            New Note
          </Link>
        </div>
      </div>

      {showFilters && (
        <div className="card p-4 animate-slide-in">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <label className="label">Search in folder</label>
              <input type="search" className="input" placeholder="Search..." />
            </div>
            <div className="flex-1">
              <label className="label">Type</label>
              <select value={filterType} onChange={e => setFilterType(e.target.value)} className="input">
                <option value="">All Types</option>
                <option value="markdown">Markdown</option>
                <option value="flowchart">Flowchart</option>
                <option value="diagram">Diagram</option>
                <option value="code">Code</option>
              </select>
            </div>
            <button onClick={() => { setFilterTagIds([]); setFilterType(''); }} className="btn-ghost self-end">Clear</button>
          </div>
        </div>
      )}

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
            <Link key={note.id} to={`/notes/${note.id}`} className="card p-4 hover:shadow-md transition-shadow flex items-start gap-3">
              <div className={cn('w-12 h-12 rounded-lg flex items-center justify-center flex-shrink-0', note.note_type === 'flowchart' ? 'bg-purple-100 dark:bg-purple-900/30' : 'bg-primary-100 dark:bg-primary-900/30')}>
                {note.note_type === 'flowchart' ? (
                  <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>
                ) : (
                  <svg className="w-6 h-6 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-medium text-secondary-900 dark:text-white truncate group-hover:text-primary-600 transition-colors">{note.title || 'Untitled'}</h3>
                <p className="text-sm text-secondary-500 dark:text-secondary-400 truncate mt-1">{truncate(note.content?.replace(/[#*`\[\]()]/g, '') || '', 150)}</p>
                <div className="flex flex-wrap items-center gap-2 mt-2 text-xs text-secondary-400">
                  {note.tags.map(tag => (
                    <span key={tag.id} className="flex items-center gap-1" style={{ color: tag.color }}>
                      <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: tag.color }} />
                      {tag.name}
                    </span>
                  ))}
                  <span>{formatRelativeTime(note.updated_at)}</span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      ) : (
        <div className="card p-12 text-center">
          <Folder className="w-16 h-16 text-secondary-300 dark:text-secondary-600 mx-auto mb-4" style={{ color: folder.color }} />
          <h2 className="text-xl font-semibold text-secondary-900 dark:text-white mb-2">No notes in this folder</h2>
          <p className="text-secondary-500 dark:text-secondary-400 mb-6">Get started by creating your first note</p>
          <Link to="/notes/new" className="btn-primary inline-flex items-center gap-2"><Plus className="w-4 h-4" /> Create note</Link>
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

function useFolder(id: string | undefined) {
  const { folders } = useFolders();
  const folder = folders.find(f => f.id === id);
  return { folder, isLoading: false };
}

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';