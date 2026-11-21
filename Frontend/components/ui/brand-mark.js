export function BrandMark({ className = "h-8 w-8" }) {
  return (
    <svg viewBox="0 0 128 128" className={className} role="img" aria-label="AI Marketing Platform">
      <defs>
        <linearGradient id="brandA" x1="20" y1="110" x2="92" y2="12" gradientUnits="userSpaceOnUse">
          <stop stopColor="#7C3AED" />
          <stop offset=".48" stopColor="#2563EB" />
          <stop offset="1" stopColor="#22D3EE" />
        </linearGradient>
        <linearGradient id="brandArrow" x1="18" y1="94" x2="112" y2="38" gradientUnits="userSpaceOnUse">
          <stop stopColor="#A855F7" />
          <stop offset=".55" stopColor="#6366F1" />
          <stop offset="1" stopColor="#22D3EE" />
        </linearGradient>
      </defs>
      <path d="M12 112 43 30Q49 14 65 14h11q12 0 18 12l13 24-19 12-13-24q-2-4-6-4h-4q-5 0-7 5L38 82 12 112Z" fill="url(#brandA)"/>
      <path d="M18 101 54 81q21-8 38-22l-7-7 32-8-7 32-6-9q-22 20-48 29l-38 14Z" fill="url(#brandArrow)"/>
      <rect x="77" y="91" width="10" height="21" rx="3" fill="#8B5CF6"/>
      <rect x="92" y="82" width="10" height="30" rx="3" fill="#3B82F6"/>
      <rect x="107" y="72" width="10" height="40" rx="3" fill="#22D3EE"/>
    </svg>
  );
}
