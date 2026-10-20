const base = {
  width: 16,
  height: 16,
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 2,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
  'aria-hidden': true,
};

export const PlayIcon = (p) => (
  <svg {...base} {...p}><path d="M7 4.5v15l12-7.5z" fill="currentColor" stroke="none" /></svg>
);
export const StopIcon = (p) => (
  <svg {...base} {...p}><rect x="6" y="6" width="12" height="12" rx="1.5" fill="currentColor" stroke="none" /></svg>
);
export const DotsIcon = (p) => (
  <svg {...base} {...p}>
    <circle cx="12" cy="5" r="1.6" fill="currentColor" stroke="none" />
    <circle cx="12" cy="12" r="1.6" fill="currentColor" stroke="none" />
    <circle cx="12" cy="19" r="1.6" fill="currentColor" stroke="none" />
  </svg>
);
export const PlusIcon = (p) => (
  <svg {...base} {...p}><path d="M12 5v14M5 12h14" /></svg>
);
export const VolumeIcon = (p) => (
  <svg {...base} {...p}>
    <path d="M4 9.5h3.5L12 5.5v13l-4.5-4H4z" fill="currentColor" stroke="none" />
    <path d="M15.5 9a4 4 0 0 1 0 6M18 6.5a7.5 7.5 0 0 1 0 11" />
  </svg>
);
export const MuteIcon = (p) => (
  <svg {...base} {...p}>
    <path d="M4 9.5h3.5L12 5.5v13l-4.5-4H4z" fill="currentColor" stroke="none" />
    <path d="M16 9.5l5 5M21 9.5l-5 5" />
  </svg>
);
export const BackIcon = (p) => (
  <svg {...base} {...p}><path d="M15 5l-7 7 7 7" /></svg>
);
export const ExpandIcon = (p) => (
  <svg {...base} {...p}><path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5" /></svg>
);
export const RefreshIcon = (p) => (
  <svg {...base} {...p}><path d="M20 11a8 8 0 1 0-2.3 5.7M20 4v7h-7" /></svg>
);
export const AppsIcon = (p) => (
  <svg {...base} {...p}>
    <rect x="4" y="4" width="6.5" height="6.5" rx="1.5" /><rect x="13.5" y="4" width="6.5" height="6.5" rx="1.5" />
    <rect x="4" y="13.5" width="6.5" height="6.5" rx="1.5" /><rect x="13.5" y="13.5" width="6.5" height="6.5" rx="1.5" />
  </svg>
);
export const BatteryIcon = (p) => (
  <svg {...base} {...p}><rect x="3" y="7.5" width="16" height="9" rx="2" /><path d="M21.5 11v2" /></svg>
);
export const SearchIcon = (p) => (
  <svg {...base} {...p}><circle cx="11" cy="11" r="6.5" /><path d="M20 20l-4.2-4.2" /></svg>
);
export const CloseIcon = (p) => (
  <svg {...base} {...p}><path d="M6 6l12 12M18 6L6 18" /></svg>
);
export const InstallIcon = (p) => (
  <svg {...base} {...p}><path d="M12 4v11M7.5 10.5L12 15l4.5-4.5M5 19.5h14" /></svg>
);
export const TrashIcon = (p) => (
  <svg {...base} {...p}><path d="M4.5 7h15M10 7V4.5h4V7M6.5 7l1 12.5h9l1-12.5M10.5 11v5M13.5 11v5" /></svg>
);
export const HeadsetIcon = (p) => (
  <svg {...base} {...p}>
    <path d="M3 9.5A2.5 2.5 0 0 1 5.5 7h13A2.5 2.5 0 0 1 21 9.5v5a2.5 2.5 0 0 1-2.5 2.5h-3.2a2 2 0 0 1-1.7-.95l-.9-1.5a.8.8 0 0 0-1.4 0l-.9 1.5a2 2 0 0 1-1.7.95H5.5A2.5 2.5 0 0 1 3 14.5z" />
  </svg>
);
export const GridSmallIcon = (p) => (
  <svg {...base} {...p}>
    <rect x="4" y="4" width="4" height="4" rx="1" /><rect x="10" y="4" width="4" height="4" rx="1" /><rect x="16" y="4" width="4" height="4" rx="1" />
    <rect x="4" y="10" width="4" height="4" rx="1" /><rect x="10" y="10" width="4" height="4" rx="1" /><rect x="16" y="10" width="4" height="4" rx="1" />
    <rect x="4" y="16" width="4" height="4" rx="1" /><rect x="10" y="16" width="4" height="4" rx="1" /><rect x="16" y="16" width="4" height="4" rx="1" />
  </svg>
);
export const GridMediumIcon = (p) => (
  <svg {...base} {...p}>
    <rect x="4" y="4" width="7" height="7" rx="1.5" /><rect x="13" y="4" width="7" height="7" rx="1.5" />
    <rect x="4" y="13" width="7" height="7" rx="1.5" /><rect x="13" y="13" width="7" height="7" rx="1.5" />
  </svg>
);
export const GridLargeIcon = (p) => (
  <svg {...base} {...p}>
    <rect x="4" y="4" width="16" height="7" rx="1.5" /><rect x="4" y="13" width="16" height="7" rx="1.5" />
  </svg>
);
