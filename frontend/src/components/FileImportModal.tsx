import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Upload,
  FileText,
  Image as ImageIcon,
  FileCheck,
  Loader2,
  X,
  Check,
  Copy,
  Sparkles,
  AlertCircle,
  Download,
  Paperclip,
  Layers,
  Presentation,
  Plus,
  Trash2,
  RefreshCw,
  Eye,
  FileCode,
} from 'lucide-react';
import { notesApi } from '../services/api';
import { cn } from '../utils';
import { compressImageToWebP } from '../utils/compression';
import type { FileConvertResponse } from '../types';
import toast from 'react-hot-toast';

export interface QueuedImportFile {
  id: string;
  file: File;
  ocrMode: 'auto' | 'handwritten' | 'printed';
  status: 'pending' | 'converting' | 'completed' | 'error';
  result?: FileConvertResponse;
  saveFormat: 'text' | 'original' | 'hybrid' | 'sequential_images';
  error?: string;
  editedText?: string;
}

interface FileImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onInsertText?: (text: string, mode: 'replace' | 'append') => void;
}

export const FileImportModal: React.FC<FileImportModalProps> = ({ isOpen, onClose, onInsertText }) => {
  const navigate = useNavigate();
  const [dragActive, setDragActive] = useState(false);
  const [filesQueue, setFilesQueue] = useState<QueuedImportFile[]>([]);
  const [activeFileId, setActiveFileId] = useState<string | null>(null);
  const [isProcessingQueue, setIsProcessingQueue] = useState(false);
  const [isCreatingNote, setIsCreatingNote] = useState(false);
  const [combinedText, setCombinedText] = useState('');
  const [customMasterTitle, setCustomMasterTitle] = useState('');
  const [activeTab, setActiveTab] = useState<'queue' | 'preview'>('queue');
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const getFileIcon = (file: File) => {
    const ext = file.name.toLowerCase();
    if (file.type.startsWith('image/') || /\.(png|jpe?g|webp|bmp|tiff)$/i.test(ext)) {
      return <ImageIcon className="w-5 h-5 text-emerald-400" />;
    }
    if (ext.endsWith('.pptx') || ext.endsWith('.ppt')) {
      return <Presentation className="w-5 h-5 text-amber-400" />;
    }
    if (ext.endsWith('.pdf')) {
      return <Layers className="w-5 h-5 text-rose-400" />;
    }
    if (ext.endsWith('.docx') || ext.endsWith('.doc')) {
      return <FileText className="w-5 h-5 text-blue-400" />;
    }
    return <FileCode className="w-5 h-5 text-slate-400" />;
  };

  const getSingleFileFormattedContent = (item: QueuedImportFile): string => {
    const data = item.result;
    const baseText = item.editedText !== undefined ? item.editedText : data?.text || '';
    if (!data) return baseText;

    const fileUrl = data.file_url || data.data_url || '';
    const fileName = item.file.name;

    if (item.saveFormat === 'sequential_images' && data.page_images && data.page_images.length > 0) {
      const isPpt = data.file_type === 'pptx';
      const term = isPpt ? 'Slide' : 'Page';
      const imgBlocks = data.page_images.map(
        p => `### ${term} ${p.page_number}\n\n![${term} ${p.page_number}](${p.image_url})`
      );
      return `> 📑 **Sequential ${isPpt ? 'PowerPoint Presentation Slides' : 'PDF Pages'} (${data.page_images.length} ${isPpt ? 'slides' : 'pages'}):**\n\n${imgBlocks.join('\n\n---\n\n')}`;
    }

    if (item.saveFormat === 'original') {
      const isImg = data.file_type === 'image';
      const imgEmbed = isImg && fileUrl ? `\n\n![${fileName}](${fileUrl})\n` : '';
      return `> 📎 **Original Attachment:** [${fileName}](${fileUrl})\n*Preserved in local storage.*${imgEmbed}\n\n### 📄 Transcribed Content\n${baseText}`;
    }

    if (item.saveFormat === 'hybrid') {
      const isImg = data.file_type === 'image';
      const previewEmbed = isImg && fileUrl
        ? `### 📷 Scan Preview\n![${fileName}](${fileUrl})\n\n---\n`
        : `> 📎 **Attached Document:** [${fileName}](${fileUrl})\n\n---\n`;
      return `${previewEmbed}${baseText}`;
    }

    return baseText;
  };

  const computeCombinedOutput = (queue: QueuedImportFile[]): string => {
    const completedItems = queue.filter(item => item.status === 'completed' && item.result);
    if (completedItems.length === 0) return '';

    if (completedItems.length === 1) {
      return getSingleFileFormattedContent(completedItems[0]);
    }

    const sections = completedItems.map((item, idx) => {
      const content = getSingleFileFormattedContent(item);
      const isImg = item.file.type.startsWith('image/');
      const isPpt = item.file.name.toLowerCase().endsWith('.pptx') || item.file.name.toLowerCase().endsWith('.ppt');
      const isPdf = item.file.name.toLowerCase().endsWith('.pdf');
      const icon = isImg ? '🖼️' : isPpt ? '📊' : isPdf ? '📑' : '📄';

      return `## ${icon} ${item.file.name}\n\n${content}`;
    });

    return sections.join('\n\n---\n\n');
  };

  const convertQueuedFile = async (item: QueuedImportFile): Promise<QueuedImportFile> => {
    try {
      const response = await notesApi.convertFile(item.file, item.ocrMode);
      const data = response.data;
      let defaultFormat: 'text' | 'original' | 'hybrid' | 'sequential_images' = 'text';

      if (
        (data.file_type === 'pdf' || data.file_type === 'pptx') &&
        data.page_images &&
        data.page_images.length > 0 &&
        !data.text.trim()
      ) {
        defaultFormat = 'sequential_images';
      }

      return {
        ...item,
        status: 'completed',
        result: data,
        editedText: data.text || '',
        saveFormat: defaultFormat,
      };
    } catch (err: any) {
      const errorMsg = err.response?.data?.detail || err.message || 'Conversion failed';
      return {
        ...item,
        status: 'error',
        error: errorMsg,
      };
    }
  };

  const addFilesToQueue = (files: File[]) => {
    if (!files.length) return;

    const newItems: QueuedImportFile[] = files.map(file => {
      const isImage = file.type.startsWith('image/') || /\.(png|jpe?g|webp|bmp|tiff)$/i.test(file.name);
      return {
        id: `q_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
        file,
        ocrMode: isImage ? 'handwritten' : 'auto',
        status: 'pending',
        saveFormat: 'text',
      };
    });

    const updatedQueue = [...filesQueue, ...newItems];
    setFilesQueue(updatedQueue);
    if (!activeFileId && newItems.length > 0) {
      setActiveFileId(newItems[0].id);
    }

    if (!customMasterTitle) {
      const firstCleanName = files[0].name.replace(/\.[^/.]+$/, '');
      setCustomMasterTitle(files.length > 1 ? `${firstCleanName} & ${files.length - 1} attached files` : firstCleanName);
    }

    // Process new items
    processQueueItems(newItems, updatedQueue);
  };

  const processQueueItems = async (itemsToProcess: QueuedImportFile[], currentFullQueue: QueuedImportFile[]) => {
    setIsProcessingQueue(true);
    let runningQueue = [...currentFullQueue];

    for (const item of itemsToProcess) {
      // Mark as converting
      runningQueue = runningQueue.map(q => q.id === item.id ? { ...q, status: 'converting' } : q);
      setFilesQueue(runningQueue);

      let itemToProcess = item;
      if (item.file.type.startsWith('image/')) {
        try {
          const comp = await compressImageToWebP(item.file);
          itemToProcess = { ...item, file: comp.file };
        } catch {
          // Fallback to original file
        }
      }

      const updatedItem = await convertQueuedFile(itemToProcess);
      runningQueue = runningQueue.map(q => q.id === item.id ? updatedItem : q);
      setFilesQueue(runningQueue);

      // Auto update combined text preview
      setCombinedText(computeCombinedOutput(runningQueue));
    }

    setIsProcessingQueue(false);
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      addFilesToQueue(Array.from(e.dataTransfer.files));
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      addFilesToQueue(Array.from(e.target.files));
      e.target.value = '';
    }
  };

  const removeFileFromQueue = (id: string) => {
    const updated = filesQueue.filter(f => f.id !== id);
    setFilesQueue(updated);
    if (activeFileId === id) {
      setActiveFileId(updated.length > 0 ? updated[0].id : null);
    }
    setCombinedText(computeCombinedOutput(updated));
  };

  const retryConversion = async (id: string) => {
    const target = filesQueue.find(f => f.id === id);
    if (!target) return;
    const reloaded = { ...target, status: 'pending' as const, error: undefined };
    const queueWithPending = filesQueue.map(f => f.id === id ? reloaded : f);
    setFilesQueue(queueWithPending);
    await processQueueItems([reloaded], queueWithPending);
  };

  const updateFileOcrMode = async (id: string, mode: 'auto' | 'handwritten' | 'printed') => {
    const target = filesQueue.find(f => f.id === id);
    if (!target) return;
    const updated = { ...target, ocrMode: mode, status: 'pending' as const };
    const newQueue = filesQueue.map(f => f.id === id ? updated : f);
    setFilesQueue(newQueue);
    await processQueueItems([updated], newQueue);
  };

  const updateFileFormat = (id: string, format: 'text' | 'original' | 'hybrid' | 'sequential_images') => {
    const updated = filesQueue.map(f => f.id === id ? { ...f, saveFormat: format } : f);
    setFilesQueue(updated);
    setCombinedText(computeCombinedOutput(updated));
  };

  const updateFileText = (id: string, text: string) => {
    const updated = filesQueue.map(f => f.id === id ? { ...f, editedText: text } : f);
    setFilesQueue(updated);
    setCombinedText(computeCombinedOutput(updated));
  };

  const activeFile = filesQueue.find(f => f.id === activeFileId);

  const handleCreateNewNote = async () => {
    const textToSave = combinedText || computeCombinedOutput(filesQueue);
    if (!textToSave.trim()) {
      toast.error('No converted text available to create a note');
      return;
    }

    setIsCreatingNote(true);
    const toastId = toast.loading('Creating note from converted files...');
    try {
      const response = await notesApi.create({
        title: customMasterTitle || activeFile?.result?.suggested_title || 'Imported Document Note',
        content: textToSave,
        note_type: 'markdown',
      });
      toast.success('New note created successfully!', { id: toastId });
      onClose();
      navigate(`/notes/${response.data.id}`);
    } catch (err: any) {
      toast.error(err.response?.data?.detail || 'Failed to create note', { id: toastId });
    } finally {
      setIsCreatingNote(false);
    }
  };

  const handleApplyToCurrentNote = (mode: 'replace' | 'append') => {
    if (!onInsertText) return;
    const textToInsert = combinedText || computeCombinedOutput(filesQueue);
    if (!textToInsert.trim()) {
      toast.error('No converted content to insert');
      return;
    }
    onInsertText(textToInsert, mode);
    toast.success(mode === 'replace' ? 'Note content replaced!' : 'Appended to current note!');
    onClose();
  };

  const handleCopyCombined = () => {
    const textToCopy = combinedText || computeCombinedOutput(filesQueue);
    navigator.clipboard.writeText(textToCopy);
    toast.success('Combined markdown copied to clipboard!');
  };

  const handleDownloadAllOriginals = () => {
    filesQueue.forEach(item => {
      const url = URL.createObjectURL(item.file);
      const a = document.createElement('a');
      a.href = url;
      a.download = item.file.name;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    });
    toast.success(`Downloaded ${filesQueue.length} file(s) to device storage!`);
  };

  const completedCount = filesQueue.filter(f => f.status === 'completed').length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/75 backdrop-blur-sm animate-fade-in">
      <div className="relative w-full max-w-4xl bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-5 sm:px-6 py-4 border-b border-slate-800 bg-slate-900/90 shrink-0">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-semibold text-slate-100">
                  Document & Image Import Hub
                </h2>
                <span className="text-[10px] bg-indigo-500/20 text-indigo-300 px-2 py-0.5 rounded-full border border-indigo-500/30 font-medium">
                  Multi-file & Mixed Types
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Upload multiple PDFs, Images (OCR), Word (.docx), & PowerPoint (.pptx) all at once or one-by-one
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab & Controls Ribbon */}
        {filesQueue.length > 0 && (
          <div className="px-5 sm:px-6 py-2 border-b border-slate-800 bg-slate-950/60 flex items-center justify-between gap-3 shrink-0">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setActiveTab('queue')}
                className={cn(
                  'px-3 py-1.5 rounded-lg text-xs font-medium transition flex items-center gap-1.5',
                  activeTab === 'queue'
                    ? 'bg-indigo-600/30 text-indigo-300 border border-indigo-500/40'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                )}
              >
                <span>Files Queue</span>
                <span className="px-1.5 py-0.2 rounded-full bg-indigo-500/30 text-[10px] text-indigo-200">
                  {completedCount}/{filesQueue.length}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('preview')}
                className={cn(
                  'px-3 py-1.5 rounded-lg text-xs font-medium transition flex items-center gap-1.5',
                  activeTab === 'preview'
                    ? 'bg-indigo-600/30 text-indigo-300 border border-indigo-500/40'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                )}
              >
                <Eye className="w-3.5 h-3.5" />
                <span>Combined Output Preview</span>
              </button>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="btn-ghost py-1 px-2.5 text-xs text-indigo-400 hover:text-indigo-300 border border-dashed border-indigo-500/40 rounded-lg flex items-center gap-1.5"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add More Files</span>
              </button>
            </div>
          </div>
        )}

        {/* Modal Body */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-4 flex-1">
          {/* Hidden File Input */}
          <input
            ref={fileInputRef}
            type="file"
            multiple
            className="hidden"
            accept=".png,.jpg,.jpeg,.webp,.bmp,.tiff,.pdf,.docx,.doc,.pptx,.ppt,.txt,.md,.markdown"
            onChange={handleFileInputChange}
          />

          {/* Empty State / Initial Dropzone */}
          {filesQueue.length === 0 && (
            <div
              className={`border-2 border-dashed rounded-2xl p-10 text-center transition cursor-pointer flex flex-col items-center justify-center space-y-3 ${
                dragActive
                  ? 'border-indigo-500 bg-indigo-500/10'
                  : 'border-slate-700 hover:border-indigo-500/50 bg-slate-800/30'
              }`}
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
            >
              <div className="p-4 rounded-2xl bg-slate-800 text-indigo-400 border border-slate-700/80 shadow-inner">
                <Upload className="w-9 h-9" />
              </div>
              <div className="max-w-md">
                <p className="text-base font-semibold text-slate-100">
                  Select or drag & drop one or multiple files
                </p>
                <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                  Upload multiple documents at once or append one-by-one. Supports{' '}
                  <span className="text-indigo-400 font-medium">Images (Handwriting OCR)</span>,{' '}
                  <span className="text-rose-400 font-medium">PDFs</span>,{' '}
                  <span className="text-amber-400 font-medium">PowerPoint (.pptx)</span>, and{' '}
                  <span className="text-blue-400 font-medium">Word (.docx)</span>.
                </p>
              </div>
              <div className="pt-2">
                <span className="px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 rounded-xl transition shadow-md shadow-indigo-600/30 inline-flex items-center gap-2">
                  <Plus className="w-4 h-4" />
                  Choose Files to Convert
                </span>
              </div>
            </div>
          )}

          {/* Tab 1: Queue View */}
          {filesQueue.length > 0 && activeTab === 'queue' && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
              {/* Left Column: List of Files in Queue (5 cols) */}
              <div className="lg:col-span-5 space-y-2.5">
                <div className="flex items-center justify-between px-1">
                  <span className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
                    Uploaded Files ({filesQueue.length})
                  </span>
                  {isProcessingQueue && (
                    <span className="text-xs text-indigo-400 flex items-center gap-1">
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      Converting...
                    </span>
                  )}
                </div>

                <div className="space-y-2 max-h-[420px] overflow-y-auto pr-1 scrollbar-thin">
                  {filesQueue.map((item, idx) => {
                    const isSelected = item.id === activeFileId;
                    return (
                      <div
                        key={item.id}
                        onClick={() => setActiveFileId(item.id)}
                        className={cn(
                          'p-3 rounded-xl border transition cursor-pointer flex items-center justify-between gap-2.5 text-left',
                          isSelected
                            ? 'bg-indigo-600/20 border-indigo-500 shadow-sm shadow-indigo-500/10 ring-1 ring-indigo-500/30'
                            : 'bg-slate-800/60 border-slate-700/70 hover:border-slate-600 hover:bg-slate-800'
                        )}
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className="p-2 rounded-lg bg-slate-900/60 border border-slate-700/60 shrink-0">
                            {getFileIcon(item.file)}
                          </div>
                          <div className="min-w-0 truncate">
                            <p className="text-xs font-medium text-slate-200 truncate">
                              {item.file.name}
                            </p>
                            <p className="text-[10px] text-slate-400 mt-0.5">
                              {(item.file.size / 1024).toFixed(1)} KB • {item.saveFormat.replace('_', ' ')}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-1.5 shrink-0">
                          {item.status === 'converting' && (
                            <Loader2 className="w-4 h-4 text-indigo-400 animate-spin" />
                          )}
                          {item.status === 'completed' && (
                            <span className="p-1 rounded-full bg-emerald-500/20 text-emerald-400">
                              <Check className="w-3.5 h-3.5" />
                            </span>
                          )}
                          {item.status === 'error' && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                retryConversion(item.id);
                              }}
                              className="p-1 rounded-lg bg-rose-500/20 text-rose-300 hover:bg-rose-500/30 transition"
                              title="Retry conversion"
                            >
                              <RefreshCw className="w-3.5 h-3.5" />
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              removeFileFromQueue(item.id);
                            }}
                            className="p-1 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-slate-700/50 transition"
                            title="Remove file"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Quick Add Drop Strip */}
                <div
                  className={`border border-dashed rounded-xl p-3 text-center transition cursor-pointer ${
                    dragActive
                      ? 'border-indigo-500 bg-indigo-500/10'
                      : 'border-slate-700 hover:border-indigo-500/40 bg-slate-800/30'
                  }`}
                  onDragEnter={handleDrag}
                  onDragLeave={handleDrag}
                  onDragOver={handleDrag}
                  onDrop={handleDrop}
                  onClick={() => fileInputRef.current?.click()}
                >
                  <p className="text-[11px] text-slate-300 flex items-center justify-center gap-1.5">
                    <Plus className="w-3.5 h-3.5 text-indigo-400" />
                    <span>Drop more files here or click to add</span>
                  </p>
                </div>
              </div>

              {/* Right Column: Selected File Editor & Formatting Details (7 cols) */}
              <div className="lg:col-span-7 space-y-3">
                {activeFile ? (
                  <div className="p-4 rounded-xl bg-slate-800/70 border border-slate-700/80 space-y-3.5">
                    <div className="flex items-center justify-between border-b border-slate-700/60 pb-2.5">
                      <div className="flex items-center gap-2 min-w-0">
                        {getFileIcon(activeFile.file)}
                        <div className="min-w-0">
                          <h3 className="text-xs font-semibold text-slate-200 truncate">
                            {activeFile.file.name}
                          </h3>
                          <p className="text-[10px] text-slate-400">
                            Status: <span className={cn('font-medium uppercase', activeFile.status === 'completed' ? 'text-emerald-400' : activeFile.status === 'error' ? 'text-rose-400' : 'text-indigo-400')}>{activeFile.status}</span>
                            {activeFile.result?.word_count ? ` • ${activeFile.result.word_count} words extracted` : ''}
                          </p>
                        </div>
                      </div>

                      {activeFile.result?.file_url && (
                        <button
                          type="button"
                          onClick={() => {
                            const a = document.createElement('a');
                            a.href = activeFile.result?.file_url || '';
                            a.download = activeFile.file.name;
                            a.click();
                          }}
                          className="px-2 py-1 text-[11px] bg-slate-700 hover:bg-slate-600 text-slate-200 rounded-lg flex items-center gap-1 transition"
                          title="Download original file to local device storage"
                        >
                          <Download className="w-3 h-3" />
                          <span>Original</span>
                        </button>
                      )}
                    </div>

                    {/* Mode Selector for Images */}
                    {(activeFile.file.type.startsWith('image/') || /\.(png|jpe?g|webp|bmp|tiff)$/i.test(activeFile.file.name)) && (
                      <div className="p-2.5 bg-slate-900/60 rounded-xl border border-slate-700/60 space-y-1.5">
                        <div className="flex items-center justify-between">
                          <label className="text-[11px] font-semibold text-slate-300">
                            OCR Recognition Mode:
                          </label>
                          <span className="text-[10px] text-indigo-400 font-medium">Tesseract + OpenCV CLAHE</span>
                        </div>
                        <div className="grid grid-cols-3 gap-1.5">
                          {(['handwritten', 'printed', 'auto'] as const).map(mode => (
                            <button
                              key={mode}
                              type="button"
                              onClick={() => updateFileOcrMode(activeFile.id, mode)}
                              className={cn(
                                'py-1.5 px-2 rounded-lg border text-xs font-medium transition text-center capitalize',
                                activeFile.ocrMode === mode
                                  ? 'bg-indigo-600/30 border-indigo-500 text-indigo-300'
                                  : 'bg-slate-800 border-slate-700 text-slate-400 hover:border-slate-600'
                              )}
                            >
                              {mode === 'handwritten' ? '✍️ Handwritten' : mode === 'printed' ? '📄 Printed' : '⚡ Auto'}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Format Selector */}
                    <div className="space-y-1.5">
                      <label className="text-[11px] font-semibold text-slate-300 block">
                        Save Format for this File:
                      </label>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 text-xs">
                        <button
                          type="button"
                          onClick={() => updateFileFormat(activeFile.id, 'text')}
                          className={cn(
                            'p-2 rounded-lg border text-left transition',
                            activeFile.saveFormat === 'text'
                              ? 'bg-indigo-600/25 border-indigo-500 text-indigo-200'
                              : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:border-slate-700'
                          )}
                        >
                          <p className="font-semibold text-[11px]">📝 Pure Text</p>
                          <p className="text-[9px] text-slate-400 mt-0.5">Editable markdown</p>
                        </button>

                        {(activeFile.result?.file_type === 'pdf' || activeFile.result?.file_type === 'pptx' || (activeFile.result?.page_images && activeFile.result.page_images.length > 0)) && (
                          <button
                            type="button"
                            onClick={() => updateFileFormat(activeFile.id, 'sequential_images')}
                            className={cn(
                              'p-2 rounded-lg border text-left transition',
                              activeFile.saveFormat === 'sequential_images'
                                ? 'bg-indigo-600/25 border-indigo-500 text-indigo-200'
                                : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:border-slate-700'
                            )}
                          >
                            <p className="font-semibold text-[11px]">
                              {activeFile.result?.file_type === 'pptx' ? '🖼️ Slides' : '📑 Pages'}
                            </p>
                            <p className="text-[9px] text-slate-400 mt-0.5">Sequential images</p>
                          </button>
                        )}

                        <button
                          type="button"
                          onClick={() => updateFileFormat(activeFile.id, 'original')}
                          className={cn(
                            'p-2 rounded-lg border text-left transition',
                            activeFile.saveFormat === 'original'
                              ? 'bg-indigo-600/25 border-indigo-500 text-indigo-200'
                              : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:border-slate-700'
                          )}
                        >
                          <p className="font-semibold text-[11px]">📎 Original Link</p>
                          <p className="text-[9px] text-slate-400 mt-0.5">Attachment link</p>
                        </button>

                        <button
                          type="button"
                          onClick={() => updateFileFormat(activeFile.id, 'hybrid')}
                          className={cn(
                            'p-2 rounded-lg border text-left transition',
                            activeFile.saveFormat === 'hybrid'
                              ? 'bg-indigo-600/25 border-indigo-500 text-indigo-200'
                              : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:border-slate-700'
                          )}
                        >
                          <p className="font-semibold text-[11px]">🖼️ Hybrid</p>
                          <p className="text-[9px] text-slate-400 mt-0.5">Image + Text</p>
                        </button>
                      </div>
                    </div>

                    {/* Extracted Text Area */}
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="text-[11px] font-medium text-slate-300">
                          Extracted Content for this File:
                        </label>
                        <span className="text-[10px] text-slate-400">
                          {(activeFile.editedText || activeFile.result?.text || '').length} chars
                        </span>
                      </div>
                      <textarea
                        value={activeFile.editedText !== undefined ? activeFile.editedText : activeFile.result?.text || ''}
                        onChange={(e) => updateFileText(activeFile.id, e.target.value)}
                        rows={7}
                        className="w-full p-2.5 text-xs font-mono bg-slate-950 border border-slate-800 rounded-lg text-slate-200 focus:outline-none focus:border-indigo-500 transition resize-none leading-relaxed scrollbar-thin"
                        placeholder="Converted text will appear here..."
                      />
                    </div>
                  </div>
                ) : (
                  <div className="h-full flex items-center justify-center p-8 text-center text-slate-500 border border-slate-800 rounded-xl bg-slate-800/40">
                    <p className="text-xs">Select a file from the queue to view and customize its extraction.</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Tab 2: Combined Master Preview View */}
          {filesQueue.length > 0 && activeTab === 'preview' && (
            <div className="space-y-3">
              <div className="p-3.5 bg-slate-800/80 rounded-xl border border-slate-700/80 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
                <div className="flex-1">
                  <label className="text-[11px] font-semibold text-slate-300 block mb-1">
                    Master Note Title:
                  </label>
                  <input
                    type="text"
                    value={customMasterTitle}
                    onChange={(e) => setCustomMasterTitle(e.target.value)}
                    placeholder="Enter title for combined note..."
                    className="w-full px-3 py-1.5 text-xs bg-slate-900 border border-slate-700 rounded-lg text-slate-100 focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div className="flex items-center gap-2 self-end sm:self-auto">
                  <button
                    type="button"
                    onClick={handleCopyCombined}
                    className="px-3 py-1.5 text-xs bg-slate-700 hover:bg-slate-600 text-slate-200 rounded-lg flex items-center gap-1.5 transition"
                  >
                    <Copy className="w-3.5 h-3.5" />
                    <span>Copy All</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleDownloadAllOriginals}
                    className="px-3 py-1.5 text-xs bg-indigo-600/30 hover:bg-indigo-600/50 text-indigo-300 border border-indigo-500/40 rounded-lg flex items-center gap-1.5 transition"
                    title="Download all original files"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Download Originals</span>
                  </button>
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-semibold text-slate-300">
                    Combined Markdown Document ({combinedText.length} characters)
                  </label>
                  <span className="text-[11px] text-slate-400">
                    Includes {completedCount} converted file(s) with section dividers
                  </span>
                </div>
                <textarea
                  value={combinedText}
                  onChange={(e) => setCombinedText(e.target.value)}
                  className="w-full h-72 p-3.5 text-xs font-mono bg-slate-950 border border-slate-800 rounded-xl text-slate-200 focus:outline-none focus:border-indigo-500 transition resize-none leading-relaxed scrollbar-thin"
                  placeholder="Combined converted markdown text..."
                />
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer Actions */}
        <div className="px-5 sm:px-6 py-3.5 border-t border-slate-800 bg-slate-900/90 flex flex-wrap items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-2 text-xs font-medium text-slate-400 hover:text-slate-200 transition"
            >
              Cancel
            </button>
            {filesQueue.length > 0 && (
              <span className="text-[11px] text-slate-500 hidden sm:inline">
                {completedCount} of {filesQueue.length} files processed
              </span>
            )}
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {/* If within note editor, allow Append or Replace */}
            {onInsertText && filesQueue.length > 0 && (
              <>
                <button
                  type="button"
                  onClick={() => handleApplyToCurrentNote('append')}
                  disabled={completedCount === 0 || isProcessingQueue}
                  className="px-3.5 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 rounded-xl transition shadow-md shadow-indigo-600/25 flex items-center gap-1.5 disabled:opacity-50"
                  title="Preserve existing note content and append these file(s) to the bottom"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Append to Current Note</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleApplyToCurrentNote('replace')}
                  disabled={completedCount === 0 || isProcessingQueue}
                  className="px-3.5 py-2 text-xs font-medium text-amber-200 bg-amber-500/10 hover:bg-amber-500/20 rounded-xl border border-amber-500/30 transition disabled:opacity-50"
                  title="Overwrite current note content with these converted file(s)"
                >
                  <span>Replace Note Content</span>
                </button>
              </>
            )}

            {/* Create as New Note */}
            {filesQueue.length > 0 && (
              <button
                type="button"
                onClick={handleCreateNewNote}
                disabled={completedCount === 0 || isCreatingNote || isProcessingQueue}
                className={cn(
                  'px-4 py-2 text-xs font-semibold rounded-xl transition shadow-md flex items-center gap-1.5 disabled:opacity-50',
                  onInsertText
                    ? 'text-slate-300 bg-slate-800 hover:bg-slate-700 border border-slate-700'
                    : 'text-white bg-indigo-600 hover:bg-indigo-500 shadow-indigo-600/30'
                )}
              >
                {isCreatingNote ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Creating Note...</span>
                  </>
                ) : (
                  <>
                    <FileCheck className="w-4 h-4" />
                    <span>Create As New Note</span>
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
