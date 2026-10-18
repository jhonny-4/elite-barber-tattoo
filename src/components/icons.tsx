import type { SVGProps } from "react";
export function Icon({
  name,
  ...props
}: SVGProps<SVGSVGElement> & {
  name:
    | "arrow"
    | "chevron"
    | "close"
    | "menu"
    | "calendar"
    | "check"
    | "plus"
    | "upload"
    | "spark"
    | "grid"
    | "users"
    | "whatsapp"
    | "instagram"
    | "clock"
    | "pin"
    | "lock"
    | "scissors"
    | "needle"
    | "razor"
    | "bell"
    | "ticket"
    | "logout"
    | "search"
    | "refresh"
    | "alert"
    | "mail"
    | "offline"
    | "expand"
    | "collapse"
    | "download"
    | "qr"
    | "screen";
}) {
  const paths = {
    razor: (
      <>
        <path d="M2.5 7.5h11.5v3.5H6.8C4.6 11 3 9.6 2.5 7.5Z" />
        <path d="M14 7.5 21 15.5a1.4 1.4 0 0 1-2 1.9l-6.3-6.4" />
        <circle cx="14.6" cy="9.1" r=".75" />
      </>
    ),
    whatsapp: (
      <>
        <path d="M21 11.5a9 9 0 0 1-13.4 7.8L3 21l1.6-4.7A9 9 0 1 1 21 11.5Z" />
        <path d="m8.1 7.2 1.5 2.4-1 1.2a8.6 8.6 0 0 0 4.6 4.4l1.1-1.2 2.5 1.3c-.5 2.2-2 2.4-3.8 1.6-3.6-1.6-5.7-3.7-6.8-6.9-.6-1.7.1-2.7 1.9-2.8Z" />
      </>
    ),
    instagram: (
      <>
        <rect x="3" y="3" width="18" height="18" rx="5" />
        <circle cx="12" cy="12" r="4" />
        <circle cx="17.5" cy="6.5" r=".8" fill="currentColor" stroke="none" />
      </>
    ),
    arrow: (
      <>
        <path d="M5 19 19 5M5 5h14v14" />
      </>
    ),
    chevron: <path d="m9 5 7 7-7 7" />,
    close: <path d="m6 6 12 12M6 18 18 6" />,
    menu: (
      <>
        <path d="M4 8h16M4 16h16" />
      </>
    ),
    calendar: (
      <>
        <rect x="3" y="5" width="18" height="16" rx="3" />
        <path d="M7 3v4m10-4v4M3 11h18" />
      </>
    ),
    check: <path d="m5 12 4 4L19 6" />,
    plus: <path d="M12 4v16M4 12h16" />,
    upload: (
      <>
        <path d="M12 16V3m-5 5 5-5 5 5M4 16v5h16v-5" />
      </>
    ),
    spark: (
      <path d="m12 2 2.8 7.2L22 12l-7.2 2.8L12 22l-2.8-7.2L2 12l7.2-2.8Z" />
    ),
    grid: (
      <>
        <rect x="3" y="3" width="7" height="7" rx="1" />
        <rect x="14" y="3" width="7" height="7" rx="1" />
        <rect x="3" y="14" width="7" height="7" rx="1" />
        <rect x="14" y="14" width="7" height="7" rx="1" />
      </>
    ),
    users: (
      <>
        <circle cx="9" cy="8" r="3" />
        <path d="M3 21v-3a6 6 0 0 1 12 0v3M16 5a3 3 0 0 1 0 6m3 10v-3a6 6 0 0 0-3-5" />
      </>
    ),
    clock: (
      <>
        <circle cx="12" cy="12" r="9" />
        <path d="M12 6v6l4 2" />
      </>
    ),
    pin: (
      <>
        <path d="M12 21s-7-6.2-7-11.5a7 7 0 0 1 14 0C19 14.8 12 21 12 21Z" />
        <circle cx="12" cy="9.5" r="2.5" />
      </>
    ),
    lock: (
      <>
        <rect x="4.5" y="10.5" width="15" height="10" rx="2.5" />
        <path d="M8 10.5V7.5a4 4 0 0 1 8 0v3" />
      </>
    ),
    scissors: (
      <>
        <circle cx="6" cy="6.5" r="2.5" />
        <circle cx="6" cy="17.5" r="2.5" />
        <path d="M8.2 7.7 20 18M8.2 16.3 20 6" />
      </>
    ),
    needle: (
      <>
        <path d="M19 5 8.5 15.5" />
        <path d="m15.5 4.5 4 4M7 14l3 3-4.5 3.5L4 19Z" />
      </>
    ),
    bell: (
      <>
        <path d="M6 16V11a6 6 0 0 1 12 0v5l1.5 2h-15Z" />
        <path d="M10 20.5a2 2 0 0 0 4 0" />
      </>
    ),
    ticket: (
      <>
        <path d="M4 7.5A1.5 1.5 0 0 1 5.5 6h13A1.5 1.5 0 0 1 20 7.5v2a2.5 2.5 0 0 0 0 5v2a1.5 1.5 0 0 1-1.5 1.5h-13A1.5 1.5 0 0 1 4 16.5v-2a2.5 2.5 0 0 0 0-5Z" />
        <path d="M14.5 6v12" strokeDasharray="2 2.5" />
      </>
    ),
    logout: (
      <>
        <path d="M14 4h4a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-4" />
        <path d="M10 8 6 12l4 4M6 12h10" />
      </>
    ),
    search: (
      <>
        <circle cx="11" cy="11" r="6.5" />
        <path d="m16 16 4.5 4.5" />
      </>
    ),
    refresh: (
      <>
        <path d="M19.5 12a7.5 7.5 0 1 1-2.2-5.3" />
        <path d="M19.5 4.5v4h-4" />
      </>
    ),
    alert: (
      <>
        <path d="M12 3.5 21.5 20h-19Z" />
        <path d="M12 10v4.5M12 17.2v.1" />
      </>
    ),
    mail: (
      <>
        <rect x="3" y="5.5" width="18" height="13" rx="2.5" />
        <path d="m4 7.5 8 6 8-6" />
      </>
    ),
    offline: (
      <>
        <path d="M2.5 9a14 14 0 0 1 5-2.9M21.5 9a14 14 0 0 0-9.3-3.5" />
        <path d="M5.5 12.5a9 9 0 0 1 3.8-2.2M18.5 12.5a9 9 0 0 0-2.6-1.8" />
        <path d="M9 16a4.5 4.5 0 0 1 6 0M12 19.5h.01M3.5 3.5l17 17" />
      </>
    ),
    expand: <path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5" />,
    collapse: <path d="M9 4v5H4M15 4v5h5M9 20v-5H4M15 20v-5h5" />,
    download: <path d="M12 3v13m-5-5 5 5 5-5M4 20h16" />,
    qr: (
      <>
        <rect x="3.5" y="3.5" width="6.5" height="6.5" rx="1" />
        <rect x="14" y="3.5" width="6.5" height="6.5" rx="1" />
        <rect x="3.5" y="14" width="6.5" height="6.5" rx="1" />
        <path d="M14 14h2.5v2.5H14ZM18 18h2.5v2.5H18ZM14 20.5h1M20.5 14v1.5" />
      </>
    ),
    screen: (
      <>
        <rect x="2.5" y="4" width="19" height="13" rx="2" />
        <path d="M8 20.5h8M12 17v3.5" />
      </>
    ),
  };
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...props}
    >
      {paths[name]}
    </svg>
  );
}
