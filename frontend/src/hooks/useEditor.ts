import { useState, useCallback, useEffect, useRef } from 'react';
import { notesApi } from '../services/api';
import { localStorageService } from '../services/localStorageService';
import type { Note, NoteUpdate } from '../types';
import toast from 'react-hot-toast';

interface UseEditorOptions {
  note: Note | null;
  onSave?: (note: Note) => void;
  autoSave?: boolean;
  autoSaveInterval?: number;
  noteType?: string;
  folderId?: string | null;
  tags?: string[];
  syncToCloud?: boolean;
}

export function useEditor({
  note,
  onSave,
  autoSave = true,
  autoSaveInterval = 5000,
  noteType = 'markdown',
  folderId = null,
  tags = [],
  syncToCloud = true,
}: UseEditorOptions) {
  const [content, setContent] = useState('');
  const [title, setTitle] = useState('');
  const [isDirty, setIsDirty] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [wordCount, setWordCount] = useState(0);
  const [readingTime, setReadingTime] = useState(0);
  
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const previousContentRef = useRef('');
  const previousTitleRef = useRef('');
  const previousFolderIdRef = useRef<string | null>(null);
  const previousTagsRef = useRef<string[]>([]);
  const previousNoteTypeRef = useRef<string>('markdown');

  useEffect(() => {
    if (note) {
      setContent(note.content || '');
      setTitle(note.title || '');
      previousContentRef.current = note.content || '';
      previousTitleRef.current = note.title || '';
      previousFolderIdRef.current = note.folder_id || null;
      previousTagsRef.current = note.tags ? note.tags.map(t => t.id).sort() : [];
      previousNoteTypeRef.current = note.note_type || 'markdown';
      setIsDirty(false);
      updateStats(note.content || '');
    } else {
      setContent('');
      setTitle('');
      previousContentRef.current = '';
      previousTitleRef.current = '';
      previousFolderIdRef.current = null;
      previousTagsRef.current = [];
      previousNoteTypeRef.current = 'markdown';
      setIsDirty(false);
      setWordCount(0);
      setReadingTime(0);
    }
  }, [note]);

  useEffect(() => {
    if (!note) return;
    const currentTagsSorted = [...tags].sort();
    const prevTagsSorted = [...previousTagsRef.current].sort();
    const tagsDiffer = JSON.stringify(currentTagsSorted) !== JSON.stringify(prevTagsSorted);
    const folderDiffer = (folderId || null) !== (previousFolderIdRef.current || null);
    const typeDiffer = (noteType || 'markdown') !== (previousNoteTypeRef.current || 'markdown');
    if (tagsDiffer || folderDiffer || typeDiffer) {
      setIsDirty(true);
    }
  }, [tags, folderId, noteType, note]);

  const updateStats = useCallback((text: string) => {
    const words = text.trim() ? text.trim().split(/\s+/).length : 0;
    setWordCount(words);
    setReadingTime(Math.max(1, Math.round(words / 200)));
  }, []);

  const handleContentChange = useCallback((newContent: string | ((prev: string) => string)) => {
    setContent(prev => {
      const resolved = typeof newContent === 'function' ? newContent(prev) : newContent;
      updateStats(resolved);
      setIsDirty(true);
      return resolved;
    });
  }, [updateStats]);

  const handleTitleChange = useCallback((newTitle: string) => {
    setTitle(newTitle);
    setIsDirty(true);
  }, []);

  const save = useCallback(async (force = false) => {
    if (!isDirty && !force) return;
    if (!note && !title.trim() && !content.trim()) return;
    
    setIsSaving(true);
    try {
      let savedNote: Note;
      if (note) {
        const updateData: NoteUpdate = {
          title: title || 'Untitled',
          content,
          note_type: noteType as any,
          folder_id: folderId || undefined,
          tags: tags,
          sync_to_cloud: syncToCloud,
        };
        const response = await notesApi.update(note.id, updateData);
        savedNote = response.data;
      } else {
        const createData = {
          title: title.trim() || 'Untitled',
          content,
          note_type: (noteType || 'markdown') as any,
          folder_id: folderId || undefined,
          tags: tags || [],
          sync_to_cloud: syncToCloud,
        };
        const response = await notesApi.create(createData);
        savedNote = response.data;
      }
      
      previousContentRef.current = content;
      previousTitleRef.current = title;
      previousFolderIdRef.current = folderId || null;
      previousTagsRef.current = [...tags].sort();
      previousNoteTypeRef.current = noteType || 'markdown';
      setIsDirty(false);
      setLastSaved(new Date());
      localStorageService.saveNote(savedNote);
      if (force) {
        toast.success('Note saved');
      }
      onSave?.(savedNote);
      return savedNote;
    } catch (error) {
      toast.error('Failed to save note');
      console.error(error);
      throw error;
    } finally {
      setIsSaving(false);
    }
  }, [note, isDirty, title, content, noteType, folderId, tags, syncToCloud, onSave]);

  useEffect(() => {
    if (!autoSave || !isDirty) return;
    if (!note && !title.trim() && !content.trim()) return;
    
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }
    
    saveTimeoutRef.current = setTimeout(() => {
      save();
    }, autoSaveInterval);
    
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, [autoSave, note, isDirty, title, content, autoSaveInterval, save]);

  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (isDirty) {
        e.preventDefault();
        e.returnValue = '';
      }
    };
    
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [isDirty]);

  const discardChanges = useCallback(() => {
    if (note) {
      setContent(note.content || '');
      setTitle(note.title || '');
      previousContentRef.current = note.content || '';
      previousTitleRef.current = note.title || '';
      setIsDirty(false);
    }
  }, [note]);

  return {
    content,
    setContent: handleContentChange,
    title,
    setTitle: handleTitleChange,
    isDirty,
    setIsDirty,
    isSaving,
    lastSaved,
    wordCount,
    readingTime,
    save,
    discardChanges,
  };
}