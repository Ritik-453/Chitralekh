import React from 'react';
import { Link, NavLink } from 'react-router-dom';
import { Tag as TagIcon, Plus, Edit, Trash2 } from 'lucide-react';
import { useTags } from '../hooks/useNotes';
import { cn } from '../utils';
import type { Tag } from '../types';

interface TagListProps {
  tags: Tag[];
  isLoading: boolean;
  showCreateForm?: boolean;
  onCloseCreateForm?: () => void;
}

export function TagList({ tags, isLoading, showCreateForm, onCloseCreateForm }: TagListProps) {
  const { createTag, updateTag, deleteTag } = useTags();
  const [editingTag, setEditingTag] = React.useState<Tag | null>(null);
  const [editName, setEditName] = React.useState('');
  const [internalShowCreate, setInternalShowCreate] = React.useState(false);
  const showCreate = showCreateForm !== undefined ? showCreateForm : internalShowCreate;
  const setShowCreate = (val: boolean) => {
    setInternalShowCreate(val);
    if (!val && onCloseCreateForm) onCloseCreateForm();
  };
  const [newTagName, setNewTagName] = React.useState('');
  const [newTagColor, setNewTagColor] = React.useState('#22c55e');

  const handleCreateTag = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTagName.trim()) return;
    await createTag({ name: newTagName.trim(), color: newTagColor });
    setNewTagName('');
    setShowCreate(false);
  };

  const handleEditTag = (tag: Tag) => {
    setEditingTag(tag);
    setEditName(tag.name);
  };

  const handleSaveEdit = async (tag: Tag) => {
    if (editName.trim() && editName !== tag.name) {
      await updateTag(tag.id, { name: editName.trim() });
    }
    setEditingTag(null);
  };

  const handleDeleteTag = async (tag: Tag) => {
    if (confirm(`Delete tag "${tag.name}"?`)) {
      await deleteTag(tag.id);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-1">
        {[1, 2, 3].map(i => (
          <div key={i} className="h-6 bg-secondary-200 dark:bg-secondary-700 rounded animate-pulse" />
        ))}
      </div>
    );
  }

  if (tags.length === 0 && !showCreate) {
    return (
      <div className="text-center py-4">
        <p className="text-secondary-500 text-sm mb-2">No tags yet</p>
        <button
          onClick={() => setShowCreate(true)}
          className="btn-secondary text-sm"
        >
          <Plus className="w-3.5 h-3.5 mr-1" />
          Create Tag
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-1">
      {showCreate && (
        <form onSubmit={handleCreateTag} className="space-y-2 p-2 bg-secondary-50 dark:bg-secondary-800/50 rounded-lg border border-secondary-200 dark:border-secondary-700 animate-slide-in">
          <div className="flex gap-2">
            <input
              type="text"
              value={newTagName}
              onChange={e => setNewTagName(e.target.value)}
              placeholder="Tag name"
              className="input text-sm flex-1"
              autoFocus
              aria-label="New tag name"
            />
            <input
              type="color"
              value={newTagColor}
              onChange={e => setNewTagColor(e.target.value)}
              className="w-8 h-8 rounded border-0 cursor-pointer"
              aria-label="Tag color"
            />
          </div>
          <div className="flex gap-2">
            <button type="submit" className="btn-primary text-xs flex-1">Create</button>
            <button type="button" onClick={() => setShowCreate(false)} className="btn-secondary text-xs flex-1">Cancel</button>
          </div>
        </form>
      )}

      {!showCreate && (
        <button
          onClick={() => setShowCreate(true)}
          className="w-full btn-secondary text-sm justify-start gap-2"
        >
          <Plus className="w-3.5 h-3.5" />
          Create Tag
        </button>
      )}

      <div className="space-y-1 max-h-60 overflow-y-auto scrollbar-thin">
        {tags.map(tag => {
          const isEditing = editingTag?.id === tag.id;
          
          return (
            <div key={tag.id} className="relative">
              {isEditing ? (
                <div className="flex items-center gap-2 p-1.5 bg-primary-50 dark:bg-primary-900/20 rounded-lg">
                  <input
                    type="text"
                    value={editName}
                    onChange={e => setEditName(e.target.value)}
                    onBlur={() => handleSaveEdit(tag)}
                    onKeyDown={e => e.key === 'Enter' && handleSaveEdit(tag)}
                    className="input text-sm flex-1"
                    autoFocus
                    aria-label="Edit tag name"
                  />
                  <button
                    onClick={() => handleSaveEdit(tag)}
                    className="p-1 rounded hover:bg-secondary-200 dark:hover:bg-secondary-700 transition-colors"
                    aria-label="Save"
                  >
                    <TagIcon className="w-3.5 h-3.5 text-primary-600" />
                  </button>
                </div>
              ) : (
                <NavLink
                  to={`/tags/${tag.id}`}
                  className={cn(
                    'flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm font-medium transition-colors',
                    'text-secondary-700 hover:bg-secondary-100 dark:text-secondary-300 dark:hover:bg-secondary-800'
                  )}
                  style={{ borderLeft: `3px solid ${tag.color}` }}
                >
                  <span
                    className="w-2.5 h-2.5 rounded flex-shrink-0"
                    style={{ backgroundColor: tag.color }}
                  />
                  <span className="truncate flex-1">{tag.name}</span>
                  {(tag.note_count || 0) > 0 && (
                    <span className="flex-shrink-0 text-xs text-secondary-400 bg-secondary-100 dark:bg-secondary-800 px-1.5 py-0.5 rounded">
                      {tag.note_count}
                    </span>
                  )}
                </NavLink>
              )}

              {!isEditing && (
                <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1 opacity-0 hover:opacity-100 transition-opacity">
                  <button
                    onClick={() => handleEditTag(tag)}
                    className="p-1 rounded hover:bg-secondary-200 dark:hover:bg-secondary-700 transition-colors"
                    aria-label="Edit tag"
                  >
                    <Edit className="w-3.5 h-3.5 text-secondary-500" />
                  </button>
                  <button
                    onClick={() => handleDeleteTag(tag)}
                    className="p-1 rounded hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors"
                    aria-label="Delete tag"
                  >
                    <Trash2 className="w-3.5 h-3.5 text-red-500" />
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}