import React from 'react';

export function AureonCrest({ className = 'w-7 h-7' }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 36 36"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      <rect x="2" y="2" width="32" height="32" rx="6" stroke="#C59B27" strokeWidth="1.5" />
      <path
        d="M18 8L26.5 26H22.6L20.7 21.8H15.3L13.4 26H9.5L18 8ZM16.5 18.6H19.5L18 14.9L16.5 18.6Z"
        fill="#D1A942"
      />
      <line x1="8" y1="28.5" x2="28" y2="28.5" stroke="#C59B27" strokeOpacity="0.45" strokeWidth="1" />
    </svg>
  );
}

export function formatCurrency(value: number): string {
  const abs = Math.abs(value);
  const formatted = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: abs >= 1000 ? 0 : 2,
  }).format(abs);
  return value < 0 ? `-${formatted}` : formatted;
}

export function formatCompactCurrency(value: number): string {
  const abs = Math.abs(value);
  const sign = value < 0 ? '-' : '';
  if (abs >= 1_000_000_000) {
    return `${sign}$${(abs / 1_000_000_000).toFixed(2)}B`;
  }
  if (abs >= 1_000_000) {
    return `${sign}$${(abs / 1_000_000).toFixed(2)}M`;
  }
  if (abs >= 1_000) {
    return `${sign}$${(abs / 1_000).toFixed(1)}K`;
  }
  return `${sign}$${abs.toFixed(0)}`;
}
