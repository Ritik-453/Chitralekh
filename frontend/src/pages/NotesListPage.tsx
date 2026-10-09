import React, { useState, useEffect } from 'react';
import { Link, useSearchParams, useNavigate } from 'react-router-dom';
import { useNotes, useFolders, useTags } from '../hooks/useNotes';
import { Plus, Filter, ChevronDown, ChevronUp, ChevronLeft, ChevronRight, Search, X, Tag, Folder, Star, Bookmark, Archive, MoreVertical, Edit, Trash2, Copy, Download, Eye, GitMerge } from 'lucide-react';
import { cn, formatRelativeTime, truncate } from '../utils';
import type { Note, SearchParams } from '../types';
import { notesApi } from '../services/api';
import toast from 'react-hot-toast';

export function NotesListPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('list');
  const [sortBy, setSortBy] = useState<'updated_at' | 'created_at' | 'title' | 'word_count'>('updated_at');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [showFilters, setShowFilters] = useState(false);
  const [selectedNotes, setSelectedNotes] = useState<Set<string>>(new Set());
  const [filterTagIds, setFilterTagIds] = useState<string[]>([]);
  const [filterFolderId, setFilterFolderId] = useState('');
  const [filterType, setFilterType] = useState('');
  const [filterPinned, setFilterPinned] = useState(false);
  const [filterArchived, setFilterArchived] = useState(false);
  const [filterFavorite, setFilterFavorite] = useState(false);
  const [filterSync, setFilterSync] = useState<string>('');

  const initialParams: SearchParams = {
    query: searchParams.get('q') || undefined,
    folder_id: searchParams.get('folder_id') || undefined,
    tag_ids: searchParams.getAll('tag_ids').length > 0 ? searchParams.getAll('tag_ids') : undefined,
    note_type: searchParams.get('type') || undefined,
    is_pinned: searchParams.get('pinned') === 'true' || undefined,
    is_archived: searchParams.get('archived') === 'true' || undefined,
    is_favorite: searchParams.get('favorite') === 'true' || undefined,
    sort_by: sortBy,
    sort_order: sortOrder,
    page: 1,
    page_size: 20,
  };

  const { notes, pagination, isLoading, params, fetchNotes, createNote, updateNote, deleteNote, pinNote, favoriteNote, archiveNote, setSearchParams: setNotesSearchParams, setPage } = useNotes(initialParams);
  const { flatFolders } = useFolders();
  const { tagsWithCounts } = useTags();

  useEffect(() => {
    const newParams: SearchParams = {
      ...params,
      query: searchParams.get('q') || undefined,
      folder_id: filterFolderId || undefined,
      tag_ids: filterTagIds.length > 0 ? filterTagIds : undefined,
      note_type: filterType || undefined,
      is_pinned: filterPinned || undefined,
      is_archived: filterArchived || undefined,
      is_favorite: filterFavorite || undefined,
      sync_to_cloud: filterSync === 'true' ? true : filterSync === 'false' ? false : undefined,
      sort_by: sortBy,
      sort_order: sortOrder,
    };
    setNotesSearchParams(newParams);
  }, [filterFolderId, filterTagIds, filterType, filterPinned, filterArchived, filterFavorite, filterSync, sortBy, sortOrder]);

  const handleSort = (field: typeof sortBy) => {
    if (sortBy === field) {
      setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortOrder('desc');
    }
  };

  const clearFilters = () => {
    setFilterFolderId('');
    setFilterTagIds([]);
    setFilterType('');
    setFilterPinned(false);
    setFilterArchived(false);
    setFilterFavorite(false);
    setFilterSync('');
  };

  const hasActiveFilters = filterFolderId || filterTagIds.length > 0 || filterType || filterPinned || filterArchived || filterFavorite || filterSync;

  const toggleNoteSelection = (id: string) => {
    setSelectedNotes(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleBulkDelete = async () => {
    if (selectedNotes.size === 0) return;
    if (!confirm(`Delete ${selectedNotes.size} notes?`)) return;
    
    for (const id of selectedNotes) {
      await deleteNote(id);
    }
    setSelectedNotes(new Set());
    toast.success(`${selectedNotes.size} notes deleted`);
  };

  const handleBulkArchive = async () => {
    for (const id of selectedNotes) {
      await archiveNote(id);
    }
    setSelectedNotes(new Set());
    toast.success(`${selectedNotes.size} notes archived`);
  };

  const handleBulkMerge = async () => {
    if (selectedNotes.size < 2) return;
    const selectedList = notes.filter(n => selectedNotes.has(n.id));
    if (selectedList.length < 2) return;

    const defaultTitle = `Merged: ${selectedList.map(n => n.title || 'Untitled').slice(0, 3).join(' & ')}${selectedList.length > 3 ? '...' : ''}`;
    const mergedTitle = prompt('Enter title for merged note:', defaultTitle);
    if (!mergedTitle) return;

    const mergedSections = selectedList.map(n => `# ${n.title || 'Untitled'}\n\n${n.content || ''}`);
    const mergedContent = mergedSections.join('\n\n---\n\n');
    const allTagIds = Array.from(new Set(selectedList.flatMap(n => (n.tags || []).map(t => t.id))));

    try {
      const newNote = await createNote({
        title: mergedTitle.trim(),
        content: mergedContent,
        note_type: 'markdown',
        folder_id: selectedList[0]?.folder_id || undefined,
        tags: allTagIds,
      });
      setSelectedNotes(new Set());
      toast.success(`Merged ${selectedList.length} notes into "${mergedTitle.trim()}"!`);
      navigate(`/notes/${newNote.id}`);
    } catch {
      toast.error('Failed to merge notes');
    }
  };

  const handleBulkSyncToggle = async (enable: boolean) => {
    if (selectedNotes.size === 0) return;
    try {
      await notesApi.bulkSyncToggle(Array.from(selectedNotes), enable);
      toast.success(
        enable
          ? `☁️ Enabled Cloud Sync for ${selectedNotes.size} notes`
          : `🔒 Set ${selectedNotes.size} notes to Local Only`
      );
      fetchNotes();
      setSelectedNotes(new Set());
    } catch {
      toast.error('Failed to update sync settings');
    }
  };

  return (
    <div className="p-4 lg:p-6 space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-secondary-900 dark:text-white">All Notes</h1>
          <p className="text-secondary-500 dark:text-secondary-400 mt-1">
            {pagination.total} note{pagination.total !== 1 ? 's' : ''} total
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={cn('btn-secondary', hasActiveFilters && 'bg-primary-100 text-primary-700 dark:bg-primary-900/30 dark:text-primary-300')}
          >
            <Filter className="w-4 h-4 mr-1" />
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
              <input
                type="search"
                defaultValue={searchParams.get('q') || ''}
                onChange={e => {
                  const params = new URLSearchParams(searchParams);
                  if (e.target.value) params.set('q', e.target.value);
                  else params.delete('q');
                  setSearchParams(params);
                }}
                className="input"
                placeholder="Search notes..."
              />
            </div>
            <div className="flex-1">
              <label className="label">Folder</label>
              <select
                value={filterFolderId}
                onChange={e => setFilterFolderId(e.target.value)}
                className="input"
              >
                <option value="">All Folders</option>
                {flatFolders.map(f => (
                  <option key={f.id} value={f.id}>{f.name}</option>
                ))}
              </select>
            </div>
            <div className="flex-1">
              <label className="label">Tags</label>
              <select
                multiple
                value={filterTagIds}
                onChange={e => setFilterTagIds(Array.from(e.target.selectedOptions).map(o => o.value))}
                className="input min-h-[40px]"
              >
                {tagsWithCounts.map(t => (
                  <option key={t.id} value={t.id}>{t.name} ({t.note_count})</option>
                ))}
              </select>
            </div>
            <div className="flex-1">
              <label className="label">Type</label>
              <select
                value={filterType}
                onChange={e => setFilterType(e.target.value)}
                className="input"
              >
                <option value="">All Types</option>
                <option value="markdown">Markdown</option>
                <option value="flowchart">Flowchart</option>
                <option value="diagram">Diagram</option>
                <option value="code">Code</option>
                <option value="text">Text</option>
              </select>
            </div>
            <div className="flex-1">
              <label className="label">Cloud Sync</label>
              <select
                value={filterSync}
                onChange={e => setFilterSync(e.target.value)}
                className="input"
              >
                <option value="">All Storage Modes</option>
                <option value="true">☁️ Cloud Synced</option>
                <option value="false">🔒 Local Only</option>
              </select>
            </div>
            <div className="flex-1">
              <label className="label">Sort By</label>
              <select
                value={sortBy}
                onChange={e => setSortBy(e.target.value as typeof sortBy)}
                className="input"
              >
                <option value="updated_at">Updated</option>
                <option value="created_at">Created</option>
                <option value="title">Title</option>
                <option value="word_count">Word Count</option>
              </select>
            </div>
            <div className="flex-1">
              <label className="label">Order</label>
              <select
                value={sortOrder}
                onChange={e => setSortOrder(e.target.value as typeof sortOrder)}
                className="input"
              >
                <option value="desc">Descending</option>
                <option value="asc">Ascending</option>
              </select>
            </div>
            <div className="flex flex-wrap gap-4 pt-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={filterPinned} onChange={e => setFilterPinned(e.target.checked)} className="rounded border-secondary-300 text-primary-600 focus:ring-primary-500" />
                <span className="text-sm">Pinned</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={filterFavorite} onChange={e => setFilterFavorite(e.target.checked)} className="rounded border-secondary-300 text-primary-600 focus:ring-primary-500" />
                <span className="text-sm">Favorites</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={filterArchived} onChange={e => setFilterArchived(e.target.checked)} className="rounded border-secondary-300 text-primary-600 focus:ring-primary-500" />
                <span className="text-sm">Archived</span>
              </label>
            </div>
            {hasActiveFilters && (
              <button onClick={clearFilters} className="btn-ghost text-sm">
                <X className="w-3.5 h-3.5 mr-1" />
                Clear all filters
              </button>
            )}
          </div>
        </div>
      )}

      {selectedNotes.size > 0 && (
        <div className="bg-primary-50 dark:bg-primary-900/20 border border-primary-200 dark:border-primary-800 rounded-lg p-3 flex items-center justify-between">
          <span className="text-sm text-primary-700 dark:text-primary-300">
            {selectedNotes.size} note{selectedNotes.size !== 1 ? 's' : ''} selected
          </span>
          <div className="flex items-center gap-2">
            {selectedNotes.size >= 2 && (
              <button
                type="button"
                onClick={handleBulkMerge}
                className="btn-primary text-xs sm:text-sm flex items-center gap-1.5 shadow-sm"
                title="Merge selected notes into one combined note"
              >
                <GitMerge className="w-3.5 h-3.5" />
                <span>Merge ({selectedNotes.size})</span>
              </button>
            )}
            <button
              type="button"
              onClick={() => handleBulkSyncToggle(true)}
              className="btn-secondary text-xs sm:text-sm flex items-center gap-1"
              title="Enable cloud sync for selected notes"
            >
              <span>☁️ Cloud Sync</span>
            </button>
            <button
              type="button"
              onClick={() => handleBulkSyncToggle(false)}
              className="btn-secondary text-xs sm:text-sm flex items-center gap-1"
              title="Set selected notes to Local Only"
            >
              <span>🔒 Local Only</span>
            </button>
            <button onClick={handleBulkArchive} className="btn-secondary text-sm">Archive</button>
            <button onClick={handleBulkDelete} className="btn-danger text-sm">Delete</button>
            <button onClick={() => setSelectedNotes(new Set())} className="btn-ghost text-sm">Clear</button>
          </div>
        </div>
      )}

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setViewMode('list')}
            className={cn('btn-secondary p-2', viewMode === 'list' && 'bg-primary-100 text-primary-700 dark:bg-primary-900/30 dark:text-primary-300')}
            aria-label="List view"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
          <button
            onClick={() => setViewMode('grid')}
            className={cn('btn-secondary p-2', viewMode === 'grid' && 'bg-primary-100 text-primary-700 dark:bg-primary-900/30 dark:text-primary-300')}
            aria-label="Grid view"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
            </svg>
          </button>
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
        <>
          {viewMode === 'list' ? (
            <div className="space-y-2">
              {notes.map(note => (
                <div
                  key={note.id}
                  className={cn(
                    'card p-4 flex items-start gap-3 hover:shadow-md transition-shadow',
                    selectedNotes.has(note.id) && 'ring-2 ring-primary-500 bg-primary-50 dark:bg-primary-900/20'
                  )}
                >
                  <input
                    type="checkbox"
                    checked={selectedNotes.has(note.id)}
                    onChange={() => toggleNoteSelection(note.id)}
                    className="mt-1 rounded border-secondary-300 text-primary-600 focus:ring-primary-500"
                    aria-label="Select note"
                  />
                  <div className={cn(
                    'w-12 h-12 rounded-lg flex items-center justify-center flex-shrink-0',
                    note.note_type === 'flowchart' ? 'bg-purple-100 dark:bg-purple-900/30' : 'bg-primary-100 dark:bg-primary-900/30'
                  )}>
                    {note.note_type === 'flowchart' ? (
                      <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                      </svg>
                    ) : (
                      <svg className="w-6 h-6 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <Link to={`/notes/${note.id}`} className="font-medium text-secondary-900 dark:text-white hover:text-primary-600 transition-colors block truncate">
                      {note.title || 'Untitled'}
                    </Link>
                    <p className="text-sm text-secondary-500 dark:text-secondary-400 truncate mt-1">
                      {truncate(note.content?.replace(/[#*`\[\]()]/g, '') || '', 150)}
                    </p>
                    <div className="flex flex-wrap items-center gap-2 mt-2 text-xs text-secondary-400">
                      {note.folder && (
                        <Link to={`/folders/${note.folder.id}`} className="flex items-center gap-1 hover:underline">
                          <Folder className="w-3 h-3" />
                          {note.folder.name}
                        </Link>
                      )}
                      {note.tags.map(tag => (
                        <Link key={tag.id} to={`/tags/${tag.id}`} className="flex items-center gap-1 hover:underline">
                          <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: tag.color }} />
                          {tag.name}
                        </Link>
                      ))}
                      <span className="flex items-center gap-1">
                        <span className="w-3 h-3" aria-hidden="true">
                          {note.is_pinned && <Star className="w-3.5 h-3.5 text-yellow-500" />}
                          {note.is_favorite && <Bookmark className="w-3.5 h-3.5 text-yellow-500 fill-current" />}
                          {note.is_archived && <Archive className="w-3.5 h-3.5" />}
                        </span>
                      </span>
                      <span>{formatRelativeTime(note.updated_at)}</span>
                      <span>{note.word_count} words · {note.reading_time} min read</span>
                      <span className={cn(
                        "inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold border",
                        note.sync_to_cloud !== false
                          ? "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800"
                          : "bg-amber-50 text-amber-800 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800"
                      )} title={note.sync_to_cloud !== false ? "☁️ Synced to Google Drive" : "🔒 Local Device Only"}>
                        {note.sync_to_cloud !== false ? "☁️ Cloud Sync" : "🔒 Local Only"}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => pinNote(note.id)}
                      className={cn('p-1.5 rounded hover:bg-secondary-100 dark:hover:bg-secondary-800 transition-colors', note.is_pinned && 'text-yellow-500')}
                      aria-label={note.is_pinned ? 'Unpin' : 'Pin'}
                    >
                      <Star className="w-4 h-4" fill={note.is_pinned ? 'currentColor' : 'none'} />
                    </button>
                    <button
                      onClick={() => favoriteNote(note.id)}
                      className={cn('p-1.5 rounded hover:bg-secondary-100 dark:hover:bg-secondary-800 transition-colors', note.is_favorite && 'text-yellow-500')}
                      aria-label={note.is_favorite ? 'Remove from favorites' : 'Add to favorites'}
                    >
                      <Bookmark className="w-4 h-4" fill={note.is_favorite ? 'currentColor' : 'none'} />
                    </button>
                    <button
                      onClick={() => archiveNote(note.id)}
                      className={cn('p-1.5 rounded hover:bg-secondary-100 dark:hover:bg-secondary-800 transition-colors', note.is_archived && 'text-secondary-500')}
                      aria-label={note.is_archived ? 'Unarchive' : 'Archive'}
                    >
                      <Archive className="w-4 h-4" />
                    </button>
                    <div className="relative">
                      <button className="p-1.5 rounded hover:bg-secondary-100 dark:hover:bg-secondary-800 transition-colors" aria-label="More options">
                        <MoreVertical className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {notes.map(note => (
                <Link
                  key={note.id}
                  to={`/notes/${note.id}`}
                  className={cn(
                    'card p-4 hover:shadow-md transition-shadow flex flex-col',
                    selectedNotes.has(note.id) && 'ring-2 ring-primary-500'
                  )}
                >
                  <div className={cn(
                    'w-12 h-12 rounded-lg flex items-center justify-center mb-3',
                    note.note_type === 'flowchart' ? 'bg-purple-100 dark:bg-purple-900/30' : 'bg-primary-100 dark:bg-primary-900/30'
                  )}>
                    {note.note_type === 'flowchart' ? (
                      <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                      </svg>
                    ) : (
                      <svg className="w-6 h-6 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                    )}
                  </div>
                  <h3 className="font-medium text-secondary-900 dark:text-white truncate mb-1 group-hover:text-primary-600 transition-colors">
                    {note.title || 'Untitled'}
                  </h3>
                  <p className="text-sm text-secondary-500 dark:text-secondary-400 line-clamp-2 flex-1 mb-3">
                    {truncate(note.content?.replace(/[#*`\[\]()]/g, '') || '', 120)}
                  </p>
                  <div className="flex flex-wrap items-center gap-2 text-xs text-secondary-400">
                    {note.folder && (
                      <span className="flex items-center gap-1">
                        <Folder className="w-3 h-3" />
                        {note.folder.name}
                      </span>
                    )}
                    {note.tags.slice(0, 2).map(tag => (
                      <span key={tag.id} className="flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: tag.color }} />
                        {tag.name}
                      </span>
                    ))}
                    {note.tags.length > 2 && (
                      <span className="text-secondary-400">+{note.tags.length - 2}</span>
                    )}
                    <span className={cn(
                      "ml-auto inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold border",
                      note.sync_to_cloud !== false
                        ? "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800"
                        : "bg-amber-50 text-amber-800 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800"
                    )} title={note.sync_to_cloud !== false ? "☁️ Synced to Google Drive" : "🔒 Local Device Only"}>
                      {note.sync_to_cloud !== false ? "☁️" : "🔒"}
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          )}

          {pagination.total_pages > 1 && (
            <div className="flex items-center justify-center gap-2 mt-6">
              <button
                disabled={pagination.page === 1 || isLoading}
                onClick={() => setPage(pagination.page - 1)}
                className="btn-secondary"
              >
                <ChevronLeft className="w-4 h-4" />
                Previous
              </button>
              <span className="px-4 text-sm text-secondary-600 dark:text-secondary-400">
                Page {pagination.page} of {pagination.total_pages}
              </span>
              <button
                disabled={pagination.page === pagination.total_pages || isLoading}
                onClick={() => setPage(pagination.page + 1)}
                className="btn-secondary"
              >
                Next
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          )}
        </>
      ) : (
        <div className="card p-12 text-center">
          <svg className="w-16 h-16 text-secondary-300 dark:text-secondary-600 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          <h2 className="text-xl font-semibold text-secondary-900 dark:text-white mb-2">No notes found</h2>
          <p className="text-secondary-500 dark:text-secondary-400 mb-6">
            {hasActiveFilters ? 'Try adjusting your filters' : 'Get started by creating your first note'}
          </p>
          <Link to="/notes/new" className="btn-primary inline-flex items-center gap-2">
            <Plus className="w-4 h-4" />
            {hasActiveFilters ? 'Clear filters' : 'Create note'}
          </Link>
        </div>
      )}
    </div>
  );
}
