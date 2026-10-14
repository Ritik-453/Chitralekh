/**
 * Mermaid Flowchart Parser & Manipulator
 * Provides bidirectional AST / text manipulation for Mermaid flowcharts:
 * - Direct node renaming
 * - Node shape changing (Box, Rhombus, Rounded, Circle, Cylinder, Hexagon)
 * - Branch creation & node connection
 * - Node deletion
 * - Outline-to-flowchart (flowchart.fun style)
 */

export type NodeShape = 'box' | 'rhombus' | 'rounded' | 'circle' | 'cylinder' | 'hexagon' | 'stadium';

export interface FlowchartNode {
  id: string;
  label: string;
  shape: NodeShape;
  rawDefinition?: string;
}

export interface FlowchartEdge {
  from: string;
  to: string;
  label?: string;
  type: string;
}

const SHAPE_DELIMITERS: Record<NodeShape, [string, string]> = {
  box: ['[', ']'],
  rhombus: ['{', '}'],
  rounded: ['(', ')'],
  circle: ['((', '))'],
  cylinder: ['[(', ')]'],
  hexagon: ['{{', '}}'],
  stadium: ['([', '])'],
};

/**
 * Detect shape from opening & closing brackets
 */
function detectShape(open: string, close: string): NodeShape {
  if (open === '[(' && close === ')]') return 'cylinder';
  if (open === '([' && close === '])') return 'stadium';
  if (open === '((' && close === '))') return 'circle';
  if (open === '{{' && close === '}}') return 'hexagon';
  if (open === '{' && close === '}') return 'rhombus';
  if (open === '(' && close === ')') return 'rounded';
  return 'box';
}

/**
 * Extracts all nodes defined in the Mermaid code
 */
export function parseFlowchartNodes(code: string): FlowchartNode[] {
  if (!code) return [];

  const nodesMap = new Map<string, FlowchartNode>();

  // Regular expression to find nodes with shapes:
  // e.g. node1["hlo"], A[Start], B{Decision?}, C(Rounded), D[(Database)], E((Circle)), F{{Hex}}
  const nodeRegex = /\b([a-zA-Z0-9_-]+)\s*(\[\(|\(\[|\(\(|\{\{|\[|\(|\{)\s*"?([^"\r\n]*?)"?\s*(\]\)|\)\)|\}\}|\]|\)|\})/g;

  let match;
  while ((match = nodeRegex.exec(code)) !== null) {
    const id = match[1];
    const open = match[2];
    const rawLabel = match[3];
    const close = match[4];

    // Filter out keywords or subgraphs
    if (['subgraph', 'end', 'flowchart', 'graph', 'style', 'classDef', 'class', 'click'].includes(id.toLowerCase())) {
      continue;
    }

    const shape = detectShape(open, close);
    const label = rawLabel.trim() || id;

    if (!nodesMap.has(id)) {
      nodesMap.set(id, {
        id,
        label,
        shape,
        rawDefinition: match[0],
      });
    }
  }

  // Also catch bare nodes used in connections like: A --> B where B has no shape definition yet
  const edgeRegex = /\b([a-zA-Z0-9_-]+)\s*(?:-->|---|-.->|==>|--\s*.*?\s*-->)\s*([a-zA-Z0-9_-]+)/g;
  while ((match = edgeRegex.exec(code)) !== null) {
    const fromId = match[1];
    const toId = match[2];

    for (const id of [fromId, toId]) {
      if (!['subgraph', 'end', 'flowchart', 'graph'].includes(id.toLowerCase()) && !nodesMap.has(id)) {
        nodesMap.set(id, {
          id,
          label: id,
          shape: 'box',
        });
      }
    }
  }

  return Array.from(nodesMap.values());
}

/**
 * Updates a node's label in Mermaid code while keeping its shape and formatting intact
 */
export function updateNodeLabel(code: string, nodeId: string, newLabel: string): string {
  if (!code || !nodeId) return code;

  const cleanLabel = newLabel.replace(/"/g, "'").trim();

  // Look for any definition of this node: nodeId[...], nodeId{...}, nodeId(...)
  const nodeDefRegex = new RegExp(
    `(\\b${nodeId}\\s*)(\\[\\(|\\(\\[|\\(\\(|\\{\\{|\\[|\\(|\\{)\\s*"?([^\r\n]*?)"?\\s*(\\]\\)|\\)\\)|\\}\\}|\\]|\\)|\\})`,
    'g'
  );

  let replaced = false;
  let newCode = code.replace(nodeDefRegex, (match, prefix, open, oldLabel, close) => {
    replaced = true;
    return `${prefix}${open}"${cleanLabel}"${close}`;
  });

  // If node was only a bare ID in connections (e.g. A --> B), append shape definition
  if (!replaced) {
    const bareRegex = new RegExp(`(\\b${nodeId}\\b)(?!\\s*[\\[\\(\\{])`, 'g');
    let replacedBare = false;
    newCode = newCode.replace(bareRegex, (match) => {
      if (!replacedBare) {
        replacedBare = true;
        return `${nodeId}["${cleanLabel}"]`;
      }
      return match;
    });
  }

  return newCode;
}

/**
 * Morph node shape (e.g. from box to rhombus/decision, rounded, circle, cylinder)
 */
export function updateNodeShape(code: string, nodeId: string, newShape: NodeShape): string {
  if (!code || !nodeId) return code;

  const [newOpen, newClose] = SHAPE_DELIMITERS[newShape] || SHAPE_DELIMITERS.box;

  const nodeDefRegex = new RegExp(
    `(\\b${nodeId}\\s*)(\\[\\(|\\(\\[|\\(\\(|\\{\\{|\\[|\\(|\\{)\\s*"?([^\r\n]*?)"?\\s*(\\]\\)|\\)\\)|\\}\\}|\\]|\\)|\\})`,
    'g'
  );

  let replaced = false;
  let newCode = code.replace(nodeDefRegex, (match, prefix, open, oldLabel, close) => {
    replaced = true;
    const cleanLabel = oldLabel.trim().replace(/^["']|["']$/g, '');
    return `${prefix}${newOpen}"${cleanLabel}"${newClose}`;
  });

  // If bare node, turn into new shape
  if (!replaced) {
    const bareRegex = new RegExp(`(\\b${nodeId}\\b)(?!\\s*[\\[\\(\\{])`, 'g');
    let replacedBare = false;
    newCode = newCode.replace(bareRegex, (match) => {
      if (!replacedBare) {
        replacedBare = true;
        return `${nodeId}${newOpen}"${nodeId}"${newClose}`;
      }
      return match;
    });
  }

  return newCode;
}

/**
 * Adds a connected child step/branch from a parent node
 */
export function addConnectedNode(
  code: string,
  parentNodeId: string,
  label: string,
  shape: NodeShape = 'box',
  edgeLabel?: string
): { newCode: string; newNodeId: string } {
  const existingNodes = parseFlowchartNodes(code);
  const existingIds = new Set(existingNodes.map((n) => n.id));

  // Generate unique clean node ID
  let counter = existingNodes.length + 1;
  let newNodeId = `node${counter}`;
  while (existingIds.has(newNodeId)) {
    counter++;
    newNodeId = `node${counter}`;
  }

  const [open, close] = SHAPE_DELIMITERS[shape] || SHAPE_DELIMITERS.box;
  const cleanLabel = (label || `Step ${counter}`).replace(/"/g, "'");
  const nodeDef = `${newNodeId}${open}"${cleanLabel}"${close}`;

  const link = edgeLabel ? ` -->|${edgeLabel}| ` : ' --> ';
  const newConnectionLine = `    ${parentNodeId}${link}${nodeDef}`;

  let lines = code.trim().split('\n');
  if (!lines[0] || !lines[0].toLowerCase().startsWith('flowchart') && !lines[0].toLowerCase().startsWith('graph')) {
    lines.unshift('flowchart TD');
  }

  lines.push(newConnectionLine);
  return { newCode: lines.join('\n'), newNodeId };
}

/**
 * Connects two existing nodes with an arrow
 */
export function connectNodes(code: string, fromId: string, toId: string, edgeLabel?: string): string {
  if (!code || !fromId || !toId || fromId === toId) return code;

  // Check if connection already exists
  const existingEdgeRegex = new RegExp(`\\b${fromId}\\s*(?:-->|---|-.->|==>)\\s*\\b${toId}\\b`);
  if (existingEdgeRegex.test(code)) {
    return code; // already connected
  }

  const link = edgeLabel ? ` -->|${edgeLabel}| ` : ' --> ';
  const newConnection = `    ${fromId}${link}${toId}`;

  const lines = code.trim().split('\n');
  lines.push(newConnection);
  return lines.join('\n');
}

/**
 * Adds a standalone node to the flowchart
 */
export function addStandaloneNode(
  code: string,
  label: string,
  shape: NodeShape = 'box'
): { newCode: string; newNodeId: string } {
  const existingNodes = parseFlowchartNodes(code);
  const existingIds = new Set(existingNodes.map((n) => n.id));

  let counter = existingNodes.length + 1;
  let newNodeId = `node${counter}`;
  while (existingIds.has(newNodeId)) {
    counter++;
    newNodeId = `node${counter}`;
  }

  const [open, close] = SHAPE_DELIMITERS[shape] || SHAPE_DELIMITERS.box;
  const cleanLabel = (label || `Step ${counter}`).replace(/"/g, "'");
  const nodeLine = `    ${newNodeId}${open}"${cleanLabel}"${close}`;

  let lines = code.trim().split('\n');
  if (!lines[0] || !lines[0].toLowerCase().startsWith('flowchart') && !lines[0].toLowerCase().startsWith('graph')) {
    lines.unshift('flowchart TD');
  }

  lines.push(nodeLine);
  return { newCode: lines.join('\n'), newNodeId };
}

/**
 * Deletes a node and any connections referencing it
 */
export function deleteNode(code: string, nodeId: string): string {
  if (!code || !nodeId) return code;

  const lines = code.split('\n');
  const filteredLines = lines.filter((line) => {
    // Check if line contains this nodeId as a token
    const tokenRegex = new RegExp(`\\b${nodeId}\\b`);
    return !tokenRegex.test(line);
  });

  return filteredLines.join('\n');
}

/**
 * Changes diagram orientation (TD, LR, BT, RL)
 */
export function changeDiagramDirection(code: string, newDirection: 'TD' | 'LR' | 'BT' | 'RL'): string {
  if (!code) return `flowchart ${newDirection}\n`;

  const lines = code.split('\n');
  const firstLine = lines[0] || '';

  if (firstLine.match(/^(flowchart|graph)\s+[A-Za-z]{2}/i)) {
    lines[0] = firstLine.replace(/^(flowchart|graph)\s+[A-Za-z]{2}/i, `$1 ${newDirection}`);
    return lines.join('\n');
  }

  return `flowchart ${newDirection}\n` + code;
}

/**
 * Converts Mermaid flowchart to simple indented outline text (inspired by flowchart.fun)
 * e.g.
 * Parent
 *   Child 1
 *   Child 2
 */
export function flowchartToOutline(code: string): string {
  const nodes = parseFlowchartNodes(code);
  if (nodes.length === 0) return '';

  const nodeMap = new Map<string, FlowchartNode>();
  nodes.forEach((n) => nodeMap.set(n.id, n));

  // Find incoming & outgoing edges
  const outgoing = new Map<string, string[]>();
  const incoming = new Map<string, string[]>();

  const edgeRegex = /\b([a-zA-Z0-9_-]+)\s*(?:-->|---|-.->|==>)\s*([a-zA-Z0-9_-]+)/g;
  let match;
  while ((match = edgeRegex.exec(code)) !== null) {
    const from = match[1];
    const to = match[2];
    if (nodeMap.has(from) && nodeMap.has(to)) {
      if (!outgoing.has(from)) outgoing.set(from, []);
      outgoing.get(from)!.push(to);

      if (!incoming.has(to)) incoming.set(to, []);
      incoming.get(to)!.push(from);
    }
  }

  // Roots are nodes with 0 incoming edges
  const roots = nodes.filter((n) => !incoming.has(n.id) || incoming.get(n.id)!.length === 0);
  const visited = new Set<string>();
  const outlineLines: string[] = [];

  function printNode(id: string, depth: number) {
    if (visited.has(id)) return;
    visited.add(id);

    const node = nodeMap.get(id);
    if (!node) return;

    const indent = '  '.repeat(depth);
    let shapePrefix = '';
    if (node.shape === 'rhombus') shapePrefix = '? ';
    else if (node.shape === 'cylinder') shapePrefix = '[(db)] ';
    else if (node.shape === 'circle') shapePrefix = '((o)) ';

    outlineLines.push(`${indent}${shapePrefix}${node.label}`);

    const children = outgoing.get(id) || [];
    children.forEach((childId) => {
      printNode(childId, depth + 1);
    });
  }

  if (roots.length > 0) {
    roots.forEach((root) => printNode(root.id, 0));
  }
  // Print any unvisited nodes
  nodes.forEach((node) => {
    if (!visited.has(node.id)) {
      printNode(node.id, 0);
    }
  });

  return outlineLines.join('\n');
}

/**
 * Converts simple indented outline text (flowchart.fun style) to Mermaid flowchart
 * e.g.
 * hlo
 *   saurav yadav
 *     palak yadav
 */
export function outlineToFlowchart(outline: string, direction: 'TD' | 'LR' = 'TD'): string {
  if (!outline || !outline.trim()) {
    return `flowchart ${direction}\n    A["Start"] --> B["End"]`;
  }

  const lines = outline.split('\n').filter((l) => l.trim().length > 0);
  if (lines.length === 0) {
    return `flowchart ${direction}\n`;
  }

  const resultLines: string[] = [`flowchart ${direction}`];
  const stack: { level: number; nodeId: string }[] = [];
  let nodeIndex = 1;

  for (const rawLine of lines) {
    const trimmed = rawLine.trim();
    if (!trimmed) continue;

    // Calculate indent level (2 spaces = 1 level, 4 spaces = 2 levels, or tabs)
    const leadingSpaces = rawLine.search(/\S|$/);
    const level = Math.floor(leadingSpaces / 2);

    let shape: NodeShape = 'box';
    let label = trimmed;

    if (label.startsWith('? ')) {
      shape = 'rhombus';
      label = label.substring(2).trim();
    } else if (label.startsWith('[(db)] ')) {
      shape = 'cylinder';
      label = label.substring(7).trim();
    } else if (label.startsWith('((o)) ')) {
      shape = 'circle';
      label = label.substring(6).trim();
    }

    const [open, close] = SHAPE_DELIMITERS[shape] || SHAPE_DELIMITERS.box;
    const cleanLabel = label.replace(/"/g, "'");
    const nodeId = `node${nodeIndex++}`;

    // Pop stack until we find the parent level
    while (stack.length > 0 && stack[stack.length - 1].level >= level) {
      stack.pop();
    }

    if (stack.length === 0) {
      // Root level node
      resultLines.push(`    ${nodeId}${open}"${cleanLabel}"${close}`);
    } else {
      // Child of the current stack top
      const parent = stack[stack.length - 1];
      resultLines.push(`    ${parent.nodeId} --> ${nodeId}${open}"${cleanLabel}"${close}`);
    }

    stack.push({ level, nodeId });
  }

  return resultLines.join('\n');
}
