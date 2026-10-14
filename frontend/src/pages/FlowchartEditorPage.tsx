import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useNote, useFlowchart, useFlowchartTemplates } from '../hooks';
import { notesApi } from '../services/api';
import { Save, RotateCcw, Download, Copy, Maximize2, Minimize2, ChevronLeft, Menu, X, Plus, Trash2, Settings, Code, Type, GitBranch, Eye, EyeOff, ExternalLink, Share2, Sparkles, AlertCircle } from 'lucide-react';
import { cn } from '../utils';
import { autoQuoteMermaidLabels } from '../utils/mermaid';
import toast from 'react-hot-toast';

export function FlowchartEditorPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const isNew = id === 'new';
  const { note, isLoading: noteLoading, refetch } = useNote(id || null);
  const { svg: flowchartSvg, error: flowchartError, isRendering: isFlowchartRendering, render: renderFlowchart, validate, exportFlowchart } = useFlowchart();
  const { templates, themes, isLoading: templatesLoading } = useFlowchartTemplates();

  const [content, setContent] = useState('');
  const [title, setTitle] = useState('');
  const [showPreview, setShowPreview] = useState(true);
  const [showTemplates, setShowTemplates] = useState(false);
  const [selectedTheme, setSelectedTheme] = useState('default');
  const [direction, setDirection] = useState('TD');
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [validation, setValidation] = useState<{ valid: boolean; error?: string } | null>(null);
  const editorRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (note) {
      setContent(note.content || '');
      setTitle(note.title || '');
      if (note.content) {
        renderFlowchart(note.content, selectedTheme, direction);
      }
    } else if (isNew) {
      setContent(templates[0]?.code || '');
      renderFlowchart(templates[0]?.code || '', selectedTheme, direction);
    }
  }, [note, isNew, templates]);

  const handleSave = async () => {
    if (!content.trim()) {
      toast.error('Flowchart cannot be empty');
      return;
    }
    setIsSaving(true);
    try {
      if (isNew) {
        const response = await notesApi.create({
          title: title.trim() || 'Untitled Flowchart',
          content,
          note_type: 'flowchart',
        });
        toast.success('Flowchart saved');
        navigate(`/flowcharts/${response.data.id}`, { replace: true });
      } else if (id) {
        await notesApi.update(id, {
          title: title.trim() || 'Untitled Flowchart',
          content,
          note_type: 'flowchart',
        });
        toast.success('Flowchart saved');
        refetch();
      }
    } catch {
      toast.error('Failed to save flowchart');
    } finally {
      setIsSaving(false);
    }
  };

  const handleValidate = async () => {
    const result = await validate(content);
    setValidation(result);
    if (result.valid) {
      toast.success('Valid flowchart syntax');
    } else {
      toast.error(result.error || 'Invalid syntax');
    }
  };

  const handleExport = (format: 'svg' | 'png' | 'pdf') => {
    exportFlowchart(note?.id || 'export', format, selectedTheme);
  };

  const insertTemplate = (templateCode: string) => {
    setContent(templateCode);
    renderFlowchart(templateCode, selectedTheme, direction);
    setShowTemplates(false);
  };

  if (noteLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="w-8 h-8 border-4 border-primary-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className={cn('h-full flex flex-col', isFullscreen && 'fixed inset-0 z-50 bg-white dark:bg-secondary-900')}>
      <div className="sticky top-0 z-20 bg-white/80 dark:bg-secondary-900/80 backdrop-blur-sm border-b border-secondary-200 dark:border-secondary-700">
        <div className="flex items-center justify-between h-16 px-4 lg:px-6">
          <div className="flex items-center gap-4">
            <button onClick={() => navigate(-1)} className="btn-ghost p-2 lg:hidden" aria-label="Back">
              <ChevronLeft className="w-5 h-5" />
            </button>
            <input
              type="text"
              value={title}
              onChange={e => setTitle(e.target.value)}
              className="bg-transparent border-none text-xl font-semibold text-secondary-900 dark:text-white w-64 focus:outline-none placeholder:text-secondary-400"
              placeholder="Untitled Flowchart"
            />
            <span className="px-2 py-1 text-xs font-medium bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 rounded">Flowchart</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="hidden sm:flex items-center gap-1 bg-secondary-100 dark:bg-secondary-800 rounded-lg p-1">
              <button onClick={handleSave} disabled={isSaving} className="btn-primary flex items-center gap-2">
                <Save className="w-4 h-4" />
                {isSaving ? 'Saving...' : 'Save'}
              </button>
              <button onClick={handleValidate} className="btn-secondary flex items-center gap-1"><RotateCcw className="w-3.5 h-3.5" /> Validate</button>
              <select value={selectedTheme} onChange={e => { setSelectedTheme(e.target.value); renderFlowchart(content, e.target.value, direction); }} className="input text-sm w-auto">
                {themes.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
              </select>
              <select value={direction} onChange={e => { setDirection(e.target.value); renderFlowchart(content, selectedTheme, e.target.value); }} className="input text-sm w-auto">
                <option value="TD">Top-Down</option>
                <option value="LR">Left-Right</option>
                <option value="RL">Right-Left</option>
                <option value="BT">Bottom-Up</option>
              </select>
            </div>
            <button onClick={() => setShowTemplates(!showTemplates)} className="btn-secondary flex items-center gap-1"><Plus className="w-3.5 h-3.5" /> Templates</button>
            <button onClick={() => setIsFullscreen(!isFullscreen)} className="btn-ghost p-2" aria-label={isFullscreen ? 'Exit fullscreen' : 'Fullscreen'}>{isFullscreen ? <Minimize2 className="w-5 h-5" /> : <Maximize2 className="w-5 h-5" />}</button>
          </div>
        </div>

        {showTemplates && (
          <div className="border-t border-secondary-200 dark:border-secondary-700 p-4 bg-secondary-50 dark:bg-secondary-800/50 animate-slide-in">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-medium text-secondary-900 dark:text-white">Templates</h3>
              <button onClick={() => setShowTemplates(false)} className="btn-ghost p-1.5"><X className="w-4 h-4" /></button>
            </div>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 max-h-60 overflow-y-auto">
              {templates.map(template => (
                <button
                  key={template.id}
                  onClick={() => insertTemplate(template.code)}
                  className="p-3 rounded-lg border border-secondary-200 dark:border-secondary-700 hover:border-primary-500 hover:bg-primary-50 dark:hover:bg-primary-900/20 transition-colors text-left"
                >
                  <h4 className="font-medium text-secondary-900 dark:text-white mb-1">{template.name}</h4>
                  <p className="text-xs text-secondary-500 mb-2">{template.description}</p>
                  <span className="text-xs px-2 py-0.5 bg-secondary-100 dark:bg-secondary-800 rounded">{template.category}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {validation && (
          <div className={cn('border-t px-4 py-3', validation.valid ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800' : 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800')}>
            <div className="flex items-center gap-2">
              {validation.valid ? (
                <CheckCircle className="w-5 h-5 text-green-600" />
              ) : (
                <AlertCircle className="w-5 h-5 text-red-600" />
              )}
              <span className={validation.valid ? 'text-green-700 dark:text-green-400' : 'text-red-700 dark:text-red-400'}>
                {validation.valid ? 'Valid Mermaid syntax' : validation.error}
              </span>
            </div>
          </div>
        )}
      </div>

      <div className="flex-1 flex overflow-hidden">
        <div className={cn('w-1/2 border-r border-secondary-200 dark:border-secondary-700 overflow-auto', !showPreview && 'w-full')}>
          <div className="h-full flex flex-col">
            <div className="p-2 border-b border-secondary-200 dark:border-secondary-700 flex items-center justify-between">
              <span className="text-sm font-medium text-secondary-700 dark:text-secondary-300">Editor</span>
              <div className="flex items-center gap-1">
                <button onClick={() => setShowPreview(!showPreview)} className={cn('btn-ghost p-1.5', !showPreview && 'bg-primary-100 text-primary-700')}>{showPreview ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}</button>
                <button onClick={handleValidate} className="btn-ghost p-1.5" title="Validate"><RotateCcw className="w-4 h-4" /></button>
              </div>
            </div>
            <textarea
              ref={editorRef}
              value={content}
              onChange={e => { setContent(e.target.value); renderFlowchart(e.target.value, selectedTheme, direction); }}
              className="flex-1 p-4 bg-transparent border-none resize-none text-secondary-900 dark:text-white focus:outline-none font-mono text-sm leading-relaxed"
              placeholder="Enter Mermaid diagram code..."
              spellCheck={false}
            />
          </div>
        </div>

        <div className={cn('w-1/2 overflow-auto bg-white dark:bg-secondary-900', !showPreview && 'hidden')}>
          <div className="h-full flex flex-col">
            <div className="p-2 border-b border-secondary-200 dark:border-secondary-700 flex items-center justify-between">
              <span className="text-sm font-medium text-secondary-700 dark:text-secondary-300">Preview</span>
              <div className="flex items-center gap-1">
                <button onClick={() => handleExport('svg')} className="btn-ghost p-1.5" title="Export SVG"><Download className="w-4 h-4" /></button>
                <button onClick={() => handleExport('png')} className="btn-ghost p-1.5" title="Export PNG"><Download className="w-4 h-4" /></button>
              </div>
            </div>
            <div className="flex-1 p-4 overflow-auto scrollbar-thin" style={{ backgroundColor: selectedTheme === 'dark' ? '#1e1e1e' : 'white' }}>
              {flowchartError ? (
                <div className="h-full flex items-center justify-center p-4">
                  <div className="max-w-md w-full bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/60 rounded-xl p-4 text-left shadow-sm">
                    <div className="flex items-center gap-2 text-red-700 dark:text-red-300 font-bold mb-2 text-sm">
                      <AlertCircle className="w-4 h-4 text-red-500" />
                      <span>Mermaid Syntax Error</span>
                    </div>
                    <pre className="text-xs font-mono text-red-600 dark:text-red-300 bg-white/70 dark:bg-secondary-900/70 p-2.5 rounded border border-red-200 dark:border-red-900/40 whitespace-pre-wrap break-words leading-relaxed mb-3">
                      {flowchartError}
                    </pre>
                    <div className="text-[11px] text-secondary-500 dark:text-secondary-400 space-y-2">
                      <p>💡 Tip: Use quotes for complex labels like <code>D["e^(iπ) + 1 = 0"]</code>.</p>
                      {autoQuoteMermaidLabels(content) !== content && (
                        <button
                          type="button"
                          onClick={() => {
                            const fixed = autoQuoteMermaidLabels(content);
                            setContent(fixed);
                            renderFlowchart(fixed, selectedTheme, direction);
                            toast.success('Auto-quoted special characters & math formulas!');
                          }}
                          className="btn-primary py-1.5 px-3 text-xs w-full justify-center flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white"
                        >
                          <Sparkles className="w-3.5 h-3.5" />
                          <span>Auto-Fix Quotes & Special Symbols</span>
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ) : flowchartSvg ? (
                <div className="w-full flex items-center justify-center" dangerouslySetInnerHTML={{ __html: flowchartSvg }} />
              ) : (
                <div className="flex items-center justify-center h-full text-secondary-500">
                  <div className="text-center">
                    <Code className="w-12 h-12 mx-auto mb-3 text-secondary-300" />
                    <p>Click "Validate" or start typing to preview</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="sticky bottom-0 z-10 bg-white/80 dark:bg-secondary-900/80 backdrop-blur-sm border-t border-secondary-200 dark:border-secondary-700 px-4 py-2 flex items-center justify-between">
        <div className="flex items-center gap-4 text-xs text-secondary-500">
          <span>{content.split('\n').length} lines</span>
          <span>·</span>
          <span>{content.length} characters</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-secondary-500">Theme:</span>
          <select value={selectedTheme} onChange={e => { setSelectedTheme(e.target.value); renderFlowchart(content, e.target.value, direction); }} className="input text-xs py-1 px-2 w-auto">
            {themes.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
          </select>
        </div>
      </div>
    </div>
  );
}

import { CheckCircle, AlertCircle } from 'lucide-react';
