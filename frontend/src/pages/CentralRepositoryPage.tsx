import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeRaw from 'rehype-raw';
import rehypeSanitize, { defaultSchema } from 'rehype-sanitize';
import {
  GraduationCap,
  Search,
  Filter,
  BookOpen,
  History,
  GitFork,
  Download,
  ThumbsUp,
  Eye,
  Calendar,
  Building,
  Layers,
  Plus,
  FileText,
  X,
  ChevronRight,
  CheckCircle2,
  Clock,
  Sparkles,
  Upload,
  Share2,
  ArrowRight,
  Paperclip,
  HardDrive,
  Users,
  RefreshCw,
  Loader2,
  ExternalLink,
} from 'lucide-react';
import { centralRepoApi, notesApi } from '../services/api';
import { localStorageService } from '../services/localStorageService';
import { useAuth } from '../context/AuthContext';
import { useNotes } from '../hooks/useNotes';
import { cn, formatRelativeTime } from '../utils';
import { compressImageToWebP } from '../utils/compression';
import type { CentralRepoItem, CentralRepoVersion, CentralRepoMeta, Note } from '../types';
import toast from 'react-hot-toast';

export const CentralRepositoryPage: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { notes } = useNotes();

  // Data states
  const [items, setItems] = useState<CentralRepoItem[]>([]);
  const [meta, setMeta] = useState<CentralRepoMeta | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [totalItems, setTotalItems] = useState(0);
  const [page, setPage] = useState(1);
  const pageSize = 12;

  // Filter & Search states
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedInstitution, setSelectedInstitution] = useState('');
  const [selectedDepartment, setSelectedDepartment] = useState('');
  const [selectedBatch, setSelectedBatch] = useState('');
  const [selectedSemester, setSelectedSemester] = useState('');
  const [sortBy, setSortBy] = useState('updated_at');

  // Reader Modal states
  const [activeItem, setActiveItem] = useState<CentralRepoItem | null>(null);
  const [activeTab, setActiveTab] = useState<'reader' | 'heritage'>('reader');
  const [selectedVersionSnapshot, setSelectedVersionSnapshot] = useState<CentralRepoVersion | null>(null);

  // Upload Modal states
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadSource, setUploadSource] = useState<'my_notes' | 'file_upload'>('my_notes');
  const [selectedNoteId, setSelectedNoteId] = useState('');
  const [newTitle, setNewTitle] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [newInstitution, setNewInstitution] = useState(user?.institution || '');
  const [newDepartment, setNewDepartment] = useState(user?.department || '');
  const [newCourseCode, setNewCourseCode] = useState('');
  const [newCourseName, setNewCourseName] = useState('');
  const [newBatch, setNewBatch] = useState(user?.batch || '2024');
  const [newSemester, setNewSemester] = useState('Sem 1');
  const [newContent, setNewContent] = useState('');
  const [newChangeSummary, setNewChangeSummary] = useState('Initial release for batch study');
  const [attachedFile, setAttachedFile] = useState<File | null>(null);
  const [compressionSavings, setCompressionSavings] = useState<{
    originalSize: number;
    newSize: number;
    savingsPercent: number;
  } | null>(null);

  // Add Custom Metadata Modal states
  const [customMetaModal, setCustomMetaModal] = useState<{
    isOpen: boolean;
    category: 'institution' | 'department' | 'batch' | 'semester';
    title: string;
    placeholder: string;
  } | null>(null);
  const [customMetaInput, setCustomMetaInput] = useState('');
  const [isSavingMeta, setIsSavingMeta] = useState(false);

  const handleOpenAddMeta = (category: 'institution' | 'department' | 'batch' | 'semester') => {
    const titles = {
      institution: 'Add New College / Institution',
      department: 'Add New Department / Faculty',
      batch: 'Add New Academic Batch',
      semester: 'Add New Semester / Yearly Term',
    };
    const placeholders = {
      institution: 'e.g. Oxford University, IIT Bombay, UCLA',
      department: 'e.g. Artificial Intelligence, Robotics, Architecture',
      batch: 'e.g. Batch 2026-2030, Class of 2027',
      semester: 'e.g. Year 3 (Annual), Trimester 2, Summer Term',
    };
    setCustomMetaModal({
      isOpen: true,
      category,
      title: titles[category],
      placeholder: placeholders[category],
    });
    setCustomMetaInput('');
  };

  const handleSaveCustomMeta = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customMetaModal || !customMetaInput.trim()) return;
    setIsSavingMeta(true);
    try {
      const res = await centralRepoApi.addMeta(customMetaModal.category, customMetaInput.trim());
      setMeta(res.data);
      if (customMetaModal.category === 'institution') {
        setSelectedInstitution(customMetaInput.trim());
        setNewInstitution(customMetaInput.trim());
      } else if (customMetaModal.category === 'department') {
        setSelectedDepartment(customMetaInput.trim());
        setNewDepartment(customMetaInput.trim());
      } else if (customMetaModal.category === 'batch') {
        setSelectedBatch(customMetaInput.trim());
        setNewBatch(customMetaInput.trim());
      } else if (customMetaModal.category === 'semester') {
        setSelectedSemester(customMetaInput.trim());
        setNewSemester(customMetaInput.trim());
      }
      toast.success(`Added new ${customMetaModal.category}: "${customMetaInput.trim()}"`);
      setCustomMetaModal(null);
    } catch (err: any) {
      toast.error(err.response?.data?.detail || 'Failed to save metadata');
    } finally {
      setIsSavingMeta(false);
    }
  };

  // Contribute Version Modal states
  const [showVersionModal, setShowVersionModal] = useState(false);
  const [isSubmittingVersion, setIsSubmittingVersion] = useState(false);
  const [versionUpdaterName, setVersionUpdaterName] = useState(user?.full_name || user?.email?.split('@')[0] || '');
  const [versionUpdaterBatch, setVersionUpdaterBatch] = useState(user?.batch || '2025');
  const [versionChangeSummary, setVersionChangeSummary] = useState('');
  const [versionContent, setVersionContent] = useState('');

  // Fetch Meta (Distinct institutions, departments, batches)
  const fetchMeta = async () => {
    try {
      const res = await centralRepoApi.getMeta();
      setMeta(res.data);
    } catch (err) {
      console.warn('Failed to load repo meta:', err);
    }
  };

  // Fetch Central Repository Items
  const fetchItems = async () => {
    setIsLoading(true);
    try {
      const res = await centralRepoApi.list({
        search: searchQuery || undefined,
        institution: selectedInstitution || undefined,
        department: selectedDepartment || undefined,
        batch: selectedBatch || undefined,
        semester: selectedSemester || undefined,
        sort_by: sortBy,
        page,
        page_size: pageSize,
      });
      setItems(res.data.items || []);
      setTotalItems(res.data.total || 0);
    } catch (err: any) {
      toast.error(err.response?.data?.detail || 'Failed to load repository notes');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchMeta();
  }, []);

  useEffect(() => {
    fetchItems();
  }, [searchQuery, selectedInstitution, selectedDepartment, selectedBatch, selectedSemester, sortBy, page]);

  // Open item reader & sync latest detail (including all version lineage)
  const handleOpenReader = async (item: CentralRepoItem) => {
    setActiveItem(item);
    setActiveTab('reader');
    setSelectedVersionSnapshot(null);
    try {
      const res = await centralRepoApi.get(item.id);
      setActiveItem(res.data);
    } catch (err) {
      console.warn('Could not fetch full details for item:', err);
    }
  };

  // Like an item
  const handleLike = async (e: React.MouseEvent, itemId: string) => {
    e.stopPropagation();
    try {
      const res = await centralRepoApi.like(itemId);
      setItems((prev) =>
        prev.map((it) => (it.id === itemId ? { ...it, likes_count: res.data.likes_count } : it))
      );
      if (activeItem && activeItem.id === itemId) {
        setActiveItem({ ...activeItem, likes_count: res.data.likes_count });
      }
      toast.success('Liked! Knowledge acknowledged 👍');
    } catch (err) {
      toast.error('Could not like item');
    }
  };

  // Fork item to personal notes
  const handleFork = async (e: React.MouseEvent, item: CentralRepoItem) => {
    e.stopPropagation();
    const toastId = toast.loading('Forking to your personal notes...');
    try {
      const res = await centralRepoApi.fork(item.id);
      // Save locally to device as well
      await localStorageService.saveNote(res.data);
      toast.success('Forked to your personal notes! Ready for your edits 🚀', { id: toastId });
      navigate(`/notes/${res.data.id}`);
    } catch (err: any) {
      toast.error(err.response?.data?.detail || 'Failed to fork note', { id: toastId });
    }
  };

  // Download note to local device disk
  const handleDownloadNote = async (item: CentralRepoItem) => {
    try {
      await centralRepoApi.download(item.id);
      setItems((prev) =>
        prev.map((it) => (it.id === item.id ? { ...it, downloads_count: it.downloads_count + 1 } : it))
      );
      if (activeItem && activeItem.id === item.id) {
        setActiveItem({ ...activeItem, downloads_count: activeItem.downloads_count + 1 });
      }

      // If original file exists, trigger direct download of original file
      if (item.original_file_url) {
        const link = document.createElement('a');
        link.href = item.original_file_url;
        link.download = item.original_file_name || `${item.title}_Original`;
        link.target = '_blank';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        toast.success(`Downloaded original document: ${item.original_file_name || item.title}`);
        return;
      }

      // Otherwise export formatted Markdown
      const safeTitle = item.title.replace(/[/\\?%*:|"<>]/g, '_');
      const text = `# ${item.title}\n\n` +
        `> **Institution:** ${item.institution} | **Department:** ${item.department} | **Course:** ${item.course_code || 'N/A'}\n` +
        `> **Batch:** ${item.batch} | **Version:** v${item.current_version}\n\n` +
        `---\n\n${item.content}`;

      const blob = new Blob([text], { type: 'text/markdown;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${safeTitle}_v${item.current_version}.md`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success(`Saved "${safeTitle}.md" to your local device storage! 💾`);
    } catch (err) {
      toast.error('Download failed');
    }
  };

  // Handle note selection for upload modal
  const handleSelectMyNote = (noteId: string) => {
    setSelectedNoteId(noteId);
    const chosen = notes.find((n) => n.id === noteId);
    if (chosen) {
      setNewTitle(chosen.title);
      setNewContent(chosen.content || '');
      setNewDescription(`Course notes for ${newCourseCode || 'Academic study'}`);
    }
  };

  // Handle file input for new note upload
  const handleFileUploadChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      let file = e.target.files[0];
      setCompressionSavings(null);

      if (file.type.startsWith('image/')) {
        const toastId = toast.loading('Optimizing image with WebP compression for Central Repository...');
        try {
          const comp = await compressImageToWebP(file);
          file = comp.file;
          if (comp.savingsPercent > 0) {
            setCompressionSavings({
              originalSize: comp.originalSize,
              newSize: comp.newSize,
              savingsPercent: comp.savingsPercent,
            });
            toast.success(
              `WebP Compressed: ${(comp.originalSize / 1024).toFixed(0)} KB → ${(comp.newSize / 1024).toFixed(0)} KB (${comp.savingsPercent}% saved for repository) 🚀`,
              { id: toastId }
            );
          } else {
            toast.dismiss(toastId);
          }
        } catch {
          toast.dismiss(toastId);
        }
      }

      setAttachedFile(file);
      if (!newTitle) {
        setNewTitle(file.name.replace(/\.[^/.]+$/, ''));
      }
    }
  };

  // Submit Publish to Central Repository
  const handleSubmitPublish = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) {
      toast.error('Title is required');
      return;
    }
    if (!newInstitution.trim() || !newDepartment.trim()) {
      toast.error('Institution and Department are required for academic tracking');
      return;
    }

    setIsUploading(true);
    const toastId = toast.loading('Publishing to Central Academic Repository...');
    try {
      let originalUrl: string | undefined = undefined;
      let originalName: string | undefined = undefined;
      let originalType: string | undefined = undefined;

      // If user provided an attached file, upload it to static server storage
      if (attachedFile) {
        const uploadRes = await centralRepoApi.uploadAttachment(attachedFile);
        originalUrl = uploadRes.data.file_url;
        originalName = uploadRes.data.file_name;
        originalType = uploadRes.data.content_type;
      }

      await centralRepoApi.create({
        title: newTitle.trim(),
        description: newDescription.trim() || undefined,
        content: newContent || `## ${newTitle}\n\nAttached academic course file preserved in original format.`,
        institution: newInstitution.trim(),
        department: newDepartment.trim(),
        course_code: newCourseCode.trim() || undefined,
        course_name: newCourseName.trim() || undefined,
        batch: newBatch.trim() || '2024',
        semester: newSemester || undefined,
        original_file_url: originalUrl,
        original_file_name: originalName,
        original_file_type: originalType,
        initial_change_summary: newChangeSummary.trim() || 'Initial batch publication',
      });

      toast.success('Successfully published to Central Repository! Accessible by current & next batches 🎉', { id: toastId });
      setShowUploadModal(false);
      resetUploadForm();
      fetchItems();
      fetchMeta();
    } catch (err: any) {
      toast.error(err.response?.data?.detail || 'Failed to publish note', { id: toastId });
    } finally {
      setIsUploading(false);
    }
  };

  const resetUploadForm = () => {
    setSelectedNoteId('');
    setNewTitle('');
    setNewDescription('');
    setNewCourseCode('');
    setNewCourseName('');
    setNewContent('');
    setAttachedFile(null);
  };

  // Open Version update modal
  const handleOpenVersionModal = (item: CentralRepoItem) => {
    setActiveItem(item);
    setVersionUpdaterName(user?.full_name || user?.email?.split('@')[0] || '');
    setVersionUpdaterBatch(user?.batch || 'Next Batch');
    setVersionChangeSummary('');
    setVersionContent(item.content);
    setShowVersionModal(true);
  };

  // Submit next-batch version update
  const handleSubmitVersion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeItem) return;
    if (!versionChangeSummary.trim()) {
      toast.error('Please describe what changes/improvements your batch made');
      return;
    }

    setIsSubmittingVersion(true);
    const toastId = toast.loading(`Publishing Version v${activeItem.current_version + 1} for next batch...`);
    try {
      const res = await centralRepoApi.createVersion(activeItem.id, {
        title: activeItem.title,
        content: versionContent,
        updater_name: versionUpdaterName.trim() || 'Anonymous Student',
        updater_batch: versionUpdaterBatch.trim() || 'Next Batch',
        change_summary: versionChangeSummary.trim(),
      });

      toast.success(`Version v${res.data.current_version} published! Heritage history recorded! 🎓`, { id: toastId });
      setShowVersionModal(false);
      setActiveItem(res.data);
      fetchItems();
    } catch (err: any) {
      toast.error(err.response?.data?.detail || 'Failed to record version update', { id: toastId });
    } finally {
      setIsSubmittingVersion(false);
    }
  };

  // Full backup of all cached notes to device storage
  const handleDeviceStorageBackup = async () => {
    await localStorageService.exportAllNotesToDevice();
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      {/* Hero / Academic Banner */}
      <div className="relative border-b border-slate-800 bg-gradient-to-b from-indigo-950/40 via-slate-900 to-slate-950 px-6 py-10">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/25 text-indigo-400 text-xs font-semibold tracking-wide uppercase">
                <GraduationCap className="w-4 h-4" />
                <span>University & College Academic Repository</span>
              </div>
              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/25 text-emerald-400 text-xs font-semibold">
                <span>⚡</span>
                <span>WebP & Gzip Compression Active • 19 GB Cloudflare R2 + Turso Free Tier</span>
              </div>
            </div>
            <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-white">
              Central Knowledge Repository
            </h1>
            <p className="text-slate-400 max-w-2xl text-sm sm:text-base leading-relaxed">
              Pass down comprehensive notes, scanned handwriting, and diagrams across academic years. Next batches can study, fork, and publish updated versions with complete historical contributor heritage.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={handleDeviceStorageBackup}
              title="Backup all notes to local hard drive"
              className="px-4 py-2.5 rounded-xl border border-slate-700 bg-slate-900/80 hover:bg-slate-800 text-slate-300 text-xs font-semibold transition flex items-center gap-2 shadow-sm"
            >
              <HardDrive className="w-4 h-4 text-emerald-400" />
              <span>Backup to Local Device</span>
            </button>

            <button
              onClick={() => setShowUploadModal(true)}
              className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold transition flex items-center gap-2 shadow-lg shadow-indigo-600/30"
            >
              <Upload className="w-4 h-4" />
              <span>Upload Notes to Repository</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 flex-1 w-full space-y-6">
        {/* Search & Dynamic Filter Bar */}
        <div className="bg-slate-900/70 border border-slate-800 rounded-2xl p-4 sm:p-5 space-y-4 backdrop-blur-sm">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
              <input
                type="text"
                placeholder="Search notes by course code (e.g. CS106B), topic, subject, or keywords..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-slate-950/80 border border-slate-800 rounded-xl text-xs text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-indigo-500 transition"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            <div className="flex items-center gap-2">
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                aria-label="Sort repository notes"
                className="px-3.5 py-2.5 bg-slate-950/80 border border-slate-800 rounded-xl text-xs text-slate-300 focus:outline-none focus:border-indigo-500 cursor-pointer"
              >
                <option value="updated_at">Most Recent</option>
                <option value="downloads_count">Most Downloaded</option>
                <option value="likes_count">Most Upvoted</option>
                <option value="current_version">Most Heritage (Versions)</option>
              </select>

              {(selectedInstitution || selectedDepartment || selectedBatch || selectedSemester || searchQuery) && (
                <button
                  onClick={() => {
                    setSelectedInstitution('');
                    setSelectedDepartment('');
                    setSelectedBatch('');
                    setSelectedSemester('');
                    setSearchQuery('');
                  }}
                  className="px-3 py-2.5 rounded-xl border border-slate-800 hover:bg-slate-800 text-slate-400 hover:text-slate-200 text-xs transition"
                  title="Clear all filters"
                >
                  Reset
                </button>
              )}
            </div>
          </div>

          {/* Academic Selectors (Institution, Department, Batch, Semester / Yearly) */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-2 border-t border-slate-800/80 text-xs">
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-[11px] font-medium text-slate-400">Institution</label>
                <button
                  type="button"
                  onClick={() => handleOpenAddMeta('institution')}
                  className="text-[10px] text-indigo-400 hover:text-indigo-300 flex items-center gap-0.5 transition"
                  title="Add new college or university"
                >
                  <Plus className="w-3 h-3" /> Add
                </button>
              </div>
              <select
                value={selectedInstitution}
                onChange={(e) => {
                  if (e.target.value === '__add_new__') {
                    handleOpenAddMeta('institution');
                  } else {
                    setSelectedInstitution(e.target.value);
                  }
                }}
                aria-label="Filter by institution"
                className="w-full py-2 px-2.5 bg-slate-950 border border-slate-800 rounded-xl text-slate-300 focus:border-indigo-500 focus:outline-none"
              >
                <option value="">All Institutions</option>
                {meta?.institutions.map((inst) => (
                  <option key={inst} value={inst}>
                    {inst}
                  </option>
                ))}
                <option value="__add_new__" className="text-indigo-400 font-semibold bg-slate-900">
                  + Add New Institution...
                </option>
              </select>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-[11px] font-medium text-slate-400">Department</label>
                <button
                  type="button"
                  onClick={() => handleOpenAddMeta('department')}
                  className="text-[10px] text-indigo-400 hover:text-indigo-300 flex items-center gap-0.5 transition"
                  title="Add new department or faculty"
                >
                  <Plus className="w-3 h-3" /> Add
                </button>
              </div>
              <select
                value={selectedDepartment}
                onChange={(e) => {
                  if (e.target.value === '__add_new__') {
                    handleOpenAddMeta('department');
                  } else {
                    setSelectedDepartment(e.target.value);
                  }
                }}
                aria-label="Filter by department"
                className="w-full py-2 px-2.5 bg-slate-950 border border-slate-800 rounded-xl text-slate-300 focus:border-indigo-500 focus:outline-none"
              >
                <option value="">All Departments</option>
                {meta?.departments.map((dept) => (
                  <option key={dept} value={dept}>
                    {dept}
                  </option>
                ))}
                <option value="__add_new__" className="text-indigo-400 font-semibold bg-slate-900">
                  + Add New Department...
                </option>
              </select>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-[11px] font-medium text-slate-400">Batch / Class</label>
                <button
                  type="button"
                  onClick={() => handleOpenAddMeta('batch')}
                  className="text-[10px] text-indigo-400 hover:text-indigo-300 flex items-center gap-0.5 transition"
                  title="Add new academic batch"
                >
                  <Plus className="w-3 h-3" /> Add
                </button>
              </div>
              <select
                value={selectedBatch}
                onChange={(e) => {
                  if (e.target.value === '__add_new__') {
                    handleOpenAddMeta('batch');
                  } else {
                    setSelectedBatch(e.target.value);
                  }
                }}
                aria-label="Filter by academic batch"
                className="w-full py-2 px-2.5 bg-slate-950 border border-slate-800 rounded-xl text-slate-300 focus:border-indigo-500 focus:outline-none"
              >
                <option value="">All Batches</option>
                {meta?.batches.map((b) => (
                  <option key={b} value={b}>
                    {b}
                  </option>
                ))}
                <option value="__add_new__" className="text-indigo-400 font-semibold bg-slate-900">
                  + Add New Batch...
                </option>
              </select>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-[11px] font-medium text-slate-400">Semester / Term</label>
                <button
                  type="button"
                  onClick={() => handleOpenAddMeta('semester')}
                  className="text-[10px] text-indigo-400 hover:text-indigo-300 flex items-center gap-0.5 transition"
                  title="Add new semester or yearly term"
                >
                  <Plus className="w-3 h-3" /> Add
                </button>
              </div>
              <select
                value={selectedSemester}
                onChange={(e) => {
                  if (e.target.value === '__add_new__') {
                    handleOpenAddMeta('semester');
                  } else {
                    setSelectedSemester(e.target.value);
                  }
                }}
                aria-label="Filter by semester or yearly term"
                className="w-full py-2 px-2.5 bg-slate-950 border border-slate-800 rounded-xl text-slate-300 focus:border-indigo-500 focus:outline-none"
              >
                <option value="">All Semesters / Yearly</option>
                {(meta?.semesters && meta.semesters.length > 0 ? meta.semesters : [
                  'Semester 1', 'Semester 2', 'Semester 3', 'Semester 4',
                  'Semester 5', 'Semester 6', 'Semester 7', 'Semester 8',
                  'Year 1 (Annual)', 'Year 2 (Annual)', 'Year 3 (Annual)', 'Year 4 (Annual)'
                ]).map((sem) => (
                  <option key={sem} value={sem}>
                    {sem}
                  </option>
                ))}
                <option value="__add_new__" className="text-indigo-400 font-semibold bg-slate-900">
                  + Add New Semester / Yearly...
                </option>
              </select>
            </div>
          </div>
        </div>

        {/* Repository Items Count & Stats Header */}
        <div className="flex items-center justify-between text-xs text-slate-400 px-1">
          <div>
            Showing <span className="font-semibold text-slate-200">{items.length}</span> of{' '}
            <span className="font-semibold text-slate-200">{totalItems}</span> course notes
          </div>
          <div className="flex items-center gap-4 text-[11px]">
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-400 inline-block animate-pulse" />
              Institutional Heritage Enabled
            </span>
          </div>
        </div>

        {/* Notes Grid (Scribd-like academic cards) */}
        {isLoading ? (
          <div className="py-24 flex flex-col items-center justify-center space-y-3">
            <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
            <p className="text-xs text-slate-400">Loading academic repository notes...</p>
          </div>
        ) : items.length === 0 ? (
          <div className="border border-dashed border-slate-800 rounded-2xl py-16 text-center space-y-3 bg-slate-900/30">
            <GraduationCap className="w-10 h-10 text-slate-600 mx-auto" />
            <h3 className="text-sm font-semibold text-slate-300">No notes found for this filter</h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              Be the first from your university or batch to upload notes for this course so future batches can learn from them!
            </p>
            <button
              onClick={() => setShowUploadModal(true)}
              className="mt-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold rounded-xl transition shadow-md shadow-indigo-600/20"
            >
              Upload First Note
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {items.map((item) => (
              <div
                key={item.id}
                onClick={() => handleOpenReader(item)}
                className="group relative bg-slate-900/80 hover:bg-slate-900 border border-slate-800 hover:border-indigo-500/50 rounded-2xl p-5 transition flex flex-col justify-between cursor-pointer shadow-sm hover:shadow-xl hover:shadow-indigo-500/10 duration-200"
              >
                <div className="space-y-3">
                  {/* Top Badges */}
                  <div className="flex items-center justify-between gap-2">
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-indigo-500/15 text-indigo-400 border border-indigo-500/30">
                      {item.course_code || item.department}
                    </span>
                    <div className="flex items-center gap-1.5">
                      {item.original_file_url && (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-emerald-500/15 text-emerald-400 border border-emerald-500/25 flex items-center gap-1">
                          <Paperclip className="w-2.5 h-2.5" />
                          <span>Original File</span>
                        </span>
                      )}
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-500/15 text-amber-300 border border-amber-500/30 flex items-center gap-1">
                        <History className="w-2.5 h-2.5" />
                        <span>v{item.current_version}</span>
                      </span>
                    </div>
                  </div>

                  {/* Title & Description */}
                  <div>
                    <h3 className="text-sm font-semibold text-slate-100 group-hover:text-indigo-300 transition line-clamp-2">
                      {item.title}
                    </h3>
                    <p className="text-xs text-slate-400 mt-1 line-clamp-2 leading-relaxed">
                      {item.description || item.content.slice(0, 120).replace(/[#*`_]/g, '')}
                    </p>
                  </div>

                  {/* Academic Context Info */}
                  <div className="pt-2 border-t border-slate-800/80 space-y-1 text-[11px] text-slate-400">
                    <div className="flex items-center gap-1.5 truncate">
                      <Building className="w-3 h-3 text-slate-500 flex-shrink-0" />
                      <span className="truncate">{item.institution}</span>
                    </div>
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="text-slate-400">
                        {item.department} {item.semester ? `• ${item.semester}` : ''}
                      </span>
                      <span className="text-indigo-400 font-medium">Batch {item.batch}</span>
                    </div>
                  </div>
                </div>

                {/* Card Footer: Upvotes, Downloads, and Quick Actions */}
                <div className="mt-4 pt-3 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
                  <div className="flex items-center gap-3">
                    <button
                      onClick={(e) => handleLike(e, item.id)}
                      title="Like note"
                      className="flex items-center gap-1 hover:text-indigo-400 transition"
                    >
                      <ThumbsUp className="w-3.5 h-3.5" />
                      <span>{item.likes_count}</span>
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDownloadNote(item);
                      }}
                      title="Download to Local Storage"
                      className="flex items-center gap-1 hover:text-emerald-400 transition"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>{item.downloads_count}</span>
                    </button>
                    <span className="flex items-center gap-1 text-slate-500">
                      <Eye className="w-3.5 h-3.5" />
                      <span>{item.views_count}</span>
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={(e) => handleFork(e, item)}
                      title="Fork to My Notes"
                      className="p-1.5 rounded-lg bg-slate-800 hover:bg-indigo-600/30 text-slate-300 hover:text-indigo-300 border border-slate-700 hover:border-indigo-500/40 transition"
                    >
                      <GitFork className="w-3.5 h-3.5" />
                    </button>
                    <span className="text-[11px] font-medium text-indigo-400 flex items-center gap-0.5 group-hover:translate-x-0.5 transition-transform">
                      Read <ArrowRight className="w-3 h-3" />
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Scribd-style Document Reader Modal / Drawer */}
      {activeItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/80 backdrop-blur-md animate-fade-in">
          <div className="relative w-full max-w-5xl h-[92vh] bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl flex flex-col overflow-hidden">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-slate-800 bg-slate-900/90 flex items-center justify-between gap-4">
              <div className="flex items-center gap-3 min-w-0">
                <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 flex-shrink-0">
                  <BookOpen className="w-5 h-5" />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h2 className="text-base sm:text-lg font-bold text-slate-100 truncate">
                      {selectedVersionSnapshot ? selectedVersionSnapshot.title : activeItem.title}
                    </h2>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/15 text-amber-300 border border-amber-500/30">
                      {selectedVersionSnapshot ? `v${selectedVersionSnapshot.version_number} (Snapshot)` : `v${activeItem.current_version} (Current)`}
                    </span>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-indigo-500/15 text-indigo-300 border border-indigo-500/30">
                      {activeItem.institution} • {activeItem.batch}
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 truncate mt-0.5">
                    {activeItem.department} {activeItem.course_code ? `• ${activeItem.course_code}` : ''}
                    {activeItem.course_name ? ` (${activeItem.course_name})` : ''}
                  </p>
                </div>
              </div>

              {/* Top Header Actions */}
              <div className="flex items-center gap-2 flex-shrink-0">
                <button
                  onClick={(e) => handleFork(e, activeItem)}
                  className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 border border-indigo-500/40 text-xs font-semibold transition"
                >
                  <GitFork className="w-3.5 h-3.5" />
                  <span>Fork to My Notes</span>
                </button>

                <button
                  onClick={() => handleDownloadNote(activeItem)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/40 text-xs font-semibold transition"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Save to Device</span>
                </button>

                <button
                  onClick={() => handleOpenVersionModal(activeItem)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold transition shadow-md shadow-indigo-600/25"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Contribute Update</span>
                </button>

                <button
                  onClick={() => setActiveItem(null)}
                  className="p-1.5 rounded-xl text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Navigation Tabs (Document Reader vs. Heritage Timeline) */}
            <div className="px-6 border-b border-slate-800 bg-slate-950/60 flex items-center justify-between text-xs">
              <div className="flex items-center gap-6">
                <button
                  onClick={() => {
                    setActiveTab('reader');
                    setSelectedVersionSnapshot(null);
                  }}
                  className={cn(
                    'py-3 border-b-2 font-semibold transition flex items-center gap-2',
                    activeTab === 'reader' && !selectedVersionSnapshot
                      ? 'border-indigo-500 text-indigo-400'
                      : 'border-transparent text-slate-400 hover:text-slate-200'
                  )}
                >
                  <BookOpen className="w-4 h-4" />
                  <span>Document Reader</span>
                </button>

                <button
                  onClick={() => setActiveTab('heritage')}
                  className={cn(
                    'py-3 border-b-2 font-semibold transition flex items-center gap-2',
                    activeTab === 'heritage'
                      ? 'border-indigo-500 text-indigo-400'
                      : 'border-transparent text-slate-400 hover:text-slate-200'
                  )}
                >
                  <History className="w-4 h-4" />
                  <span>Batch Heritage & Updaters ({activeItem.versions?.length || 1})</span>
                </button>
              </div>

              {selectedVersionSnapshot && (
                <div className="text-xs text-amber-400 flex items-center gap-2">
                  <span>Viewing historical snapshot: v{selectedVersionSnapshot.version_number}</span>
                  <button
                    onClick={() => setSelectedVersionSnapshot(null)}
                    className="text-xs text-indigo-400 underline hover:text-indigo-300"
                  >
                    Return to Latest
                  </button>
                </div>
              )}
            </div>

            {/* Modal Body */}
            <div className="flex-1 overflow-y-auto p-6 bg-slate-950/40">
              {activeTab === 'reader' ? (
                <div className="max-w-4xl mx-auto space-y-6">
                  {/* Original File Attachment Card */}
                  {activeItem.original_file_url && (
                    <div className="p-4 rounded-2xl bg-indigo-950/30 border border-indigo-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div className="p-2.5 rounded-xl bg-indigo-500/20 text-indigo-400">
                          <Paperclip className="w-5 h-5" />
                        </div>
                        <div>
                          <div className="text-xs font-semibold text-slate-100">
                            Pristine Original File Attached
                          </div>
                          <div className="text-[11px] text-slate-400">
                            {activeItem.original_file_name || 'Uploaded Document'} • Preserved in original format
                          </div>
                        </div>
                      </div>
                      <a
                        href={activeItem.original_file_url}
                        target="_blank"
                        rel="noreferrer"
                        className="px-3.5 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold transition flex items-center justify-center gap-1.5 shadow-sm"
                      >
                        <Download className="w-3.5 h-3.5" />
                        <span>Download Original File</span>
                      </a>
                    </div>
                  )}

                  {/* Render Markdown Content */}
                  <div className="prose prose-invert prose-indigo max-w-none bg-slate-900/60 p-6 sm:p-8 rounded-2xl border border-slate-800 leading-relaxed text-slate-200">
                    <ReactMarkdown
                      components={{
                        img: ({ src, alt, ...props }: any) => {
                          const resolvedSrc = src || '';
                          return (
                            <img
                              src={resolvedSrc}
                              alt={alt || ''}
                              className="rounded-xl my-4 max-w-full h-auto shadow-md border border-slate-700 block transition-all"
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
                      }}
                      remarkPlugins={[remarkGfm]}
                      rehypePlugins={[
                        rehypeRaw,
                        [
                          rehypeSanitize,
                          {
                            ...defaultSchema,
                            attributes: {
                              ...defaultSchema.attributes,
                              '*': [...(defaultSchema.attributes?.['*'] || []), 'className', 'id'],
                              a: [...(defaultSchema.attributes?.['a'] || []), 'target', 'rel'],
                              img: [...(defaultSchema.attributes?.['img'] || []), 'src', 'alt', 'width', 'height', 'loading', 'className'],
                            },
                          },
                        ],
                      ]}
                    >
                      {selectedVersionSnapshot ? selectedVersionSnapshot.content : activeItem.content}
                    </ReactMarkdown>
                  </div>
                </div>
              ) : (
                /* Batch Heritage & Contributor Lineage Timeline */
                <div className="max-w-3xl mx-auto space-y-6">
                  <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-between">
                    <div>
                      <h3 className="text-sm font-semibold text-slate-100 flex items-center gap-2">
                        <Users className="w-4 h-4 text-indigo-400" />
                        <span>Inter-Batch Knowledge Lineage</span>
                      </h3>
                      <p className="text-xs text-slate-400 mt-0.5">
                        Each generation of students enriches these notes and passes them to the next batch.
                      </p>
                    </div>
                    <button
                      onClick={() => handleOpenVersionModal(activeItem)}
                      className="px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold transition flex items-center gap-1.5"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Add My Batch Update</span>
                    </button>
                  </div>

                  <div className="relative pl-6 space-y-8 before:absolute before:left-3 before:top-3 before:bottom-3 before:w-0.5 before:bg-indigo-500/30">
                    {activeItem.versions && activeItem.versions.length > 0 ? (
                      activeItem.versions.map((ver, idx) => (
                        <div key={ver.id || idx} className="relative group">
                          {/* Dot marker */}
                          <div
                            className={cn(
                              'absolute -left-6 top-1.5 w-6 h-6 rounded-full border-2 flex items-center justify-center transition',
                              idx === 0
                                ? 'bg-indigo-600 border-indigo-400 shadow-md shadow-indigo-600/50'
                                : 'bg-slate-900 border-indigo-500/50 text-indigo-400'
                            )}
                          >
                            <span className="text-[10px] font-bold text-white">v{ver.version_number}</span>
                          </div>

                          <div className="bg-slate-900/90 border border-slate-800 hover:border-indigo-500/40 rounded-2xl p-4 sm:p-5 transition space-y-2">
                            <div className="flex items-center justify-between flex-wrap gap-2">
                              <div className="flex items-center gap-2">
                                <span className="text-xs font-bold text-slate-100">
                                  {ver.updater_name || 'Academic Contributor'}
                                </span>
                                <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-indigo-500/15 text-indigo-400 border border-indigo-500/25">
                                  Batch {ver.updater_batch}
                                </span>
                                {idx === 0 && (
                                  <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/15 text-emerald-400 border border-emerald-500/25">
                                    Latest Version
                                  </span>
                                )}
                              </div>
                              <span className="text-[11px] text-slate-500">
                                {formatRelativeTime(ver.created_at)}
                              </span>
                            </div>

                            <p className="text-xs text-slate-300 font-medium">
                              📝 Change Summary:{' '}
                              <span className="text-slate-400 font-normal">
                                {ver.change_summary || 'Updated content and exam formulas'}
                              </span>
                            </p>

                            <div className="pt-2 flex items-center justify-end gap-2">
                              <button
                                onClick={() => {
                                  setSelectedVersionSnapshot(ver);
                                  setActiveTab('reader');
                                }}
                                className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-indigo-600/30 text-indigo-300 border border-slate-700 text-xs font-medium transition flex items-center gap-1"
                              >
                                <Eye className="w-3.5 h-3.5" />
                                <span>Inspect This Snapshot</span>
                              </button>
                            </div>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="text-xs text-slate-500">No versions found</div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Upload Notes to Central Repository Modal */}
      {showUploadModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
          <div className="relative w-full max-w-2xl bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="px-6 py-4 border-b border-slate-800 bg-slate-900/90 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                  <Upload className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-slate-100">
                    Publish Notes to Central Academic Repository
                  </h2>
                  <p className="text-xs text-slate-400">
                    Store in university repository so your batch and junior batches can study and update
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowUploadModal(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmitPublish} className="p-6 overflow-y-auto space-y-4 flex-1 text-xs">
              {/* Source Switch: From My Notes vs. Direct File */}
              <div className="flex items-center gap-2 p-1 bg-slate-950 rounded-xl border border-slate-800">
                <button
                  type="button"
                  onClick={() => setUploadSource('my_notes')}
                  className={cn(
                    'flex-1 py-2 text-center rounded-lg font-semibold transition',
                    uploadSource === 'my_notes'
                      ? 'bg-indigo-600 text-white shadow-sm'
                      : 'text-slate-400 hover:text-slate-200'
                  )}
                >
                  Choose From My Notes
                </button>
                <button
                  type="button"
                  onClick={() => setUploadSource('file_upload')}
                  className={cn(
                    'flex-1 py-2 text-center rounded-lg font-semibold transition',
                    uploadSource === 'file_upload'
                      ? 'bg-indigo-600 text-white shadow-sm'
                      : 'text-slate-400 hover:text-slate-200'
                  )}
                >
                  Upload New Document / Scan
                </button>
              </div>

              {uploadSource === 'my_notes' ? (
                <div>
                  <label className="block font-medium text-slate-300 mb-1">Select Existing Note</label>
                  <select
                    value={selectedNoteId}
                    onChange={(e) => handleSelectMyNote(e.target.value)}
                    aria-label="Select existing note to publish"
                    className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-slate-200 focus:border-indigo-500 focus:outline-none"
                  >
                    <option value="">-- Choose a note from your library --</option>
                    {notes.map((n) => (
                      <option key={n.id} value={n.id}>
                        {n.title} ({n.note_type})
                      </option>
                    ))}
                  </select>
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="border-2 border-dashed border-slate-800 rounded-xl p-4 text-center">
                    <input
                      type="file"
                      id="central-file-input"
                      className="hidden"
                      onChange={handleFileUploadChange}
                      accept=".png,.jpg,.jpeg,.pdf,.docx,.doc,.txt,.md"
                    />
                    <label
                      htmlFor="central-file-input"
                      className="cursor-pointer flex flex-col items-center gap-1.5"
                    >
                      <Paperclip className="w-6 h-6 text-indigo-400" />
                      <span className="font-semibold text-slate-200">
                        {attachedFile ? attachedFile.name : 'Click to attach original document or scanned notes'}
                      </span>
                      <span className="text-[11px] text-slate-500">
                        Supports PDF, Scanned Images, DOCX, Markdown (Preserved in original form)
                      </span>
                    </label>
                  </div>

                  {compressionSavings && (
                    <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-between text-xs text-emerald-400">
                      <span className="flex items-center gap-1.5 font-medium">
                        <span>⚡ WebP Compressed:</span>
                        <span>{(compressionSavings.originalSize / 1024).toFixed(0)} KB → {(compressionSavings.newSize / 1024).toFixed(0)} KB</span>
                      </span>
                      <span className="font-bold bg-emerald-500/20 px-2 py-0.5 rounded-full text-[10px]">
                        {compressionSavings.savingsPercent}% Storage Saved
                      </span>
                    </div>
                  )}

                  <div className="p-2 rounded-lg bg-indigo-950/40 border border-indigo-900/50 flex items-center justify-between text-[11px] text-indigo-300">
                    <span className="flex items-center gap-1.5">
                      <span>☁️</span>
                      <span>Cloudflare R2 (10 GB free) &amp; Turso (9 GB free) Active</span>
                    </span>
                    <span className="font-semibold text-indigo-400">Zero Egress Fees</span>
                  </div>
                </div>
              )}

              {/* Title & Description */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="sm:col-span-2">
                  <label className="block font-medium text-slate-300 mb-1">Note / Course Title *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Data Structures & Algorithms Complete Notes"
                    value={newTitle}
                    onChange={(e) => setNewTitle(e.target.value)}
                    className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-slate-200 focus:border-indigo-500 focus:outline-none"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="font-medium text-slate-300">University / College *</label>
                    <button
                      type="button"
                      onClick={() => handleOpenAddMeta('institution')}
                      className="text-[10px] text-indigo-400 hover:text-indigo-300 flex items-center gap-0.5"
                    >
                      <Plus className="w-3 h-3" /> New College
                    </button>
                  </div>
                  <input
                    type="text"
                    list="inst-suggestions"
                    required
                    placeholder="e.g. Stanford University, IIT Delhi"
                    value={newInstitution}
                    onChange={(e) => setNewInstitution(e.target.value)}
                    className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-slate-200 focus:border-indigo-500 focus:outline-none"
                  />
                  <datalist id="inst-suggestions">
                    {meta?.institutions.map(i => <option key={i} value={i} />)}
                  </datalist>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="font-medium text-slate-300">Department *</label>
                    <button
                      type="button"
                      onClick={() => handleOpenAddMeta('department')}
                      className="text-[10px] text-indigo-400 hover:text-indigo-300 flex items-center gap-0.5"
                    >
                      <Plus className="w-3 h-3" /> New Dept
                    </button>
                  </div>
                  <input
                    type="text"
                    list="dept-suggestions"
                    required
                    placeholder="e.g. Computer Science & AI"
                    value={newDepartment}
                    onChange={(e) => setNewDepartment(e.target.value)}
                    className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-slate-200 focus:border-indigo-500 focus:outline-none"
                  />
                  <datalist id="dept-suggestions">
                    {meta?.departments.map(d => <option key={d} value={d} />)}
                  </datalist>
                </div>

                <div>
                  <label className="block font-medium text-slate-300 mb-1">Course Code</label>
                  <input
                    type="text"
                    placeholder="e.g. CS106B"
                    value={newCourseCode}
                    onChange={(e) => setNewCourseCode(e.target.value)}
                    className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-slate-200 focus:border-indigo-500 focus:outline-none"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="font-medium text-slate-300">Batch / Class *</label>
                    <button
                      type="button"
                      onClick={() => handleOpenAddMeta('batch')}
                      className="text-[10px] text-indigo-400 hover:text-indigo-300 flex items-center gap-0.5"
                    >
                      <Plus className="w-3 h-3" /> New Batch
                    </button>
                  </div>
                  <input
                    type="text"
                    list="batch-suggestions"
                    required
                    placeholder="e.g. Batch 2024-2028"
                    value={newBatch}
                    onChange={(e) => setNewBatch(e.target.value)}
                    className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-slate-200 focus:border-indigo-500 focus:outline-none"
                  />
                  <datalist id="batch-suggestions">
                    {meta?.batches.map(b => <option key={b} value={b} />)}
                  </datalist>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="font-medium text-slate-300">Semester / Term</label>
                    <button
                      type="button"
                      onClick={() => handleOpenAddMeta('semester')}
                      className="text-[10px] text-indigo-400 hover:text-indigo-300 flex items-center gap-0.5"
                    >
                      <Plus className="w-3 h-3" /> New Term
                    </button>
                  </div>
                  <select
                    value={newSemester}
                    onChange={(e) => {
                      if (e.target.value === '__add_new__') {
                        handleOpenAddMeta('semester');
                      } else {
                        setNewSemester(e.target.value);
                      }
                    }}
                    aria-label="Select note semester or term"
                    className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-slate-200 focus:border-indigo-500 focus:outline-none"
                  >
                    {(meta?.semesters && meta.semesters.length > 0 ? meta.semesters : [
                      'Semester 1', 'Semester 2', 'Semester 3', 'Semester 4',
                      'Semester 5', 'Semester 6', 'Semester 7', 'Semester 8',
                      'Year 1 (Annual)', 'Year 2 (Annual)', 'Year 3 (Annual)', 'Year 4 (Annual)'
                    ]).map((sem) => (
                      <option key={sem} value={sem}>
                        {sem}
                      </option>
                    ))}
                    <option value="__add_new__" className="text-indigo-400 font-semibold bg-slate-900">
                      + Add Custom Semester / Year...
                    </option>
                  </select>
                </div>

                <div>
                  <label className="block font-medium text-slate-300 mb-1">Initial Release Note</label>
                  <input
                    type="text"
                    placeholder="e.g. Midterm & End-semester study guide"
                    value={newChangeSummary}
                    onChange={(e) => setNewChangeSummary(e.target.value)}
                    className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-slate-200 focus:border-indigo-500 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block font-medium text-slate-300 mb-1">Notes Content (Markdown)</label>
                <textarea
                  rows={6}
                  placeholder="Enter or paste the note text..."
                  value={newContent}
                  onChange={(e) => setNewContent(e.target.value)}
                  className="w-full p-3 font-mono text-xs bg-slate-950 border border-slate-800 rounded-xl text-slate-200 focus:border-indigo-500 focus:outline-none"
                />
              </div>

              <div className="pt-3 border-t border-slate-800 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowUploadModal(false)}
                  className="px-4 py-2 rounded-xl text-slate-400 hover:text-slate-200 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isUploading}
                  className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold transition flex items-center gap-2 shadow-lg shadow-indigo-600/30 disabled:opacity-50"
                >
                  {isUploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                  <span>Publish to Repository</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Contribute Next-Batch Version Modal */}
      {showVersionModal && activeItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
          <div className="relative w-full max-w-2xl bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="px-6 py-4 border-b border-slate-800 bg-slate-900/90 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
                  <History className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-slate-100">
                    Contribute Next Batch Version (v{activeItem.current_version + 1})
                  </h2>
                  <p className="text-xs text-slate-400">
                    Enhance these notes with new syllabus updates, corrections, or exam solutions
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowVersionModal(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmitVersion} className="p-6 overflow-y-auto space-y-4 flex-1 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium text-slate-300 mb-1">Your Name / Contributor *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Alex Rivera"
                    value={versionUpdaterName}
                    onChange={(e) => setVersionUpdaterName(e.target.value)}
                    className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-slate-200 focus:border-indigo-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block font-medium text-slate-300 mb-1">Your Batch *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Batch 2025"
                    value={versionUpdaterBatch}
                    onChange={(e) => setVersionUpdaterBatch(e.target.value)}
                    className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-slate-200 focus:border-indigo-500 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block font-medium text-slate-300 mb-1">
                  Change Summary (What did your batch improve?) *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Added Unit 5 Graph Theory proofs and solved 2024 Midterm questions"
                  value={versionChangeSummary}
                  onChange={(e) => setVersionChangeSummary(e.target.value)}
                  className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-slate-200 focus:border-indigo-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-medium text-slate-300 mb-1">Updated Notes Content (Markdown)</label>
                <textarea
                  rows={8}
                  required
                  value={versionContent}
                  onChange={(e) => setVersionContent(e.target.value)}
                  className="w-full p-3 font-mono text-xs bg-slate-950 border border-slate-800 rounded-xl text-slate-200 focus:border-indigo-500 focus:outline-none leading-relaxed"
                />
              </div>

              <div className="pt-3 border-t border-slate-800 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowVersionModal(false)}
                  className="px-4 py-2 rounded-xl text-slate-400 hover:text-slate-200 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingVersion}
                  className="px-5 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-semibold transition flex items-center gap-2 shadow-lg shadow-amber-600/30 disabled:opacity-50"
                >
                  {isSubmittingVersion ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <History className="w-4 h-4" />
                  )}
                  <span>Publish Version v{activeItem.current_version + 1}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Custom Institution / Department / Batch / Semester Modal */}
      {customMetaModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
          <div className="relative w-full max-w-md bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                  <Building className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-100">{customMetaModal.title}</h3>
                  <p className="text-[11px] text-slate-400">Save to global academic repository options</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setCustomMetaModal(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveCustomMeta} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">
                  Name / Identifier *
                </label>
                <input
                  type="text"
                  required
                  autoFocus
                  placeholder={customMetaModal.placeholder}
                  value={customMetaInput}
                  onChange={(e) => setCustomMetaInput(e.target.value)}
                  className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-slate-200 text-xs focus:border-indigo-500 focus:outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setCustomMetaModal(null)}
                  className="px-3.5 py-1.5 rounded-xl text-slate-400 hover:text-slate-200 text-xs transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSavingMeta || !customMetaInput.trim()}
                  className="px-4 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs transition flex items-center gap-1.5 shadow-md shadow-indigo-600/30 disabled:opacity-50"
                >
                  {isSavingMeta ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
                  <span>Save & Select</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
export default CentralRepositoryPage;
