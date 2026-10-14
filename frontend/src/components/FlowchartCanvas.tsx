import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  parseFlowchartNodes,
  updateNodeLabel,
  updateNodeShape,
  addConnectedNode,
  addStandaloneNode,
  connectNodes,
  deleteNode,
  changeDiagramDirection,
  NodeShape,
  FlowchartNode,
} from '../utils/flowchartParser';
import {
  Edit3,
  Plus,
  GitBranch,
  Trash2,
  Maximize2,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Sparkles,
  Link as LinkIcon,
  Check,
  X,
  Square,
  HelpCircle,
  Circle,
  Database,
  ArrowDown,
  ArrowRight,
  Move,
  ChevronDown,
} from 'lucide-react';
import toast from 'react-hot-toast';

interface FlowchartCanvasProps {
  svg: string;
  code: string;
  onChangeCode: (newCode: string) => void;
  onRender: (codeToRender?: string) => void;
  isRendering?: boolean;
  className?: string;
}

export function FlowchartCanvas({
  svg,
  code,
  onChangeCode,
  onRender,
  isRendering = false,
  className = '',
}: FlowchartCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const contentWrapperRef = useRef<HTMLDivElement>(null);

  // Selected node state
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [selectedNodeLabel, setSelectedNodeLabel] = useState<string>('');
  const [selectedNodeShape, setSelectedNodeShape] = useState<NodeShape>('box');
  const [popoverPosition, setPopoverPosition] = useState<{ top: number; left: number } | null>(null);

  // Inline editing state
  const [isEditingLabel, setIsEditingLabel] = useState(false);
  const [editingLabelValue, setEditingLabelValue] = useState('');

  // Connecting mode (Click node A, then click node B to link)
  const [isConnectingMode, setIsConnectingMode] = useState(false);
  const [connectSourceNodeId, setConnectSourceNodeId] = useState<string | null>(null);

  // Shape picker dropdown
  const [showShapePicker, setShowShapePicker] = useState(false);

  // Zoom and Pan
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [startPan, setStartPan] = useState({ x: 0, y: 0 });

  // Parsed nodes map
  const parsedNodes = useRef<FlowchartNode[]>([]);
  parsedNodes.current = parseFlowchartNodes(code);

  // Helper to apply code change and immediately trigger re-render
  const applyCodeUpdate = useCallback(
    (newCode: string, successMessage?: string) => {
      onChangeCode(newCode);
      onRender(newCode);
      if (successMessage) {
        toast.success(successMessage, { id: 'canvas-toast', duration: 1500 });
      }
    },
    [onChangeCode, onRender]
  );

  // Position popover relative to selected SVG node
  const positionPopoverForElement = useCallback((nodeEl: Element, nodeId: string) => {
    if (!containerRef.current) return;

    const containerRect = containerRef.current.getBoundingClientRect();
    const nodeRect = nodeEl.getBoundingClientRect();

    // Find node details from parsed code
    const nodeInfo = parsedNodes.current.find((n) => n.id === nodeId);
    const label = nodeInfo?.label || nodeEl.textContent?.trim() || nodeId;
    const shape = nodeInfo?.shape || 'box';

    setSelectedNodeId(nodeId);
    setSelectedNodeLabel(label);
    setSelectedNodeShape(shape);
    setEditingLabelValue(label);

    // Place popover right above the node (or below if near top)
    let left = nodeRect.left - containerRect.left + nodeRect.width / 2;
    let top = nodeRect.top - containerRect.top - 12;

    if (top < 70) {
      top = nodeRect.bottom - containerRect.top + 12;
    }

    setPopoverPosition({ top, left });
  }, []);

  // Attach interactive click & hover handlers to Mermaid SVG nodes
  useEffect(() => {
    if (!contentWrapperRef.current || !svg) return;

    const container = contentWrapperRef.current;
    const nodeElements = container.querySelectorAll('g.node');

    nodeElements.forEach((nodeEl) => {
      // Mermaid IDs look like "flowchart-node1-42" or "node1"
      const rawId = nodeEl.id || '';
      let extractedId = '';

      if (rawId.startsWith('flowchart-')) {
        const parts = rawId.replace(/^flowchart-/, '').split('-');
        if (parts.length > 1) {
          parts.pop(); // remove index suffix
        }
        extractedId = parts.join('-');
      } else {
        extractedId = rawId;
      }

      // If id is empty or generic, try finding node by matching label
      if (!extractedId || !parsedNodes.current.some((n) => n.id === extractedId)) {
        const textContent = nodeEl.textContent?.trim();
        const matched = parsedNodes.current.find((n) => n.label === textContent);
        if (matched) {
          extractedId = matched.id;
        }
      }

      // Style node for interactivity
      (nodeEl as HTMLElement).style.cursor = isConnectingMode ? 'crosshair' : 'pointer';
      (nodeEl as HTMLElement).style.transition = 'all 0.15s ease-out';

      // Highlight selected node
      const shapeShapeEl = nodeEl.querySelector('rect, circle, polygon, path');
      if (shapeShapeEl) {
        if (extractedId === selectedNodeId) {
          shapeShapeEl.setAttribute('stroke', '#6366f1');
          shapeShapeEl.setAttribute('stroke-width', '3px');
          shapeShapeEl.setAttribute('filter', 'drop-shadow(0 0 6px rgba(99, 102, 241, 0.5))');
        } else {
          shapeShapeEl.removeAttribute('filter');
        }
      }

      const handleClick = (e: Event) => {
        e.stopPropagation();

        if (isConnectingMode && connectSourceNodeId) {
          if (connectSourceNodeId !== extractedId) {
            const updated = connectNodes(code, connectSourceNodeId, extractedId);
            applyCodeUpdate(updated, `Connected ${connectSourceNodeId} → ${extractedId}`);
          }
          setIsConnectingMode(false);
          setConnectSourceNodeId(null);
          return;
        }

        positionPopoverForElement(nodeEl, extractedId);
        setIsEditingLabel(false);
      };

      const handleDblClick = (e: Event) => {
        e.stopPropagation();
        positionPopoverForElement(nodeEl, extractedId);
        setIsEditingLabel(true);
      };

      nodeEl.addEventListener('click', handleClick);
      nodeEl.addEventListener('dblclick', handleDblClick);

      return () => {
        nodeEl.removeEventListener('click', handleClick);
        nodeEl.removeEventListener('dblclick', handleDblClick);
      };
    });
  }, [svg, selectedNodeId, isConnectingMode, connectSourceNodeId, code, positionPopoverForElement, applyCodeUpdate]);

  // Click outside canvas clears selection
  const handleCanvasClick = (e: React.MouseEvent) => {
    // Only deselect if clicked directly on canvas background
    if ((e.target as HTMLElement).tagName === 'svg' || (e.target as HTMLElement) === containerRef.current) {
      setSelectedNodeId(null);
      setPopoverPosition(null);
      setIsEditingLabel(false);
      setIsConnectingMode(false);
      setConnectSourceNodeId(null);
      setShowShapePicker(false);
    }
  };

  // Actions on Selected Node
  const handleSaveLabel = () => {
    if (!selectedNodeId) return;
    const updated = updateNodeLabel(code, selectedNodeId, editingLabelValue);
    setSelectedNodeLabel(editingLabelValue);
    setIsEditingLabel(false);
    applyCodeUpdate(updated, `Renamed to "${editingLabelValue}"`);
  };

  const handleAddChildStep = (shape: NodeShape = 'box') => {
    if (!selectedNodeId) return;
    const { newCode, newNodeId } = addConnectedNode(code, selectedNodeId, 'Next Step', shape);
    applyCodeUpdate(newCode, `Added branch from ${selectedNodeId}`);
    setSelectedNodeId(newNodeId);
  };

  const handleAddDecision = () => {
    handleAddChildStep('rhombus');
  };

  const handleChangeShape = (newShape: NodeShape) => {
    if (!selectedNodeId) return;
    const updated = updateNodeShape(code, selectedNodeId, newShape);
    setSelectedNodeShape(newShape);
    setShowShapePicker(false);
    applyCodeUpdate(updated, `Changed shape to ${newShape}`);
  };

  const handleStartConnect = () => {
    if (!selectedNodeId) return;
    setIsConnectingMode(true);
    setConnectSourceNodeId(selectedNodeId);
    toast('Click another node to connect arrow', { icon: '🔗', duration: 2500 });
  };

  const handleDelete = () => {
    if (!selectedNodeId) return;
    const updated = deleteNode(code, selectedNodeId);
    setSelectedNodeId(null);
    setPopoverPosition(null);
    applyCodeUpdate(updated, `Deleted node ${selectedNodeId}`);
  };

  // Global Quick Add buttons
  const handleQuickAdd = (shape: NodeShape) => {
    if (selectedNodeId) {
      handleAddChildStep(shape);
    } else {
      const { newCode, newNodeId } = addStandaloneNode(code, 'New Node', shape);
      applyCodeUpdate(newCode, 'Added new node');
      setSelectedNodeId(newNodeId);
    }
  };

  const handleDirectionChange = (dir: 'TD' | 'LR') => {
    const updated = changeDiagramDirection(code, dir);
    applyCodeUpdate(updated, `Orientation: ${dir === 'TD' ? 'Top to Bottom' : 'Left to Right'}`);
  };

  // Zoom & Pan handlers
  const handleWheel = (e: React.WheelEvent) => {
    if (e.ctrlKey || e.metaKey) {
      e.preventDefault();
      const delta = e.deltaY > 0 ? -0.1 : 0.1;
      setZoom((prev) => Math.min(Math.max(prev + delta, 0.4), 2.5));
    }
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button === 0 && (e.target as HTMLElement).tagName === 'svg') {
      setIsPanning(true);
      setStartPan({ x: e.clientX - pan.x, y: e.clientY - pan.y });
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isPanning) {
      setPan({ x: e.clientX - startPan.x, y: e.clientY - startPan.y });
    }
  };

  const handleMouseUp = () => {
    setIsPanning(false);
  };

  const resetView = () => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  };

  return (
    <div
      ref={containerRef}
      onClick={handleCanvasClick}
      onWheel={handleWheel}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      className={`relative w-full h-full flex flex-col overflow-hidden select-none bg-secondary-900 ${className}`}
    >
      {/* Top Floating Visual Builder Toolbar (flowchart.fun inspiration) */}
      <div className="absolute top-3 left-3 right-3 z-30 flex items-center justify-between pointer-events-none">
        {/* Left Side: Quick Node Adder Palette */}
        <div className="pointer-events-auto flex items-center gap-1.5 p-1.5 rounded-xl bg-secondary-900/90 backdrop-blur-md border border-secondary-700/80 shadow-lg text-xs text-white">
          <button
            type="button"
            onClick={() => handleQuickAdd('box')}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg hover:bg-secondary-800 text-secondary-200 hover:text-white transition-all active:scale-95 font-medium"
            title="Add Process Box [ ]"
          >
            <Square className="w-3.5 h-3.5 text-blue-400" />
            <span>+ Box</span>
          </button>

          <button
            type="button"
            onClick={() => handleQuickAdd('rhombus')}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg hover:bg-secondary-800 text-secondary-200 hover:text-white transition-all active:scale-95 font-medium"
            title="Add Decision Rhombus { }"
          >
            <HelpCircle className="w-3.5 h-3.5 text-amber-400" />
            <span>+ Rhombus</span>
          </button>

          <button
            type="button"
            onClick={() => handleQuickAdd('rounded')}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg hover:bg-secondary-800 text-secondary-200 hover:text-white transition-all active:scale-95 font-medium"
            title="Add Start / End Pill ( )"
          >
            <Circle className="w-3.5 h-3.5 text-emerald-400" />
            <span>+ Pill</span>
          </button>

          <button
            type="button"
            onClick={() => handleQuickAdd('cylinder')}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg hover:bg-secondary-800 text-secondary-200 hover:text-white transition-all active:scale-95 font-medium"
            title="Add Database Cylinder [( )]"
          >
            <Database className="w-3.5 h-3.5 text-purple-400" />
            <span>+ Database</span>
          </button>

          <div className="h-4 w-px bg-secondary-700 mx-1" />

          {/* Direction toggle */}
          <div className="flex items-center rounded-lg bg-secondary-800/80 p-0.5 border border-secondary-700/60">
            <button
              type="button"
              onClick={() => handleDirectionChange('TD')}
              className={`p-1.5 rounded-md text-xs flex items-center gap-1 transition-all ${
                code.includes('TD') ? 'bg-primary-600 text-white font-bold' : 'text-secondary-400 hover:text-white'
              }`}
              title="Direction: Top to Bottom"
            >
              <ArrowDown className="w-3.5 h-3.5" />
              <span>TD</span>
            </button>
            <button
              type="button"
              onClick={() => handleDirectionChange('LR')}
              className={`p-1.5 rounded-md text-xs flex items-center gap-1 transition-all ${
                code.includes('LR') ? 'bg-primary-600 text-white font-bold' : 'text-secondary-400 hover:text-white'
              }`}
              title="Direction: Left to Right"
            >
              <ArrowRight className="w-3.5 h-3.5" />
              <span>LR</span>
            </button>
          </div>
        </div>

        {/* Right Side: Zoom & View Controls */}
        <div className="pointer-events-auto flex items-center gap-1 p-1.5 rounded-xl bg-secondary-900/90 backdrop-blur-md border border-secondary-700/80 shadow-lg text-xs text-white">
          <button
            type="button"
            onClick={() => setZoom((z) => Math.max(0.4, z - 0.15))}
            className="p-1.5 rounded-lg hover:bg-secondary-800 text-secondary-300 hover:text-white"
            title="Zoom Out"
          >
            <ZoomOut className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={resetView}
            className="px-2 py-1 rounded-lg hover:bg-secondary-800 text-secondary-300 hover:text-white font-mono text-[11px]"
            title="Reset Zoom & Pan"
          >
            {Math.round(zoom * 100)}%
          </button>
          <button
            type="button"
            onClick={() => setZoom((z) => Math.min(2.5, z + 0.15))}
            className="p-1.5 rounded-lg hover:bg-secondary-800 text-secondary-300 hover:text-white"
            title="Zoom In"
          >
            <ZoomIn className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Connecting Mode Banner */}
      {isConnectingMode && (
        <div className="absolute top-16 left-1/2 -translate-x-1/2 z-40 bg-indigo-600 text-white px-4 py-2 rounded-full shadow-2xl flex items-center gap-2.5 text-xs animate-bounce font-medium border border-indigo-400">
          <LinkIcon className="w-4 h-4" />
          <span>Click on the target node to connect arrow from <strong>{connectSourceNodeId}</strong></span>
          <button
            type="button"
            onClick={() => {
              setIsConnectingMode(false);
              setConnectSourceNodeId(null);
            }}
            className="ml-2 bg-indigo-700 hover:bg-indigo-800 px-2 py-0.5 rounded-full text-[11px]"
          >
            Cancel
          </button>
        </div>
      )}

      {/* Floating Node Action Popover (Appears right over selected node) */}
      {selectedNodeId && popoverPosition && !isConnectingMode && (
        <div
          style={{
            top: `${popoverPosition.top}px`,
            left: `${popoverPosition.left}px`,
            transform: 'translate(-50%, -100%)',
          }}
          onClick={(e) => e.stopPropagation()}
          className="absolute z-40 flex flex-col items-center animate-fade-in"
        >
          {/* Main Popover Pill */}
          <div className="flex items-center gap-1 p-1 rounded-2xl bg-secondary-900/95 backdrop-blur-xl border border-secondary-700 shadow-2xl text-xs text-white">
            {isEditingLabel ? (
              <div className="flex items-center gap-1.5 px-2 py-1">
                <input
                  type="text"
                  autoFocus
                  value={editingLabelValue}
                  onChange={(e) => setEditingLabelValue(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleSaveLabel();
                    if (e.key === 'Escape') setIsEditingLabel(false);
                  }}
                  className="bg-secondary-800 border border-secondary-600 rounded-lg px-2.5 py-1 text-xs text-white focus:outline-none focus:border-primary-500 min-w-[140px]"
                  placeholder="Enter node label..."
                />
                <button
                  type="button"
                  onClick={handleSaveLabel}
                  className="p-1 rounded-md bg-emerald-600 hover:bg-emerald-500 text-white"
                  title="Save Label (Enter)"
                >
                  <Check className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => setIsEditingLabel(false)}
                  className="p-1 rounded-md bg-secondary-800 hover:bg-secondary-700 text-secondary-400"
                  title="Cancel (Esc)"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            ) : (
              <>
                {/* Node Label preview / click to edit */}
                <button
                  type="button"
                  onClick={() => setIsEditingLabel(true)}
                  className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl hover:bg-secondary-800 text-white font-medium group max-w-[150px] truncate"
                  title="Click to Rename Node"
                >
                  <Edit3 className="w-3 h-3 text-secondary-400 group-hover:text-primary-400 shrink-0" />
                  <span className="truncate">{selectedNodeLabel}</span>
                </button>

                <div className="h-4 w-px bg-secondary-700" />

                {/* Add Child Step */}
                <button
                  type="button"
                  onClick={() => handleAddChildStep('box')}
                  className="flex items-center gap-1 px-2 py-1.5 rounded-xl hover:bg-secondary-800 text-emerald-400 hover:text-emerald-300 font-medium"
                  title="Add Next Step [Box]"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Step</span>
                </button>

                {/* Add Decision Rhombus */}
                <button
                  type="button"
                  onClick={handleAddDecision}
                  className="flex items-center gap-1 px-2 py-1.5 rounded-xl hover:bg-secondary-800 text-amber-400 hover:text-amber-300 font-medium"
                  title="Add Decision Branch {Rhombus}"
                >
                  <GitBranch className="w-3.5 h-3.5" />
                  <span>Decision</span>
                </button>

                {/* Change Shape Button */}
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setShowShapePicker(!showShapePicker)}
                    className="flex items-center gap-1 px-2 py-1.5 rounded-xl hover:bg-secondary-800 text-blue-400 hover:text-blue-300"
                    title="Change Node Shape"
                  >
                    <span>Shape</span>
                    <ChevronDown className="w-3 h-3" />
                  </button>

                  {showShapePicker && (
                    <div className="absolute top-full left-0 mt-2 p-1.5 rounded-xl bg-secondary-900 border border-secondary-700 shadow-2xl flex flex-col gap-1 min-w-[130px] z-50">
                      <button
                        type="button"
                        onClick={() => handleChangeShape('box')}
                        className={`flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-left text-xs ${
                          selectedNodeShape === 'box' ? 'bg-primary-600 text-white' : 'hover:bg-secondary-800 text-secondary-200'
                        }`}
                      >
                        <Square className="w-3.5 h-3.5 text-blue-400" />
                        <span>Box [ ]</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleChangeShape('rhombus')}
                        className={`flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-left text-xs ${
                          selectedNodeShape === 'rhombus' ? 'bg-primary-600 text-white' : 'hover:bg-secondary-800 text-secondary-200'
                        }`}
                      >
                        <HelpCircle className="w-3.5 h-3.5 text-amber-400" />
                        <span>Rhombus &#123; &#125;</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleChangeShape('rounded')}
                        className={`flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-left text-xs ${
                          selectedNodeShape === 'rounded' ? 'bg-primary-600 text-white' : 'hover:bg-secondary-800 text-secondary-200'
                        }`}
                      >
                        <Circle className="w-3.5 h-3.5 text-emerald-400" />
                        <span>Pill ( )</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleChangeShape('cylinder')}
                        className={`flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-left text-xs ${
                          selectedNodeShape === 'cylinder' ? 'bg-primary-600 text-white' : 'hover:bg-secondary-800 text-secondary-200'
                        }`}
                      >
                        <Database className="w-3.5 h-3.5 text-purple-400" />
                        <span>Database [(&nbsp;)]</span>
                      </button>
                    </div>
                  )}
                </div>

                {/* Connect to another node */}
                <button
                  type="button"
                  onClick={handleStartConnect}
                  className="p-1.5 rounded-xl hover:bg-secondary-800 text-indigo-400 hover:text-indigo-300"
                  title="Connect Arrow to Another Node"
                >
                  <LinkIcon className="w-3.5 h-3.5" />
                </button>

                {/* Delete node */}
                <button
                  type="button"
                  onClick={handleDelete}
                  className="p-1.5 rounded-xl hover:bg-red-950/60 text-red-400 hover:text-red-300"
                  title="Delete Node"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </>
            )}
          </div>

          {/* Little arrow pointer down towards the node */}
          <div className="w-2.5 h-2.5 bg-secondary-900 border-r border-b border-secondary-700 rotate-45 -mt-1.5 shadow-md" />
        </div>
      )}

      {/* Main SVG Flowchart Stage */}
      <div
        className="flex-1 w-full h-full flex items-center justify-center p-8 overflow-hidden cursor-grab active:cursor-grabbing"
        style={{
          transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
          transformOrigin: 'center center',
          transition: isPanning ? 'none' : 'transform 0.1s ease-out',
        }}
      >
        <div
          ref={contentWrapperRef}
          className="w-full flex items-center justify-center"
          dangerouslySetInnerHTML={{ __html: svg }}
        />
      </div>

      {/* Bottom Hint */}
      <div className="absolute bottom-3 left-4 text-[11px] text-secondary-500 pointer-events-none flex items-center gap-2">
        <span className="inline-block w-2 h-2 rounded-full bg-emerald-500" />
        <span>Click node to edit name, add branch or change shape • Double-click to rename • Ctrl+Scroll to zoom</span>
      </div>
    </div>
  );
}
