import { useState, useCallback, useEffect, useRef } from 'react';
import { flowchartsApi } from '../services/api';
import type { FlowchartData } from '../types';
import toast from 'react-hot-toast';

/**
 * Removes any error elements Mermaid.js may have injected into document.body.
 * By default, Mermaid injects <div id="dmermaid-..." class="error-icon">...</div> into <body>
 * when syntax errors occur, causing them to pile up outside the React app.
 */
export const removeMermaidErrorElements = (containerId?: string) => {
  if (typeof document === 'undefined') return;

  if (containerId) {
    document.getElementById(containerId)?.remove();
    document.getElementById(`d${containerId}`)?.remove();
  }

  // Remove any elements Mermaid injected into document.body
  const errorElements = document.querySelectorAll(
    'body > [id^="dmermaid"], body > [id^="mermaid-"], body > svg[id^="dmermaid"], body > .error-icon, body > [class*="error-icon"]'
  );
  errorElements.forEach(el => el.remove());

  // Also remove any direct body elements whose text contains Mermaid error signatures
  document.querySelectorAll('body > div, body > svg').forEach(el => {
    if (el.textContent?.includes('Syntax error in text') && el.textContent?.includes('mermaid version')) {
      el.remove();
    }
  });
};

const VALID_MERMAID_STARTERS = [
  'flowchart',
  'graph',
  'sequencediagram',
  'classdiagram',
  'statediagram',
  'statediagram-v2',
  'erdiagram',
  'journey',
  'gantt',
  'pie',
  'quadrantchart',
  'requirementdiagram',
  'gitgraph',
  'c4context',
  'mindmap',
  'timeline',
  'sankey-beta',
  'xychart-beta',
  'block-beta',
  'architecture-beta',
  'packet-beta',
  'kanban',
];

export function useFlowchart() {
  const [isRendering, setIsRendering] = useState(false);
  const [svg, setSvg] = useState<string>('');
  const [error, setError] = useState<string | null>(null);

  const render = useCallback(async (code: string, theme = 'default', direction = 'TD') => {
    // 1. Immediately clean up any previous rogue Mermaid error DOM nodes
    removeMermaidErrorElements();

    if (!code || !code.trim()) {
      setSvg('');
      setError(null);
      return;
    }

    setIsRendering(true);
    setError(null);

    const trimmed = code.trim();
    const firstToken = trimmed.split(/[\s\n\r(]/)[0].toLowerCase();
    const hasValidHeader = VALID_MERMAID_STARTERS.some(s => s === firstToken || trimmed.toLowerCase().startsWith(s));

    // Fast-fail if the user typed plain text (e.g. "hlo saurav yadav") without a diagram header
    if (!hasValidHeader) {
      removeMermaidErrorElements();
      const friendlyErr = `Diagram must begin with a valid Mermaid diagram type (e.g., "flowchart TD", "graph TD", "sequenceDiagram", "mindmap"). Found "${firstToken || 'text'}".`;
      setError(friendlyErr);
      setSvg('');
      setIsRendering(false);
      return;
    }

    const id = `mermaid-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;

    try {
      const mermaid = (await import('mermaid')).default;

      // Override parseError so Mermaid never writes error elements to document.body
      mermaid.parseError = () => {};

      mermaid.initialize({
        startOnLoad: false,
        suppressErrorRendering: true,
        theme: (theme as any) || 'default',
        securityLevel: 'loose',
        fontFamily: 'Inter, system-ui, sans-serif',
      });

      // Parse first with suppressErrors to catch syntax issues without DOM pollution
      try {
        await mermaid.parse(trimmed, { suppressErrors: true });
      } catch (parseErr: any) {
        removeMermaidErrorElements(id);
        const rawMsg = parseErr?.message || parseErr?.str || 'Invalid Mermaid syntax';
        const cleanMsg = rawMsg
          .replace(/\n#dmermaid[^\n]*/g, '')
          .replace(/mermaid version \d+\.\d+\.\d+/gi, '')
          .trim();
        setError(cleanMsg);
        setSvg('');
        setIsRendering(false);
        return;
      }

      // Syntax is valid, render SVG
      const { svg: renderedSvg } = await mermaid.render(id, trimmed);
      removeMermaidErrorElements(id);
      setSvg(renderedSvg);
      setError(null);
    } catch (clientErr: any) {
      removeMermaidErrorElements(id);

      // Attempt fallback to backend API if available
      try {
        const response = await flowchartsApi.render({ code: trimmed, theme, direction });
        setSvg(response.data.svg);
        setError(null);
      } catch (err: any) {
        removeMermaidErrorElements(id);
        const rawMessage = clientErr?.message || err?.response?.data?.detail || 'Failed to render flowchart';
        const cleanMessage = String(rawMessage)
          .replace(/\n#dmermaid[^\n]*/g, '')
          .replace(/mermaid version \d+\.\d+\.\d+/gi, '')
          .trim();
        setError(cleanMessage);
        setSvg('');
      }
    } finally {
      removeMermaidErrorElements(id);
      setIsRendering(false);
    }
  }, []);

  const validate = useCallback(async (code: string) => {
    removeMermaidErrorElements();
    if (!code || !code.trim()) {
      return { valid: false, error: 'Diagram code is empty' };
    }

    const trimmed = code.trim();
    const firstToken = trimmed.split(/[\s\n\r(]/)[0].toLowerCase();
    const hasValidHeader = VALID_MERMAID_STARTERS.some(s => s === firstToken || trimmed.toLowerCase().startsWith(s));

    if (!hasValidHeader) {
      return {
        valid: false,
        error: `Diagram must begin with a valid Mermaid diagram header (e.g., "flowchart TD", "graph TD", "sequenceDiagram"). Found "${firstToken}".`,
      };
    }

    try {
      const mermaid = (await import('mermaid')).default;
      mermaid.parseError = () => {};
      mermaid.initialize({
        startOnLoad: false,
        suppressErrorRendering: true,
      });
      const isValid = await mermaid.parse(trimmed, { suppressErrors: true });
      removeMermaidErrorElements();
      return { valid: !!isValid };
    } catch (clientErr: any) {
      removeMermaidErrorElements();
      try {
        const response = await flowchartsApi.validate(trimmed);
        return response.data;
      } catch {
        const raw = clientErr?.message || 'Validation failed';
        return {
          valid: false,
          error: String(raw).replace(/\n#dmermaid[^\n]*/g, '').trim(),
        };
      }
    } finally {
      removeMermaidErrorElements();
    }
  }, []);

  const exportFlowchart = async (noteId: string, format: 'svg' | 'png' | 'pdf', theme = 'default') => {
    try {
      const response = await flowchartsApi.export(noteId, { format, theme });
      const blob = new Blob([response.data], {
        type: format === 'svg' ? 'image/svg+xml' : format === 'png' ? 'image/png' : 'application/pdf',
      });
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
      mermaid.default.parseError = () => {};
      mermaid.default.initialize({
        startOnLoad: false,
        suppressErrorRendering: true,
        theme: 'default',
        securityLevel: 'loose',
        fontFamily: 'Inter, system-ui, sans-serif',
      });
      setIsInitialized(true);
    });
  }, []);

  const renderToElement = useCallback(async (code: string, element: HTMLElement) => {
    removeMermaidErrorElements();
    const mermaid = (await import('mermaid')).default;
    mermaid.parseError = () => {};
    const id = `mermaid-${Date.now()}`;
    try {
      const { svg } = await mermaid.render(id, code);
      removeMermaidErrorElements(id);
      element.innerHTML = svg;
      return svg;
    } catch (error: any) {
      removeMermaidErrorElements(id);
      element.innerHTML = `<div class="text-red-500 p-4 font-mono text-xs">${error?.message || error}</div>`;
      throw error;
    } finally {
      removeMermaidErrorElements();
    }
  }, []);

  return { containerRef, isInitialized, renderToElement };
}