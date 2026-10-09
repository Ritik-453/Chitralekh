import { useState, useCallback, useEffect } from 'react';
import { notesApi, foldersApi, tagsApi, searchApi } from '../services/api';
import { localStorageService } from '../services/localStorageService';
import type { Note, NoteCreate, NoteUpdate, Folder, FolderCreate, FolderUpdate, Tag, TagCreate, TagUpdate, PaginatedResponse, SearchParams } from '../types';
import toast from 'react-hot-toast';

export function useNotes(initialParams?: SearchParams) {
  const [notes, setNotes] = useState<Note[]>([]);
  const [pagination, setPagination] = useState({ page: 1, page_size: 20, total: 0, total_pages: 0 });
  const [isLoading, setIsLoading] = useState(false);
  const [params, setParams] = useState<SearchParams>({
    sort_by: 'updated_at',
    sort_order: 'desc',
    page: 1,
    page_size: 20,
    ...initialParams,
  });

  const fetchNotes = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await notesApi.list(params);
      setNotes(response.data.items);
      setPagination({
        page: response.data.page,
        page_size: response.data.page_size,
        total: response.data.total,
        total_pages: response.data.total_pages,
      });
      // Mirror to local device storage asynchronously
      localStorageService.saveNotesBatch(response.data.items);
    } catch (error) {
      // Fallback to local device storage if offline
      const localNotes = await localStorageService.getAllNotes();
      if (localNotes.length > 0) {
        setNotes(localNotes);
        toast('Loaded notes from local device storage (offline mode)', { icon: '💾' });
      } else {
        toast.error('Failed to load notes');
        console.error(error);
      }
    } finally {
      setIsLoading(false);
    }
  }, [params]);

  useEffect(() => {
    fetchNotes();
  }, [fetchNotes]);

  const createNote = async (data: NoteCreate) => {
    const response = await notesApi.create(data);
    setNotes(prev => [response.data, ...prev]);
    pagination.total += 1;
    await localStorageService.saveNote(response.data);
    toast.success('Note created');
    return response.data;
  };

  const updateNote = async (id: string, data: NoteUpdate) => {
    const response = await notesApi.update(id, data);
    setNotes(prev => prev.map(note => note.id === id ? response.data : note));
    await localStorageService.saveNote(response.data);
    return response.data;
  };

  const deleteNote = async (id: string) => {
    await notesApi.delete(id);
    setNotes(prev => prev.filter(note => note.id !== id));
    pagination.total -= 1;
    await localStorageService.deleteNote(id);
    toast.success('Note deleted');
  };

  const pinNote = async (id: string) => {
    const response = await notesApi.pin(id);
    setNotes(prev => prev.map(note => note.id === id ? { ...note, is_pinned: response.data.is_pinned } : note));
  };

  const favoriteNote = async (id: string) => {
    const response = await notesApi.favorite(id);
    setNotes(prev => prev.map(note => note.id === id ? { ...note, is_favorite: response.data.is_favorite } : note));
  };

  const archiveNote = async (id: string) => {
    const response = await notesApi.archive(id);
    setNotes(prev => prev.map(note => note.id === id ? { ...note, is_archived: response.data.is_archived } : note));
  };

  const setSearchParams = (newParams: Partial<SearchParams>) => {
    setParams(prev => ({ ...prev, ...newParams, page: 1 }));
  };

  const setPage = (page: number) => {
    setParams(prev => ({ ...prev, page }));
  };

  return {
    notes,
    pagination,
    isLoading,
    params,
    fetchNotes,
    createNote,
    updateNote,
    deleteNote,
    pinNote,
    favoriteNote,
    archiveNote,
    setSearchParams,
    setPage,
  };
}

export function useRecentNotes(limit = 10) {
  const [notes, setNotes] = useState<Note[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const fetch = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await notesApi.getRecent(limit);
      setNotes(response.data);
    } catch {
      toast.error('Failed to load recent notes');
    } finally {
      setIsLoading(false);
    }
  }, [limit]);

  useEffect(() => {
    fetch();
  }, [fetch]);

  return { notes, isLoading, refetch: fetch };
}

export function usePinnedNotes() {
  const [notes, setNotes] = useState<Note[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const fetch = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await notesApi.getPinned();
      setNotes(response.data);
    } catch {
      toast.error('Failed to load pinned notes');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetch();
  }, [fetch]);

  return { notes, isLoading, refetch: fetch };
}

export function useFavoriteNotes() {
  const [notes, setNotes] = useState<Note[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const fetch = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await notesApi.getFavorites();
      setNotes(response.data);
    } catch {
      toast.error('Failed to load favorite notes');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetch();
  }, [fetch]);

  return { notes, isLoading, refetch: fetch };
}

export function useNote(id: string | null) {
  const [note, setNote] = useState<Note | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const fetch = useCallback(async () => {
    if (!id || id === 'new') {
      setNote(null);
      return;
    }
    setIsLoading(true);
    try {
      const response = await notesApi.get(id);
      setNote(response.data);
    } catch {
      toast.error('Failed to load note');
    } finally {
      setIsLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetch();
  }, [fetch]);

  return { note, isLoading, refetch: fetch };
}

export function useNoteVersions(noteId: string) {
  const [versions, setVersions] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const fetch = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await notesApi.getVersions(noteId);
      setVersions(response.data);
    } catch {
      toast.error('Failed to load versions');
    } finally {
      setIsLoading(false);
    }
  }, [noteId]);

  useEffect(() => {
    fetch();
  }, [fetch]);

  const restore = async (versionId: string) => {
    const response = await notesApi.restoreVersion(noteId, versionId);
    toast.success('Version restored');
    return response.data;
  };

  return { versions, isLoading, refetch: fetch, restore };
}

export function useFolders() {
  const [folders, setFolders] = useState<Folder[]>([]);
  const [flatFolders, setFlatFolders] = useState<Folder[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const fetch = useCallback(async () => {
    setIsLoading(true);
    try {
      const [treeResponse, flatResponse] = await Promise.all([
        foldersApi.list(),
        foldersApi.listFlat(),
      ]);
      setFolders(treeResponse.data);
      setFlatFolders(flatResponse.data);
    } catch (err: any) {
      if (err?.response?.status !== 401) {
        toast.error('Failed to load folders', { id: 'load-folders-error' });
      }
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetch();
  }, [fetch]);

  const createFolder = async (data: FolderCreate) => {
    const response = await foldersApi.create(data);
    await fetch();
    toast.success('Folder created');
    return response.data;
  };

  const updateFolder = async (id: string, data: FolderUpdate) => {
    const response = await foldersApi.update(id, data);
    await fetch();
    return response.data;
  };

  const deleteFolder = async (id: string, moveNotesTo?: string) => {
    await foldersApi.delete(id, moveNotesTo);
    await fetch();
    toast.success('Folder deleted');
  };

  const reorderFolders = async (folderOrders: { id: string; sort_order: number; parent_id?: string }[]) => {
    await foldersApi.reorder(folderOrders);
    await fetch();
  };

  return {
    folders,
    flatFolders,
    isLoading,
    fetch,
    createFolder,
    updateFolder,
    deleteFolder,
    reorderFolders,
  };
}

export function useFolder(id: string | null | undefined) {
  const [folder, setFolder] = useState<Folder | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const fetch = useCallback(async () => {
    if (!id) {
      setFolder(null);
      return;
    }
    setIsLoading(true);
    try {
      const response = await foldersApi.get(id);
      setFolder(response.data);
    } catch {
      setFolder(null);
    } finally {
      setIsLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetch();
  }, [fetch]);

  return { folder, isLoading, refetch: fetch };
}

export function useTags() {
  const [tags, setTags] = useState<Tag[]>([]);
  const [tagsWithCounts, setTagsWithCounts] = useState<{ id: string; name: string; color: string; note_count: number }[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const fetch = useCallback(async () => {
    setIsLoading(true);
    try {
      const [tagsResponse, countsResponse] = await Promise.allSettled([
        tagsApi.list(),
        tagsApi.listWithCounts(),
      ]);
      if (tagsResponse.status === 'fulfilled') {
        setTags(tagsResponse.value.data);
      }
      if (countsResponse.status === 'fulfilled') {
        setTagsWithCounts(countsResponse.value.data);
      }
      if (tagsResponse.status === 'rejected' && countsResponse.status === 'rejected') {
        toast.error('Failed to load tags', { id: 'tags-load-error' });
      }
    } catch {
      toast.error('Failed to load tags', { id: 'tags-load-error' });
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetch();
  }, [fetch]);

  const createTag = async (data: TagCreate) => {
    const response = await tagsApi.create(data);
    await fetch();
    toast.success('Tag created');
    return response.data;
  };

  const updateTag = async (id: string, data: TagUpdate) => {
    const response = await tagsApi.update(id, data);
    await fetch();
    return response.data;
  };

  const deleteTag = async (id: string) => {
    await tagsApi.delete(id);
    await fetch();
    toast.success('Tag deleted');
  };

  const bulkDeleteTags = async (tagIds: string[]) => {
    await tagsApi.bulkDelete(tagIds);
    await fetch();
    toast.success(`${tagIds.length} tags deleted`);
  };

  return {
    tags,
    tagsWithCounts,
    isLoading,
    fetch,
    createTag,
    updateTag,
    deleteTag,
    bulkDeleteTags,
  };
}

export function useTag(id: string | null | undefined) {
  const [tag, setTag] = useState<Tag | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const fetch = useCallback(async () => {
    if (!id) {
      setTag(null);
      return;
    }
    setIsLoading(true);
    try {
      const response = await tagsApi.get(id);
      setTag(response.data);
    } catch {
      setTag(null);
    } finally {
      setIsLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetch();
  }, [fetch]);

  return { tag, isLoading, refetch: fetch };
}

export function useSearch() {
  const [results, setResults] = useState<PaginatedResponse<Note> | null>(null);
  const [suggestions, setSuggestions] = useState<{ title: string; id: string }[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const searchNotes = async (params: SearchParams) => {
    setIsLoading(true);
    try {
      const response = await searchApi.notes(params);
      setResults(response.data);
    } catch {
      toast.error('Search failed');
    } finally {
      setIsLoading(false);
    }
  };

  const getSuggestions = async (q: string) => {
    if (q.length < 2) {
      setSuggestions([]);
      return;
    }
    try {
      const response = await searchApi.suggestions(q);
      setSuggestions(response.data.suggestions);
    } catch {
      // Ignore
    }
  };

  return { results, suggestions, isLoading, searchNotes, getSuggestions };
}

export function useSearchStats() {
  const [stats, setStats] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);

  const fetch = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await searchApi.stats();
      setStats(response.data);
    } catch {
      // Ignore
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetch();
  }, [fetch]);

  return { stats, isLoading, refetch: fetch };
}