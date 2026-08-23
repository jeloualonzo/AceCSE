import { ChevronRight } from 'lucide-react';
import { Link } from 'react-router-dom';

/**
 * Content Bank breadcrumbs.
 *
 * The admin surfaces nest four deep (Content Bank → Subject → Family → Batch →
 * Review), so a trail is the navigation, not decoration. Uses a real `<nav>`
 * with an ordered list and `aria-current` on the leaf; the separator is an
 * `aria-hidden` chevron rather than a typographic character, so nothing reads
 * out as punctuation.
 */

export interface Crumb {
  label: string;
  /** Omitted on the current page. */
  to?: string;
}

export function ContentBankBreadcrumbs({ trail }: { trail: readonly Crumb[] }) {
  return (
    <nav aria-label="Breadcrumb">
      <ol className="flex flex-wrap items-center gap-1 text-xs text-slate-500 dark:text-slate-400">
        {trail.map((crumb, index) => (
          <li key={`${crumb.label}-${index}`} className="flex items-center gap-1">
            {index > 0 && <ChevronRight className="h-3.5 w-3.5 shrink-0 text-slate-300 dark:text-slate-600" aria-hidden="true" />}
            {crumb.to ? (
              <Link
                to={crumb.to}
                className="rounded font-semibold text-emerald-700 transition hover:text-emerald-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 dark:text-emerald-400"
              >
                {crumb.label}
              </Link>
            ) : (
              <span aria-current="page" className="font-semibold text-slate-900 dark:text-white">
                {crumb.label}
              </span>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
}

export default ContentBankBreadcrumbs;
