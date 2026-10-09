import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Search, X, Filter, Tag, Folder, Clock, Star, Archive, ChevronDown, Loader2 } from 'lucide-react';
import { useSearch } from '../hooks/useNotes';
import { useFolders } from '../hooks/useNotes';
import { useTags } from '../hooks/useNotes';
import { cn, formatRelativeTime } from '../utils';
import type { Note } from '../types';

export function SearchModal() {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [selectedNote, setSelectedNote] = useState<Note | null>(null);
  const [filters, setFilters] = useState({
    folder_id: '',
    tag_ids: [] as string[],
    note_type: '',
    is_pinned: false,
    is_archived: false,
    is_favorite: false,
    sort_by: 'updated_at',
    sort_order: 'desc' as 'asc' | 'desc',
  });
  const [showFilters, setShowFilters] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const { results, suggestions, isLoading, searchNotes, getSuggestions } = useSearch();
  const { flatFolders } = useFolders();
  const { tagsWithCounts } = useTags();

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setIsOpen(true);
      }
      if (e.key === 'Escape') {
        setIsOpen(false);
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  useEffect(() => {
    if (isOpen) {
      inputRef.current?.focus();
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [isOpen]);

  useEffect(() => {
    if (query.length >= 2) {
      getSuggestions(query);
    } else {
      searchNotes({ ...filters, query, page: 1, page_size: 10 });
    }
  }, [query, filters]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    searchNotes({ ...filters, query, page: 1, page_size: 20 });
  };

  const clearSearch = () => {
    setQuery('');
    setSelectedNote(null);
  };

  const handleNoteClick = (note: Note) => {
    setSelectedNote(note);
    setIsOpen(false);
    setQuery('');
  };

  if (!isOpen) return null;

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-16 px-4">
      <div
        className="absolute inset-0 bg-black/50 animate-fade-in"
        onClick={() => setIsOpen(false)}
        aria-hidden="true"
      />
      <div className="relative w-full max-w-3xl bg-white dark:bg-secondary-900 rounded-xl shadow-xl border border-secondary-200 dark:border-secondary-700 animate-scale-in overflow-hidden max-h-[70vh] flex flex-col">
        <form onSubmit={handleSearch} className="flex items-center gap-2 p-4 border-b border-secondary-200 dark:border-secondary-700">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-secondary-400" aria-hidden="true" />
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Search notes... (⌘K)"
              className="input pl-10 pr-10 py-2 text-base"
              autoFocus
              aria-label="Search notes"
            />
            {query && (
              <button
                type="button"
                onClick={clearSearch}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded hover:bg-secondary-100 dark:hover:bg-secondary-800 transition-colors"
                aria-label="Clear search"
              >
                <X className="w-4 h-4 text-secondary-500" />
              </button>
            )}
          </div>
          <button
            type="button"
            onClick={() => setShowFilters(!showFilters)}
            className={cn(
              'btn-secondary p-2',
              showFilters && 'bg-primary-100 text-primary-700 dark:bg-primary-900/30 dark:text-primary-300'
            )}
            aria-label="Toggle filters"
            aria-expanded={showFilters}
          >
            <Filter className="w-5 h-5" />
          </button>
          <button
            type="button"
            onClick={() => setIsOpen(false)}
            className="btn-ghost p-2"
            aria-label="Close search"
          >
            <X className="w-5 h-5" />
          </button>
        </form>

        {showFilters && (
          <div className="p-4 border-b border-secondary-200 dark:border-secondary-700 bg-secondary-50 dark:bg-secondary-800/50 animate-slide-in">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <div>
                <label className="label">Folder</label>
                <select
                  value={filters.folder_id}
                  onChange={e => setFilters(prev => ({ ...prev, folder_id: e.target.value }))}
                  className="input text-sm"
                >
                  <option value="">All Folders</option>
                  {flatFolders.map(folder => (
                    <option key={folder.id} value={folder.id}>{folder.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="label">Tags</label>
                <select
                  multiple
                  value={filters.tag_ids}
                  onChange={e => {
                    const selected = Array.from(e.target.selectedOptions).map(opt => opt.value);
                    setFilters(prev => ({ ...prev, tag_ids: selected }));
                  }}
                  className="input text-sm min-h-[40px]"
                >
                  {tagsWithCounts.map(tag => (
                    <option key={tag.id} value={tag.id}>{tag.name} ({tag.note_count})</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="label">Type</label>
                <select
                  value={filters.note_type}
                  onChange={e => setFilters(prev => ({ ...prev, note_type: e.target.value }))}
                  className="input text-sm"
                >
                  <option value="">All Types</option>
                  <option value="markdown">Markdown</option>
                  <option value="flowchart">Flowchart</option>
                  <option value="diagram">Diagram</option>
                  <option value="code">Code</option>
                  <option value="text">Text</option>
                </select>
              </div>
              <div>
                <label className="label">Sort By</label>
                <select
                  value={filters.sort_by}
                  onChange={e => setFilters(prev => ({ ...prev, sort_by: e.target.value }))}
                  className="input text-sm"
                >
                  <option value="updated_at">Recently Updated</option>
                  <option value="created_at">Recently Created</option>
                  <option value="title">Title</option>
                  <option value="word_count">Word Count</option>
                </select>
              </div>
            </div>
            <div className="mt-4 flex flex-wrap gap-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={filters.is_pinned}
                  onChange={e => setFilters(prev => ({ ...prev, is_pinned: e.target.checked }))}
                  className="rounded border-secondary-300 text-primary-600 focus:ring-primary-500"
                />
                <span className="text-sm text-secondary-700 dark:text-secondary-300">Pinned only</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={filters.is_favorite}
                  onChange={e => setFilters(prev => ({ ...prev, is_favorite: e.target.checked }))}
                  className="rounded border-secondary-300 text-primary-600 focus:ring-primary-500"
                />
                <span className="text-sm text-secondary-700 dark:text-secondary-300">Favorites only</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={filters.is_archived}
                  onChange={e => setFilters(prev => ({ ...prev, is_archived: e.target.checked }))}
                  className="rounded border-secondary-300 text-primary-600 focus:ring-primary-500"
                />
                <span className="text-sm text-secondary-700 dark:text-secondary-300">Archived only</span>
              </label>
            </div>
          </div>
        )}

        <div className="flex-1 overflow-y-auto">
          {isLoading && !results ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 text-primary-600 animate-spin" />
            </div>
          ) : results && results.items.length > 0 ? (
            <ul className="divide-y divide-secondary-200 dark:divide-secondary-700" role="listbox" aria-label="Search results">
              {results.items.map((note, index) => (
                <li key={note.id} role="option">
                  <button
                    onClick={() => handleNoteClick(note)}
                    className="w-full p-4 text-left hover:bg-secondary-50 dark:hover:bg-secondary-800/50 transition-colors flex items-start gap-3"
                  >
                    <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center">
                      {note.note_type === 'flowchart' ? (
                        <svg className="w-5 h-5 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                        </svg>
                      ) : (
                        <svg className="w-5 h-5 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-medium text-secondary-900 dark:text-white truncate">{note.title || 'Untitled'}</h3>
                      {note.content && (
                        <p className="text-sm text-secondary-500 dark:text-secondary-400 truncate mt-1 line-clamp-2">
                          {note.content.replace(/[#*`\[\]()]/g, '')}
                        </p>
                      )}
                      <div className="flex items-center gap-3 mt-2 text-xs text-secondary-400">
                        {note.folder && (
                          <span className="flex items-center gap-1">
                            <Folder className="w-3 h-3" />
                            {note.folder.name}
                          </span>
                        )}
                        {note.tags.length > 0 && (
                          <span className="flex items-center gap-1">
                            <Tag className="w-3 h-3" />
                            {note.tags.slice(0, 3).map(t => t.name).join(', ')}
                            {note.tags.length > 3 && ` +${note.tags.length - 3}`}
                          </span>
                        )}
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {formatRelativeTime(note.updated_at)}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      {note.is_pinned && <Star className="w-4 h-4 text-yellow-500" />}
                      {note.is_favorite && <Star className="w-4 h-4 text-yellow-500 fill-current" />}
                      {note.is_archived && <Archive className="w-4 h-4 text-secondary-400" />}
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          ) : query ? (
            <div className="py-12 text-center">
              <Search className="w-12 h-12 text-secondary-300 dark:text-secondary-600 mx-auto mb-3" />
              <p className="text-secondary-500 dark:text-secondary-400">No notes found for "{query}"</p>
              <p className="text-sm text-secondary-400 dark:text-secondary-500 mt-1">Try adjusting your search or filters</p>
            </div>
          ) : (
            <div className="py-12 text-center">
              <Search className="w-12 h-12 text-secondary-300 dark:text-secondary-600 mx-auto mb-3" />
              <p className="text-secondary-500 dark:text-secondary-400">Start typing to search your notes</p>
              <p className="text-sm text-secondary-400 dark:text-secondary-500 mt-1">Press ⌘K to open search from anywhere</p>
            </div>
          )}
        </div>

        {results && results.total_pages > 1 && (
          <div className="p-4 border-t border-secondary-200 dark:border-secondary-700 flex items-center justify-between">
            <span className="text-sm text-secondary-500">
              Page {results.page} of {results.total_pages} ({results.total} results)
            </span>
            <div className="flex gap-2">
              <button
                disabled={results.page === 1 || isLoading}
                onClick={() => searchNotes({ ...filters, query, page: results.page - 1 })}
                className="btn-secondary text-sm"
              >
                Previous
              </button>
              <button
                disabled={results.page === results.total_pages || isLoading}
                onClick={() => searchNotes({ ...filters, query, page: results.page + 1 })}
                className="btn-secondary text-sm"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </div>,
    document.body
  );
}