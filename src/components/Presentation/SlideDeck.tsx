import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { VaultFile } from '../../types';
import { 
  X, 
  ChevronLeft, 
  ChevronRight, 
  Maximize, 
  Minimize, 
  Grid, 
  FileText, 
  Sparkles,
  Info,
  Lightbulb,
  AlertTriangle,
  AlertCircle,
  Quote
} from 'lucide-react';

interface SlideDeckProps {
  file: VaultFile;
  isOpen: boolean;
  onClose: () => void;
  onNavigateLink?: (target: string) => void;
}

interface SlideData {
  index: number;
  title: string;
  rawContent: string;
}

export const SlideDeck: React.FC<SlideDeckProps> = ({
  file,
  isOpen,
  onClose,
  onNavigateLink
}) => {
  const [currentSlideIndex, setCurrentSlideIndex] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showGridModal, setShowGridModal] = useState(false);
  const [isLightMode, setIsLightMode] = useState(false);

  // Parse markdown into distinct slides separated by `\n---\n`
  const slides: SlideData[] = useMemo(() => {
    let content = file.content;

    // Remove frontmatter if present
    if (content.startsWith('---')) {
      const endFm = content.indexOf('\n---', 3);
      if (endFm !== -1) {
        content = content.slice(endFm + 4);
      }
    }

    // Split by horizontal rule `---` surrounded by newlines
    const rawSlides = content
      .split(/\n\s*---\s*\n/)
      .map(s => s.trim())
      .filter(s => s.length > 0);

    if (rawSlides.length === 0) {
      return [{ index: 0, title: file.name.replace(/\.md$/, ''), rawContent: file.content }];
    }

    return rawSlides.map((raw, idx) => {
      // Find first header for title
      const lines = raw.split('\n');
      const hMatch = lines.find(l => l.trim().startsWith('#'));
      let title = `Slide ${idx + 1}`;
      if (hMatch) {
        title = hMatch.replace(/^#+\s*/, '').trim();
      } else if (lines[0]) {
        title = lines[0].slice(0, 40).trim();
      }

      return {
        index: idx,
        title,
        rawContent: raw
      };
    });
  }, [file.content, file.name]);

  // Keep index in range
  useEffect(() => {
    if (currentSlideIndex >= slides.length) {
      setCurrentSlideIndex(Math.max(0, slides.length - 1));
    }
  }, [slides.length, currentSlideIndex]);

  // Keyboard navigation
  const nextSlide = useCallback(() => {
    setCurrentSlideIndex(prev => Math.min(slides.length - 1, prev + 1));
  }, [slides.length]);

  const prevSlide = useCallback(() => {
    setCurrentSlideIndex(prev => Math.max(0, prev - 1));
  }, []);

  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight' || e.key === ' ' || e.key === 'PageDown') {
        e.preventDefault();
        nextSlide();
      } else if (e.key === 'ArrowLeft' || e.key === 'Backspace' || e.key === 'PageUp') {
        e.preventDefault();
        prevSlide();
      } else if (e.key === 'Escape') {
        e.preventDefault();
        if (showGridModal) {
          setShowGridModal(false);
        } else {
          onClose();
        }
      } else if (e.key === 'Home') {
        e.preventDefault();
        setCurrentSlideIndex(0);
      } else if (e.key === 'End') {
        e.preventDefault();
        setCurrentSlideIndex(slides.length - 1);
      } else if (e.key.toLowerCase() === 'g') {
        e.preventDefault();
        setShowGridModal(prev => !prev);
      } else if (e.key.toLowerCase() === 'f') {
        e.preventDefault();
        toggleFullscreen();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, nextSlide, prevSlide, onClose, showGridModal, slides.length]);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
      setIsFullscreen(true);
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen().catch(() => {});
      }
      setIsFullscreen(false);
    }
  };

  if (!isOpen || slides.length === 0) return null;

  const currentSlide = slides[currentSlideIndex] || slides[0];

  // Helper to render markdown inline features on slides
  const renderSlideInline = (text: string) => {
    const parts: (string | React.ReactNode)[] = [];
    const regex = /(\[\[(.*?)\]\])|(`.*?`)|(\*\*.*?\*\*)|(\*.*?\*)|(\$[^$]+\$)|((?:^|\s)#[a-zA-Z0-9_\-\/]+)/g;

    let lastIdx = 0;
    let match;

    while ((match = regex.exec(text)) !== null) {
      if (match.index > lastIdx) {
        parts.push(text.slice(lastIdx, match.index));
      }

      // Wikilink
      if (match[1]) {
        const raw = match[2];
        const [target, alias] = raw.split('|').map(s => s.trim());
        parts.push(
          <span
            key={`wiki-${match.index}`}
            onClick={(e) => {
              e.stopPropagation();
              if (onNavigateLink) onNavigateLink(target);
            }}
            className="text-purple-400 bg-purple-950/60 hover:bg-purple-900/80 px-2 py-0.5 rounded cursor-pointer border border-purple-800/50 transition-colors inline-flex items-center gap-1"
          >
            <FileText className="w-3.5 h-3.5" />
            <span>{alias || target}</span>
          </span>
        );
      }
      // Inline code
      else if (match[3]) {
        parts.push(
          <code key={`c-${match.index}`} className="px-1.5 py-0.5 rounded bg-zinc-800 text-purple-300 font-mono text-[0.9em] border border-zinc-700">
            {match[0].slice(1, -1)}
          </code>
        );
      }
      // Bold
      else if (match[4]) {
        parts.push(
          <strong key={`b-${match.index}`} className="font-bold text-white">
            {match[0].slice(2, -2)}
          </strong>
        );
      }
      // Italic
      else if (match[5]) {
        parts.push(
          <em key={`i-${match.index}`} className="italic text-zinc-300">
            {match[0].slice(1, -1)}
          </em>
        );
      }
      // Math
      else if (match[6]) {
        parts.push(
          <span key={`m-${match.index}`} className="font-mono text-emerald-300 bg-emerald-950/40 px-1.5 py-0.5 rounded border border-emerald-800/40">
            {match[0].slice(1, -1)}
          </span>
        );
      }
      // Tag
      else if (match[7]) {
        parts.push(
          <span key={`t-${match.index}`} className="text-sky-400 bg-sky-950/50 px-2 py-0.5 rounded-full text-xs font-mono border border-sky-800/40">
            {match[0].trim()}
          </span>
        );
      }

      lastIdx = regex.lastIndex;
    }

    if (lastIdx < text.length) {
      parts.push(text.slice(lastIdx));
    }

    return parts.length > 0 ? parts : text;
  };

  // Render slide body blocks
  const renderSlideContent = (raw: string) => {
    const lines = raw.split('\n');
    const elements: React.ReactNode[] = [];
    let i = 0;

    while (i < lines.length) {
      const line = lines[i];

      // 1. Image: ![alt](src)
      const imgMatch = line.match(/^!\[(.*?)\]\((.*?)\)/);
      if (imgMatch) {
        const alt = imgMatch[1];
        const src = imgMatch[2];
        elements.push(
          <div key={`img-${i}`} className="my-5 flex flex-col items-center justify-center">
            <div className="rounded-xl overflow-hidden border border-zinc-700/80 shadow-2xl bg-zinc-950/90 max-h-[50vh] p-1">
              <img src={src} alt={alt} className="max-h-[48vh] w-auto object-contain rounded-lg" />
            </div>
            {alt && <div className="text-xs text-zinc-400 mt-2 italic">{alt}</div>}
          </div>
        );
        i++;
        continue;
      }

      // 2. Fenced code block
      if (line.trim().startsWith('```')) {
        const lang = line.trim().slice(3);
        const codeLines: string[] = [];
        let j = i + 1;
        while (j < lines.length && !lines[j].trim().startsWith('```')) {
          codeLines.push(lines[j]);
          j++;
        }
        elements.push(
          <div key={`code-${i}`} className="my-4 rounded-xl overflow-hidden border border-zinc-800 bg-zinc-950/90 font-mono text-sm shadow-xl">
            {lang && (
              <div className="px-4 py-1.5 bg-zinc-900 border-b border-zinc-800 text-[11px] text-zinc-400 font-semibold uppercase">
                {lang}
              </div>
            )}
            <pre className="p-4 text-zinc-200 overflow-x-auto leading-relaxed">
              <code>{codeLines.join('\n')}</code>
            </pre>
          </div>
        );
        i = j + 1;
        continue;
      }

      // 3. Callout > [!TYPE]
      if (line.trim().startsWith('> [!')) {
        const cMatch = line.trim().match(/^>\s*\[!([a-zA-Z]+)\]/);
        const cType = cMatch ? cMatch[1].toLowerCase() : 'note';
        const calloutLines: string[] = [];
        let j = i + 1;
        while (j < lines.length && lines[j].trim().startsWith('>')) {
          calloutLines.push(lines[j].replace(/^>\s?/, ''));
          j++;
        }

        let icon = <Info className="w-5 h-5 text-blue-400 shrink-0" />;
        let borderClass = 'border-blue-500/80 bg-blue-950/20';

        if (cType === 'tip') {
          icon = <Lightbulb className="w-5 h-5 text-emerald-400 shrink-0" />;
          borderClass = 'border-emerald-500/80 bg-emerald-950/20';
        } else if (cType === 'warning') {
          icon = <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0" />;
          borderClass = 'border-amber-500/80 bg-amber-950/20';
        } else if (cType === 'important' || cType === 'caution') {
          icon = <AlertCircle className="w-5 h-5 text-rose-400 shrink-0" />;
          borderClass = 'border-rose-500/80 bg-rose-950/20';
        } else if (cType === 'quote') {
          icon = <Quote className="w-5 h-5 text-purple-400 shrink-0" />;
          borderClass = 'border-purple-500/80 bg-purple-950/20';
        }

        elements.push(
          <div key={`callout-${i}`} className={`my-4 p-4 rounded-xl border-l-4 ${borderClass} shadow-lg backdrop-blur-md`}>
            <div className="flex items-center gap-2 font-bold text-sm mb-2 capitalize text-white">
              {icon}
              <span>{cType}</span>
            </div>
            <div className="text-zinc-300 text-sm space-y-1 pl-7">
              {calloutLines.map((cl, idx) => (
                <p key={idx}>{renderSlideInline(cl)}</p>
              ))}
            </div>
          </div>
        );
        i = j;
        continue;
      }

      // 4. Tables
      if (line.trim().startsWith('|') && line.trim().endsWith('|')) {
        const tableLines: string[] = [];
        let j = i;
        while (j < lines.length && lines[j].trim().startsWith('|')) {
          tableLines.push(lines[j]);
          j++;
        }

        const parseRow = (r: string) => r.split('|').slice(1, -1).map(c => c.trim());
        const headers = parseRow(tableLines[0]);
        const dataRows = tableLines.slice(2).map(parseRow);

        elements.push(
          <div key={`tbl-${i}`} className="my-4 overflow-x-auto rounded-xl border border-zinc-700/80 shadow-2xl bg-zinc-900/40">
            <table className="w-full text-left text-sm border-collapse">
              <thead>
                <tr className="bg-zinc-800/80 text-purple-300 font-semibold border-b border-zinc-700">
                  {headers.map((h, hIdx) => (
                    <th key={hIdx} className="p-3 border-r border-zinc-700/60 last:border-none">
                      {renderSlideInline(h)}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/80">
                {dataRows.map((row, rIdx) => (
                  <tr key={rIdx} className="hover:bg-zinc-800/30 transition-colors">
                    {row.map((cell, cIdx) => (
                      <td key={cIdx} className="p-3 text-zinc-200 border-r border-zinc-800 last:border-none align-top">
                        {renderSlideInline(cell)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        );
        i = j;
        continue;
      }

      // 5. Headers
      const hMatch = line.match(/^(#{1,6})\s+(.*)$/);
      if (hMatch) {
        const level = hMatch[1].length;
        const text = hMatch[2];

        if (level === 1) {
          elements.push(
            <h1 key={`h1-${i}`} className="text-3xl md:text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-purple-300 via-white to-purple-200 tracking-tight mt-2 mb-4">
              {renderSlideInline(text)}
            </h1>
          );
        } else if (level === 2) {
          elements.push(
            <h2 key={`h2-${i}`} className="text-2xl md:text-3xl font-bold text-purple-300 tracking-tight mt-4 mb-3 border-b border-zinc-800/80 pb-2">
              {renderSlideInline(text)}
            </h2>
          );
        } else if (level === 3) {
          elements.push(
            <h3 key={`h3-${i}`} className="text-xl md:text-2xl font-semibold text-zinc-100 mt-3 mb-2">
              {renderSlideInline(text)}
            </h3>
          );
        } else {
          elements.push(
            <h4 key={`h4-${i}`} className="text-lg font-semibold text-zinc-300 mt-2 mb-1">
              {renderSlideInline(text)}
            </h4>
          );
        }
        i++;
        continue;
      }

      // 6. Blockquote
      if (line.trim().startsWith('>')) {
        elements.push(
          <blockquote key={`bq-${i}`} className="border-l-4 border-purple-500 pl-4 py-1 my-3 text-zinc-300 italic text-base">
            {renderSlideInline(line.replace(/^>\s?/, ''))}
          </blockquote>
        );
        i++;
        continue;
      }

      // 7. Checklists
      const taskMatch = line.match(/^(\s*)-\s+\[([ xX])\]\s+(.*)$/);
      if (taskMatch) {
        const isDone = taskMatch[2].toLowerCase() === 'x';
        elements.push(
          <div key={`task-${i}`} className="flex items-center gap-3 my-2 text-base">
            <span className={`w-5 h-5 rounded flex items-center justify-center border ${isDone ? 'bg-purple-600 border-purple-500 text-white' : 'border-zinc-600'}`}>
              {isDone ? '✓' : ''}
            </span>
            <span className={isDone ? 'line-through text-zinc-500' : 'text-zinc-200'}>
              {renderSlideInline(taskMatch[3])}
            </span>
          </div>
        );
        i++;
        continue;
      }

      // 8. Bullet points
      if (line.match(/^\s*[-*+]\s+/)) {
        elements.push(
          <li key={`li-${i}`} className="ml-6 list-disc text-zinc-200 text-base md:text-lg my-1.5 leading-relaxed">
            {renderSlideInline(line.replace(/^\s*[-*+]\s+/, ''))}
          </li>
        );
        i++;
        continue;
      }

      // 9. Numbered items
      if (line.match(/^\s*\d+\.\s+/)) {
        elements.push(
          <div key={`ol-${i}`} className="flex items-start gap-3 my-2 text-base md:text-lg text-zinc-200 leading-relaxed">
            <span className="font-bold text-purple-400 shrink-0">{line.match(/^\s*(\d+\.)/)![1]}</span>
            <span>{renderSlideInline(line.replace(/^\s*\d+\.\s+/, ''))}</span>
          </div>
        );
        i++;
        continue;
      }

      // 10. Paragraphs & Empty space
      if (line.trim() === '') {
        elements.push(<div key={`sp-${i}`} className="h-3" />);
      } else {
        elements.push(
          <p key={`p-${i}`} className="text-zinc-300 text-base md:text-lg my-2 leading-relaxed">
            {renderSlideInline(line)}
          </p>
        );
      }

      i++;
    }

    return elements;
  };

  const progressPercent = ((currentSlideIndex + 1) / slides.length) * 100;

  return (
    <div className={`fixed inset-0 z-50 flex flex-col select-none overflow-hidden ${isLightMode ? 'bg-slate-100 text-slate-900' : 'bg-[#0c0c0e] text-zinc-100'}`}>
      {/* 1. Presentation Header Bar */}
      <div className={`flex items-center justify-between px-6 py-3 border-b shrink-0 z-10 ${isLightMode ? 'bg-white/80 border-slate-300' : 'bg-[#121215]/90 border-zinc-800/80 backdrop-blur-md'}`}>
        <div className="flex items-center gap-3">
          <div className="px-2.5 py-1 rounded bg-purple-600/20 text-purple-400 border border-purple-500/30 text-xs font-semibold flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5" />
            <span>OBSIDIAN SLIDES</span>
          </div>
          <span className="text-xs text-zinc-400 font-medium truncate max-w-sm hidden sm:inline">
            {file.name.replace(/\.md$/, '')}
          </span>
        </div>

        {/* Center: Slide indicator */}
        <div className="flex items-center gap-2">
          <button
            onClick={prevSlide}
            disabled={currentSlideIndex === 0}
            className="p-1.5 rounded hover:bg-zinc-800 disabled:opacity-30 disabled:hover:bg-transparent text-zinc-300 transition-colors"
            title="Previous Slide (Left Arrow)"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>

          <span className="text-xs font-mono font-medium px-3 py-1 rounded bg-zinc-900/80 border border-zinc-800 text-purple-300">
            {currentSlideIndex + 1} / {slides.length}
          </span>

          <button
            onClick={nextSlide}
            disabled={currentSlideIndex === slides.length - 1}
            className="p-1.5 rounded hover:bg-zinc-800 disabled:opacity-30 disabled:hover:bg-transparent text-zinc-300 transition-colors"
            title="Next Slide (Right Arrow or Space)"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        {/* Right Actions */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowGridModal(true)}
            className="p-2 rounded text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800/80 transition-colors"
            title="Slide Grid Overview (G)"
          >
            <Grid className="w-4 h-4" />
          </button>

          <button
            onClick={toggleFullscreen}
            className="p-2 rounded text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800/80 transition-colors"
            title="Toggle Fullscreen (F)"
          >
            {isFullscreen ? <Minimize className="w-4 h-4" /> : <Maximize className="w-4 h-4" />}
          </button>

          <button
            onClick={onClose}
            className="p-2 rounded text-zinc-400 hover:text-rose-400 hover:bg-zinc-800/80 transition-colors"
            title="Exit Presentation (Esc)"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* 2. Main Slide Stage */}
      <div className="flex-1 flex items-center justify-center p-4 md:p-8 overflow-hidden relative">
        <div
          className={`w-full max-w-6xl h-full max-h-[86vh] rounded-2xl border shadow-2xl overflow-y-auto p-8 md:p-14 flex flex-col justify-between transition-all duration-300 select-text ${
            isLightMode 
              ? 'bg-white border-slate-300 shadow-slate-300/40 text-slate-800' 
              : 'bg-[#141418] border-zinc-800/90 shadow-black/80 text-zinc-100'
          }`}
        >
          {/* Slide Content */}
          <div className="flex-1">
            {renderSlideContent(currentSlide.rawContent)}
          </div>

          {/* Slide Footer */}
          <div className="mt-8 pt-4 border-t border-zinc-800/80 flex items-center justify-between text-xs text-zinc-500 font-medium select-none">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-purple-500" />
              <span>2026 Data Clinic AI Clinic · Review 1</span>
            </div>
            <span>Slide {currentSlideIndex + 1} of {slides.length}</span>
          </div>
        </div>
      </div>

      {/* 3. Bottom Progress Bar */}
      <div className="h-1.5 w-full bg-zinc-900 overflow-hidden shrink-0">
        <div
          className="h-full bg-gradient-to-r from-purple-600 to-indigo-500 transition-all duration-300 ease-out"
          style={{ width: `${progressPercent}%` }}
        />
      </div>

      {/* 4. Slide Grid Overview Modal */}
      {showGridModal && (
        <div
          onClick={() => setShowGridModal(false)}
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex flex-col p-8 select-none animate-in fade-in duration-150"
        >
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <Grid className="w-5 h-5 text-purple-400" />
              <span>All Slides ({slides.length})</span>
            </h2>
            <button
              onClick={() => setShowGridModal(false)}
              className="p-2 rounded text-zinc-400 hover:text-white hover:bg-zinc-800"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4 p-2">
            {slides.map((s, idx) => (
              <div
                key={s.index}
                onClick={(e) => {
                  e.stopPropagation();
                  setCurrentSlideIndex(idx);
                  setShowGridModal(false);
                }}
                className={`p-3.5 rounded-xl border text-left cursor-pointer transition-all flex flex-col justify-between h-36 ${
                  idx === currentSlideIndex
                    ? 'bg-purple-600/30 border-purple-500 shadow-lg shadow-purple-600/20'
                    : 'bg-zinc-900/70 border-zinc-800 hover:border-zinc-600 hover:bg-zinc-850'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between text-[11px] text-zinc-500 font-mono mb-1">
                    <span>#{idx + 1}</span>
                    {idx === currentSlideIndex && (
                      <span className="text-purple-400 font-semibold">Active</span>
                    )}
                  </div>
                  <div className="text-xs font-semibold text-zinc-200 line-clamp-2 leading-snug">
                    {s.title}
                  </div>
                </div>

                <div className="text-[10px] text-zinc-500 truncate">
                  Click to jump
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
