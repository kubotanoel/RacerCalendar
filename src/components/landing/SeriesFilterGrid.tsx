"use client";

import { CATEGORIES, CategoryIcon } from "@/components/CategoryIcon";
import type { UiCategory as Cat } from "@/components/CategoryIcon";

const SHORT_LABELS: Record<Cat, string> = {
  FORMULA: "Formula",
  SPORTSCAR: "Sportscar",
  STOCK_CAR: "Stock",
  MOTORCYCLE: "Moto",
  RALLY: "Rally",
  OTHER: "Other",
};

type Props = {
  picked: Set<Cat>;
  onToggle: (c: Cat) => void;
  onClearCategories: () => void;
};

export function SeriesFilterGrid({ picked, onToggle, onClearCategories }: Props) {
  const allSports = picked.size === 0;

  return (
    <section className="flex flex-col gap-4 lg:gap-5" aria-labelledby="series-heading">
      <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1 lg:justify-between lg:gap-4">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <span
            id="series-heading"
            className="text-sm font-semibold uppercase tracking-wide text-stone-700 dark:text-zinc-400 lg:text-xs lg:font-medium lg:text-stone-600 dark:lg:text-zinc-500"
          >
            Series
          </span>
          {allSports ?
            <span className="text-xs text-[var(--text-muted)] dark:text-zinc-500">
              Everything (all categories)
            </span>
          : null}
        </div>
        {!allSports ?
          <button
            type="button"
            className="-mx-px min-h-[44px] rounded-lg px-3 py-2 text-sm font-medium text-orange-600 underline-offset-4 hover:bg-orange-500/8 hover:text-orange-700 hover:underline active:bg-orange-500/12 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-orange-500 dark:text-orange-400 dark:hover:bg-orange-500/10 dark:hover:text-orange-300"
            onClick={onClearCategories}
          >
            All categories
          </button>
        : null}
      </div>

      <div className="grid grid-cols-3 gap-2.5 sm:flex sm:flex-wrap sm:gap-2 lg:gap-3">
        {CATEGORIES.map((c) => {
          const on = picked.has(c);
          return (
            <button
              key={c}
              type="button"
              aria-pressed={on}
              title={SHORT_LABELS[c]}
              onClick={() => onToggle(c)}
              className={`flex min-h-[3.75rem] flex-col items-center justify-center gap-2 rounded-2xl border px-3 py-3.5 transition active:scale-[0.98] motion-reduce:transition-none motion-reduce:active:scale-100 sm:min-h-0 sm:flex-1 sm:basis-[calc(16.66%-12px)] sm:min-w-[5.75rem] sm:py-4 ${
                on
                  ? "border-orange-500/90 bg-gradient-to-br from-orange-400 to-orange-600 text-orange-950 shadow-lg shadow-orange-600/35 ring-2 ring-orange-400 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-orange-500 dark:border-orange-400/85 dark:bg-gradient-to-br dark:from-orange-600/85 dark:to-orange-950/90 dark:text-orange-50 dark:ring-orange-600/85"
                  : "focus-visible:border-orange-400 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-orange-500/80 dark:focus-visible:outline-orange-400/70 border-[var(--border-muted)] bg-[var(--surface-elevated)] text-stone-600 shadow-sm hover:border-orange-300 hover:bg-[var(--surface-muted)] hover:text-stone-900 dark:border-zinc-800 dark:bg-zinc-900/90 dark:text-zinc-400 dark:hover:border-zinc-600 dark:hover:text-zinc-200"
              }`}
            >
              <CategoryIcon category={c} />
              <span className="text-center text-xs font-semibold leading-tight sm:text-xs lg:font-medium">
                {SHORT_LABELS[c]}
              </span>
            </button>
          );
        })}
      </div>
    </section>
  );
}
