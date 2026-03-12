'use client';

interface ViewToggleProps {
  view: 'grouped' | 'list';
  onChange: (view: 'grouped' | 'list') => void;
}

export default function ViewToggle({ view, onChange }: ViewToggleProps) {
  return (
    <div className="bg-neutral-100 dark:bg-neutral-800 rounded-full p-0.5 inline-flex text-sm">
      <button
        onClick={() => onChange('grouped')}
        className={`px-3.5 py-1.5 rounded-full font-medium transition-all duration-200 ${
          view === 'grouped'
            ? 'bg-white dark:bg-neutral-700 shadow-sm text-neutral-900 dark:text-neutral-100'
            : 'text-neutral-500 dark:text-neutral-400'
        }`}
      >
        Par bien
      </button>
      <button
        onClick={() => onChange('list')}
        className={`px-3.5 py-1.5 rounded-full font-medium transition-all duration-200 ${
          view === 'list'
            ? 'bg-white dark:bg-neutral-700 shadow-sm text-neutral-900 dark:text-neutral-100'
            : 'text-neutral-500 dark:text-neutral-400'
        }`}
      >
        Liste
      </button>
    </div>
  );
}
