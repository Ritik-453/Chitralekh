import React, { useState, useRef, useEffect } from 'react';
import { Link, useLocation, useNavigate, NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  FolderKanban,
  Tag,
  Star,
  Pin,
  Archive,
  Settings,
  HelpCircle,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Plus,
  GraduationCap,
  FolderPlus,
  Folder,
  LogOut,
  User,
  Sparkles,
  FilePlus,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { useFolders, useTags } from '../hooks/useNotes';
import { useTourStatus } from '../hooks/useTourStatus';
import { cn } from '../utils';
import { FolderTree } from './FolderTree';
import { TagList } from './TagList';
import { SearchModal } from './SearchModal';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
  onToggleCollapse: () => void;
  isCollapsed: boolean;
}

export function Sidebar({ isOpen, onClose, onToggleCollapse, isCollapsed }: SidebarProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const { theme, toggleTheme, resolvedTheme } = useTheme();
  const { isCompleted: isTourCompleted } = useTourStatus();
  const { folders, isLoading: foldersLoading, createFolder } = useFolders();
  const { tags, isLoading: tagsLoading } = useTags();

  const [foldersOpen, setFoldersOpen] = useState(true);
  const [tagsOpen, setTagsOpen] = useState(true);
  const [showCreateFolder, setShowCreateFolder] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [showCreateTag, setShowCreateTag] = useState(false);
  const sidebarRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  const handleNewNoteClick = () => {
    navigate(`/notes/new?fresh=${Date.now()}`);
    onClose();
  };

  const handleCreateFolder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFolderName.trim()) return;
    await createFolder({ name: newFolderName.trim() });
    setNewFolderName('');
    setShowCreateFolder(false);
  };

  const primaryNavigation = [
    { path: '/', label: 'Dashboard', icon: LayoutDashboard },
    { path: '/notes', label: 'All Notes', icon: FolderKanban },
    { path: '/central-repository', label: 'Central Repository', icon: GraduationCap, badge: 'Hub' },
  ];

  const filterNavigation = [
    { path: '/notes/pinned', label: 'Pinned', icon: Pin },
    { path: '/notes/favorites', label: 'Favorites', icon: Star },
    { path: '/notes/archived', label: 'Archived', icon: Archive },
  ];

  return (
    <>
      {/* Mobile Overlay */}
      <div
        className={cn(
          'fixed inset-0 z-40 bg-black/50 backdrop-blur-xs transition-opacity lg:hidden',
          isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
        )}
        onClick={onClose}
        aria-hidden="true"
      />

      <aside
        ref={sidebarRef}
        className={cn(
          'fixed lg:relative z-50 flex flex-col h-full bg-white dark:bg-secondary-900 border-r border-secondary-200 dark:border-secondary-700 transition-all duration-300 ease-in-out select-none',
          isCollapsed ? 'w-16' : 'w-72',
          isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        )}
        role="navigation"
        aria-label="Main navigation"
      >
        {/* Brand & Header */}
        <div className={cn(
          'flex items-center h-16 px-4 border-b border-secondary-200 dark:border-secondary-700 flex-shrink-0',
          isCollapsed ? 'justify-center px-2' : 'justify-between'
        )}>
          <Link to="/" className="flex items-center gap-2.5 min-w-0" aria-label="Chitralekh Home">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-primary-600 to-indigo-500 flex items-center justify-center shadow-md shadow-primary-500/20 flex-shrink-0">
              <svg className="w-4.5 h-4.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            {!isCollapsed && (
              <div className="flex items-center gap-1.5 min-w-0">
                <span className="font-bold text-lg text-secondary-900 dark:text-white tracking-tight truncate">
                  Chitralekh
                </span>
              </div>
            )}
          </Link>

          {!isCollapsed && (
            <button
              onClick={onToggleCollapse}
              className="p-1.5 rounded-lg text-secondary-400 hover:text-secondary-600 hover:bg-secondary-100 dark:hover:bg-secondary-800 transition-colors"
              aria-label="Collapse sidebar"
              title="Collapse sidebar"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Quick Action: New Note Button */}
        <div className="p-3 pb-1 flex-shrink-0">
          {!isCollapsed ? (
            <button
              onClick={handleNewNoteClick}
              className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-xl bg-primary-600 hover:bg-primary-500 active:scale-[0.98] text-white font-medium text-sm shadow-md shadow-primary-600/20 transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4 stroke-[2.5]" />
              <span>New Note</span>
            </button>
          ) : (
            <button
              onClick={handleNewNoteClick}
              className="w-10 h-10 mx-auto flex items-center justify-center rounded-xl bg-primary-600 hover:bg-primary-500 text-white shadow-md shadow-primary-600/20 transition-all cursor-pointer"
              title="Create New Note"
              aria-label="Create New Note"
            >
              <Plus className="w-5 h-5 stroke-[2.5]" />
            </button>
          )}
        </div>

        {/* Unified Scrollable Center: Nav, Filters, Folders & Tags */}
        <div className="flex-1 overflow-y-auto scrollbar-thin px-3 py-2 space-y-4 min-h-0">
          {/* Primary Navigation */}
          <nav className="space-y-1" aria-label="Main menu">
            {primaryNavigation.map(item => (
              <NavLink
                key={item.path}
                to={item.path}
                data-tour={item.path === '/central-repository' ? 'central-repo-nav' : undefined}
                onClick={onClose}
                end={item.path === '/'}
                className={({ isActive }) => cn(
                  'flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-primary-50 text-primary-700 dark:bg-primary-900/30 dark:text-primary-300 font-semibold shadow-xs'
                    : 'text-secondary-600 hover:bg-secondary-100 dark:text-secondary-400 dark:hover:bg-secondary-800',
                  isCollapsed && 'justify-center px-2'
                )}
                title={isCollapsed ? item.label : undefined}
              >
                <item.icon className="w-4.5 h-4.5 flex-shrink-0" aria-hidden="true" />
                {!isCollapsed && (
                  <div className="flex items-center justify-between flex-1 min-w-0">
                    <span className="truncate">{item.label}</span>
                    {item.badge && (
                      <span className="text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded-full bg-indigo-100 text-indigo-700 dark:bg-indigo-900/50 dark:text-indigo-300">
                        {item.badge}
                      </span>
                    )}
                  </div>
                )}
              </NavLink>
            ))}
          </nav>

          {/* Quick Views / Filters */}
          <div className="space-y-1">
            {!isCollapsed && (
              <p className="px-3 text-[11px] font-semibold uppercase tracking-wider text-secondary-400 dark:text-secondary-500 mb-1.5">
                Filters
              </p>
            )}
            {filterNavigation.map(item => (
              <NavLink
                key={item.path}
                to={item.path}
                onClick={onClose}
                className={({ isActive }) => cn(
                  'flex items-center gap-3 rounded-xl px-3 py-1.5 text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-primary-50 text-primary-700 dark:bg-primary-900/30 dark:text-primary-300 font-semibold'
                    : 'text-secondary-600 hover:bg-secondary-100 dark:text-secondary-400 dark:hover:bg-secondary-800',
                  isCollapsed && 'justify-center px-2'
                )}
                title={isCollapsed ? item.label : undefined}
              >
                <item.icon className="w-4 h-4 flex-shrink-0" aria-hidden="true" />
                {!isCollapsed && <span className="truncate">{item.label}</span>}
              </NavLink>
            ))}
          </div>

          {/* Folders Section */}
          {!isCollapsed && (
            <div data-tour="sidebar-folders" className="pt-2 border-t border-secondary-200 dark:border-secondary-700/80 space-y-2">
              <div className="flex items-center justify-between px-1">
                <button
                  type="button"
                  onClick={() => setFoldersOpen(prev => !prev)}
                  className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-secondary-400 dark:text-secondary-500 hover:text-secondary-700 dark:hover:text-secondary-300 transition-colors"
                >
                  {foldersOpen ? (
                    <ChevronDown className="w-3.5 h-3.5" />
                  ) : (
                    <ChevronRight className="w-3.5 h-3.5" />
                  )}
                  <span>Folders</span>
                  <span className="ml-1 text-[10px] px-1.5 py-0.2 rounded-full bg-secondary-100 dark:bg-secondary-800 text-secondary-500">
                    {folders.length}
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => setShowCreateFolder(prev => !prev)}
                  className="p-1 rounded-lg text-secondary-400 hover:text-secondary-700 hover:bg-secondary-100 dark:hover:bg-secondary-800 transition-colors"
                  aria-label="Create folder"
                  title="Add folder"
                >
                  <Plus className="w-3.5 h-3.5" />
                </button>
              </div>

              {foldersOpen && (
                <div className="space-y-1.5">
                  {showCreateFolder && (
                    <form onSubmit={handleCreateFolder} className="p-2 rounded-xl bg-secondary-50 dark:bg-secondary-800/60 border border-secondary-200 dark:border-secondary-700 space-y-2">
                      <input
                        type="text"
                        value={newFolderName}
                        onChange={e => setNewFolderName(e.target.value)}
                        placeholder="Folder name..."
                        className="input text-xs py-1.5 w-full"
                        autoFocus
                        aria-label="New folder name"
                      />
                      <div className="flex gap-1.5">
                        <button type="submit" className="btn-primary text-xs py-1 flex-1">Create</button>
                        <button type="button" onClick={() => setShowCreateFolder(false)} className="btn-secondary text-xs py-1 flex-1">Cancel</button>
                      </div>
                    </form>
                  )}
                  <FolderTree folders={folders} isLoading={foldersLoading} />
                </div>
              )}
            </div>
          )}

          {/* Tags Section */}
          {!isCollapsed && (
            <div className="pt-2 border-t border-secondary-200 dark:border-secondary-700/80 space-y-2">
              <div className="flex items-center justify-between px-1">
                <button
                  type="button"
                  onClick={() => setTagsOpen(prev => !prev)}
                  className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-secondary-400 dark:text-secondary-500 hover:text-secondary-700 dark:hover:text-secondary-300 transition-colors"
                >
                  {tagsOpen ? (
                    <ChevronDown className="w-3.5 h-3.5" />
                  ) : (
                    <ChevronRight className="w-3.5 h-3.5" />
                  )}
                  <span>Tags</span>
                  <span className="ml-1 text-[10px] px-1.5 py-0.2 rounded-full bg-secondary-100 dark:bg-secondary-800 text-secondary-500">
                    {tags.length}
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => setShowCreateTag(prev => !prev)}
                  className="p-1 rounded-lg text-secondary-400 hover:text-secondary-700 hover:bg-secondary-100 dark:hover:bg-secondary-800 transition-colors"
                  aria-label="Create tag"
                  title="Add tag"
                >
                  <Plus className="w-3.5 h-3.5" />
                </button>
              </div>

              {tagsOpen && (
                <TagList
                  tags={tags}
                  isLoading={tagsLoading}
                  showCreateForm={showCreateTag}
                  onCloseCreateForm={() => setShowCreateTag(false)}
                />
              )}
            </div>
          )}
        </div>

        {/* Docked Bottom: Settings, Help & User Profile */}
        <div className="flex-shrink-0 border-t border-secondary-200 dark:border-secondary-700 bg-secondary-50/40 dark:bg-secondary-900/40 p-2.5 space-y-1">
          {/* Settings & Help */}
          <NavLink
            to="/settings"
            onClick={onClose}
            className={({ isActive }) => cn(
              'flex items-center gap-3 rounded-xl px-2.5 py-1.5 text-sm font-medium transition-colors',
              isActive
                ? 'bg-primary-50 text-primary-700 dark:bg-primary-900/30 dark:text-primary-300 font-semibold'
                : 'text-secondary-600 hover:bg-secondary-100 dark:text-secondary-400 dark:hover:bg-secondary-800',
              isCollapsed && 'justify-center px-1.5'
            )}
            title={isCollapsed ? 'Settings' : undefined}
          >
            <Settings className="w-4.5 h-4.5 flex-shrink-0 text-secondary-500" />
            {!isCollapsed && <span>Settings</span>}
          </NavLink>

          {!isTourCompleted && (
            <button
              type="button"
              onClick={() => {
                window.dispatchEvent(new CustomEvent('start-newbie-tour'));
                onClose();
              }}
              className={cn(
                'flex items-center gap-3 rounded-xl px-2.5 py-1.5 text-sm font-medium transition-colors text-amber-700 dark:text-amber-300 hover:bg-amber-500/10 w-full text-left cursor-pointer',
                isCollapsed && 'justify-center px-1.5'
              )}
              title={isCollapsed ? 'Feature Tour' : undefined}
            >
              <span className="text-base flex-shrink-0">📌</span>
              {!isCollapsed && <span>Feature Tour Guide</span>}
            </button>
          )}

          <NavLink
            to="/help"
            onClick={onClose}
            className={({ isActive }) => cn(
              'flex items-center gap-3 rounded-xl px-2.5 py-1.5 text-sm font-medium transition-colors',
              isActive
                ? 'bg-primary-50 text-primary-700 dark:bg-primary-900/30 dark:text-primary-300 font-semibold'
                : 'text-secondary-600 hover:bg-secondary-100 dark:text-secondary-400 dark:hover:bg-secondary-800',
              isCollapsed && 'justify-center px-1.5'
            )}
            title={isCollapsed ? 'Help & Guide' : undefined}
          >
            <HelpCircle className="w-4.5 h-4.5 flex-shrink-0 text-secondary-500" />
            {!isCollapsed && <span>Help & Guide</span>}
          </NavLink>

          {/* User Account Card */}
          {user && (
            <div className={cn(
              'mt-1 pt-2 border-t border-secondary-200/80 dark:border-secondary-700/80',
              isCollapsed ? 'flex justify-center' : 'space-y-2'
            )}>
              {!isCollapsed ? (
                <div className="p-2 rounded-xl bg-white dark:bg-secondary-800/80 border border-secondary-200 dark:border-secondary-700 shadow-2xs">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-primary-500 to-indigo-600 flex items-center justify-center flex-shrink-0 text-white font-semibold text-xs shadow-xs">
                      {user.avatar_url ? (
                        <img src={user.avatar_url} alt="" className="w-8 h-8 rounded-full object-cover" />
                      ) : (
                        <span>
                          {user.full_name?.charAt(0).toUpperCase() || user.email.charAt(0).toUpperCase()}
                        </span>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-secondary-900 dark:text-white truncate">
                        {user.full_name || 'My Account'}
                      </p>
                      <p className="text-[11px] text-secondary-400 dark:text-secondary-500 truncate">
                        {user.email}
                      </p>
                    </div>
                  </div>
                  <div className="mt-2 flex items-center gap-1.5 pt-1.5 border-t border-secondary-100 dark:border-secondary-700/60">
                    <NavLink
                      to="/profile"
                      onClick={onClose}
                      className="flex-1 py-1 rounded-lg text-center text-xs font-medium text-secondary-600 dark:text-secondary-300 hover:bg-secondary-100 dark:hover:bg-secondary-700/60 transition-colors"
                    >
                      Profile
                    </NavLink>
                    <button
                      type="button"
                      onClick={logout}
                      className="flex-1 py-1 rounded-lg text-center text-xs font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors"
                    >
                      Sign Out
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={logout}
                  className="p-2 rounded-xl text-secondary-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors"
                  title={`Sign out (${user.email})`}
                >
                  <LogOut className="w-4.5 h-4.5" />
                </button>
              )}
            </div>
          )}
        </div>
      </aside>

      <SearchModal />
    </>
  );
}