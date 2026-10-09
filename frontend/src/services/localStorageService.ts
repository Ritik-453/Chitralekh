import { openDB, DBSchema, IDBPDatabase } from 'idb';
import type { Note } from '../types';
import { compressText } from '../utils/compression';
import toast from 'react-hot-toast';

interface NotesAppDB extends DBSchema {
  notes: {
    key: string;
    value: Note & { locallySavedAt?: string };
    indexes: { 'by-updated': string; 'by-title': string };
  };
  files: {
    key: string;
    value: {
      id: string;
      name: string;
      type: string;
      size: number;
      dataUrl: string;
      savedAt: string;
    };
  };
  diagrams: {
    key: string;
    value: {
      id: string;
      title: string;
      code: string;
      type: string;
      savedAt: string;
    };
  };
}

const DB_NAME = 'NotesAppLocalDeviceStorage';
const DB_VERSION = 1;

let dbPromise: Promise<IDBPDatabase<NotesAppDB>> | null = null;

function getDB(): Promise<IDBPDatabase<NotesAppDB>> {
  if (!dbPromise) {
    dbPromise = openDB<NotesAppDB>(DB_NAME, DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains('notes')) {
          const notesStore = db.createObjectStore('notes', { keyPath: 'id' });
          notesStore.createIndex('by-updated', 'updated_at');
          notesStore.createIndex('by-title', 'title');
        }
        if (!db.objectStoreNames.contains('files')) {
          db.createObjectStore('files', { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains('diagrams')) {
          db.createObjectStore('diagrams', { keyPath: 'id' });
        }
      },
    });
  }
  return dbPromise;
}

export const localStorageService = {
  /**
   * Save a note to the local device IndexedDB storage.
   */
  async saveNote(note: Note): Promise<void> {
    try {
      const db = await getDB();
      await db.put('notes', {
        ...note,
        locallySavedAt: new Date().toISOString(),
      });
      // If note contains flowchart, store diagram as well
      if (note.note_type === 'flowchart' && note.content) {
        await db.put('diagrams', {
          id: note.id,
          title: note.title,
          code: note.content,
          type: 'mermaid',
          savedAt: new Date().toISOString(),
        });
      }
    } catch (err) {
      console.warn('Failed to mirror note to local device storage:', err);
    }
  },

  /**
   * Batch save notes to local device storage.
   */
  async saveNotesBatch(notes: Note[]): Promise<void> {
    try {
      const db = await getDB();
      const tx = db.transaction('notes', 'readwrite');
      for (const note of notes) {
        await tx.store.put({
          ...note,
          locallySavedAt: new Date().toISOString(),
        });
      }
      await tx.done;
    } catch (err) {
      console.warn('Failed to batch save notes to local device storage:', err);
    }
  },

  /**
   * Retrieve all notes saved on local device storage.
   */
  async getAllNotes(): Promise<Note[]> {
    try {
      const db = await getDB();
      return await db.getAll('notes');
    } catch (err) {
      console.warn('Failed to read notes from local device storage:', err);
      return [];
    }
  },

  /**
   * Retrieve a single note from local device storage.
   */
  async getNote(id: string): Promise<Note | undefined> {
    try {
      const db = await getDB();
      return await db.get('notes', id);
    } catch (err) {
      console.warn(`Failed to read note ${id} from local device storage:`, err);
      return undefined;
    }
  },

  /**
   * Delete note from local device storage.
   */
  async deleteNote(id: string): Promise<void> {
    try {
      const db = await getDB();
      await db.delete('notes', id);
      await db.delete('diagrams', id);
    } catch (err) {
      console.warn(`Failed to delete note ${id} from local device storage:`, err);
    }
  },

  /**
   * Save an uploaded file / image / attachment locally into IndexedDB.
   */
  async saveFile(name: string, type: string, size: number, dataUrl: string): Promise<string> {
    try {
      const db = await getDB();
      const id = 'file_' + Date.now() + '_' + Math.random().toString(36).substring(2, 9);
      await db.put('files', {
        id,
        name,
        type,
        size,
        dataUrl,
        savedAt: new Date().toISOString(),
      });
      return id;
    } catch (err) {
      console.warn('Failed to save file to local device storage:', err);
      return '';
    }
  },

  /**
   * Export all notes, diagrams, and metadata to user's local hard drive as a downloadable JSON backup.
   */
  async exportAllNotesToDevice(): Promise<void> {
    try {
      const db = await getDB();
      const notes = await db.getAll('notes');
      const diagrams = await db.getAll('diagrams');

      const backupData = {
        exportedAt: new Date().toISOString(),
        appName: 'Notes App',
        totalNotes: notes.length,
        notes: notes,
        diagrams: diagrams,
      };

      const blob = new Blob([JSON.stringify(backupData, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `NotesApp_DeviceBackup_${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast.success(`Exported ${notes.length} notes to your device storage!`);
    } catch (err) {
      toast.error('Failed to export notes to local device');
      console.error(err);
    }
  },

  /**
   * Save an individual note file directly to user's computer disk.
   */
  exportSingleNote(note: Note): void {
    try {
      const extension = note.note_type === 'flowchart' ? 'mmd' : 'md';
      const safeTitle = (note.title || 'Untitled_Note').replace(/[/\\?%*:|"<>]/g, '_');
      const text = note.content || '';
      const fullText = note.note_type === 'flowchart' ? text : `# ${note.title}\n\n${text}`;

      const blob = new Blob([fullText], { type: 'text/markdown;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${safeTitle}.${extension}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast.success(`Saved "${safeTitle}.${extension}" to your device`);
    } catch (err) {
      toast.error('Failed to save file to local device');
    }
  },

  /**
   * Export Gzip-compressed backup of all local device notes.
   */
  async exportCompressedBackup(): Promise<void> {
    try {
      const db = await getDB();
      const notes = await db.getAll('notes');
      const diagrams = await db.getAll('diagrams');

      const backupData = {
        exportedAt: new Date().toISOString(),
        appName: 'Notes App',
        totalNotes: notes.length,
        notes: notes,
        diagrams: diagrams,
      };

      const rawJson = JSON.stringify(backupData, null, 2);
      const { base64, originalBytes, compressedBytes, savingsPercent } = await compressText(rawJson);

      const blob = new Blob([base64], { type: 'application/gzip' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `NotesApp_CompressedBackup_${new Date().toISOString().slice(0, 10)}.json.gz`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast.success(
        `Exported compressed backup (${(originalBytes / 1024).toFixed(0)} KB → ${(compressedBytes / 1024).toFixed(0)} KB, ${savingsPercent}% saved)! 💾`
      );
    } catch (err) {
      toast.error('Failed to export compressed backup');
      console.error(err);
    }
  },
};
