import React, { useEffect, useState, useRef } from 'react';
import {
  removeMermaidErrorElements,
  autoQuoteMermaidLabels,
  hasValidMermaidHeader,
} from '../utils/mermaid';
import { Copy, Check, AlertCircle, Code, Eye } from 'lucide-react';
import toast from 'react-hot-toast';

interface MermaidDiagramProps {
  code: string;
  className?: string;
  theme?: string;
}

export function MermaidDiagram({ code, className = '', theme }: MermaidDiagramProps) {
  const [svg, setSvg] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [showCode, setShowCode] = useState(false);
  const [copied, setCopied] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let isMounted = true;
    const trimmed = (code || '').trim();

    if (!trimmed) {
      setSvg('');
      setError(null);
      return;
    }

    const renderId = `mermaid-md-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;

    async function doRender() {
      removeMermaidErrorElements();

      try {
        const mermaid = (await import('mermaid')).default;
        mermaid.parseError = () => {};

        const isDark = document.documentElement.classList.contains('dark');
        const activeTheme = theme || (isDark ? 'dark' : 'default');

        mermaid.initialize({
          startOnLoad: false,
          suppressErrorRendering: true,
          theme: activeTheme as any,
          securityLevel: 'loose',
          fontFamily: 'Inter, system-ui, sans-serif',
        });

        let codeToRender = trimmed;
        let isValid = false;

        // Try direct parse
        try {
          await mermaid.parse(trimmed, { suppressErrors: true });
          isValid = true;
        } catch (directErr) {
          // If direct parse fails, try auto-quoting complex node labels
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
            removeMermaidErrorElements(renderId);
            if (isMounted) {
              const msg = (directErr as any)?.message || 'Invalid Mermaid diagram syntax';
              const cleanMsg = String(msg)
                .replace(/\n#dmermaid[^\n]*/g, '')
                .replace(/mermaid version \d+\.\d+\.\d+/gi, '')
                .trim();
              setError(cleanMsg);
              setSvg('');
            }
            return;
          }
        }

        const { svg: renderedSvg } = await mermaid.render(renderId, codeToRender);
        removeMermaidErrorElements(renderId);

        if (isMounted) {
          setSvg(renderedSvg);
          setError(null);
        }
      } catch (err: any) {
        removeMermaidErrorElements(renderId);
        if (isMounted) {
          const raw = err?.message || 'Failed to render Mermaid diagram';
          const cleanMsg = String(raw)
            .replace(/\n#dmermaid[^\n]*/g, '')
            .replace(/mermaid version \d+\.\d+\.\d+/gi, '')
            .trim();
          setError(cleanMsg);
          setSvg('');
        }
      } finally {
        removeMermaidErrorElements(renderId);
      }
    }

    doRender();

    return () => {
      isMounted = false;
      removeMermaidErrorElements(renderId);
    };
  }, [code, theme]);

  const handleCopy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    toast.success('Diagram code copied!');
    setTimeout(() => setCopied(false), 2000);
  };

  if (error) {
    return (
      <div className="my-4 rounded-xl border border-red-200 dark:border-red-900/60 bg-red-50/80 dark:bg-red-950/40 p-4 text-xs font-sans">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2 text-red-700 dark:text-red-300 font-semibold">
            <AlertCircle className="w-4 h-4 text-red-500 shrink-0" />
            <span>Mermaid Syntax Error</span>
          </div>
          <button
            type="button"
            onClick={() => setShowCode(!showCode)}
            className="flex items-center gap-1 text-[11px] text-red-600 dark:text-red-400 hover:underline"
          >
            {showCode ? <Eye className="w-3 h-3" /> : <Code className="w-3 h-3" />}
            <span>{showCode ? 'Hide Code' : 'View Code'}</span>
          </button>
        </div>
        <pre className="p-2.5 rounded bg-white/70 dark:bg-secondary-900/70 border border-red-200 dark:border-red-900/40 text-red-600 dark:text-red-300 font-mono text-[11px] whitespace-pre-wrap break-words mb-2">
          {error}
        </pre>
        {showCode && (
          <pre className="p-3 rounded bg-secondary-900 text-secondary-100 font-mono text-xs overflow-x-auto whitespace-pre">
            {code}
          </pre>
        )}
      </div>
    );
  }

  return (
    <div className={`relative my-4 group rounded-xl border border-secondary-200 dark:border-secondary-700 bg-secondary-50/40 dark:bg-secondary-900/60 p-4 overflow-hidden ${className}`}>
      {/* Top right quick actions */}
      <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1.5 z-10">
        <button
          type="button"
          onClick={handleCopy}
          className="p-1.5 rounded-lg bg-white/90 dark:bg-secondary-800/90 shadow-sm border border-secondary-200 dark:border-secondary-700 text-secondary-600 dark:text-secondary-300 hover:text-primary-600"
          title="Copy Mermaid Code"
        >
          {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
        </button>
      </div>

      {svg ? (
        <div
          ref={containerRef}
          className="w-full flex items-center justify-center overflow-x-auto"
          dangerouslySetInnerHTML={{ __html: svg }}
        />
      ) : (
        <div className="flex items-center justify-center py-8 text-secondary-400 text-xs">
          Rendering flowchart...
        </div>
      )}
    </div>
  );
}
