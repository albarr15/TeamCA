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

export default function TabNav({ tabs, activeTab, onTabChange }: TabNavProps) {
  return (
    <div
      role="tablist"
      aria-label="Offboarding modules"
      className="flex overflow-x-auto border-b border-slate-200"
      style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' } as React.CSSProperties}
    >
      {tabs.map((tab) => {
        const isActive   = tab.id === activeTab;
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
              'group flex select-none items-center gap-2 whitespace-nowrap px-4 py-3 text-sm font-medium',
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
  );
}
