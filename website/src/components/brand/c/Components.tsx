import React from 'react';

export const Mark = ({ size = 120, className = "" }: { size?: number, className?: string }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 100 100"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
  >
    {/* Abstract Grip Mark - Outer Brackets */}
    <path d="M 10 30 L 10 10 L 30 10" stroke="currentColor" strokeWidth="4" fill="none" />
    <path d="M 70 10 L 90 10 L 90 30" stroke="currentColor" strokeWidth="4" fill="none" />
    <path d="M 10 70 L 10 90 L 30 90" stroke="currentColor" strokeWidth="4" fill="none" />
    <path d="M 70 90 L 90 90 L 90 70" stroke="currentColor" strokeWidth="4" fill="none" />

    {/* Calibration Ticks */}
    <line x1="50" y1="5" x2="50" y2="12" stroke="currentColor" strokeWidth="2" />
    <line x1="50" y1="88" x2="50" y2="95" stroke="currentColor" strokeWidth="2" />
    <line x1="5" y1="50" x2="12" y2="50" stroke="currentColor" strokeWidth="2" />
    <line x1="88" y1="50" x2="95" y2="50" stroke="currentColor" strokeWidth="2" />

    {/* Center element - "The Signal" */}
    <rect x="42" y="42" width="16" height="16" fill="currentColor" rx="1" />
    <circle cx="50" cy="50" r="2" fill="#121214" />
    
    {/* Inner Precision Crosshair */}
    <line x1="40" y1="50" x2="60" y2="50" stroke="currentColor" strokeWidth="0.5" opacity="0.5" />
    <line x1="50" y1="40" x2="50" y2="60" stroke="currentColor" strokeWidth="0.5" opacity="0.5" />
  </svg>
);

export const Wordmark = ({ className = "" }: { className?: string }) => (
  <span className={`font-[family-name:var(--font-jetbrains)] font-bold tracking-tighter uppercase ${className}`}>
    VoiceClaw
  </span>
);

export const IconMic = () => (
  <svg viewBox="0 0 24 24" width="24" height="24" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z" />
    <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
    <line x1="12" y1="19" x2="12" y2="22" />
  </svg>
);

export const IconWaveform = () => (
  <svg viewBox="0 0 24 24" width="24" height="24" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round">
    <path d="M2 10v3" /><path d="M6 6v11" /><path d="M10 3v18" /><path d="M14 8v7" /><path d="M18 5v13" /><path d="M22 10v3" />
  </svg>
);

export const IconBrain = () => (
  <svg viewBox="0 0 24 24" width="24" height="24" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" /><rect x="14" y="14" width="7" height="7" /><rect x="3" y="14" width="7" height="7" />
    <path d="M10 6h4" /><path d="M10 18h4" /><path d="M6 10v4" /><path d="M18 10v4" />
  </svg>
);

export const IconConnection = () => (
  <svg viewBox="0 0 24 24" width="24" height="24" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round">
    <path d="M18 13V9a2 2 0 0 0-2-2H8a2 2 0 0 0-2 2v4" />
    <path d="M18 19v2" /><path d="M6 19v2" /><path d="M10 19h4" /><circle cx="12" cy="16" r="3" />
  </svg>
);

export const IconSettings = () => (
  <svg viewBox="0 0 24 24" width="24" height="24" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="3" />
    <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1Z" />
  </svg>
);

export const IconRouting = () => (
  <svg viewBox="0 0 24 24" width="24" height="24" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="3" width="6" height="6" rx="1" /><rect x="15" y="15" width="6" height="6" rx="1" />
    <path d="M9 6h6a2 2 0 0 1 2 2v7" /><path d="M12 12h3" />
  </svg>
);

export const IconMeter = () => (
  <svg viewBox="0 0 24 24" width="24" height="24" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round">
    <path d="m12 20 9-9" /><path d="M18 20V4" /><path d="M6 20V12" /><path d="M12 20V8" />
  </svg>
);

export const IconGain = () => (
  <svg viewBox="0 0 24 24" width="24" height="24" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10" /><path d="M12 8v8" /><path d="M8 12h8" />
  </svg>
);
