import React from 'react';

/**
 * The AceCSE mark: a geometric "A" (the examinee's ascent) completed by a
 * check (the passing mark) on an emerald tile. Flat, minimal, legible at
 * 24px, and identical in light and dark themes. Also shipped as
 * /favicon.svg — keep the two in sync.
 */
export const BrandMark: React.FC<{ className?: string }> = ({ className = 'w-8 h-8' }) => (
  <svg viewBox="0 0 32 32" className={className} role="img" aria-hidden="true" focusable="false">
    <rect width="32" height="32" rx="7" fill="#059669" />
    <path
      d="M8.5 23.5 16 8.5l7.5 15"
      stroke="#ffffff"
      strokeWidth="2.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      fill="none"
    />
    <path
      d="M12.2 17.5l2.6 2.6 4.6-6.2"
      stroke="#ffffff"
      strokeWidth="2.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      fill="none"
    />
  </svg>
);
