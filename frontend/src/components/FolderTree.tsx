import React, { useState } from 'react';
import { Link, NavLink } from 'react-router-dom';
import { ChevronRight, ChevronDown, Folder as FolderIcon, FolderOpen, Plus, MoreHorizontal, Edit, Trash2, Move } from 'lucide-react';
import { useFolders } from '../hooks/useNotes';
import { cn } from '../utils';
import type { Folder } from '../types';

interface FolderTreeProps {
  folders: Folder[];
  isLoading: boolean;
  level?: number;
}

export function FolderTree({ folders, isLoading, level = 0 }: FolderTreeProps) {
  const { createFolder, updateFolder, deleteFolder } = useFolders();
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set());
  const [editingFolder, setEditingFolder] = useState<Folder | null>(null);
  const [editName, setEditName] = useState('');

  const toggleExpand = (folderId: string) => {
    setExpandedFolders(prev => {
      const next = new Set(prev);
      if (next.has(folderId)) {
        next.delete(folderId);
      } else {
        next.add(folderId);
      }
      return next;
    });
  };

  const handleCreateSubfolder = async (parentId: string) => {
    const name = prompt('Enter folder name:');
    if (name?.trim()) {
      await createFolder({ name: name.trim(), parent_id: parentId });
    }
  };

  const handleEditFolder = (folder: Folder) => {
    setEditingFolder(folder);
    setEditName(folder.name);
  };

  const handleSaveEdit = async (folder: Folder) => {
    if (editName.trim() && editName !== folder.name) {
      await updateFolder(folder.id, { name: editName.trim() });
    }
    setEditingFolder(null);
  };

  const handleDeleteFolder = async (folder: Folder) => {
    if (confirm(`Delete "${folder.name}" and all its contents?`)) {
      await deleteFolder(folder.id);
    }
  };

  const renderFolder = (folder: Folder, depth: number) => {
    const isExpanded = expandedFolders.has(folder.id);
    const hasChildren = folder.children && folder.children.length > 0;
    const isEditing = editingFolder?.id === folder.id;

    return (
      <div key={folder.id} className="relative">
        <div
          className={cn(
            'flex items-center gap-1 rounded-lg px-2 py-1.5 transition-colors',
            isEditing ? 'bg-primary-50 dark:bg-primary-900/20' : 'hover:bg-secondary-100 dark:hover:bg-secondary-800'
          )}
          style={{ paddingLeft: `${12 + depth * 16}px` }}
        >
          {hasChildren && (
            <button
              onClick={() => toggleExpand(folder.id)}
              className="p-1 rounded hover:bg-secondary-200 dark:hover:bg-secondary-700 transition-colors"
              aria-label={isExpanded ? `Collapse ${folder.name}` : `Expand ${folder.name}`}
              aria-expanded={isExpanded}
            >
              {isExpanded ? <ChevronDown className="w-4 h-4 text-secondary-500" /> : <ChevronRight className="w-4 h-4 text-secondary-500" />}
            </button>
          )}

          {isEditing ? (
            <input
              type="text"
              value={editName}
              onChange={e => setEditName(e.target.value)}
              onBlur={() => handleSaveEdit(folder)}
              onKeyDown={e => e.key === 'Enter' && handleSaveEdit(folder)}
              className="input text-sm flex-1 min-w-0"
              autoFocus
              aria-label="Edit folder name"
            />
          ) : (
            <NavLink
              to={`/folders/${folder.id}`}
              className={cn(
                'flex items-center gap-2 flex-1 min-w-0 text-sm font-medium truncate transition-colors',
                'text-secondary-700 hover:text-secondary-900 dark:text-secondary-300 dark:hover:text-white'
              )}
              style={{ color: folder.color }}
            >
              <span className="flex-shrink-0" style={{ color: folder.color }}>
                {isExpanded ? <FolderOpen className="w-4 h-4" /> : <FolderIcon className="w-4 h-4" />}
              </span>
              <span className="truncate">{folder.name}</span>
              {(folder.note_count || 0) > 0 && (
                <span className="flex-shrink-0 text-xs text-secondary-400 bg-secondary-100 dark:bg-secondary-800 px-1.5 py-0.5 rounded">
                  {folder.note_count}
                </span>
              )}
            </NavLink>
          )}

          {!isEditing && (
            <div className="flex items-center gap-1 opacity-0 hover:opacity-100 transition-opacity">
              <button
                onClick={() => handleCreateSubfolder(folder.id)}
                className="p-1 rounded hover:bg-secondary-200 dark:hover:bg-secondary-700 transition-colors"
                aria-label="Create subfolder"
                title="Create subfolder"
              >
                <Plus className="w-3.5 h-3.5 text-secondary-500" />
              </button>
              <button
                onClick={() => handleEditFolder(folder)}
                className="p-1 rounded hover:bg-secondary-200 dark:hover:bg-secondary-700 transition-colors"
                aria-label="Rename folder"
                title="Rename"
              >
                <Edit className="w-3.5 h-3.5 text-secondary-500" />
              </button>
              <button
                onClick={() => handleDeleteFolder(folder)}
                className="p-1 rounded hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors"
                aria-label="Delete folder"
                title="Delete"
              >
                <Trash2 className="w-3.5 h-3.5 text-red-500" />
              </button>
            </div>
          )}
        </div>

        {isExpanded && folder.children && folder.children.length > 0 && (
          <div className="animate-slide-in">
            {folder.children.map(child => renderFolder(child, depth + 1))}
          </div>
        )}
      </div>
    );
  };

  if (isLoading) {
    return (
      <div className="space-y-2" style={{ paddingLeft: `${12 + level * 16}px` }}>
        {[1, 2, 3].map(i => (
          <div key={i} className="h-6 bg-secondary-200 dark:bg-secondary-700 rounded animate-pulse" style={{ width: '60%' }} />
        ))}
      </div>
    );
  }

  if (folders.length === 0) {
    return (
      <div className="text-center py-4 text-secondary-500 text-sm" style={{ paddingLeft: `${12 + level * 16}px` }}>
        No folders yet. Click + to create one.
      </div>
    );
  }

  return (
    <div className="space-y-1">
      {folders.map(folder => renderFolder(folder, level))}
    </div>
  );
}