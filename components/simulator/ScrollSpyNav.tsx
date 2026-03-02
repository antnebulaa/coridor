'use client';

import { useState, useEffect, useRef, useCallback } from 'react';

interface ScrollSpyNavProps {
  sections: { id: string; label: string; icon: React.ComponentType<{ size: number }> }[];
}

export function ScrollSpyNav({ sections }: ScrollSpyNavProps) {
  const [activeId, setActiveId] = useState(sections[0]?.id ?? '');
  const [isStuck, setIsStuck] = useState(false);
  const navRef = useRef<HTMLDivElement>(null);
  const activeIdRef = useRef(activeId);

  const isDarkSection = activeId === 'section-fiscal';

  // Signal dark state to the layout header via data attribute
  useEffect(() => {
    const header = document.querySelector('[data-sim-header]');
    if (header) {
      header.setAttribute('data-dark', isDarkSection ? 'true' : 'false');
    }
  }, [isDarkSection]);

  // Scroll-based detection — more reliable timing than IntersectionObserver
  useEffect(() => {
    let ticking = false;

    const handleScroll = () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => {
        const navBottom = navRef.current?.getBoundingClientRect().bottom ?? 0;
        let current = sections[0]?.id ?? '';

        for (const s of sections) {
          const el = document.getElementById(s.id);
          if (!el) continue;
          // Last section whose top has passed above the nav bottom
          if (el.getBoundingClientRect().top <= navBottom + 50) {
            current = s.id;
          }
        }

        if (current !== activeIdRef.current) {
          activeIdRef.current = current;
          setActiveId(current);
        }
        ticking = false;
      });
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    // Listen on the scrollable main container too
    const scrollContainer = navRef.current?.closest('main');
    if (scrollContainer) {
      scrollContainer.addEventListener('scroll', handleScroll, { passive: true });
    }
    handleScroll();
    return () => {
      window.removeEventListener('scroll', handleScroll);
      if (scrollContainer) {
        scrollContainer.removeEventListener('scroll', handleScroll);
      }
    };
  }, [sections]);

  // Detect sticky state via sentinel
  useEffect(() => {
    const nav = navRef.current;
    if (!nav) return;

    const sentinel = document.createElement('div');
    sentinel.style.height = '1px';
    sentinel.style.marginBottom = '-1px';
    nav.parentElement?.insertBefore(sentinel, nav);

    const observer = new IntersectionObserver(
      ([entry]) => {
        setIsStuck(!entry.isIntersecting);
      },
      { threshold: 0 }
    );

    observer.observe(sentinel);
    return () => {
      observer.disconnect();
      sentinel.remove();
    };
  }, []);

  const handleClick = useCallback((id: string) => {
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, []);

  return (
    <div
      ref={navRef}
      className={`sticky top-0 z-50 transition-all duration-300 ${
        isStuck
          ? isDarkSection
            ? 'shadow-[0_2px_8px_rgba(0,0,0,0.4)]'
            : 'shadow-[0_2px_8px_rgba(0,0,0,0.06)] dark:shadow-[0_2px_8px_rgba(0,0,0,0.3)]'
          : ''
      }`}
      style={{
        backgroundColor: isDarkSection
          ? isStuck
            ? 'rgba(26, 26, 26, 0.95)'
            : '#1A1A1A'
          : isStuck
            ? 'color-mix(in srgb, var(--sim-bg-card) 95%, transparent)'
            : 'var(--sim-bg-card)',
        backdropFilter: isStuck ? 'blur(8px)' : 'none',
      }}
    >
      <div className="max-w-4xl mx-auto px-4 sm:px-6">
        <div className="flex gap-1 overflow-x-auto scrollbar-hide snap-x px-1 py-2.5">
          {sections.map((s) => {
            const Icon = s.icon;
            const isActive = activeId === s.id;
            return (
              <button
                key={s.id}
                type="button"
                onClick={() => handleClick(s.id)}
                className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap snap-start transition-all duration-200 ${
                  isActive
                    ? isDarkSection
                      ? 'bg-amber-500/20 text-amber-300'
                      : 'bg-(--sim-amber-50) text-(--sim-amber-600)'
                    : isDarkSection
                      ? 'text-white/50 hover:text-white/80'
                      : 'text-neutral-500 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-200'
                }`}
              >
                <Icon size={14} />
                {s.label}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
