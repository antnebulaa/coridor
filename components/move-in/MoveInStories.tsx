'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { X } from 'lucide-react';
import MoveInStoryProgress from './MoveInStoryProgress';
import MoveInStoryCongrats from './MoveInStoryCongrats';
import MoveInStoryStep from './MoveInStoryStep';
import MoveInStoryRecap from './MoveInStoryRecap';
import { MOVE_IN_STEPS_CONFIG, type MoveInLeaseData } from '@/lib/moveInGuide';

interface MoveInStoriesProps {
  lease: MoveInLeaseData;
  onClose: () => void;
  onComplete: () => void;
}

const TOTAL_STORIES = 10; // congrats + 8 steps + recap
const AUTO_ADVANCE_MS = 8000;

const MoveInStories: React.FC<MoveInStoriesProps> = ({ lease, onClose, onComplete }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [progress, setProgress] = useState(0);
  const [paused, setPaused] = useState(false);
  const progressRef = useRef(0);
  const rafRef = useRef<number>(0);
  const lastTimeRef = useRef<number>(0);
  const touchStartRef = useRef<number>(0);
  const touchStartXRef = useRef<number>(0);

  // Disable body scroll
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, []);

  const goNext = useCallback(() => {
    if (currentIndex < TOTAL_STORIES - 1) {
      setCurrentIndex(prev => prev + 1);
      progressRef.current = 0;
      setProgress(0);
      lastTimeRef.current = 0;
    } else {
      onComplete();
    }
  }, [currentIndex, onComplete]);

  const goPrev = useCallback(() => {
    if (currentIndex > 0) {
      setCurrentIndex(prev => prev - 1);
      progressRef.current = 0;
      setProgress(0);
      lastTimeRef.current = 0;
    }
  }, [currentIndex]);

  // Auto-advance with requestAnimationFrame
  useEffect(() => {
    // Reset on index change
    progressRef.current = 0;
    lastTimeRef.current = 0;

    const animate = (timestamp: number) => {
      if (!lastTimeRef.current) lastTimeRef.current = timestamp;

      if (!paused) {
        const elapsed = timestamp - lastTimeRef.current;
        progressRef.current += elapsed / AUTO_ADVANCE_MS;

        if (progressRef.current >= 1) {
          goNext();
          return;
        }

        setProgress(progressRef.current);
      }

      lastTimeRef.current = timestamp;
      rafRef.current = requestAnimationFrame(animate);
    };

    rafRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(rafRef.current);
  }, [currentIndex, paused, goNext]);

  // Touch/click handlers for pause + navigation
  const handlePointerDown = (e: React.PointerEvent) => {
    setPaused(true);
    touchStartRef.current = Date.now();
    touchStartXRef.current = e.clientX;
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    setPaused(false);
    const duration = Date.now() - touchStartRef.current;
    const deltaX = e.clientX - touchStartXRef.current;

    // Swipe detection
    if (Math.abs(deltaX) > 50) {
      if (deltaX < 0) goNext();
      else goPrev();
      return;
    }

    // Tap detection (only short taps, not holds)
    if (duration < 300) {
      const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
      const x = e.clientX - rect.left;
      const width = rect.width;

      if (x < width * 0.3) goPrev();
      else if (x > width * 0.7) goNext();
    }
  };

  // Render current story content
  const renderStory = () => {
    if (currentIndex === 0) {
      return <MoveInStoryCongrats lease={lease} onNext={goNext} />;
    }
    if (currentIndex === TOTAL_STORIES - 1) {
      return <MoveInStoryRecap onComplete={onComplete} />;
    }
    // Steps 1-8 correspond to indices 1-8
    const stepConfig = MOVE_IN_STEPS_CONFIG[currentIndex - 1];
    return <MoveInStoryStep config={stepConfig} />;
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center" style={{ backgroundColor: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(12px)' }}>
      <div
        className="relative w-full max-w-[380px] mx-auto overflow-hidden flex flex-col"
        style={{
          height: 'min(90vh, 740px)',
          borderRadius: '28px',
          boxShadow: '0 24px 80px rgba(0,0,0,0.15), 0 0 0 1px rgba(0,0,0,0.06)',
          backgroundColor: '#FFFFFF',
        }}
        onPointerDown={handlePointerDown}
        onPointerUp={handlePointerUp}
      >
        {/* Progress bars */}
        <div className="relative z-10">
          <MoveInStoryProgress total={TOTAL_STORIES} currentIndex={currentIndex} progress={progress} />
        </div>

        {/* Header: close + counter */}
        <div className="relative z-10 flex items-center justify-between px-4 pt-2 pb-1">
          <span className="text-[11px]" style={{ color: 'rgba(0,0,0,0.25)' }}>
            {currentIndex + 1}/{TOTAL_STORIES}
          </span>
          <button
            onClick={(e) => { e.stopPropagation(); onClose(); }}
            className="w-[30px] h-[30px] rounded-full flex items-center justify-center transition-colors"
            style={{ backgroundColor: 'rgba(0,0,0,0.06)' }}
          >
            <X size={14} style={{ color: 'rgba(0,0,0,0.35)' }} />
          </button>
        </div>

        {/* Story content */}
        <div className="flex-1 overflow-hidden">
          {renderStory()}
        </div>
      </div>
    </div>
  );
};

export default MoveInStories;
