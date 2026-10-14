import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeRaw from 'rehype-raw';
import rehypeSanitize, { defaultSchema } from 'rehype-sanitize';
import rehypeSlug from 'rehype-slug';
import rehypeAutolinkHeadings from 'rehype-autolink-headings';
import { useEditor, useNote, useFlowchart, useFolders, useTags } from '../hooks';
import {
  Save,
  MoreVertical,
  Star,
  Bookmark,
  Archive,
  Tag as TagIcon,
  Folder,
  Share2,
  Download,
  Copy,
  RotateCcw,
  Eye,
  EyeOff,
  Code,
  Type,
  GitBranch,
  Trash2,
  Settings,
  Bold,
  Italic,
  Strikethrough,
  Code as CodeIcon,
  List,
  ListOrdered,
  Quote,
  Minus,
  Maximize2,
  Minimize2,
  Link as LinkIcon,
  Image,
  Table,
  Heading1,
  Heading2,
  Heading3,
  Undo,
  Redo,
  Upload,
  Sparkles,
  Plus,
  X,
  GraduationCap,
  Highlighter,
  CheckSquare,
  SquareCode,
  Calculator,
  AlertCircle,
  ChevronDown,
  Scissors,
  FilePlus,
  Search,
  Replace,
  CaseUpper,
  FileStack,
  Check,
  ChevronUp,
  Layers,
  FileText,
  BookOpen,
  Calendar,
  Bug,
  Compass,
} from 'lucide-react';
import { cn, extractTableOfContent, formatRelativeTime } from '../utils';
import type { Note, NoteType, Tag } from '../types';
import { notesApi } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { GuestAuthModal } from '../components/GuestAuthModal';
import { FileImportModal } from '../components/FileImportModal';
import { useTourStatus } from '../hooks/useTourStatus';
import { compressImageToWebP } from '../utils/compression';
import { MermaidDiagram } from '../components/MermaidDiagram';
import { FlowchartCanvas } from '../components/FlowchartCanvas';
import { autoQuoteMermaidLabels } from '../utils/mermaid';
import { flowchartToOutline, outlineToFlowchart } from '../utils/flowchartParser';
import toast from 'react-hot-toast';

const TOOLBAR_BUTTONS = [
  { icon: Heading1, title: 'Heading 1', shortcut: 'Ctrl+1', action: 'heading1' },
  { icon: Heading2, title: 'Heading 2', shortcut: 'Ctrl+2', action: 'heading2' },
  { icon: Heading3, title: 'Heading 3', shortcut: 'Ctrl+3', action: 'heading3' },
  { type: 'divider' },
  { icon: Bold, title: 'Bold', shortcut: 'Ctrl+B', action: 'bold' },
  { icon: Italic, title: 'Italic', shortcut: 'Ctrl+I', action: 'italic' },
  { icon: Strikethrough, title: 'Strikethrough', shortcut: 'Ctrl+Shift+X', action: 'strikethrough' },
  { icon: Highlighter, title: 'Highlight Text', shortcut: 'Ctrl+H', action: 'highlight' },
  { icon: CodeIcon, title: 'Inline Code', shortcut: 'Ctrl+E', action: 'code' },
  { type: 'divider' },
  { icon: List, title: 'Bullet List', shortcut: 'Ctrl+Shift+8', action: 'bulletList' },
  { icon: ListOrdered, title: 'Numbered List', shortcut: 'Ctrl+Shift+7', action: 'orderedList' },
  { icon: CheckSquare, title: 'Task / Checklist', shortcut: 'Ctrl+Shift+C', action: 'checklist' },
  { icon: Quote, title: 'Quote', shortcut: 'Ctrl+Shift+Q', action: 'quote' },
  { type: 'divider' },
  { icon: LinkIcon, title: 'Link', shortcut: 'Ctrl+K', action: 'link' },
  { icon: Image, title: 'Insert Image', shortcut: 'Ctrl+Shift+I', action: 'image' },
  { icon: Table, title: 'Custom Table Generator', action: 'table' },
  { icon: SquareCode, title: 'Code Block with Syntax', action: 'codeBlock' },
  { icon: Calculator, title: 'Math LaTeX Formula', action: 'mathBlock' },
  { icon: AlertCircle, title: 'Callout / Alert Banner', action: 'callout' },
  { icon: ChevronDown, title: 'Collapsible Section / Accordion', action: 'details' },
  { type: 'divider' },
  { icon: Search, title: 'Find & Replace', shortcut: 'Ctrl+F', action: 'findReplace' },
  { icon: CaseUpper, title: 'Change Text Case', action: 'caseTransform' },
  { icon: Minus, title: 'Horizontal Rule', action: 'hr' },
  { type: 'divider' },
  { icon: Undo, title: 'Undo', shortcut: 'Ctrl+Z', action: 'undo' },
  { icon: Redo, title: 'Redo', shortcut: 'Ctrl+Shift+Z', action: 'redo' },
];

const MARKDOWN_SNIPPETS = {
  bold: { prefix: '**', suffix: '**', placeholder: 'Bold text' },
  italic: { prefix: '*', suffix: '*', placeholder: 'Italic text' },
  strikethrough: { prefix: '~~', suffix: '~~', placeholder: 'Strikethrough' },
  highlight: { prefix: '<mark>', suffix: '</mark>', placeholder: 'Highlighted text' },
  code: { prefix: '`', suffix: '`', placeholder: 'code' },
  heading1: { prefix: '# ', suffix: '', placeholder: 'Heading 1' },
  heading2: { prefix: '## ', suffix: '', placeholder: 'Heading 2' },
  heading3: { prefix: '### ', suffix: '', placeholder: 'Heading 3' },
  bulletList: { prefix: '- ', suffix: '', placeholder: 'List item' },
  orderedList: { prefix: '1. ', suffix: '', placeholder: 'List item' },
  checklist: { prefix: '- [ ] ', suffix: '', placeholder: 'Task to do' },
  quote: { prefix: '> ', suffix: '', placeholder: 'Quote' },
  link: { prefix: '[', suffix: '](url)', placeholder: 'Link text' },
  image: { prefix: '![', suffix: '](url)', placeholder: 'Alt text' },
  hr: { prefix: '\n---\n', suffix: '', placeholder: '' },
  mathInline: { prefix: '$', suffix: '$', placeholder: 'E = mc^2' },
  mathBlock: { prefix: '$$\n', suffix: '\n$$', placeholder: '\\int_{0}^{\\infty} e^{-x^2} dx = \\frac{\\sqrt{\\pi}}{2}' },
  details: {
    prefix: '<details>\n<summary>',
    suffix: '</summary>\n\nHidden detailed notes and collapsible content go here...\n</details>\n',
    placeholder: 'Click to expand section',
  },
};

const NOTE_TEMPLATES = [
  {
    id: 'cornell',
    name: '🎓 Cornell Lecture Notes',
    description: 'Divided format for active recall, cues, and lecture summary',
    content: `# 🎓 Lecture: [Topic Name]\n\n**Date:** [Date] | **Professor/Instructor:** [Name] | **Course:** [Course Code]\n\n---\n\n### 💡 Key Cues & Questions\n- What is the primary principle of this topic?\n- Key formula or theorem:\n- Exam review question:\n\n---\n\n### 📝 Detailed Lecture Notes\n- Core concept 1:\n- Core concept 2:\n  - Supporting detail A:\n  - Supporting detail B:\n- Relevant diagrams / visual notes:\n\n---\n\n### 📌 Summary (Write in your own words)\n> In short, this lecture demonstrated that...\n`,
  },
  {
    id: 'meeting',
    name: '🤝 Meeting Notes & Action Items',
    description: 'Attendees, agenda topics, key decisions, and tracked action items',
    content: `# 🤝 Meeting: [Project / Discussion Title]\n\n**Date & Time:** ${new Date().toLocaleDateString()} | **Facilitator:** [Name]\n**Attendees:** @Person1, @Person2, @Person3\n\n---\n\n### 🎯 Meeting Objectives\n1. [Objective 1]\n2. [Objective 2]\n\n---\n\n### 📋 Discussion Points\n- **Topic 1:** Summary of discussion...\n- **Topic 2:** Key observations and architectural decisions...\n\n---\n\n### ✅ Action Items\n- [ ] Task 1 - @Assignee (Due: YYYY-MM-DD)\n- [ ] Task 2 - @Assignee (Due: YYYY-MM-DD)\n- [ ] Follow-up review scheduled for next week\n`,
  },
  {
    id: 'project',
    name: '🚀 Project Blueprint & Roadmap',
    description: 'Scope, architecture, milestones, and deliverables',
    content: `# 🚀 Project Blueprint: [Project Name]\n\n> **Executive Summary:** One-sentence pitch describing what we are building and the core value proposition.\n\n---\n\n### 🛠️ Architecture & Tech Stack\n| Component | Technology | Rationale |\n| --- | --- | --- |\n| Frontend | React + Vite | Fast HMR & responsive components |\n| Backend | FastAPI (Python) | High throughput async REST endpoints |\n| Database | SQLite / PostgreSQL | Structured relational models |\n\n---\n\n### 🚩 Milestones & Deliverables\n- [ ] **Phase 1: Foundation** - Database schemas and auth\n- [ ] **Phase 2: Core Features** - Note CRUD and rich formatting\n- [ ] **Phase 3: Testing & Polish** - Performance tuning and launch\n`,
  },
  {
    id: 'bug',
    name: '🐛 Bug Report & Debugging Log',
    description: 'Steps to reproduce, environment, logs, and resolution plan',
    content: `# 🐛 Bug Investigation: [Issue Title]\n\n**Severity:** High / Medium / Low | **Status:** Under Investigation\n\n---\n\n### 🔍 Steps to Reproduce\n1. Navigate to...\n2. Click on...\n3. Observe error behavior:\n\n---\n\n### 💥 Observed vs Expected Behavior\n- **Observed:** [What actually happened]\n- **Expected:** [What should happen]\n\n---\n\n### 💻 Stacktrace / Log Snippet\n\`\`\`bash\n[Paste logs or terminal error here]\n\`\`\`\n\n---\n\n### 💡 Root Cause Analysis & Fix Plan\n- Root cause:\n- Proposed patch:\n- [ ] Verify fix in test suite\n`,
  },
];

export function NoteEditorPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { isGuest } = useAuth();
  const isNew = id === 'new';
  const { note, isLoading: noteLoading, refetch } = useNote(id || null);
  const { folders } = useFolders();
  const { tags, createTag } = useTags();
  const { svg: flowchartSvg, error: flowchartError, isRendering: isFlowchartRendering, render: renderFlowchart } = useFlowchart();

  const [noteType, setNoteType] = useState<NoteType>('markdown');
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null);
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>([]);
  const [showPreview, setShowPreview] = useState(false);
  const [flowchartInputMode, setFlowchartInputMode] = useState<'code' | 'outline'>('code');
  const [flowchartLayout, setFlowchartLayout] = useState<'split' | 'canvas' | 'code'>('split');
  const [outlineText, setOutlineText] = useState('');
  const [showTOC, setShowTOC] = useState(false);
  const [syncToCloud, setSyncToCloud] = useState<boolean>(true);
  const [toc, setToc] = useState<{ level: number; text: string; id: string }[]>([]);
  const [activeHeadingId, setActiveHeadingId] = useState<string | null>(null);
  const [showNoteMenu, setShowNoteMenu] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);

  // Guest Auth Intercept Modal
  const [showGuestAuthModal, setShowGuestAuthModal] = useState(false);
  const [guestModalContext, setGuestModalContext] = useState({
    title: 'Sign In to Save to Cloud',
    description: 'Your note is saved locally in this browser. To save permanently to your account, sync across devices, and share to the Central Repository, please sign in or register.',
  });

  // New Modals & Drawers
  const [showTableModal, setShowTableModal] = useState(false);
  const [tableRows, setTableRows] = useState(3);
  const [tableCols, setTableCols] = useState(3);
  const [tableHasHeader, setTableHasHeader] = useState(true);

  const [showFindReplace, setShowFindReplace] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [replaceQuery, setReplaceQuery] = useState('');
  const [matchCase, setMatchCase] = useState(false);
  const [currentMatchIdx, setCurrentMatchIdx] = useState(0);

  const [showCaseMenu, setShowCaseMenu] = useState(false);
  const [showCodeBlockMenu, setShowCodeBlockMenu] = useState(false);
  const [showCalloutMenu, setShowCalloutMenu] = useState(false);

  const [showSplitModal, setShowSplitModal] = useState(false);
  const [splitMode, setSplitMode] = useState<'cursor' | 'headings'>('cursor');
  const [splitPart2Title, setSplitPart2Title] = useState('');
  const [cursorSplitIndex, setCursorSplitIndex] = useState(0);

  const [showAppendNoteModal, setShowAppendNoteModal] = useState(false);
  const [availableNotes, setAvailableNotes] = useState<Note[]>([]);
  const [appendSearchQuery, setAppendSearchQuery] = useState('');
  const [selectedNoteToAppend, setSelectedNoteToAppend] = useState<Note | null>(null);
  const [isLoadingNotes, setIsLoadingNotes] = useState(false);

  const [showTemplatesModal, setShowTemplatesModal] = useState(false);

  const [showTagPicker, setShowTagPicker] = useState(false);
  const [newTagName, setNewTagName] = useState('');
  const [newTagColor, setNewTagColor] = useState('#22c55e');
  const { isCompleted: isTourCompleted } = useTourStatus();

  const editorRef = useRef<HTMLTextAreaElement>(null);
  const previewRef = useRef<HTMLDivElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);

  const [autoSaveEnabled, setAutoSaveEnabled] = useState<boolean>(() => {
    const saved = localStorage.getItem('notes_autosave_enabled');
    return saved !== null ? saved === 'true' : false;
  });

  const toggleAutoSave = useCallback(() => {
    const next = !autoSaveEnabled;
    setAutoSaveEnabled(next);
    localStorage.setItem('notes_autosave_enabled', String(next));
    toast.success(next ? 'Autosave turned ON' : 'Autosave turned OFF', { id: 'autosave-toggle-status' });
  }, [autoSaveEnabled]);

  const {
    content,
    setContent,
    title,
    setTitle,
    isDirty,
    setIsDirty,
    isSaving,
    lastSaved,
    wordCount,
    readingTime,
    save,
    discardChanges,
  } = useEditor({
    note: note || null,
    onSave: (savedNote) => {
      if (isNew) {
        navigate(`/notes/${savedNote.id}`, { replace: true });
      }
      refetch();
    },
    autoSave: autoSaveEnabled,
    autoSaveInterval: 4000,
    noteType,
    folderId: selectedFolderId,
    tags: selectedTagIds,
    syncToCloud,
  });

  const handleSaveClick = async () => {
    if (isGuest) {
      await save(false);
      setGuestModalContext({
        title: 'Sign In to Save & Sync to Cloud',
        description: 'Your note has been saved locally in your browser so you won\'t lose your work! To save permanently to your cloud account and access from any device, please sign in or create an account.',
      });
      setShowGuestAuthModal(true);
      return;
    }
    save(true);
  };

  const handleToggleCloudSync = async () => {
    if (isGuest) {
      setGuestModalContext({
        title: 'Cloud Sync Requires Account',
        description: 'You are currently in Guest Mode. Cloud backups and central account sync require an account. Please sign in or register.',
      });
      setShowGuestAuthModal(true);
      return;
    }
    const nextVal = !syncToCloud;
    setSyncToCloud(nextVal);
    if (!isNew && note) {
      try {
        await notesApi.update(note.id, { sync_to_cloud: nextVal });
        if (nextVal) {
          toast.success('☁️ Cloud Sync enabled for this note (will backup to Google Drive)');
        } else {
          toast('🔒 Note set to Local Only (will never be uploaded to cloud)', { icon: '🔒' });
        }
        refetch();
      } catch {
        toast.error('Failed to update sync setting');
      }
    } else {
      if (nextVal) {
        toast.success('☁️ Note will sync to Google Drive when saved');
      } else {
        toast('🔒 Note will stay Local Only on this device', { icon: '🔒' });
      }
    }
  };

  // Direct image insertion helper
  const insertImageAtCursor = useCallback((imageUrl: string, altText: string) => {
    const textarea = editorRef.current;
    if (!textarea) {
      setContent(prev => `${prev}\n\n![${altText}](${imageUrl})\n`);
      setIsDirty(true);
      return;
    }
    const { selectionStart, selectionEnd, value } = textarea;
    const markdownImage = `\n![${altText}](${imageUrl})\n`;
    const newValue = value.slice(0, selectionStart) + markdownImage + value.slice(selectionEnd);
    setContent(newValue);
    setIsDirty(true);
    setTimeout(() => {
      textarea.focus();
      const newPos = selectionStart + markdownImage.length;
      textarea.setSelectionRange(newPos, newPos);
    }, 0);
  }, [setContent, setIsDirty]);

  const uploadAndInsertImage = useCallback(async (file: File) => {
    let fileToUpload = file;
    let savings = 0;
    const toastId = toast.loading('Optimizing image with WebP compression...');
    try {
      if (file.type.startsWith('image/')) {
        const comp = await compressImageToWebP(file);
        fileToUpload = comp.file;
        savings = comp.savingsPercent;
      }
      const res = await notesApi.uploadImage(fileToUpload);
      const cleanName = file.name.replace(/\.[^/.]+$/, '') || 'image';
      insertImageAtCursor(res.data.url, cleanName);
      if (savings > 0) {
        toast.success(`Image compressed (${savings}% saved) & inserted! ⚡`, { id: toastId });
      } else {
        toast.success('Image inserted directly on line!', { id: toastId });
      }
    } catch (err: any) {
      toast.error(err.response?.data?.detail || 'Failed to upload image', { id: toastId });
    }
  }, [insertImageAtCursor]);

  const handleImageFileSelect = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      await uploadAndInsertImage(file);
      e.target.value = '';
    }
  }, [uploadAndInsertImage]);

  const handlePaste = useCallback(async (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
    if (e.clipboardData && e.clipboardData.items) {
      const items = Array.from(e.clipboardData.items);
      const imageItem = items.find(item => item.type.startsWith('image/'));
      if (imageItem) {
        e.preventDefault();
        const file = imageItem.getAsFile();
        if (file) {
          const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
          const namedFile = new File([file], `screenshot_${timestamp}.png`, { type: file.type });
          await uploadAndInsertImage(namedFile);
        }
      }
    }
  }, [uploadAndInsertImage]);

  const handleDrop = useCallback(async (e: React.DragEvent<HTMLTextAreaElement>) => {
    if (e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      if (file.type.startsWith('image/')) {
        e.preventDefault();
        await uploadAndInsertImage(file);
      }
    }
  }, [uploadAndInsertImage]);

  const handleToggleTag = (tagId: string) => {
    setSelectedTagIds(prev => {
      const exists = prev.includes(tagId);
      return exists ? prev.filter(id => id !== tagId) : [...prev, tagId];
    });
    setIsDirty(true);
  };

  const handleRemoveTag = (tagId: string) => {
    setSelectedTagIds(prev => prev.filter(id => id !== tagId));
    setIsDirty(true);
  };

  const handleCreateAndSelectTag = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!newTagName.trim()) return;
    try {
      const created = await createTag({ name: newTagName.trim(), color: newTagColor });
      if (created && created.id) {
        setSelectedTagIds(prev => [...prev, created.id]);
        setIsDirty(true);
      }
      setNewTagName('');
      setShowTagPicker(false);
      toast.success(`Tag "${newTagName.trim()}" created`);
    } catch {
      toast.error('Failed to create tag');
    }
  };

  useEffect(() => {
    if (note) {
      setNoteType(note.note_type);
      setSelectedFolderId(note.folder_id);
      setSelectedTagIds(note.tags ? note.tags.map(t => t.id) : []);
      if (note.note_type === 'flowchart' && note.content) {
        renderFlowchart(note.content);
      }
      if (note.sync_to_cloud !== undefined) {
        setSyncToCloud(note.sync_to_cloud);
      }
    }
  }, [note?.id, note?.sync_to_cloud]);

  useEffect(() => {
    setToc(extractTableOfContent(content));
  }, [content]);

  // Insert arbitrary snippet at editor cursor
  const insertTextAtCursor = useCallback((prefix: string, suffix: string = '', placeholder: string = '') => {
    const textarea = editorRef.current;
    if (!textarea) {
      setContent(prev => `${prev}\n${prefix}${placeholder}${suffix}\n`);
      setIsDirty(true);
      return;
    }

    const { selectionStart, selectionEnd, value } = textarea;
    const selectedText = value.slice(selectionStart, selectionEnd);
    const textToInsert = prefix + (selectedText || placeholder) + suffix;

    const newValue = value.slice(0, selectionStart) + textToInsert + value.slice(selectionEnd);
    setContent(newValue);
    setIsDirty(true);

    setTimeout(() => {
      textarea.focus();
      if (!selectedText && placeholder) {
        const newPos = selectionStart + prefix.length;
        textarea.setSelectionRange(newPos, newPos + placeholder.length);
      } else {
        const newPos = selectionStart + textToInsert.length;
        textarea.setSelectionRange(newPos, newPos);
      }
    }, 0);
  }, [setContent, setIsDirty]);

  const handleToolbarAction = useCallback((action: string) => {
    if (action === 'image') {
      imageInputRef.current?.click();
      return;
    }
    if (action === 'table') {
      setShowTableModal(true);
      return;
    }
    if (action === 'codeBlock') {
      setShowCodeBlockMenu(prev => !prev);
      return;
    }
    if (action === 'callout') {
      setShowCalloutMenu(prev => !prev);
      return;
    }
    if (action === 'findReplace') {
      setShowFindReplace(prev => !prev);
      return;
    }
    if (action === 'caseTransform') {
      setShowCaseMenu(prev => !prev);
      return;
    }

    const snippet = MARKDOWN_SNIPPETS[action as keyof typeof MARKDOWN_SNIPPETS];
    if (snippet) {
      insertTextAtCursor(snippet.prefix, snippet.suffix, snippet.placeholder);
    }
  }, [insertTextAtCursor]);

  // Table Generator Handler
  const handleInsertGeneratedTable = () => {
    let tableMd = '\n';
    // Headers
    if (tableHasHeader) {
      const headers = Array.from({ length: tableCols }, (_, i) => `Header ${i + 1}`);
      const dividers = Array.from({ length: tableCols }, () => '---');
      tableMd += `| ${headers.join(' | ')} |\n`;
      tableMd += `| ${dividers.join(' | ')} |\n`;
    }
    // Rows
    for (let r = 0; r < tableRows; r++) {
      const cells = Array.from({ length: tableCols }, (_, c) => `Cell ${r + 1}.${c + 1}`);
      tableMd += `| ${cells.join(' | ')} |\n`;
    }
    tableMd += '\n';

    insertTextAtCursor(tableMd);
    setShowTableModal(false);
    toast.success(`Inserted ${tableRows}x${tableCols} table!`);
  };

  // Code Block with Specific Language Syntax
  const handleInsertCodeBlock = (lang: string) => {
    insertTextAtCursor(`\`\`\`${lang}\n`, '\n```\n', `// Write your ${lang} code here`);
    setShowCodeBlockMenu(false);
  };

  // Callout Banners
  const handleInsertCallout = (type: 'NOTE' | 'TIP' | 'IMPORTANT' | 'WARNING' | 'CAUTION') => {
    insertTextAtCursor(`> [!${type}]\n> `, '\n', `Highlight important information or advice here`);
    setShowCalloutMenu(false);
  };

  // Text Case Transforms
  const handleApplyCaseTransform = (mode: 'upper' | 'lower' | 'title') => {
    const textarea = editorRef.current;
    if (!textarea) return;
    const { selectionStart, selectionEnd, value } = textarea;
    const selected = value.slice(selectionStart, selectionEnd);
    if (!selected) {
      toast.error('Select text in editor to change its case');
      setShowCaseMenu(false);
      return;
    }

    let transformed = selected;
    if (mode === 'upper') {
      transformed = selected.toUpperCase();
    } else if (mode === 'lower') {
      transformed = selected.toLowerCase();
    } else if (mode === 'title') {
      transformed = selected.replace(
        /\w\S*/g,
        txt => txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase()
      );
    }

    const newValue = value.slice(0, selectionStart) + transformed + value.slice(selectionEnd);
    setContent(newValue);
    setIsDirty(true);
    setShowCaseMenu(false);
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(selectionStart, selectionStart + transformed.length);
    }, 0);
    toast.success(`Converted text to ${mode}case!`);
  };

  // Find & Replace Logic
  const getMatchIndices = useCallback((): number[] => {
    if (!searchQuery) return [];
    const indices: number[] = [];
    const haystack = matchCase ? content : content.toLowerCase();
    const needle = matchCase ? searchQuery : searchQuery.toLowerCase();
    let pos = 0;
    while ((pos = haystack.indexOf(needle, pos)) !== -1) {
      indices.push(pos);
      pos += needle.length;
    }
    return indices;
  }, [content, searchQuery, matchCase]);

  const matches = getMatchIndices();

  const handleFindNext = (direction: 'next' | 'prev' = 'next') => {
    if (!matches.length) {
      toast.error('No matches found');
      return;
    }
    let nextIdx = direction === 'next' ? currentMatchIdx + 1 : currentMatchIdx - 1;
    if (nextIdx >= matches.length) nextIdx = 0;
    if (nextIdx < 0) nextIdx = matches.length - 1;
    setCurrentMatchIdx(nextIdx);

    const pos = matches[nextIdx];
    const textarea = editorRef.current;
    if (textarea) {
      textarea.focus();
      textarea.setSelectionRange(pos, pos + searchQuery.length);
    }
  };

  const handleReplaceOne = () => {
    if (!matches.length || !searchQuery) return;
    const pos = matches[currentMatchIdx] ?? matches[0];
    const newContent = content.slice(0, pos) + replaceQuery + content.slice(pos + searchQuery.length);
    setContent(newContent);
    setIsDirty(true);
    toast.success('Replaced 1 occurrence');
  };

  const handleReplaceAll = () => {
    if (!matches.length || !searchQuery) return;
    const escaped = searchQuery.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(escaped, matchCase ? 'g' : 'gi');
    const newContent = content.replace(regex, replaceQuery);
    const count = matches.length;
    setContent(newContent);
    setIsDirty(true);
    toast.success(`Replaced all ${count} occurrences!`);
  };

  // Open Split Modal & calculate split position
  const handleOpenSplitModal = () => {
    const textarea = editorRef.current;
    const cursorPos = textarea ? textarea.selectionStart : Math.floor(content.length / 2);
    setCursorSplitIndex(cursorPos);
    setSplitPart2Title(`${title || 'Untitled Note'} (Part 2)`);
    setShowSplitModal(true);
  };

  // Execute Split
  const handleExecuteSplit = async () => {
    if (splitMode === 'cursor') {
      const topHalf = content.slice(0, cursorSplitIndex).trimEnd();
      const bottomHalf = content.slice(cursorSplitIndex).trimStart();

      if (!bottomHalf) {
        toast.error('No content after split point to create Part 2');
        return;
      }

      const toastId = toast.loading('Splitting note...');
      try {
        // Create new note with second half
        const res = await notesApi.create({
          title: splitPart2Title.trim() || `${title} (Part 2)`,
          content: bottomHalf,
          note_type: noteType,
          folder_id: selectedFolderId || undefined,
          tags: selectedTagIds,
        });

        // Update current note with top half
        setContent(topHalf);
        setIsDirty(true);
        setShowSplitModal(false);
        toast.success(
          `Note split successfully! Created "${res.data.title}".`,
          { id: toastId }
        );
      } catch (err: any) {
        toast.error(err.response?.data?.detail || 'Failed to split note', { id: toastId });
      }
    } else {
      // Split by Headings
      const headingRegex = /^(#{1,3})\s+(.+)$/gm;
      const sections: { title: string; body: string }[] = [];
      let match;
      let lastIndex = 0;
      let lastTitle = title || 'Introduction';

      while ((match = headingRegex.exec(content)) !== null) {
        if (match.index > lastIndex) {
          const body = content.slice(lastIndex, match.index).trim();
          if (body) {
            sections.push({ title: lastTitle, body });
          }
        }
        lastTitle = match[2].trim();
        lastIndex = match.index;
      }
      if (lastIndex < content.length) {
        const body = content.slice(lastIndex).trim();
        if (body) {
          sections.push({ title: lastTitle, body });
        }
      }

      if (sections.length <= 1) {
        toast.error('Could not find multiple headings (# or ##) to split by');
        return;
      }

      const toastId = toast.loading(`Splitting into ${sections.length} separate notes...`);
      try {
        // Keep section 0 in current note
        setTitle(sections[0].title);
        setContent(sections[0].body);
        setIsDirty(true);

        // Create other sections as individual notes
        for (let i = 1; i < sections.length; i++) {
          await notesApi.create({
            title: sections[i].title,
            content: sections[i].body,
            note_type: noteType,
            folder_id: selectedFolderId || undefined,
            tags: selectedTagIds,
          });
        }
        setShowSplitModal(false);
        toast.success(`Split into ${sections.length} separate notes successfully!`, { id: toastId });
      } catch (err: any) {
        toast.error(err.response?.data?.detail || 'Failed to split notes by headings', { id: toastId });
      }
    }
  };

  // Open Append Note Modal
  const handleOpenAppendNoteModal = async () => {
    setShowAppendNoteModal(true);
    setIsLoadingNotes(true);
    try {
      const res = await notesApi.getAll({ pageSize: 50 });
      const currentId = note?.id;
      setAvailableNotes((res.data.notes || []).filter(n => n.id !== currentId));
    } catch {
      toast.error('Failed to load notebook library');
    } finally {
      setIsLoadingNotes(false);
    }
  };

  // Execute Append
  const handleExecuteAppendNote = () => {
    if (!selectedNoteToAppend) return;
    const appendMarkdown = `\n\n---\n\n# 📑 ${selectedNoteToAppend.title}\n\n${selectedNoteToAppend.content || ''}`;
    setContent(prev => (prev.trim() ? `${prev}${appendMarkdown}` : appendMarkdown.trimStart()));
    setIsDirty(true);
    setShowAppendNoteModal(false);
    setSelectedNoteToAppend(null);
    toast.success(`Appended "${selectedNoteToAppend.title}" to this note!`);
  };

  // Apply Template
  const handleApplyTemplate = (tmpl: typeof NOTE_TEMPLATES[0]) => {
    if (content.trim()) {
      if (confirm('Append template to bottom of current note? (Click Cancel to replace current note content)')) {
        setContent(prev => `${prev}\n\n---\n\n${tmpl.content}`);
      } else {
        setContent(tmpl.content);
        if (!title.trim() || title === 'Untitled') {
          setTitle(tmpl.name.replace(/^[^\w\s]+\s*/, ''));
        }
      }
    } else {
      setContent(tmpl.content);
      if (!title.trim() || title === 'Untitled') {
        setTitle(tmpl.name.replace(/^[^\w\s]+\s*/, ''));
      }
    }
    setIsDirty(true);
    setShowTemplatesModal(false);
    toast.success(`Applied ${tmpl.name}!`);
  };

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if ((e.metaKey || e.ctrlKey) && e.key === 's') {
      e.preventDefault();
      save();
    }
    if ((e.metaKey || e.ctrlKey) && e.key === 'f') {
      e.preventDefault();
      setShowFindReplace(prev => !prev);
    }
  }, [save]);

  const handleDelete = async () => {
    if (!note || !confirm('Delete this note permanently?')) return;
    try {
      await notesApi.delete(note.id);
      toast.success('Note deleted');
      navigate('/notes');
    } catch {
      toast.error('Failed to delete note');
    }
  };

  const handleDuplicate = async () => {
    if (!note) return;
    try {
      const res = await notesApi.create({
        title: `${note.title} (Copy)`,
        content: note.content || '',
        note_type: note.note_type,
        folder_id: note.folder_id || undefined,
        tags: note.tags ? note.tags.map(t => t.id) : [],
      });
      toast.success('Note duplicated');
      navigate(`/notes/${res.data.id}`);
    } catch {
      toast.error('Failed to duplicate note');
    }
  };

  const handleExport = () => {
    const blob = new Blob([`# ${title}\n\n${content}`], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${title || 'note'}.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleCopyLink = () => {
    if (!note) return;
    navigator.clipboard.writeText(`${window.location.origin}/notes/${note.id}`);
    toast.success('Link copied');
  };

  if (noteLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="w-8 h-8 border-4 border-primary-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // Flowchart & Diagram View
  if (noteType === 'flowchart' || noteType === 'diagram') {
    return (
      <div className={cn('h-full w-full flex-1 min-h-0 flex flex-col overflow-hidden', isFullscreen && 'fixed inset-0 z-50 bg-white dark:bg-secondary-900')}>
        <div className="shrink-0 z-20 bg-white/90 dark:bg-secondary-900/90 backdrop-blur-sm border-b border-secondary-200 dark:border-secondary-700">
          <div className="flex items-center justify-between h-14 px-3 sm:px-4 lg:px-6 gap-2">
            <div className="flex items-center gap-3 min-w-0 flex-1">
              <button onClick={() => navigate(-1)} className="btn-ghost p-1.5 lg:hidden shrink-0" aria-label="Back">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
              </button>
              <input
                type="text"
                value={title}
                onChange={e => setTitle(e.target.value)}
                className="bg-transparent border-none text-base sm:text-lg font-semibold text-secondary-900 dark:text-white min-w-[120px] max-w-xs sm:max-w-md focus:outline-none placeholder:text-secondary-400 truncate"
                placeholder={noteType === 'flowchart' ? 'Untitled flowchart' : 'Untitled diagram'}
              />
              <span className="px-2 py-0.5 text-xs font-medium bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 rounded shrink-0">
                {noteType === 'flowchart' ? 'Flowchart' : 'Diagram'}
              </span>
            </div>
            <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
              <button
                type="button"
                onClick={toggleAutoSave}
                className={cn(
                  'px-2 py-1 text-xs font-medium rounded-lg border transition-colors flex items-center gap-1.5 shrink-0',
                  autoSaveEnabled
                    ? 'bg-emerald-50 text-emerald-700 border-emerald-300 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800'
                    : 'bg-secondary-100 text-secondary-600 border-secondary-300 dark:bg-secondary-800 dark:text-secondary-400 dark:border-secondary-700'
                )}
                title={autoSaveEnabled ? 'Autosave is ON (Click to disable)' : 'Autosave is OFF (Click to enable)'}
              >
                <span className={cn('w-1.5 h-1.5 rounded-full', autoSaveEnabled ? 'bg-emerald-500 animate-pulse' : 'bg-secondary-400')} />
                <span>Autosave: {autoSaveEnabled ? 'ON' : 'OFF'}</span>
              </button>
              <button onClick={handleSaveClick} disabled={isSaving} className="btn-primary py-1 px-2.5 sm:px-3 text-xs sm:text-sm flex items-center gap-1.5 shrink-0 font-medium">
                <Save className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                <span>{isSaving ? 'Saving...' : isDirty ? 'Save' : 'Saved'}</span>
              </button>
              <button onClick={() => setIsFullscreen(!isFullscreen)} className="btn-ghost p-1.5 sm:p-2 rounded-lg shrink-0" aria-label={isFullscreen ? 'Exit fullscreen' : 'Fullscreen'}>
                {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
              </button>
            </div>
          </div>
          <div className="border-t border-secondary-200/80 dark:border-secondary-700/80 px-3 sm:px-4 py-1.5 flex items-center justify-between gap-2 overflow-x-auto scrollbar-thin bg-secondary-50/70 dark:bg-secondary-800/40">
            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={() => {
                  if (!content.trim()) {
                    toast.error('Please enter Mermaid diagram code to render');
                    return;
                  }
                  renderFlowchart(content);
                }}
                className="btn-secondary py-1 px-2.5 text-xs flex items-center gap-1 shrink-0"
                disabled={isFlowchartRendering}
              >
                <RotateCcw className={cn("w-3.5 h-3.5", isFlowchartRendering && "animate-spin")} />
                {isFlowchartRendering ? 'Rendering...' : 'Render'}
              </button>
              <button onClick={() => handleExport()} className="btn-secondary py-1 px-2.5 text-xs flex items-center gap-1 shrink-0" disabled={!flowchartSvg}>
                <Download className="w-3.5 h-3.5" />
                Export SVG
              </button>

              {/* Mode Toggle: Mermaid Code vs flowchart.fun Simple Outline */}
              <div className="flex items-center rounded-lg bg-secondary-200/80 dark:bg-secondary-800/80 p-0.5 border border-secondary-300/60 dark:border-secondary-700/60 text-xs">
                <button
                  type="button"
                  onClick={() => setFlowchartInputMode('code')}
                  className={cn(
                    'px-2 py-0.5 rounded-md font-medium transition-all text-xs',
                    flowchartInputMode === 'code'
                      ? 'bg-white dark:bg-secondary-700 text-secondary-900 dark:text-white shadow-2xs font-semibold'
                      : 'text-secondary-600 dark:text-secondary-400 hover:text-secondary-900 dark:hover:text-white'
                  )}
                >
                  Mermaid Code
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const outline = flowchartToOutline(content);
                    setOutlineText(outline);
                    setFlowchartInputMode('outline');
                  }}
                  className={cn(
                    'px-2 py-0.5 rounded-md font-medium transition-all text-xs flex items-center gap-1',
                    flowchartInputMode === 'outline'
                      ? 'bg-white dark:bg-secondary-700 text-secondary-900 dark:text-white shadow-2xs font-semibold'
                      : 'text-secondary-600 dark:text-secondary-400 hover:text-secondary-900 dark:hover:text-white'
                  )}
                  title="Edit as simple indented text outline (like flowchart.fun)"
                >
                  <Sparkles className="w-3 h-3 text-amber-500" />
                  <span>Simple Outline</span>
                </button>
              </div>

              {/* View Layout Mode: Split vs Full Canvas vs Code Only */}
              <div className="flex items-center rounded-lg bg-secondary-200/80 dark:bg-secondary-800/80 p-0.5 border border-secondary-300/60 dark:border-secondary-700/60 text-xs">
                <button
                  type="button"
                  onClick={() => setFlowchartLayout('split')}
                  className={cn(
                    'px-2 py-0.5 rounded-md font-medium transition-all text-xs flex items-center gap-1',
                    flowchartLayout === 'split'
                      ? 'bg-white dark:bg-secondary-700 text-secondary-900 dark:text-white shadow-2xs font-semibold'
                      : 'text-secondary-600 dark:text-secondary-400 hover:text-secondary-900 dark:hover:text-white'
                  )}
                  title="Side-by-side Split View"
                >
                  <span>Split</span>
                </button>
                <button
                  type="button"
                  onClick={() => setFlowchartLayout('canvas')}
                  className={cn(
                    'px-2 py-0.5 rounded-md font-medium transition-all text-xs flex items-center gap-1',
                    flowchartLayout === 'canvas'
                      ? 'bg-white dark:bg-secondary-700 text-primary-600 dark:text-primary-400 shadow-2xs font-bold'
                      : 'text-secondary-600 dark:text-secondary-400 hover:text-secondary-900 dark:hover:text-white'
                  )}
                  title="Switch Canvas to Full Width (hides code for spacious visual editing)"
                >
                  <Maximize2 className="w-3 h-3" />
                  <span>Full Canvas</span>
                </button>
                <button
                  type="button"
                  onClick={() => setFlowchartLayout('code')}
                  className={cn(
                    'px-2 py-0.5 rounded-md font-medium transition-all text-xs flex items-center gap-1',
                    flowchartLayout === 'code'
                      ? 'bg-white dark:bg-secondary-700 text-secondary-900 dark:text-white shadow-2xs font-semibold'
                      : 'text-secondary-600 dark:text-secondary-400 hover:text-secondary-900 dark:hover:text-white'
                  )}
                  title="Code editor only"
                >
                  <span>Code</span>
                </button>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <select value={noteType} onChange={e => setNoteType(e.target.value as NoteType)} className="input text-xs py-1 px-2 w-auto shrink-0">
                <option value="markdown">Markdown</option>
                <option value="flowchart">Flowchart</option>
                <option value="diagram">Diagram</option>
              </select>
            </div>
          </div>
        </div>
        <div className="flex-1 min-h-0 flex overflow-hidden">
          <div className={cn(
            'border-r border-secondary-200 dark:border-secondary-700 flex flex-col overflow-hidden font-mono text-sm bg-secondary-50 dark:bg-secondary-950 transition-all',
            flowchartLayout === 'canvas' ? 'hidden' : flowchartLayout === 'split' ? 'w-1/2' : 'w-full'
          )}>
            {flowchartInputMode === 'outline' ? (
              <div className="flex-1 flex flex-col min-h-0">
                <div className="px-3 py-1.5 bg-amber-500/10 border-b border-amber-500/20 text-[11px] text-amber-700 dark:text-amber-300 flex items-center justify-between">
                  <span>💡 <strong>Outline Mode</strong>: Indent lines by 2 spaces to branch (like flowchart.fun)</span>
                  <span className="text-secondary-400">Auto-syncs to Mermaid</span>
                </div>
                <textarea
                  value={outlineText}
                  onChange={(e) => {
                    const text = e.target.value;
                    setOutlineText(text);
                    const converted = outlineToFlowchart(text);
                    setContent(converted);
                    setIsDirty(true);
                    renderFlowchart(converted);
                  }}
                  onKeyDown={(e) => {
                    // Support Tab key indentation
                    if (e.key === 'Tab') {
                      e.preventDefault();
                      const target = e.target as HTMLTextAreaElement;
                      const start = target.selectionStart;
                      const end = target.selectionEnd;
                      const nextText = outlineText.substring(0, start) + '  ' + outlineText.substring(end);
                      setOutlineText(nextText);
                      const converted = outlineToFlowchart(nextText);
                      setContent(converted);
                      setIsDirty(true);
                      renderFlowchart(converted);
                      setTimeout(() => {
                        target.selectionStart = target.selectionEnd = start + 2;
                      }, 0);
                    }
                  }}
                  className="flex-1 w-full p-4 bg-transparent border-none resize-none text-secondary-900 dark:text-white focus:outline-none overflow-y-auto scrollbar-thin leading-relaxed"
                  placeholder={"Start\n  Process Data\n    Is valid?\n      Save to database\n      Show error"}
                  spellCheck={false}
                />
              </div>
            ) : (
              <textarea
                ref={editorRef}
                value={content}
                onChange={e => setContent(e.target.value)}
                onKeyDown={handleKeyDown}
                className="flex-1 w-full p-4 bg-transparent border-none resize-none text-secondary-900 dark:text-white focus:outline-none overflow-y-auto scrollbar-thin leading-relaxed"
                placeholder="Enter Mermaid diagram code..."
                spellCheck={false}
              />
            )}
          </div>
          <div className={cn(
            'flex flex-col overflow-hidden bg-secondary-900 transition-all',
            flowchartLayout === 'code' ? 'hidden' : flowchartLayout === 'split' ? 'w-1/2' : 'w-full'
          )}>
            {flowchartError ? (
              <div className="h-full flex flex-col justify-center items-center p-4 overflow-y-auto scrollbar-thin">
                <div className="w-full max-w-md bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/60 rounded-2xl p-5 text-left shadow-sm">
                  <div className="flex items-center gap-2.5 text-red-700 dark:text-red-300 font-bold mb-2 text-sm">
                    <div className="p-1.5 rounded-lg bg-red-100 dark:bg-red-900/50 text-red-600 dark:text-red-400">
                      <AlertCircle className="w-4 h-4" />
                    </div>
                    <span>Mermaid Syntax Error</span>
                  </div>
                  <pre className="text-xs text-red-700 dark:text-red-300 font-mono bg-white/80 dark:bg-secondary-900/80 p-3 rounded-lg border border-red-200 dark:border-red-900/40 whitespace-pre-wrap break-words leading-relaxed mb-4">
                    {flowchartError}
                  </pre>
                  <div className="text-xs text-secondary-600 dark:text-secondary-400 space-y-2">
                    <p className="font-semibold text-secondary-800 dark:text-secondary-200">💡 Quick Fix:</p>
                    <p>Labels with parentheses, colons, or math must be enclosed in quotes like <code>D["e^(iπ) + 1 = 0"]</code>.</p>
                    
                    {autoQuoteMermaidLabels(content) !== content && (
                      <button
                        type="button"
                        onClick={() => {
                          const fixed = autoQuoteMermaidLabels(content);
                          setContent(fixed);
                          setIsDirty(true);
                          renderFlowchart(fixed);
                          toast.success('Auto-quoted special characters & math formulas!');
                        }}
                        className="btn-primary py-1.5 px-3 text-xs w-full justify-center flex items-center gap-1.5 mt-2 bg-emerald-600 hover:bg-emerald-700 text-white"
                      >
                        <Sparkles className="w-3.5 h-3.5" />
                        <span>Auto-Fix Quotes & Special Symbols</span>
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={() => {
                        const lines = content.trim().split('\n').filter(Boolean);
                        let sample = '';
                        if (lines.length >= 2) {
                          sample = `flowchart TD\n` + lines.map((l, i) => `    node${i + 1}["${l.trim()}"]`).join(' --> ');
                        } else {
                          sample = `flowchart TD\n    A[Start] --> B[${content.trim() || 'Process'}]\n    B --> C[End]`;
                        }
                        setContent(sample);
                        setIsDirty(true);
                        renderFlowchart(sample);
                      }}
                      className="btn-secondary py-1.5 px-3 text-xs w-full justify-center flex items-center gap-1.5 mt-1.5"
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>Convert Text to Flowchart Diagram</span>
                    </button>
                  </div>
                </div>
              </div>
            ) : flowchartSvg ? (
              <FlowchartCanvas
                svg={flowchartSvg}
                code={content}
                onChangeCode={(newCode) => {
                  setContent(newCode);
                  setIsDirty(true);
                  if (flowchartInputMode === 'outline') {
                    setOutlineText(flowchartToOutline(newCode));
                  }
                }}
                onRender={(codeToRender) => {
                  renderFlowchart(codeToRender || content);
                }}
                isRendering={isFlowchartRendering}
              />
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-secondary-500 gap-2">
                <RotateCcw className="w-8 h-8 opacity-30 text-secondary-400" />
                <p className="font-medium text-sm">Click "Render" to preview the flowchart</p>
                <p className="text-xs text-secondary-400">Requires valid syntax like <code>flowchart TD; A--&gt;B</code></p>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Standard Markdown Editor View
  return (
    <div className={cn('h-full w-full flex-1 min-h-0 flex flex-col overflow-hidden', isFullscreen && 'fixed inset-0 z-50 bg-white dark:bg-secondary-900')}>
      {/* Top Header Bar */}
      <div className="shrink-0 z-20 bg-white/90 dark:bg-secondary-900/90 backdrop-blur-sm border-b border-secondary-200 dark:border-secondary-700">
        <div className="flex items-center justify-between h-14 px-3 sm:px-4 lg:px-6 gap-2">
          {/* Left Side: Back + Title + NoteType */}
          <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
            <button onClick={() => navigate(-1)} className="btn-ghost p-1.5 lg:hidden shrink-0" aria-label="Back">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
            </button>
            <input
              type="text"
              value={title}
              onChange={e => setTitle(e.target.value)}
              className="bg-transparent border-none text-base sm:text-lg font-semibold text-secondary-900 dark:text-white min-w-[120px] max-w-xs sm:max-w-md focus:outline-none placeholder:text-secondary-400 truncate"
              placeholder="Untitled"
            />
            <select
              value={noteType}
              onChange={e => setNoteType(e.target.value as NoteType)}
              className="input text-xs py-1 px-2 w-auto hidden sm:block shrink-0"
            >
              <option value="markdown">Markdown</option>
              <option value="flowchart">Flowchart</option>
              <option value="diagram">Diagram</option>
              <option value="code">Code</option>
              <option value="text">Text</option>
            </select>
          </div>

          {/* Right Side Actions: Import, Templates, Append, Split, Preview, Autosave, Save, More */}
          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            <button
              onClick={() => setShowImportModal(true)}
              className="btn-ghost p-1.5 sm:p-2 rounded-lg text-indigo-500 hover:text-indigo-400 hover:bg-indigo-500/10 shrink-0"
              title="Import Documents & Images (OCR) - Multi-file / Appending"
              aria-label="Import Document"
            >
              <Upload className="w-4 h-4 sm:w-5 sm:h-5" />
            </button>

            <button
              onClick={() => setShowTemplatesModal(true)}
              className="btn-ghost p-1.5 sm:p-2 rounded-lg text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/10 shrink-0"
              title="Insert Note Template (Cornell, Meeting, Project)"
              aria-label="Templates"
            >
              <Compass className="w-4 h-4 sm:w-5 sm:h-5" />
            </button>

            <button
              onClick={handleOpenAppendNoteModal}
              className="btn-ghost p-1.5 sm:p-2 rounded-lg text-blue-600 dark:text-blue-400 hover:bg-blue-500/10 shrink-0 hidden sm:inline-flex"
              title="Append Existing Note from Library"
              aria-label="Append Note"
            >
              <FileStack className="w-4 h-4 sm:w-5 sm:h-5" />
            </button>

            <button
              onClick={handleOpenSplitModal}
              className="btn-ghost p-1.5 sm:p-2 rounded-lg text-amber-600 dark:text-amber-400 hover:bg-amber-500/10 shrink-0 hidden sm:inline-flex"
              title="Split Note (At Cursor or by Headings)"
              aria-label="Split Note"
            >
              <Scissors className="w-4 h-4 sm:w-5 sm:h-5" />
            </button>

            {!isTourCompleted && (
              <button
                onClick={() => window.dispatchEvent(new CustomEvent('start-newbie-tour'))}
                className="btn-ghost p-1.5 sm:p-2 rounded-lg text-amber-600 dark:text-amber-400 hover:bg-amber-500/10 shrink-0"
                title="Start Feature Tour Guide"
                aria-label="Newbie Sticky Guide"
              >
                <span className="text-base leading-none">📌</span>
              </button>
            )}

            <button
              onClick={() => setShowPreview(!showPreview)}
              className={cn('btn-ghost p-1.5 sm:p-2 rounded-lg shrink-0', showPreview && 'bg-primary-100 text-primary-700 dark:bg-primary-900/30 dark:text-primary-300')}
              title={showPreview ? 'Exit preview' : 'Preview note'}
              aria-label="Toggle preview"
            >
              {showPreview ? <EyeOff className="w-4 h-4 sm:w-5 sm:h-5" /> : <Eye className="w-4 h-4 sm:w-5 sm:h-5" />}
            </button>

            <button
              type="button"
              onClick={toggleAutoSave}
              className={cn(
                'px-2 py-1 text-xs font-medium rounded-lg border transition-colors flex items-center gap-1.5 shrink-0',
                autoSaveEnabled
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-300 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800'
                  : 'bg-secondary-100 text-secondary-600 border-secondary-300 dark:bg-secondary-800 dark:text-secondary-400 dark:border-secondary-700'
              )}
              title={autoSaveEnabled ? 'Autosave is ON (Click to disable)' : 'Autosave is OFF (Click to enable)'}
            >
              <span className={cn('w-1.5 h-1.5 rounded-full', autoSaveEnabled ? 'bg-emerald-500 animate-pulse' : 'bg-secondary-400')} />
              <span>Autosave: {autoSaveEnabled ? 'ON' : 'OFF'}</span>
            </button>

            {/* Selective Cloud Sync Toggle */}
            <button
              type="button"
              onClick={handleToggleCloudSync}
              className={cn(
                'px-2.5 py-1 text-xs font-semibold rounded-lg border transition-all flex items-center gap-1.5 shrink-0 cursor-pointer shadow-2xs',
                syncToCloud
                  ? 'bg-blue-50 text-blue-700 border-blue-300 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800 hover:bg-blue-100'
                  : 'bg-amber-50 text-amber-800 border-amber-300 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800 hover:bg-amber-100'
              )}
              title={
                syncToCloud
                  ? '☁️ Cloud Sync: ACTIVE (Will back up to your Google Drive when connected)'
                  : '🔒 Local Device Only: Private (Will NEVER be uploaded to the cloud)'
              }
            >
              <span className="text-sm leading-none">{syncToCloud ? '☁️' : '🔒'}</span>
              <span className="hidden md:inline font-bold">
                {syncToCloud ? 'Cloud Sync' : 'Local Only'}
              </span>
            </button>

            <button
              onClick={handleSaveClick}
              disabled={isSaving}
              className="btn-primary py-1 px-2.5 sm:px-3 text-xs sm:text-sm flex items-center gap-1.5 shrink-0 font-medium"
            >
              <Save className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              <span>{isSaving ? 'Saving...' : isDirty ? 'Save' : 'Saved'}</span>
            </button>

            <button
              onClick={() => setIsFullscreen(!isFullscreen)}
              className="btn-ghost p-1.5 sm:p-2 rounded-lg shrink-0 hidden sm:inline-flex"
              aria-label={isFullscreen ? 'Exit fullscreen' : 'Fullscreen'}
            >
              {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
            </button>

            <div className="relative shrink-0">
              <button onClick={() => setShowNoteMenu(!showNoteMenu)} className="btn-ghost p-1.5 sm:p-2 rounded-lg" aria-label="More options">
                <MoreVertical className="w-4 h-4 sm:w-5 sm:h-5" />
              </button>
              {showNoteMenu && (
                <div className="absolute right-0 mt-2 w-56 bg-white dark:bg-secondary-800 rounded-lg shadow-lg border border-secondary-200 dark:border-secondary-700 animate-fade-in z-30">
                  <button onClick={() => { setShowNoteMenu(false); setShowImportModal(true); }} className="dropdown-item w-full text-indigo-500 dark:text-indigo-400">
                    <Sparkles className="w-4 h-4" /> Multi-file / OCR Import
                  </button>
                  <button onClick={() => { setShowNoteMenu(false); handleOpenAppendNoteModal(); }} className="dropdown-item w-full text-blue-500">
                    <FileStack className="w-4 h-4" /> Append From Library
                  </button>
                  <button onClick={() => { setShowNoteMenu(false); handleOpenSplitModal(); }} className="dropdown-item w-full text-amber-500">
                    <Scissors className="w-4 h-4" /> Split This Note
                  </button>
                  <button onClick={() => { setShowNoteMenu(false); navigate('/central-repository'); }} className="dropdown-item w-full text-indigo-500 dark:text-indigo-400">
                    <GraduationCap className="w-4 h-4" /> Central Repository
                  </button>
                  <button onClick={() => { setShowNoteMenu(false); setShowStickyGuideModal(true); }} className="dropdown-item w-full text-amber-600 dark:text-amber-400">
                    <span className="text-base leading-none">📌</span> Newbie Sticky Guide
                  </button>
                  <button onClick={handleDuplicate} className="dropdown-item w-full"><Copy className="w-4 h-4" /> Duplicate Note</button>
                  <button onClick={handleExport} className="dropdown-item w-full"><Download className="w-4 h-4" /> Export as Markdown</button>
                  <button onClick={handleCopyLink} className="dropdown-item w-full"><Copy className="w-4 h-4" /> Copy Direct Link</button>
                  <hr className="my-1 border-secondary-200 dark:border-secondary-700" />
                  <button onClick={handleDelete} className="dropdown-item w-full text-red-600"><Trash2 className="w-4 h-4" /> Delete Note</button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Formatting Toolbar Ribbon */}
        {!showPreview && (
          <div className="border-t border-secondary-200/80 dark:border-secondary-700/80 px-3 sm:px-4 py-1 flex items-center gap-1 overflow-x-auto scrollbar-thin bg-secondary-50/70 dark:bg-secondary-800/40 relative">
            <div className="flex items-center gap-0.5 shrink-0">
              {TOOLBAR_BUTTONS.map((btn, i) =>
                btn.type === 'divider' ? (
                  <div key={i} className="w-px h-5 bg-secondary-300 dark:bg-secondary-600 mx-1 shrink-0" />
                ) : (
                  <button
                    key={btn.action}
                    onClick={() => handleToolbarAction(btn.action as string)}
                    className="btn-ghost p-1.5 rounded hover:bg-secondary-200 dark:hover:bg-secondary-700 shrink-0 text-secondary-700 dark:text-secondary-300"
                    title={`${btn.title} ${btn.shortcut ? `(${btn.shortcut})` : ''}`}
                  >
                    {btn.icon ? React.createElement(btn.icon as any, { className: 'w-4 h-4' }) : null}
                  </button>
                )
              )}
            </div>

            {/* Code Block Language Picker Popover */}
            {showCodeBlockMenu && (
              <div className="absolute top-full left-48 mt-1 w-52 bg-white dark:bg-secondary-800 rounded-xl shadow-xl border border-secondary-200 dark:border-secondary-700 p-2 z-40 animate-slide-up">
                <div className="flex items-center justify-between pb-1.5 mb-1.5 border-b border-secondary-100 dark:border-secondary-700">
                  <span className="text-xs font-semibold text-secondary-700 dark:text-secondary-300">Choose Language:</span>
                  <button onClick={() => setShowCodeBlockMenu(false)} className="text-secondary-400 hover:text-secondary-600"><X className="w-3.5 h-3.5" /></button>
                </div>
                <div className="grid grid-cols-2 gap-1 text-xs">
                  {['typescript', 'javascript', 'python', 'html', 'css', 'sql', 'bash', 'json', 'cpp', 'markdown'].map(lang => (
                    <button
                      key={lang}
                      onClick={() => handleInsertCodeBlock(lang)}
                      className="px-2 py-1 text-left rounded hover:bg-secondary-100 dark:hover:bg-secondary-700 text-secondary-700 dark:text-secondary-300 capitalize truncate"
                    >
                      {lang}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Callout Alert Style Picker Popover */}
            {showCalloutMenu && (
              <div className="absolute top-full left-56 mt-1 w-48 bg-white dark:bg-secondary-800 rounded-xl shadow-xl border border-secondary-200 dark:border-secondary-700 p-2 z-40 animate-slide-up">
                <div className="flex items-center justify-between pb-1.5 mb-1.5 border-b border-secondary-100 dark:border-secondary-700">
                  <span className="text-xs font-semibold text-secondary-700 dark:text-secondary-300">Callout Banner:</span>
                  <button onClick={() => setShowCalloutMenu(false)} className="text-secondary-400 hover:text-secondary-600"><X className="w-3.5 h-3.5" /></button>
                </div>
                <div className="space-y-1 text-xs">
                  <button onClick={() => handleInsertCallout('NOTE')} className="w-full text-left px-2 py-1 rounded hover:bg-blue-50 dark:hover:bg-blue-900/30 text-blue-600 font-medium">ℹ️ Note</button>
                  <button onClick={() => handleInsertCallout('TIP')} className="w-full text-left px-2 py-1 rounded hover:bg-emerald-50 dark:hover:bg-emerald-900/30 text-emerald-600 font-medium">💡 Tip</button>
                  <button onClick={() => handleInsertCallout('IMPORTANT')} className="w-full text-left px-2 py-1 rounded hover:bg-purple-50 dark:hover:bg-purple-900/30 text-purple-600 font-medium">⭐ Important</button>
                  <button onClick={() => handleInsertCallout('WARNING')} className="w-full text-left px-2 py-1 rounded hover:bg-amber-50 dark:hover:bg-amber-900/30 text-amber-600 font-medium">⚠️ Warning</button>
                  <button onClick={() => handleInsertCallout('CAUTION')} className="w-full text-left px-2 py-1 rounded hover:bg-red-50 dark:hover:bg-red-900/30 text-red-600 font-medium">🛑 Caution</button>
                </div>
              </div>
            )}

            {/* Case Transform Menu */}
            {showCaseMenu && (
              <div className="absolute top-full left-64 mt-1 w-44 bg-white dark:bg-secondary-800 rounded-xl shadow-xl border border-secondary-200 dark:border-secondary-700 p-2 z-40 animate-slide-up">
                <div className="flex items-center justify-between pb-1 mb-1 border-b border-secondary-100 dark:border-secondary-700">
                  <span className="text-xs font-semibold text-secondary-700 dark:text-secondary-300">Change Case:</span>
                  <button onClick={() => setShowCaseMenu(false)} className="text-secondary-400 hover:text-secondary-600"><X className="w-3.5 h-3.5" /></button>
                </div>
                <div className="space-y-1 text-xs">
                  <button onClick={() => handleApplyCaseTransform('upper')} className="w-full text-left px-2 py-1 rounded hover:bg-secondary-100 dark:hover:bg-secondary-700">UPPERCASE</button>
                  <button onClick={() => handleApplyCaseTransform('lower')} className="w-full text-left px-2 py-1 rounded hover:bg-secondary-100 dark:hover:bg-secondary-700">lowercase</button>
                  <button onClick={() => handleApplyCaseTransform('title')} className="w-full text-left px-2 py-1 rounded hover:bg-secondary-100 dark:hover:bg-secondary-700">Title Case</button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Find & Replace Floating Ribbon Bar */}
        {showFindReplace && (
          <div className="border-t border-secondary-200 dark:border-secondary-700 px-4 py-2 bg-indigo-50/80 dark:bg-indigo-950/40 flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2 flex-1 min-w-[280px]">
              <div className="relative flex-1">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={e => {
                    setSearchQuery(e.target.value);
                    setCurrentMatchIdx(0);
                  }}
                  placeholder="Find in note..."
                  className="input py-1 text-xs pr-14"
                  autoFocus
                />
                <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-secondary-400">
                  {matches.length > 0 ? `${currentMatchIdx + 1} of ${matches.length}` : '0 results'}
                </span>
              </div>

              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => handleFindNext('prev')}
                  disabled={!matches.length}
                  className="p-1 rounded bg-secondary-100 dark:bg-secondary-800 hover:bg-secondary-200 disabled:opacity-40"
                  title="Previous match"
                >
                  <ChevronUp className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => handleFindNext('next')}
                  disabled={!matches.length}
                  className="p-1 rounded bg-secondary-100 dark:bg-secondary-800 hover:bg-secondary-200 disabled:opacity-40"
                  title="Next match"
                >
                  <ChevronDown className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => setMatchCase(prev => !prev)}
                  className={cn('px-1.5 py-0.5 rounded font-mono text-[11px] border', matchCase ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-secondary-100 dark:bg-secondary-800 border-secondary-300 dark:border-secondary-600')}
                  title="Match case"
                >
                  Aa
                </button>
              </div>
            </div>

            <div className="flex items-center gap-2 flex-1 min-w-[280px]">
              <input
                type="text"
                value={replaceQuery}
                onChange={e => setReplaceQuery(e.target.value)}
                placeholder="Replace with..."
                className="input py-1 text-xs flex-1"
              />
              <button
                type="button"
                onClick={handleReplaceOne}
                disabled={!matches.length}
                className="btn-secondary py-1 px-2 text-xs disabled:opacity-40"
              >
                Replace
              </button>
              <button
                type="button"
                onClick={handleReplaceAll}
                disabled={!matches.length}
                className="btn-primary py-1 px-2.5 text-xs disabled:opacity-40"
              >
                Replace All
              </button>
              <button
                type="button"
                onClick={() => setShowFindReplace(false)}
                className="p-1 text-secondary-400 hover:text-secondary-600 rounded"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* Table of Contents Header Ribbon */}
        {showTOC && toc.length > 0 && (
          <div className="border-t border-secondary-200 dark:border-secondary-700 px-4 py-2 bg-secondary-50 dark:bg-secondary-800/50">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium text-secondary-500 uppercase">Table of Contents</span>
              <button onClick={() => setShowTOC(false)} className="text-xs text-secondary-500 hover:text-secondary-700">Hide</button>
            </div>
            <nav className="flex flex-wrap gap-2 max-h-24 overflow-y-auto" role="navigation" aria-label="Table of contents">
              {toc.map(heading => (
                <button
                  key={heading.id}
                  onClick={() => {
                    const element = previewRef.current?.querySelector(`#${heading.id}`);
                    element?.scrollIntoView({ behavior: 'smooth' });
                    setActiveHeadingId(heading.id);
                  }}
                  className={cn(
                    'text-xs px-2 py-1 rounded transition-colors',
                    activeHeadingId === heading.id
                      ? 'bg-primary-100 text-primary-700 dark:bg-primary-900/30 dark:text-primary-300'
                      : 'text-secondary-600 hover:bg-secondary-200 dark:text-secondary-400 dark:hover:bg-secondary-700'
                  )}
                  style={{ paddingLeft: `${heading.level * 8}px` }}
                >
                  {heading.text}
                </button>
              ))}
            </nav>
          </div>
        )}
      </div>

      {/* Editor Main Content Area */}
      <div className="flex-1 min-h-0 flex overflow-hidden">
        <div className={cn('flex-1 min-w-0 border-r border-secondary-200 dark:border-secondary-700 flex flex-col overflow-hidden', showPreview && 'hidden')}>
          <textarea
            ref={editorRef}
            value={content}
            onChange={e => setContent(e.target.value)}
            onKeyDown={handleKeyDown}
            onPaste={handlePaste}
            onDrop={handleDrop}
            className="flex-1 w-full p-4 bg-transparent border-none resize-none text-secondary-900 dark:text-white focus:outline-none font-mono text-sm leading-relaxed overflow-y-auto scrollbar-thin"
            placeholder="Start writing your note... (Markdown supported. Paste or drop images directly onto the line!)"
            spellCheck={true}
          />
        </div>

        <div className={cn('flex-1 min-w-0 overflow-y-auto scrollbar-thin', !showPreview && 'hidden')}>
          <div ref={previewRef} className="p-6 max-w-3xl mx-auto prose prose-secondary dark:prose-invert">
            <ReactMarkdown
              components={{
                h1: ({ children, id, ...props }) => <h1 id={id || slugify(children)} {...props}>{children}</h1>,
                h2: ({ children, id, ...props }) => <h2 id={id || slugify(children)} {...props}>{children}</h2>,
                h3: ({ children, id, ...props }) => <h3 id={id || slugify(children)} {...props}>{children}</h3>,
                img: ({ src, alt, ...props }: any) => {
                  const resolvedSrc = src || '';
                  return (
                    <img
                      src={resolvedSrc}
                      alt={alt || ''}
                      className="rounded-xl my-4 max-w-full h-auto shadow-md border border-secondary-200 dark:border-secondary-700 block transition-all"
                      loading="lazy"
                      onError={(e: any) => {
                        if (resolvedSrc.startsWith('/uploads/') && !resolvedSrc.startsWith('http://localhost:8000')) {
                          e.currentTarget.src = `http://localhost:8000${resolvedSrc}`;
                        }
                      }}
                      {...props}
                    />
                  );
                },
                code: ({ node, inline, className, children, ...props }: any) => {
                  const match = /language-(\w+)/.exec(className || '');
                  if (!inline && match && match[1] === 'mermaid') {
                    return <MermaidDiagram code={String(children).replace(/\n$/, '')} />;
                  }
                  if (inline) {
                    return (
                      <code className="inline-code" {...props}>
                        {children}
                      </code>
                    );
                  }
                  return (
                    <code className={className} {...props}>
                      {children}
                    </code>
                  );
                },
                blockquote: ({ children, ...props }: any) => {
                  return (
                    <blockquote
                      className="my-3 pl-4 py-2 border-l-4 border-indigo-500 bg-indigo-50/30 dark:bg-indigo-950/20 rounded-r-xl"
                      {...props}
                    >
                      {children}
                    </blockquote>
                  );
                },
              }}
              remarkPlugins={[remarkGfm]}
              rehypePlugins={[
                rehypeRaw,
                [
                  rehypeSanitize,
                  {
                    ...defaultSchema,
                    tagNames: [
                      ...(defaultSchema.tagNames || []),
                      'mark',
                      'details',
                      'summary',
                      'sub',
                      'sup',
                      'kbd',
                      'input',
                    ],
                    attributes: {
                      ...defaultSchema.attributes,
                      '*': [...(defaultSchema.attributes?.['*'] || []), 'className', 'id', 'open'],
                      a: [...(defaultSchema.attributes?.['a'] || []), 'target', 'rel'],
                      img: [...(defaultSchema.attributes?.['img'] || []), 'src', 'alt', 'width', 'height', 'loading', 'className'],
                      details: ['open', 'className'],
                      summary: ['className'],
                      input: ['type', 'checked', 'disabled'],
                    },
                  },
                ],
                rehypeSlug,
                rehypeAutolinkHeadings,
              ]}
            >
              {content}
            </ReactMarkdown>
          </div>
        </div>
      </div>

      {/* Fixed Editor Bottom Bar */}
      <div className="shrink-0 z-10 bg-white/90 dark:bg-secondary-900/90 backdrop-blur-sm border-t border-secondary-200 dark:border-secondary-700 px-3 sm:px-4 py-2 flex items-center justify-between gap-2 overflow-x-auto scrollbar-thin">
        <div className="flex items-center gap-4 text-xs text-secondary-500">
          <span>{wordCount} words</span>
          <span>·</span>
          <span>{readingTime} min read</span>
          <span>·</span>
          <span>{content.split('\n').length} lines</span>
          {lastSaved && (
            <>
              <span>·</span>
              <span>Saved {formatRelativeTime(lastSaved.toISOString())}</span>
            </>
          )}
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {/* Tag Selector with Interactive Chips */}
          <div className="relative flex items-center gap-1.5 flex-wrap">
            <TagIcon className="w-3.5 h-3.5 text-secondary-500" />
            {selectedTagIds.map(tagId => {
              const tagObj = tags.find(t => t.id === tagId);
              if (!tagObj) return null;
              return (
                <span
                  key={tagId}
                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border"
                  style={{
                    backgroundColor: tagObj.color + '15',
                    borderColor: tagObj.color + '40',
                    color: tagObj.color,
                  }}
                >
                  <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: tagObj.color }} />
                  {tagObj.name}
                  <button
                    type="button"
                    onClick={() => handleRemoveTag(tagId)}
                    className="hover:opacity-70 p-0.5 rounded-full"
                    title={`Remove ${tagObj.name}`}
                  >
                    <X className="w-2.5 h-2.5" />
                  </button>
                </span>
              );
            })}

            {/* Tag Picker Popover Button */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setShowTagPicker(!showTagPicker)}
                className="btn-ghost py-0.5 px-2 text-xs flex items-center gap-1 border border-dashed border-secondary-300 dark:border-secondary-600 rounded-full hover:border-primary-500"
                title="Add or remove tags"
              >
                <Plus className="w-3 h-3" />
                <span>Tag</span>
              </button>

              {showTagPicker && (
                <div
                  className="absolute bottom-full mb-2 right-0 sm:left-0 sm:right-auto w-64 bg-white dark:bg-secondary-800 rounded-xl shadow-xl border border-secondary-200 dark:border-secondary-700 p-2 z-40 animate-slide-up"
                  onClick={e => e.stopPropagation()}
                >
                  <div className="flex items-center justify-between pb-1.5 mb-1.5 border-b border-secondary-100 dark:border-secondary-700">
                    <span className="text-xs font-semibold text-secondary-600 dark:text-secondary-300">Select Tags</span>
                    <button onClick={() => setShowTagPicker(false)} className="text-secondary-400 hover:text-secondary-600">
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <div className="max-h-44 overflow-y-auto space-y-1 mb-2 scrollbar-thin">
                    {tags.length === 0 ? (
                      <p className="text-xs text-secondary-400 text-center py-2">No tags yet</p>
                    ) : (
                      tags.map(t => {
                        const isSelected = selectedTagIds.includes(t.id);
                        return (
                          <button
                            key={t.id}
                            type="button"
                            onClick={() => handleToggleTag(t.id)}
                            className={cn(
                              'w-full flex items-center justify-between px-2 py-1 rounded text-xs text-left transition-colors',
                              isSelected
                                ? 'bg-primary-50 text-primary-900 dark:bg-primary-900/30 dark:text-primary-200 font-medium'
                                : 'hover:bg-secondary-100 dark:hover:bg-secondary-700 text-secondary-700 dark:text-secondary-300'
                            )}
                          >
                            <span className="flex items-center gap-1.5 truncate">
                              <span className="w-2 h-2 rounded-full" style={{ backgroundColor: t.color }} />
                              <span className="truncate">{t.name}</span>
                            </span>
                            {isSelected && <span className="text-primary-600 font-bold ml-1">✓</span>}
                          </button>
                        );
                      })
                    )}
                  </div>
                  <div className="pt-1.5 border-t border-secondary-100 dark:border-secondary-700">
                    <div className="flex gap-1 items-center">
                      <input
                        type="text"
                        value={newTagName}
                        onChange={e => setNewTagName(e.target.value)}
                        placeholder="Create tag..."
                        className="input text-xs py-1 px-2 flex-1"
                        onKeyDown={e => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            handleCreateAndSelectTag();
                          }
                        }}
                      />
                      <input
                        type="color"
                        value={newTagColor}
                        onChange={e => setNewTagColor(e.target.value)}
                        className="w-6 h-6 rounded cursor-pointer border-0"
                        title="Choose tag color"
                      />
                      <button
                        type="button"
                        onClick={handleCreateAndSelectTag}
                        disabled={!newTagName.trim()}
                        className="btn-primary py-1 px-2 text-xs"
                      >
                        <Plus className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Folder Selector */}
          <div className="flex items-center gap-1">
            <Folder className="w-3.5 h-3.5 text-secondary-500" />
            <select
              value={selectedFolderId || ''}
              onChange={e => {
                setSelectedFolderId(e.target.value || null);
                setIsDirty(true);
              }}
              className="input text-xs py-1 px-2 w-auto"
            >
              <option value="">No folder</option>
              {folders.map(f => (
                <option key={f.id} value={f.id}>{f.name}</option>
              ))}
            </select>
          </div>

          <button onClick={() => setShowTOC(!showTOC)} className={cn('btn-ghost p-1.5 text-xs', showTOC && 'text-primary-600')}>
            <GitBranch className="w-3.5 h-3.5" />
            TOC
          </button>
        </div>
      </div>

      {/* Custom Table Generator Modal */}
      {showTableModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-sm bg-white dark:bg-secondary-800 rounded-2xl shadow-2xl border border-secondary-200 dark:border-secondary-700 p-5 space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-secondary-100 dark:border-secondary-700">
              <div className="flex items-center gap-2">
                <Table className="w-5 h-5 text-indigo-500" />
                <h3 className="font-semibold text-secondary-900 dark:text-white text-sm">Table Generator</h3>
              </div>
              <button onClick={() => setShowTableModal(false)} className="text-secondary-400 hover:text-secondary-600">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="text-secondary-700 dark:text-secondary-300 font-medium block mb-1">
                  Rows ({tableRows}):
                </label>
                <input
                  type="range"
                  min={1}
                  max={12}
                  value={tableRows}
                  onChange={e => setTableRows(Number(e.target.value))}
                  className="w-full"
                />
              </div>

              <div>
                <label className="text-secondary-700 dark:text-secondary-300 font-medium block mb-1">
                  Columns ({tableCols}):
                </label>
                <input
                  type="range"
                  min={1}
                  max={8}
                  value={tableCols}
                  onChange={e => setTableCols(Number(e.target.value))}
                  className="w-full"
                />
              </div>

              <label className="flex items-center gap-2 cursor-pointer pt-1">
                <input
                  type="checkbox"
                  checked={tableHasHeader}
                  onChange={e => setTableHasHeader(e.target.checked)}
                  className="rounded text-indigo-600"
                />
                <span className="text-secondary-700 dark:text-secondary-300">Include header row</span>
              </label>

              {/* Preview table shape */}
              <div className="p-3 bg-secondary-50 dark:bg-secondary-900/60 rounded-xl border border-secondary-200 dark:border-secondary-700 text-center">
                <p className="text-[11px] text-secondary-500">
                  Preview Grid: {tableRows} {tableRows === 1 ? 'row' : 'rows'} × {tableCols} {tableCols === 1 ? 'column' : 'columns'}
                </p>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowTableModal(false)}
                className="btn-secondary py-1.5 px-3 text-xs"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleInsertGeneratedTable}
                className="btn-primary py-1.5 px-4 text-xs font-semibold"
              >
                Insert Table
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Split Note Modal */}
      {showSplitModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/65 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-lg bg-white dark:bg-secondary-800 rounded-2xl shadow-2xl border border-secondary-200 dark:border-secondary-700 p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-secondary-100 dark:border-secondary-700">
              <div className="flex items-center gap-2">
                <Scissors className="w-5 h-5 text-amber-500" />
                <h3 className="font-semibold text-secondary-900 dark:text-white text-base">Split Note</h3>
              </div>
              <button onClick={() => setShowSplitModal(false)} className="text-secondary-400 hover:text-secondary-600">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs">
              <button
                type="button"
                onClick={() => setSplitMode('cursor')}
                className={cn(
                  'p-3 rounded-xl border text-left transition',
                  splitMode === 'cursor'
                    ? 'bg-amber-500/10 border-amber-500 text-amber-900 dark:text-amber-200 font-medium'
                    : 'bg-secondary-50 dark:bg-secondary-800 border-secondary-200 dark:border-secondary-700 text-secondary-600 dark:text-secondary-400'
                )}
              >
                <div className="font-semibold mb-0.5">✂️ Split at Cursor</div>
                <div className="text-[10px] opacity-80 leading-relaxed">
                  Cuts content at your current cursor position into a new Part 2 note
                </div>
              </button>

              <button
                type="button"
                onClick={() => setSplitMode('headings')}
                className={cn(
                  'p-3 rounded-xl border text-left transition',
                  splitMode === 'headings'
                    ? 'bg-amber-500/10 border-amber-500 text-amber-900 dark:text-amber-200 font-medium'
                    : 'bg-secondary-50 dark:bg-secondary-800 border-secondary-200 dark:border-secondary-700 text-secondary-600 dark:text-secondary-400'
                )}
              >
                <div className="font-semibold mb-0.5">📑 Split by Headings</div>
                <div className="text-[10px] opacity-80 leading-relaxed">
                  Separates every major section (# or ##) into its own individual note
                </div>
              </button>
            </div>

            {splitMode === 'cursor' ? (
              <div className="space-y-3 text-xs">
                <div>
                  <label className="text-secondary-700 dark:text-secondary-300 font-medium block mb-1">
                    Title for the Second Note:
                  </label>
                  <input
                    type="text"
                    value={splitPart2Title}
                    onChange={e => setSplitPart2Title(e.target.value)}
                    placeholder="Enter title for Part 2..."
                    className="input py-1.5 text-xs"
                  />
                </div>

                <div className="p-3 bg-secondary-50 dark:bg-secondary-900/60 rounded-xl border border-secondary-200 dark:border-secondary-700 space-y-1 text-[11px] text-secondary-500">
                  <p>
                    <strong>Part 1 (Current Note):</strong> Starts from beginning to cursor ({cursorSplitIndex} chars)
                  </p>
                  <p>
                    <strong>Part 2 (New Note):</strong> Remaining content from cursor to end ({content.length - cursorSplitIndex} chars)
                  </p>
                </div>
              </div>
            ) : (
              <div className="p-3 bg-secondary-50 dark:bg-secondary-900/60 rounded-xl border border-secondary-200 dark:border-secondary-700 text-xs text-secondary-600 dark:text-secondary-400">
                <p className="mb-2 font-medium">
                  Detected {toc.length} heading section(s) in this note.
                </p>
                <div className="max-h-36 overflow-y-auto space-y-1 scrollbar-thin">
                  {toc.map((t, idx) => (
                    <div key={idx} className="flex items-center gap-2 text-[11px]">
                      <span className="text-amber-500 font-mono">#{t.level}</span>
                      <span className="truncate">{t.text}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowSplitModal(false)}
                className="btn-secondary py-1.5 px-3 text-xs"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleExecuteSplit}
                className="btn-primary py-1.5 px-4 text-xs font-semibold bg-amber-600 hover:bg-amber-500 text-white"
              >
                Execute Split
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Append Note from Library Modal */}
      {showAppendNoteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/65 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-2xl bg-white dark:bg-secondary-800 rounded-2xl shadow-2xl border border-secondary-200 dark:border-secondary-700 p-6 flex flex-col max-h-[85vh] space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-secondary-100 dark:border-secondary-700">
              <div className="flex items-center gap-2">
                <FileStack className="w-5 h-5 text-blue-500" />
                <h3 className="font-semibold text-secondary-900 dark:text-white text-base">
                  Append Existing Note from Library
                </h3>
              </div>
              <button onClick={() => setShowAppendNoteModal(false)} className="text-secondary-400 hover:text-secondary-600">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="relative">
              <Search className="w-4 h-4 text-secondary-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={appendSearchQuery}
                onChange={e => setAppendSearchQuery(e.target.value)}
                placeholder="Search your notes to append..."
                className="input pl-9 py-1.5 text-xs"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 flex-1 min-h-[220px] overflow-hidden">
              {/* Note List */}
              <div className="overflow-y-auto space-y-1.5 pr-1 border-r border-secondary-100 dark:border-secondary-700/60 max-h-[300px] scrollbar-thin">
                {isLoadingNotes ? (
                  <p className="text-xs text-secondary-400 text-center py-8">Loading notebook library...</p>
                ) : (
                  availableNotes
                    .filter(n => !appendSearchQuery || n.title.toLowerCase().includes(appendSearchQuery.toLowerCase()))
                    .map(n => {
                      const isSelected = selectedNoteToAppend?.id === n.id;
                      return (
                        <div
                          key={n.id}
                          onClick={() => setSelectedNoteToAppend(n)}
                          className={cn(
                            'p-2.5 rounded-xl border text-left cursor-pointer transition',
                            isSelected
                              ? 'bg-blue-500/10 border-blue-500 text-blue-900 dark:text-blue-200'
                              : 'bg-secondary-50/50 dark:bg-secondary-800 border-secondary-200 dark:border-secondary-700 hover:border-secondary-400'
                          )}
                        >
                          <p className="text-xs font-medium truncate">{n.title || 'Untitled'}</p>
                          <p className="text-[10px] text-secondary-400 truncate mt-0.5">
                            {n.content ? n.content.substring(0, 60).replace(/\n/g, ' ') : 'Empty note'}
                          </p>
                        </div>
                      );
                    })
                )}
              </div>

              {/* Note Preview */}
              <div className="p-3 bg-secondary-50 dark:bg-secondary-900/60 rounded-xl border border-secondary-200 dark:border-secondary-700 flex flex-col justify-between overflow-hidden">
                {selectedNoteToAppend ? (
                  <div className="space-y-2 overflow-y-auto max-h-[250px] scrollbar-thin text-xs">
                    <h4 className="font-semibold text-secondary-900 dark:text-white border-b border-secondary-200 dark:border-secondary-700 pb-1">
                      {selectedNoteToAppend.title}
                    </h4>
                    <p className="font-mono text-[11px] text-secondary-700 dark:text-secondary-300 whitespace-pre-wrap leading-relaxed">
                      {selectedNoteToAppend.content || '(Empty content)'}
                    </p>
                  </div>
                ) : (
                  <div className="h-full flex items-center justify-center text-center text-xs text-secondary-400 p-4">
                    Select a note from the left to preview its content before appending.
                  </div>
                )}
              </div>
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-secondary-100 dark:border-secondary-700">
              <span className="text-[11px] text-secondary-400">
                Will be appended with divider <code className="text-indigo-400">---</code> at bottom
              </span>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setShowAppendNoteModal(false)}
                  className="btn-secondary py-1.5 px-3 text-xs"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleExecuteAppendNote}
                  disabled={!selectedNoteToAppend}
                  className="btn-primary py-1.5 px-4 text-xs font-semibold bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white"
                >
                  Append Note Content
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Templates Modal */}
      {showTemplatesModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/65 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-2xl bg-white dark:bg-secondary-800 rounded-2xl shadow-2xl border border-secondary-200 dark:border-secondary-700 p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-secondary-100 dark:border-secondary-700">
              <div className="flex items-center gap-2">
                <Compass className="w-5 h-5 text-emerald-500" />
                <h3 className="font-semibold text-secondary-900 dark:text-white text-base">Note Templates Library</h3>
              </div>
              <button onClick={() => setShowTemplatesModal(false)} className="text-secondary-400 hover:text-secondary-600">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {NOTE_TEMPLATES.map(tmpl => (
                <div
                  key={tmpl.id}
                  className="p-3.5 rounded-xl border border-secondary-200 dark:border-secondary-700 bg-secondary-50/50 dark:bg-secondary-800 hover:border-emerald-500/50 hover:bg-emerald-500/5 transition flex flex-col justify-between"
                >
                  <div>
                    <h4 className="text-xs font-semibold text-secondary-900 dark:text-white">{tmpl.name}</h4>
                    <p className="text-[11px] text-secondary-500 mt-1 leading-relaxed">{tmpl.description}</p>
                  </div>
                  <div className="pt-3 mt-3 border-t border-secondary-100 dark:border-secondary-700 flex justify-end">
                    <button
                      type="button"
                      onClick={() => handleApplyTemplate(tmpl)}
                      className="px-3 py-1 text-xs font-medium text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 hover:bg-emerald-500/20 rounded-lg transition"
                    >
                      Use Template
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={() => setShowTemplatesModal(false)}
                className="btn-secondary py-1.5 px-3 text-xs"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Multi-File / Mixed-Type Import Modal */}
      <FileImportModal
        isOpen={showImportModal}
        onClose={() => setShowImportModal(false)}
        onInsertText={(text, mode) => {
          if (mode === 'replace') {
            setContent(text);
          } else {
            setContent(content.trim() ? `${content}\n\n---\n\n${text}` : text);
          }
          setIsDirty(true);
        }}
      />

      {/* Hidden Native File Input for Direct Line Image Upload */}
      <input
        ref={imageInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleImageFileSelect}
      />

      {/* Guest Auth Required Modal */}
      <GuestAuthModal
        isOpen={showGuestAuthModal}
        onClose={() => setShowGuestAuthModal(false)}
        title={guestModalContext.title}
        description={guestModalContext.description}
        onDownloadLocal={handleExport}
      />
    </div>
  );
}

function slugify(text: any): string {
  if (!text) return '';
  const str = typeof text === 'string' ? text : Array.isArray(text) ? text.map(t => (typeof t === 'string' ? t : '')).join('') : String(text || '');
  return str.toLowerCase().trim().replace(/[^\w\s-]/g, '').replace(/[\s_-]+/g, '-').replace(/^-+|-+$/g, '');
}
