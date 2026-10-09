import React, { useState, useEffect } from 'react';
import { useParams, Link, useSearchParams } from 'react-router-dom';
import { useNotes, useTags, useTag } from '../hooks/useNotes';
import { Tag, Plus, ChevronLeft, ChevronRight, Filter, X } from 'lucide-react';
import { cn, formatRelativeTime, truncate } from '../utils';
import type { Note, SearchParams } from '../types';
import { useNavigate } from 'react-router-dom';

export function TagNotesPage() {
  const { id } = useParams<{ id: string }>();
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const { tagsWithCounts, tags, isLoading: tagsLoading } = useTags();
  const { tag: fetchedTag, isLoading: singleTagLoading } = useTag(id);
  const { notes, pagination, isLoading, params, fetchNotes, setSearchParams: setNotesSearchParams, setPage } = useNotes({
    tag_ids: id ? [id] : [],
    sort_by: 'updated_at',
    sort_order: 'desc',
    page: 1,
    page_size: 20,
  });

  const tag = fetchedTag || tagsWithCounts.find(t => t.id.toLowerCase() === id?.toLowerCase()) || tags.find(t => t.id.toLowerCase() === id?.toLowerCase());
  const [showFilters, setShowFilters] = useState(false);
  const [filterType, setFilterType] = useState('');

  useEffect(() => {
    setNotesSearchParams({
      tag_ids: id ? [id] : [],
      note_type: filterType || undefined,
    });
  }, [id, filterType]);

  const isDataLoading = tagsLoading || singleTagLoading;

  if (!tag) {
    if (isDataLoading) {
      return (
        <div className="p-4 lg:p-6 space-y-4">
          <div className="h-8 bg-secondary-200 dark:bg-secondary-700 rounded w-1/3 animate-pulse" />
          <div className="space-y-3">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="card p-4 animate-pulse">
                <div className="h-4 bg-secondary-200 dark:bg-secondary-700 rounded w-3/4 mb-2" />
                <div className="h-4 bg-secondary-200 dark:bg-secondary-700 rounded w-1/2" />
              </div>
            ))}
          </div>
        </div>
      );
    }
    return (
      <div className="p-4 lg:p-6 text-center">
        <Tag className="w-16 h-16 text-secondary-300 dark:text-secondary-600 mx-auto mb-4" />
        <h2 className="text-xl font-semibold text-secondary-900 dark:text-white mb-2">Tag not found</h2>
        <Link to="/notes" className="btn-primary inline-flex items-center gap-2">
          <ChevronLeft className="w-4 h-4" />
          Back to notes
        </Link>
      </div>
    );
  }

  const noteCount = (tag as any).note_count !== undefined ? (tag as any).note_count : pagination.total;

  return (
    <div className="p-4 lg:p-6 space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-4">
          <Link to="/tags" className="btn-ghost p-2 lg:hidden" aria-label="Back">
            <ChevronLeft className="w-5 h-5" />
          </Link>
          <span className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: tag.color + '20' }}>
            <span className="w-5 h-5 rounded-full" style={{ backgroundColor: tag.color }} />
          </span>
          <div>
            <h1 className="text-2xl font-bold text-secondary-900 dark:text-white">{tag.name}</h1>
            <p className="text-secondary-500 dark:text-secondary-400 mt-1">
              {noteCount} note{noteCount !== 1 ? 's' : ''} tagged
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
              <label className="label">Search</label>
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
            <button onClick={() => setFilterType('')} className="btn-ghost self-end">Clear</button>
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
                  {note.folder && (
                    <Link to={`/folders/${note.folder.id}`} className="flex items-center gap-1 hover:underline text-secondary-500">
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" /></svg>
                      {note.folder.name}
                    </Link>
                  )}
                  <span>{formatRelativeTime(note.updated_at)}</span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      ) : (
        <div className="card p-12 text-center">
          <span className="w-16 h-16 rounded-xl flex items-center justify-center mx-auto mb-4" style={{ backgroundColor: tag.color + '20' }}>
            <span className="w-8 h-8 rounded-full" style={{ backgroundColor: tag.color }} />
          </span>
          <h2 className="text-xl font-semibold text-secondary-900 dark:text-white mb-2">No notes with this tag</h2>
          <p className="text-secondary-500 dark:text-secondary-400 mb-6">Start tagging notes to see them here</p>
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