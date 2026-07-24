// frontend/src/features/offboarding/components/TabNav.tsx
// Horizontal, scrollable tab bar for the Offboarding Hub.
//
// Matches the standard tab style used in other pages (Batches, etc.):
//   Active tab:   border-b-2 border-slate-900 text-slate-900
//   Inactive tab: text-slate-500 hover:text-slate-700
//   Disabled tab: not-clickable, text-slate-300 (no "Soon" chip)
//
// The active underline is applied directly on the button so it integrates
// with the container's border-b border-slate-200, same as Batches.
//
// FIX: with enough visible tabs (e.g. Superadmin sees all 8), the row can
// overflow the container width. The scrollbar was previously hidden with no
// other affordance, so overflowing tabs (like "Alumni Profile") were
// unreachable. This adds:
//   • Left/right edge fade so it's visually obvious there's more content
//   • Click-to-scroll chevron buttons (shown only when there's room to
//     scroll in that direction) — the most discoverable/accessible fix
//   • Vertical mouse-wheel input translated to horizontal scroll, since most
//     desktop mice don't have a horizontal wheel

import { useEffect, useRef, useState } from 'react';

export interface TabDefinition {
  id: string;
  label: string;
  icon: React.ReactNode;
  implemented: boolean;
}

interface TabNavProps {
  tabs: TabDefinition[];
  activeTab: string;
  onTabChange: (tabId: string) => void;
}

const SCROLL_STEP = 160;

export default function TabNav({ tabs, activeTab, onTabChange }: TabNavProps) {
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const updateScrollState = () => {
    const el = scrollRef.current;
    if (!el) return;
    setCanScrollLeft(el.scrollLeft > 1);
    setCanScrollRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 1);
  };

  useEffect(() => {
    updateScrollState();
    const el = scrollRef.current;
    if (!el) return;

    const handleResize = () => updateScrollState();
    window.addEventListener('resize', handleResize);

    // Re-check after layout settles (e.g. fonts/icons loading in).
    const raf = requestAnimationFrame(updateScrollState);

    const resizeObserver =
      typeof ResizeObserver !== 'undefined' ? new ResizeObserver(updateScrollState) : null;
    resizeObserver?.observe(el);

    return () => {
      window.removeEventListener('resize', handleResize);
      cancelAnimationFrame(raf);
      resizeObserver?.disconnect();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tabs.length]);

  const scrollBy = (delta: number) => {
    scrollRef.current?.scrollBy({ left: delta, behavior: 'smooth' });
  };

  const handleWheel = (e: React.WheelEvent<HTMLDivElement>) => {
    const el = scrollRef.current;
    if (!el) return;
    // Most desktop mice only produce vertical wheel deltas. If the row can
    // scroll horizontally, redirect vertical scroll input into horizontal
    // movement so the tab bar is reachable without a trackpad.
    if (el.scrollWidth > el.clientWidth && Math.abs(e.deltaY) > Math.abs(e.deltaX)) {
      e.preventDefault();
      el.scrollLeft += e.deltaY;
    }
  };

  return (
    <div className="relative border-b border-slate-200">
      {/* Left scroll affordance */}
      {canScrollLeft && (
        <>
          <div className="pointer-events-none absolute left-0 top-0 z-10 h-full w-8 bg-gradient-to-r from-white to-transparent" />
          <button
            type="button"
            aria-label="Scroll tabs left"
            onClick={() => scrollBy(-SCROLL_STEP)}
            className="absolute left-0 top-0 z-20 flex h-full items-center px-1 text-slate-400 hover:text-slate-700"
          >
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
        </>
      )}

      {/* Right scroll affordance */}
      {canScrollRight && (
        <>
          <div className="pointer-events-none absolute right-0 top-0 z-10 h-full w-8 bg-gradient-to-l from-white to-transparent" />
          <button
            type="button"
            aria-label="Scroll tabs right"
            onClick={() => scrollBy(SCROLL_STEP)}
            className="absolute right-0 top-0 z-20 flex h-full items-center px-1 text-slate-400 hover:text-slate-700"
          >
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </>
      )}

      <div
        ref={scrollRef}
        role="tablist"
        aria-label="Offboarding modules"
        onScroll={updateScrollState}
        onWheel={handleWheel}
        className="flex overflow-x-auto scroll-smooth"
        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' } as React.CSSProperties}
      >
        {tabs.map((tab) => {
          const isActive = tab.id === activeTab;
          const isDisabled = !tab.implemented;

          return (
            <button
              key={tab.id}
              role="tab"
              aria-selected={isActive}
              aria-disabled={isDisabled}
              disabled={isDisabled}
              onClick={() => {
                if (!isDisabled) onTabChange(tab.id);
              }}
              title={isDisabled ? 'Coming soon' : tab.label}
              className={[
                'group flex shrink-0 select-none items-center gap-2 whitespace-nowrap px-4 py-3 text-sm font-medium',
                'transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2',
                'focus-visible:ring-inset focus-visible:ring-slate-900',
                isActive
                  ? 'border-b-2 border-slate-900 text-slate-900'
                  : isDisabled
                  ? 'cursor-not-allowed border-b-2 border-transparent text-slate-300'
                  : 'cursor-pointer border-b-2 border-transparent text-slate-500 hover:text-slate-700',
              ].join(' ')}
            >
              {/* Icon */}
              <span
                className={[
                  'shrink-0 transition-colors duration-150',
                  isActive
                    ? 'text-slate-900'
                    : isDisabled
                    ? 'text-slate-300'
                    : 'text-slate-400 group-hover:text-slate-600',
                ].join(' ')}
              >
                {tab.icon}
              </span>

              {/* Label */}
              {tab.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}