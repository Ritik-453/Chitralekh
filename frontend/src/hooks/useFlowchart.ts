import { useState, useCallback, useEffect, useRef } from 'react';
import { flowchartsApi } from '../services/api';
import type { FlowchartData } from '../types';
import toast from 'react-hot-toast';
import {
  removeMermaidErrorElements,
  autoQuoteMermaidLabels,
  hasValidMermaidHeader,
  VALID_MERMAID_STARTERS,
} from '../utils/mermaid';

export { removeMermaidErrorElements, autoQuoteMermaidLabels, VALID_MERMAID_STARTERS };

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
    const hasValidHeader = hasValidMermaidHeader(trimmed);

    // Fast-fail if the user typed plain text without a diagram header
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

      let codeToRender = trimmed;
      let isValid = false;

      // First attempt direct parse
      try {
        await mermaid.parse(trimmed, { suppressErrors: true });
        isValid = true;
      } catch (directErr: any) {
        // Direct parse failed; try auto-quoting complex node labels (e.g. math with parentheses or colons)
        const autoQuoted = autoQuoteMermaidLabels(trimmed);
        if (autoQuoted !== trimmed) {
          try {
            await mermaid.parse(autoQuoted, { suppressErrors: true });
            codeToRender = autoQuoted;
            isValid = true;
          } catch {
            // Both failed
          }
        }

        if (!isValid) {
          removeMermaidErrorElements(id);
          const rawMsg = directErr?.message || directErr?.str || 'Invalid Mermaid syntax';
          const cleanMsg = rawMsg
            .replace(/\n#dmermaid[^\n]*/g, '')
            .replace(/mermaid version \d+\.\d+\.\d+/gi, '')
            .trim();
          setError(cleanMsg);
          setSvg('');
          setIsRendering(false);
          return;
        }
      }

      // Syntax is valid, render SVG
      const { svg: renderedSvg } = await mermaid.render(id, codeToRender);
      removeMermaidErrorElements(id);
      setSvg(renderedSvg);
      setError(null);
    } catch (clientErr: any) {
      removeMermaidErrorElements(id);

      // Attempt fallback to backend API if available, but reject fake SVG fallbacks
      try {
        const response = await flowchartsApi.render({ code: trimmed, theme, direction });
        const returnedSvg = response.data?.svg || '';
        // If the backend returns a mock/fallback pre-block inside SVG, do not treat as rendered flowchart
        if (returnedSvg.includes('<foreignObject') && returnedSvg.includes('<pre')) {
          throw new Error('Could not render diagram on backend');
        }
        setSvg(returnedSvg);
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