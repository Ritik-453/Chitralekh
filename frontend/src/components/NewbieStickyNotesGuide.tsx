import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Sparkles, X, ChevronRight, Check } from 'lucide-react';
import { cn } from '../utils';
import toast from 'react-hot-toast';

export interface TourStep {
  id: string;
  stepNumber: number;
  stepDisplay: string; // "1 of 9", "2 of 9", etc.
  targetSelector: string;
  preferredPlacement: 'bottom' | 'top' | 'left' | 'right';
  title: string;
  badgeEmoji: string;
  bgClass: string;
  borderClass: string;
  textClass: string;
  arrowFill: string;
  strokeColor: string;
  description: string;
  tip?: string;
  tiltClass: string;
}

const TOUR_STEPS: TourStep[] = [
  {
    id: 'autosave',
    stepNumber: 1,
    stepDisplay: '1 of 9',
    targetSelector: '[data-tour="autosave-toggle"]',
    preferredPlacement: 'bottom',
    title: 'Autosave Switch',
    badgeEmoji: '💡',
    bgClass: 'bg-amber-100',
    borderClass: 'border-amber-300',
    textClass: 'text-amber-950',
    arrowFill: '#fef08a',
    strokeColor: '#d97706',
    description: 'Toggle autosaving ON or OFF with a single click! When OFF, take full control and save manually using Ctrl+S anytime.',
    tip: 'Green pulsing dot indicates Autosave is actively saving.',
    tiltClass: '-rotate-1',
  },
  {
    id: 'search',
    stepNumber: 2,
    stepDisplay: '2 of 9',
    targetSelector: '[data-tour="search-bar"]',
    preferredPlacement: 'bottom',
    title: 'Instant Search & Ctrl+K',
    badgeEmoji: '🔍',
    bgClass: 'bg-sky-100',
    borderClass: 'border-sky-300',
    textClass: 'text-sky-950',
    arrowFill: '#bae6fd',
    strokeColor: '#0284c7',
    description: 'Press Ctrl+K from anywhere to summon the command palette. Search instantly across note titles, contents, tags, and folders.',
    tip: 'Shortcut: Ctrl + K (or ⌘K on Mac)',
    tiltClass: 'rotate-1',
  },
  {
    id: 'new-note',
    stepNumber: 3,
    stepDisplay: '3 of 9',
    targetSelector: '[data-tour="new-note-header"]',
    preferredPlacement: 'bottom',
    title: 'Create New Notes',
    badgeEmoji: '📝',
    bgClass: 'bg-emerald-100',
    borderClass: 'border-emerald-300',
    textClass: 'text-emerald-950',
    arrowFill: '#a7f3d0',
    strokeColor: '#059669',
    description: 'Start fresh in a second! Choose a blank canvas, select note templates (Cornell, meetings), or draw diagrams and flowcharts.',
    tip: 'Click here anytime or use + in the sidebar.',
    tiltClass: '-rotate-2',
  },
  {
    id: 'import',
    stepNumber: 4,
    stepDisplay: '4 of 9',
    targetSelector: '[data-tour="import-doc-btn"]',
    preferredPlacement: 'top',
    title: 'Multi-File & Slide Importer',
    badgeEmoji: '📥',
    bgClass: 'bg-orange-100',
    borderClass: 'border-orange-300',
    textClass: 'text-orange-950',
    arrowFill: '#fed7aa',
    strokeColor: '#ea580c',
    description: 'Upload Word (.docx), PDF, or PowerPoint (.pptx). Convert into editable text with OCR, or save PDF pages & PPT slides as sequential images!',
    tip: 'Supports PPTX slides saved as high-res images.',
    tiltClass: 'rotate-1',
  },
  {
    id: 'paste-image',
    stepNumber: 5,
    stepDisplay: '5 of 9',
    targetSelector: '[data-tour="recent-notes-section"]',
    preferredPlacement: 'top',
    title: 'Direct Line Image Pasting',
    badgeEmoji: '📋',
    bgClass: 'bg-rose-100',
    borderClass: 'border-rose-300',
    textClass: 'text-rose-950',
    arrowFill: '#fecdd3',
    strokeColor: '#e11d48',
    description: 'No image URLs or hosting required! Simply copy any screenshot or image to your clipboard and hit Ctrl+V anywhere in your note to embed it.',
    tip: 'Drag-and-drop images right onto the editor line.',
    tiltClass: '-rotate-1',
  },
  {
    id: 'merge-split',
    stepNumber: 6,
    stepDisplay: '6 of 9',
    targetSelector: '[data-tour="quick-actions-panel"]',
    preferredPlacement: 'left',
    title: 'Split, Merge & Append',
    badgeEmoji: '🔀',
    bgClass: 'bg-purple-100',
    borderClass: 'border-purple-300',
    textClass: 'text-purple-950',
    arrowFill: '#e9d5ff',
    strokeColor: '#9333ea',
    description: 'Refactor complex documents easily! Split long notes at cursor headings, merge multiple notes into one, or append files one-by-one.',
    tip: 'Available right inside the note editor toolbar.',
    tiltClass: 'rotate-2',
  },
  {
    id: 'central-repo',
    stepNumber: 7,
    stepDisplay: '7 of 9',
    targetSelector: '[data-tour="central-repo-nav"]',
    preferredPlacement: 'right',
    title: 'Central Academic Repository',
    badgeEmoji: '🏛️',
    bgClass: 'bg-teal-100',
    borderClass: 'border-teal-300',
    textClass: 'text-teal-950',
    arrowFill: '#99f6e4',
    strokeColor: '#0d9488',
    description: 'Join your campus hub! Browse or publish syllabus notes organized by custom Institute, Department, Batch, and Semester with version history.',
    tip: 'Add your own custom Institute & Department anytime.',
    tiltClass: '-rotate-1',
  },
  {
    id: 'folders-tags',
    stepNumber: 8,
    stepDisplay: '8 of 9',
    targetSelector: '[data-tour="sidebar-folders"]',
    preferredPlacement: 'right',
    title: 'Folders & Color-Coded Tags',
    badgeEmoji: '📁',
    bgClass: 'bg-yellow-100',
    borderClass: 'border-yellow-300',
    textClass: 'text-yellow-950',
    arrowFill: '#fde68a',
    strokeColor: '#d97706',
    description: 'Keep your knowledge organized! Create unlimited nested folders and colorful tags to quickly filter notes by course, topic, or priority.',
    tip: 'Drag-and-drop notes into folders in 1 click.',
    tiltClass: 'rotate-1',
  },
  {
    id: 'theme-profile',
    stepNumber: 9,
    stepDisplay: '9 of 9',
    targetSelector: '[data-tour="theme-profile"]',
    preferredPlacement: 'bottom',
    title: 'Theme & Profile Settings',
    badgeEmoji: '🎨',
    bgClass: 'bg-indigo-100',
    borderClass: 'border-indigo-300',
    textClass: 'text-indigo-950',
    arrowFill: '#c7d2fe',
    strokeColor: '#4f46e5',
    description: 'Toggle between clean light and sleek dark mode anytime. Manage your account profile, shortcuts, and preferences right here.',
    tip: 'You can restart this guide anytime from your user menu.',
    tiltClass: '-rotate-1',
  },
];

interface NewbieStickyNotesGuideProps {
  isOpen?: boolean;
  onClose?: () => void;
  variant?: 'modal' | 'dashboard-board' | 'drawer';
  onOpenMultiFileImport?: () => void;
}

export function NewbieStickyNotesGuide({
  isOpen: propIsOpen,
  onClose: propOnClose,
}: NewbieStickyNotesGuideProps) {
  const [isActive, setIsActive] = useState<boolean>(false);
  const [currentStepIndex, setCurrentStepIndex] = useState<number>(0);
  const [targetRect, setTargetRect] = useState<DOMRect | null>(null);
  const [coords, setCoords] = useState<{
    top: number;
    left: number;
    width: number;
    height: number;
    placement: 'bottom' | 'top' | 'left' | 'right';
    arrowOffset: number;
  }>({
    top: 100,
    left: 100,
    width: 320,
    height: 220,
    placement: 'bottom',
    arrowOffset: 160,
  });

  const cardRef = useRef<HTMLDivElement>(null);
  const currentStep = TOUR_STEPS[currentStepIndex] || TOUR_STEPS[0];
  const isLastStep = currentStepIndex === TOUR_STEPS.length - 1;

  // Check if this is the first time after signup
  useEffect(() => {
    const isFirstTimeSignup = localStorage.getItem('notes_is_first_time_signup') === 'true';
    const tourCompleted = localStorage.getItem('notes_tour_completed') === 'true';

    if (isFirstTimeSignup && !tourCompleted) {
      const timer = setTimeout(() => {
        setCurrentStepIndex(0);
        setIsActive(true);
      }, 700);
      return () => clearTimeout(timer);
    }
  }, []);

  // Sync with prop if explicitly controlled
  useEffect(() => {
    if (propIsOpen !== undefined) {
      if (propIsOpen) {
        setCurrentStepIndex(0);
        setIsActive(true);
      } else {
        setIsActive(false);
      }
    }
  }, [propIsOpen]);

  // Listen to global restart tour event
  useEffect(() => {
    const handleStartTour = () => {
      setCurrentStepIndex(0);
      setIsActive(true);
    };
    window.addEventListener('start-newbie-tour', handleStartTour);
    return () => window.removeEventListener('start-newbie-tour', handleStartTour);
  }, []);

  // Update target rect and position sticky note next to target
  const updatePosition = useCallback(() => {
    if (!isActive) return;

    const el = document.querySelector(currentStep.targetSelector) as HTMLElement | null;
    if (!el) {
      // Fallback: center in viewport
      const width = Math.min(340, window.innerWidth - 32);
      const height = 230;
      setTargetRect(null);
      setCoords({
        top: Math.max(30, (window.innerHeight - height) / 2),
        left: Math.max(16, (window.innerWidth - width) / 2),
        width,
        height,
        placement: 'bottom',
        arrowOffset: width / 2,
      });
      return;
    }

    // Scroll target into view if needed
    el.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'nearest' });
    const rect = el.getBoundingClientRect();
    setTargetRect(rect);

    const cardWidth = Math.min(340, window.innerWidth - 32);
    const cardHeight = 230;
    let placement = currentStep.preferredPlacement;

    // Check boundary collisions and flip if necessary
    if (placement === 'bottom') {
      if (rect.bottom + cardHeight + 20 > window.innerHeight && rect.top - cardHeight - 20 > 0) {
        placement = 'top';
      }
    } else if (placement === 'top') {
      if (rect.top - cardHeight - 20 < 0 && rect.bottom + cardHeight + 20 < window.innerHeight) {
        placement = 'bottom';
      }
    } else if (placement === 'right') {
      if (rect.right + cardWidth + 20 > window.innerWidth) {
        placement = 'bottom';
      }
    } else if (placement === 'left') {
      if (rect.left - cardWidth - 20 < 0) {
        placement = 'bottom';
      }
    }

    let top = 0;
    let left = 0;
    let arrowOffset = 0;

    if (placement === 'bottom') {
      top = rect.bottom + 14;
      left = rect.left + rect.width / 2 - cardWidth / 2;
      arrowOffset = (rect.left + rect.width / 2) - left;
    } else if (placement === 'top') {
      top = rect.top - cardHeight - 14;
      left = rect.left + rect.width / 2 - cardWidth / 2;
      arrowOffset = (rect.left + rect.width / 2) - left;
    } else if (placement === 'right') {
      left = rect.right + 14;
      top = rect.top + rect.height / 2 - cardHeight / 2;
      arrowOffset = (rect.top + rect.height / 2) - top;
    } else if (placement === 'left') {
      left = rect.left - cardWidth - 14;
      top = rect.top + rect.height / 2 - cardHeight / 2;
      arrowOffset = (rect.top + rect.height / 2) - top;
    }

    // Clamp inside viewport
    const clampedLeft = Math.max(16, Math.min(window.innerWidth - cardWidth - 16, left));
    const clampedTop = Math.max(16, Math.min(window.innerHeight - cardHeight - 16, top));

    // Adjust arrow offset for clamped card
    let finalArrowOffset = arrowOffset;
    if (placement === 'bottom' || placement === 'top') {
      finalArrowOffset = (rect.left + rect.width / 2) - clampedLeft;
      finalArrowOffset = Math.max(24, Math.min(cardWidth - 24, finalArrowOffset));
    } else {
      finalArrowOffset = (rect.top + rect.height / 2) - clampedTop;
      finalArrowOffset = Math.max(24, Math.min(cardHeight - 24, finalArrowOffset));
    }

    setCoords({
      top: clampedTop,
      left: clampedLeft,
      width: cardWidth,
      height: cardHeight,
      placement,
      arrowOffset: finalArrowOffset,
    });
  }, [isActive, currentStep]);

  useEffect(() => {
    if (!isActive) return;
    updatePosition();

    // Re-check after 150ms in case DOM layout shifted
    const t = setTimeout(updatePosition, 150);

    window.addEventListener('resize', updatePosition);
    window.addEventListener('scroll', updatePosition, true);

    return () => {
      clearTimeout(t);
      window.removeEventListener('resize', updatePosition);
      window.removeEventListener('scroll', updatePosition, true);
    };
  }, [isActive, updatePosition]);

  // Advance to next step
  const handleNext = () => {
    if (isLastStep) {
      // Completed tour!
      localStorage.setItem('notes_tour_completed', 'true');
      localStorage.removeItem('notes_is_first_time_signup');
      window.dispatchEvent(new CustomEvent('notes-tour-status-changed'));
      setIsActive(false);
      if (propOnClose) propOnClose();
      toast.success("You're all set! Enjoy taking notes 🎉", { id: 'tour-complete-toast' });
    } else {
      setCurrentStepIndex(prev => prev + 1);
    }
  };

  // Skip entire tour
  const handleSkipAll = () => {
    localStorage.setItem('notes_tour_completed', 'true');
    localStorage.removeItem('notes_is_first_time_signup');
    window.dispatchEvent(new CustomEvent('notes-tour-status-changed'));
    setIsActive(false);
    if (propOnClose) propOnClose();
    toast('Tour skipped.', {
      icon: '📌',
      id: 'tour-skipped-toast',
    });
  };

  if (!isActive) return null;

  return (
    <div className="fixed inset-0 z-50 pointer-events-none">
      {/* Dim Semi-transparent Backdrop Scrim */}
      <div
        className="fixed inset-0 bg-black/45 backdrop-blur-[0.5px] transition-opacity duration-300 pointer-events-auto"
        onClick={handleSkipAll}
        aria-label="Close tour overlay"
      />

      {/* Spotlight Ring around the Target Feature */}
      {targetRect && (
        <div
          style={{
            position: 'fixed',
            top: targetRect.top - 6,
            left: targetRect.left - 6,
            width: targetRect.width + 12,
            height: targetRect.height + 12,
          }}
          className="pointer-events-none rounded-xl ring-4 ring-amber-400 ring-offset-2 ring-offset-black/20 shadow-[0_0_28px_rgba(251,191,36,0.7)] animate-pulse z-45 transition-all duration-300"
        />
      )}

      {/* Floating Sticky Note Card with Arrow pointing to Feature */}
      <div
        ref={cardRef}
        style={{
          position: 'fixed',
          top: coords.top,
          left: coords.left,
          width: coords.width,
        }}
        className={cn(
          'pointer-events-auto z-50 transition-all duration-300 transform',
          currentStep.tiltClass,
          'hover:rotate-0'
        )}
      >
        {/* Physical Sticky Note Body */}
        <div
          className={cn(
            'relative rounded-2xl p-5 border-2 shadow-[0_20px_45px_rgba(0,0,0,0.35)]',
            currentStep.bgClass,
            currentStep.borderClass,
            currentStep.textClass,
            'select-none'
          )}
        >
          {/* Top Center Pushpin Graphic */}
          <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 flex items-center justify-center filter drop-shadow select-none">
            <span className="text-xl">📌</span>
          </div>

          {/* Dog-eared Folded Corner Effect at Bottom Right */}
          <div className="absolute bottom-0 right-0 w-6 h-6 bg-gradient-to-tl from-black/15 to-transparent pointer-events-none rounded-br-2xl rounded-tl-md" />

          {/* Pointer Arrow pointing toward the feature */}
          {targetRect && coords.placement === 'bottom' && (
            <div
              className="absolute -top-3 w-0 h-0 pointer-events-none"
              style={{ left: Math.max(16, Math.min(coords.width - 36, coords.arrowOffset - 10)) }}
            >
              <svg width="20" height="12" viewBox="0 0 20 12" className="overflow-visible drop-shadow-xs">
                <polygon
                  points="10,0 20,12 0,12"
                  fill={currentStep.arrowFill}
                  stroke={currentStep.strokeColor}
                  strokeWidth="1.5"
                  strokeLinejoin="round"
                />
              </svg>
            </div>
          )}

          {targetRect && coords.placement === 'top' && (
            <div
              className="absolute -bottom-3 w-0 h-0 pointer-events-none"
              style={{ left: Math.max(16, Math.min(coords.width - 36, coords.arrowOffset - 10)) }}
            >
              <svg width="20" height="12" viewBox="0 0 20 12" className="overflow-visible drop-shadow-xs">
                <polygon
                  points="0,0 20,0 10,12"
                  fill={currentStep.arrowFill}
                  stroke={currentStep.strokeColor}
                  strokeWidth="1.5"
                  strokeLinejoin="round"
                />
              </svg>
            </div>
          )}

          {targetRect && coords.placement === 'right' && (
            <div
              className="absolute -left-3 w-0 h-0 pointer-events-none"
              style={{ top: Math.max(16, Math.min(coords.height - 36, coords.arrowOffset - 10)) }}
            >
              <svg width="12" height="20" viewBox="0 0 12 20" className="overflow-visible drop-shadow-xs">
                <polygon
                  points="0,10 12,0 12,20"
                  fill={currentStep.arrowFill}
                  stroke={currentStep.strokeColor}
                  strokeWidth="1.5"
                  strokeLinejoin="round"
                />
              </svg>
            </div>
          )}

          {targetRect && coords.placement === 'left' && (
            <div
              className="absolute -right-3 w-0 h-0 pointer-events-none"
              style={{ top: Math.max(16, Math.min(coords.height - 36, coords.arrowOffset - 10)) }}
            >
              <svg width="12" height="20" viewBox="0 0 12 20" className="overflow-visible drop-shadow-xs">
                <polygon
                  points="0,0 12,10 0,20"
                  fill={currentStep.arrowFill}
                  stroke={currentStep.strokeColor}
                  strokeWidth="1.5"
                  strokeLinejoin="round"
                />
              </svg>
            </div>
          )}

          {/* Sticky Note Top Bar: Step Number & Close */}
          <div className="flex items-center justify-between gap-2 mb-2 pt-1">
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-black tracking-wider uppercase bg-black/10 text-current shadow-2xs">
              {currentStep.stepDisplay}
            </span>

            <button
              type="button"
              onClick={handleSkipAll}
              title="Skip Tour"
              className="p-1 rounded-full text-current opacity-60 hover:opacity-100 hover:bg-black/10 transition cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Sticky Note Content */}
          <h4 className="font-black text-base tracking-tight flex items-center gap-1.5 leading-snug">
            <span>{currentStep.badgeEmoji}</span>
            <span>{currentStep.title}</span>
          </h4>

          <p className="text-xs leading-relaxed font-semibold mt-1.5 opacity-90">
            {currentStep.description}
          </p>

          {currentStep.tip && (
            <div className="mt-2 px-2.5 py-1 rounded-lg bg-black/5 text-[11px] font-bold flex items-center gap-1.5 border border-black/5">
              <Sparkles className="w-3.5 h-3.5 flex-shrink-0 text-amber-700" />
              <span className="truncate">{currentStep.tip}</span>
            </div>
          )}

          {/* Footer Controls: Skip All & Got it Button */}
          <div className="mt-4 pt-2.5 border-t border-black/10 flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={handleSkipAll}
              className="text-xs font-bold opacity-60 hover:opacity-100 underline underline-offset-2 transition cursor-pointer"
            >
              Skip all
            </button>

            <button
              type="button"
              onClick={handleNext}
              className="px-4 py-1.5 rounded-xl text-xs font-black shadow-md bg-stone-900 text-amber-50 hover:bg-black hover:scale-105 active:scale-95 transition-all cursor-pointer flex items-center gap-1.5"
            >
              <span>Got it</span>
              {isLastStep ? <Check className="w-3.5 h-3.5 stroke-[3]" /> : <ChevronRight className="w-3.5 h-3.5 stroke-[3]" />}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default NewbieStickyNotesGuide;
