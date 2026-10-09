import { useState, useCallback, useEffect, useRef } from 'react';
import { flowchartsApi } from '../services/api';
import type { FlowchartData } from '../types';
import toast from 'react-hot-toast';

export function useFlowchart() {
  const [isRendering, setIsRendering] = useState(false);
  const [svg, setSvg] = useState<string>('');
  const [error, setError] = useState<string | null>(null);

  const render = useCallback(async (code: string, theme = 'default', direction = 'TD') => {
    if (!code || !code.trim()) {
      setSvg('');
      setError(null);
      return;
    }
    setIsRendering(true);
    setError(null);
    try {
      const mermaid = (await import('mermaid')).default;
      mermaid.initialize({
        startOnLoad: false,
        theme: (theme as any) || 'default',
        securityLevel: 'loose',
        fontFamily: 'Inter, system-ui, sans-serif',
      });
      const id = `mermaid-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
      const { svg: renderedSvg } = await mermaid.render(id, code);
      setSvg(renderedSvg);
    } catch (clientErr: any) {
      try {
        const response = await flowchartsApi.render({ code, theme, direction });
        setSvg(response.data.svg);
      } catch (err: any) {
        const message = clientErr?.message || err?.response?.data?.detail || 'Failed to render flowchart';
        setError(message);
        setSvg('');
      }
    } finally {
      setIsRendering(false);
    }
  }, []);

  const validate = useCallback(async (code: string) => {
    try {
      const mermaid = (await import('mermaid')).default;
      const isValid = await mermaid.parse(code);
      return { valid: !!isValid };
    } catch (clientErr: any) {
      try {
        const response = await flowchartsApi.validate(code);
        return response.data;
      } catch {
        return { valid: false, error: clientErr?.message || 'Validation failed' };
      }
    }
  }, []);

  const exportFlowchart = async (noteId: string, format: 'svg' | 'png' | 'pdf', theme = 'default') => {
    try {
      const response = await flowchartsApi.export(noteId, { format, theme });
      const blob = new Blob([response.data], { type: format === 'svg' ? 'image/svg+xml' : format === 'png' ? 'image/png' : 'application/pdf' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `flowchart.${format}`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success(`Exported as ${format.toUpperCase()}`);
    } catch {
      if (format === 'svg' && svg) {
        const blob = new Blob([svg], { type: 'image/svg+xml' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'flowchart.svg';
        a.click();
        URL.revokeObjectURL(url);
        toast.success('Exported as SVG');
        return;
      }
      toast.error('Export failed');
    }
  };

  return { svg, isRendering, error, render, validate, exportFlowchart };
}

export function useFlowchartTemplates() {
  const [templates, setTemplates] = useState<any[]>([]);
  const [themes, setThemes] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const fetch = useCallback(async () => {
    setIsLoading(true);
    try {
      const [templatesResponse, themesResponse] = await Promise.all([
        flowchartsApi.getTemplates(),
        flowchartsApi.getThemes(),
      ]);
      setTemplates(templatesResponse.data.templates);
      setThemes(themesResponse.data.themes);
    } catch {
      toast.error('Failed to load templates');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetch();
  }, [fetch]);

  return { templates, themes, isLoading, refetch: fetch };
}

export function useMermaid() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    import('mermaid').then((mermaid) => {
      mermaid.default.initialize({
        startOnLoad: false,
        theme: 'default',
        securityLevel: 'loose',
        fontFamily: 'Inter, system-ui, sans-serif',
      });
      setIsInitialized(true);
    });
  }, []);

  const renderToElement = useCallback(async (code: string, element: HTMLElement) => {
    const mermaid = (await import('mermaid')).default;
    try {
      const { svg } = await mermaid.render(`mermaid-${Date.now()}`, code);
      element.innerHTML = svg;
      return svg;
    } catch (error) {
      element.innerHTML = `<div class="text-red-500 p-4">${error}</div>`;
      throw error;
    }
  }, []);

  return { containerRef, isInitialized, renderToElement };
}