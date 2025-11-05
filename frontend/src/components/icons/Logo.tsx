export const Logo = ({ className = '', size = 32 }: { className?: string; size?: number }) => {
  return (
    <svg 
      xmlns="http://www.w3.org/2000/svg" 
      viewBox="0 0 128 128" 
      width={size} 
      height={size}
      className={className}
      role="img" 
      aria-label="Medical AI Notetaker logo"
    >
      <defs>
        <clipPath id="round-clip">
          <rect x="4" y="4" width="120" height="120" rx="24" ry="24" />
        </clipPath>
      </defs>

      {/* rounded background */}
      <rect x="4" y="4" width="120" height="120" rx="24" ry="24" fill="#ffffff" />

      {/* left half (brain) */}
      <g clipPath="url(#round-clip)">
        <rect x="4" y="4" width="60" height="120" fill="#FFD54A" />
        {/* simplified curved lines to suggest brain folds */}
        <g transform="translate(8,14)" fill="none" stroke="#FFF4CC" strokeWidth="3" strokeLinecap="round">
          <path d="M6 10c6-6 18-6 24 0"/>
          <path d="M2 28c8-8 26-8 34 0"/>
          <path d="M6 46c10-10 30-10 40 0"/>
        </g>
      </g>

      {/* right half (circuit) */}
      <g clipPath="url(#round-clip)">
        <rect x="64" y="4" width="60" height="120" fill="#36c9b3" />
        {/* minimal circuit lines and nodes */}
        <g transform="translate(70,18)" fill="none" stroke="#e6fff9" strokeWidth="3" strokeLinecap="round">
          <path d="M4 8h18"/>
          <circle cx="4" cy="8" r="3" fill="#e6fff9"/>
          <path d="M22 8v12h14"/>
          <circle cx="36" cy="20" r="3" fill="#e6fff9"/>
          <path d="M14 36h18"/>
          <circle cx="32" cy="36" r="3" fill="#e6fff9"/>
        </g>
      </g>

      {/* face */}
      <g>
        {/* eyes */}
        <circle cx="48" cy="58" r="10" fill="#062023" opacity="1" />
        <circle cx="80" cy="58" r="10" fill="#062023" opacity="1" />
        {/* smile */}
        <path d="M42 80 Q64 98 86 80" stroke="#062023" strokeWidth="6" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
      </g>

      {/* border for contrast */}
      <rect x="4" y="4" width="120" height="120" rx="24" ry="24" fill="none" stroke="#000" strokeOpacity="0.06" strokeWidth="2"/>
    </svg>
  );
};
