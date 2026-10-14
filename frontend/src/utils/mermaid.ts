/**
 * Mermaid utility functions for Chitralekh
 * Handles DOM error element cleanup, auto-quoting of complex node labels,
 * and diagram type validation.
 */

export const VALID_MERMAID_STARTERS = [
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

/**
 * Removes rogue error SVG elements injected into document.body by Mermaid.js internal error handlers.
 */
export function removeMermaidErrorElements(containerId?: string) {
  if (typeof document === 'undefined') return;

  const selectors = [
    '.error-icon',
    '.error-text',
    '[id^="dmermaid"]',
    '[id^="mermaid-"][class*="error"]',
  ];
  if (containerId) {
    selectors.push(`#d${containerId}`);
    selectors.push(`#${containerId}`);
  }

  try {
    const errorElements = document.querySelectorAll(selectors.join(', '));
    errorElements.forEach((el) => el.remove());

    // Also remove any direct body elements whose text contains Mermaid error signatures
    document.querySelectorAll('body > div, body > svg').forEach((el) => {
      const text = el.textContent || '';
      if (text.includes('Syntax error in text') && text.includes('mermaid version')) {
        el.remove();
      }
    });
  } catch {
    // Graceful silence on DOM errors
  }
}

/**
 * Checks whether a given string has a valid Mermaid diagram starter header
 */
export function hasValidMermaidHeader(code: string): boolean {
  if (!code || !code.trim()) return false;
  const trimmed = code.trim();
  const firstToken = trimmed.split(/[\s\n\r(]/)[0].toLowerCase();
  return VALID_MERMAID_STARTERS.some(
    (s) => s === firstToken || trimmed.toLowerCase().startsWith(s)
  );
}

/**
 * Auto-quotes unquoted node labels in Mermaid flowchart / graph syntax.
 * In Mermaid, node labels with characters like parentheses (), brackets, colons :,
 * mathematical symbols (+, =, ^), emojis, or slashes / break the lexer unless
 * enclosed in double quotes: A["Label with math: e^(iπ) + 1 = 0"].
 */
export function autoQuoteMermaidLabels(code: string): string {
  if (!code) return '';

  let transformed = code;

  // 1. Match rectangle nodes: id[Label...] where Label is not already quoted
  // We match [ and lookahead for matching ] on the same line
  transformed = transformed.replace(
    /([a-zA-Z0-9_-]+)\[([^"\[\]\r\n]+?)\]/g,
    (match, id, text) => {
      // Don't modify if it's already a nested special shape like [(cylinder)] or ([stadium]) or [/shape/]
      if (text.startsWith('(') && text.endsWith(')')) return match;
      if (text.startsWith('/') || text.startsWith('\\')) return match;
      const clean = text.replace(/"/g, "'").trim();
      return `${id}["${clean}"]`;
    }
  );

  // 2. Match rounded nodes: id(Label...) where Label is not already quoted
  transformed = transformed.replace(
    /([a-zA-Z0-9_-]+)\(([^"\(\)\r\n]+?)\)/g,
    (match, id, text) => {
      // Don't modify if it's double rounded ((circle)) or ([stadium])
      if (text.startsWith('[') && text.endsWith(']')) return match;
      if (text.startsWith('(') && text.endsWith(')')) return match;
      const clean = text.replace(/"/g, "'").trim();
      return `${id}("${clean}")`;
    }
  );

  // 3. Match rhombus / decision nodes: id{Label...} where Label is not already quoted
  transformed = transformed.replace(
    /([a-zA-Z0-9_-]+)\{([^"\{\}\r\n]+?)\}/g,
    (match, id, text) => {
      // Don't modify if it's hexagon {{text}}
      if (text.startsWith('{') && text.endsWith('}')) return match;
      const clean = text.replace(/"/g, "'").trim();
      return `${id}{"${clean}"}`;
    }
  );

  return transformed;
}
