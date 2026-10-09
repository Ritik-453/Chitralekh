import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useRecentNotes, usePinnedNotes, useFavoriteNotes, useSearchStats } from '../hooks/useNotes';
import { useFolders } from '../hooks/useNotes';
import { Plus, Folder, FileText, Star, Bookmark, Archive, Clock, TrendingUp, FolderOpen, ExternalLink, Search, Sparkles } from 'lucide-react';
import { cn, formatRelativeTime, truncate } from '../utils';
import { FileImportModal } from '../components/FileImportModal';

export function DashboardPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { notes: recentNotes, isLoading: recentLoading } = useRecentNotes(5);
  const { notes: pinnedNotes } = usePinnedNotes();
  const { notes: favoriteNotes } = useFavoriteNotes();
  const { stats } = useSearchStats();
  const { folders } = useFolders();
  const [showImportModal, setShowImportModal] = React.useState(false);

  const handleQuickSearch = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const query = formData.get('query') as string;
    if (query.trim()) {
      navigate(`/notes?q=${encodeURIComponent(query.trim())}`);
    }
  };

  const statsCards = [
    { label: 'Total Notes', value: stats?.total_notes || 0, icon: FileText, color: 'text-blue-600 bg-blue-100 dark:bg-blue-900/30' },
    { label: 'Total Words', value: stats?.total_words || 0, icon: TrendingUp, color: 'text-green-600 bg-green-100 dark:bg-green-900/30' },
    { label: 'Reading Time', value: `${stats?.total_reading_time_minutes || 0} min`, icon: Clock, color: 'text-purple-600 bg-purple-100 dark:bg-purple-900/30' },
    { label: 'Folders', value: folders.length, icon: FolderOpen, color: 'text-orange-600 bg-orange-100 dark:bg-orange-900/30' },
  ];

  return (
    <div className="p-4 lg:p-6 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-secondary-900 dark:text-white">
            Welcome back, {user?.full_name?.split(' ')[0] || 'there'}!
          </h1>
          <p className="text-secondary-500 dark:text-secondary-400 mt-1">
            Here's what's happening with your notes
          </p>
        </div>
        <Link to="/notes/new" className="btn-primary flex items-center gap-2 whitespace-nowrap">
          <Plus className="w-4 h-4" />
          New Note
        </Link>
      </div>

      <form onSubmit={handleQuickSearch} className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-secondary-400" aria-hidden="true" />
        <input
          name="query"
          type="search"
          placeholder="Search all notes... (⌘K)"
          className="input pl-10 pr-10 py-3 text-base"
          aria-label="Quick search"
        />
        <kbd className="absolute right-3 top-1/2 -translate-y-1/2 hidden md:inline-flex items-center gap-1 px-2 py-1 bg-secondary-100 dark:bg-secondary-800 rounded text-xs text-secondary-500">
          <span>⌘</span>
          <span>K</span>
        </kbd>
      </form>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {statsCards.map((stat, index) => (
          <Link
            key={index}
            to={index === 0 ? '/notes' : index === 3 ? '/folders' : '/notes'}
            className="card p-5 hover:shadow-md transition-shadow"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-secondary-500 dark:text-secondary-400">{stat.label}</p>
                <p className="text-2xl font-bold text-secondary-900 dark:text-white mt-1">{stat.value.toLocaleString()}</p>
              </div>
              <div className={cn('p-3 rounded-xl', stat.color)}>
                <stat.icon className="w-6 h-6" aria-hidden="true" />
              </div>
            </div>
          </Link>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <section className="lg:col-span-2 space-y-4" data-tour="recent-notes-section">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-secondary-900 dark:text-white">Recent Notes</h2>
            <Link to="/notes" className="text-sm text-primary-600 hover:underline">View all</Link>
          </div>
          
          {recentLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map(i => (
                <div key={i} className="card p-4 animate-pulse">
                  <div className="h-4 bg-secondary-200 dark:bg-secondary-700 rounded w-3/4 mb-2" />
                  <div className="h-4 bg-secondary-200 dark:bg-secondary-700 rounded w-1/2" />
                </div>
              ))}
            </div>
          ) : recentNotes.length > 0 ? (
            <div className="space-y-2">
              {recentNotes.map(note => (
                <Link
                  key={note.id}
                  to={`/notes/${note.id}`}
                  className="card p-4 hover:shadow-md transition-shadow flex items-start gap-3 group"
                >
                  <div className={cn(
                    'w-12 h-12 rounded-lg flex items-center justify-center flex-shrink-0',
                    note.note_type === 'flowchart' ? 'bg-purple-100 dark:bg-purple-900/30' : 'bg-primary-100 dark:bg-primary-900/30'
                  )}>
                    {note.note_type === 'flowchart' ? (
                      <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                      </svg>
                    ) : (
                      <FileText className="w-6 h-6 text-primary-600" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-medium text-secondary-900 dark:text-white truncate group-hover:text-primary-600 transition-colors">
                      {note.title || 'Untitled'}
                    </h3>
                    <p className="text-sm text-secondary-500 dark:text-secondary-400 truncate mt-1">
                      {truncate(note.content?.replace(/[#*`\[\]()]/g, '') || '', 100)}
                    </p>
                    <div className="flex items-center gap-3 mt-2 text-xs text-secondary-400">
                      {note.folder && (
                        <span className="flex items-center gap-1">
                          <Folder className="w-3 h-3" />
                          {note.folder.name}
                        </span>
                      )}
                      {note.tags.length > 0 && (
                        <span className="flex items-center gap-1">
                          <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: note.tags[0].color }} />
                          {note.tags[0].name}
                        </span>
                      )}
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {formatRelativeTime(note.updated_at)}
                      </span>
                      <span className={cn(
                        "inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold border",
                        note.sync_to_cloud !== false
                          ? "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800"
                          : "bg-amber-50 text-amber-800 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800"
                      )} title={note.sync_to_cloud !== false ? "☁️ Synced to Google Drive" : "🔒 Local Device Only"}>
                        {note.sync_to_cloud !== false ? "☁️ Cloud" : "🔒 Local"}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    {note.is_pinned && <Star className="w-4 h-4 text-yellow-500" />}
                    {note.is_favorite && <Bookmark className="w-4 h-4 text-yellow-500 fill-current" />}
                    {note.is_archived && <Archive className="w-4 h-4 text-secondary-400" />}
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <div className="card p-8 text-center">
              <FileText className="w-12 h-12 text-secondary-300 dark:text-secondary-600 mx-auto mb-3" />
              <p className="text-secondary-500 dark:text-secondary-400">No recent notes</p>
              <Link to="/notes/new" className="btn-primary mt-4 inline-flex items-center gap-2">
                <Plus className="w-4 h-4" />
                Create your first note
              </Link>
            </div>
          )}
        </section>

        <section className="space-y-6" data-tour="quick-actions-panel">
          <div>
            <h2 className="text-lg font-semibold text-secondary-900 dark:text-white">Quick Actions</h2>
          </div>
          
          <div className="space-y-2">
            <Link to="/notes/new" className="card p-4 hover:shadow-md transition-shadow flex items-center gap-3 group">
              <div className="p-2 rounded-lg bg-primary-100 dark:bg-primary-900/30 text-primary-600">
                <Plus className="w-5 h-5" />
              </div>
              <div>
                <p className="font-medium text-secondary-900 dark:text-white">New Note</p>
                <p className="text-sm text-secondary-500">Create a new markdown note</p>
              </div>
            </Link>
            
            <Link to="/notes/new?type=flowchart" className="card p-4 hover:shadow-md transition-shadow flex items-center gap-3 group">
              <div className="p-2 rounded-lg bg-purple-100 dark:bg-purple-900/30 text-purple-600">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
              <div>
                <p className="font-medium text-secondary-900 dark:text-white">New Flowchart</p>
                <p className="text-sm text-secondary-500">Create a diagram or flowchart</p>
              </div>
            </Link>
            
            <Link to="/folders" className="card p-4 hover:shadow-md transition-shadow flex items-center gap-3 group">
              <div className="p-2 rounded-lg bg-green-100 dark:bg-green-900/30 text-green-600">
                <Folder className="w-5 h-5" />
              </div>
              <div>
                <p className="font-medium text-secondary-900 dark:text-white">New Folder</p>
                <p className="text-sm text-secondary-500">Organize your notes</p>
              </div>
            </Link>

            <button
              type="button"
              data-tour="import-doc-btn"
              onClick={() => setShowImportModal(true)}
              className="card p-4 hover:shadow-md transition-shadow flex items-center gap-3 group text-left w-full cursor-pointer"
            >
              <div className="p-2 rounded-lg bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400">
                <Sparkles className="w-5 h-5" />
              </div>
              <div>
                <p className="font-medium text-secondary-900 dark:text-white">Convert & OCR to Text</p>
                <p className="text-sm text-secondary-500">Import Images, PDFs, or Word docs</p>
              </div>
            </button>
          </div>

          {(pinnedNotes.length > 0 || favoriteNotes.length > 0) && (
            <div>
              <h3 className="text-lg font-semibold text-secondary-900 dark:text-white mb-3">Important</h3>
              <div className="space-y-2">
                {pinnedNotes.slice(0, 3).map(note => (
                  <Link key={note.id} to={`/notes/${note.id}`} className="card p-3 hover:shadow-md transition-shadow flex items-center gap-2">
                    <Star className="w-5 h-5 text-yellow-500 flex-shrink-0" />
                    <span className="text-sm font-medium text-secondary-900 dark:text-white truncate">{note.title}</span>
                  </Link>
                ))}
                {favoriteNotes.slice(0, 3).map(note => (
                  <Link key={note.id} to={`/notes/${note.id}`} className="card p-3 hover:shadow-md transition-shadow flex items-center gap-2">
                    <Bookmark className="w-5 h-5 text-yellow-500 fill-current flex-shrink-0" />
                    <span className="text-sm font-medium text-secondary-900 dark:text-white truncate">{note.title}</span>
                  </Link>
                ))}
              </div>
            </div>
          )}

          <div className="card p-4">
            <h3 className="font-medium text-secondary-900 dark:text-white mb-3">Note Types</h3>
            <div className="space-y-2">
              {stats?.notes_by_type && Object.entries(stats.notes_by_type).map(([type, count]) => (
                <Link key={type} to={`/notes?type=${type}`} className="flex items-center justify-between p-2 rounded-lg hover:bg-secondary-100 dark:hover:bg-secondary-800 transition-colors">
                  <span className="text-sm text-secondary-700 dark:text-secondary-300 capitalize">{type}</span>
                  <span className="text-sm font-medium text-secondary-500">{String(count)}</span>
                </Link>
              ))}
            </div>
          </div>
        </section>
      </div>

      <FileImportModal
        isOpen={showImportModal}
        onClose={() => setShowImportModal(false)}
      />
    </div>
  );
}