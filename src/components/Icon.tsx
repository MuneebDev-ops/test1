import type { ReactNode, SVGProps } from 'react'

export type IconName =
  | 'shield'
  | 'overview'
  | 'transactions'
  | 'alert'
  | 'cases'
  | 'rules'
  | 'simulator'
  | 'pipeline'
  | 'model'
  | 'chevron'
  | 'search'
  | 'trend'
  | 'bell'
  | 'file'
  | 'logout'
  | 'eye'
  | 'plus'
  | 'refresh'
  | 'play'
  | 'stop'
  | 'pulse'
  | 'spark'
  | 'warning'
  | 'close'
  | 'user'
  | 'sliders'

const paths: Record<IconName, ReactNode> = {
  shield: (
    <path d="M12 3.2 19 6v5.2c0 4.2-2.8 7.3-7 8.8-4.2-1.5-7-4.6-7-8.8V6l7-2.8Z" />
  ),
  overview: (
    <>
      <rect x="4" y="4" width="6.5" height="6.5" rx="1.4" />
      <rect x="13.5" y="4" width="6.5" height="6.5" rx="1.4" />
      <rect x="4" y="13.5" width="6.5" height="6.5" rx="1.4" />
      <rect x="13.5" y="13.5" width="6.5" height="6.5" rx="1.4" />
    </>
  ),
  transactions: (
    <>
      <path d="M7 3.5h7.2L19 8.2V20a1.5 1.5 0 0 1-1.5 1.5h-10A1.5 1.5 0 0 1 6 20V5a1.5 1.5 0 0 1 1-1.5Z" />
      <path d="M14 3.8V8h4.2M8.5 12h7M8.5 15.5h7" />
    </>
  ),
  alert: (
    <>
      <path d="M12 4.2 20 18.5H4L12 4.2Z" />
      <path d="M12 10v4.2" />
      <path d="M12 16.8h.01" />
    </>
  ),
  cases: (
    <>
      <rect x="5" y="3.5" width="14" height="17" rx="2" />
      <path d="M8.5 8.5h7M8.5 12h7M8.5 15.5h4.5" />
    </>
  ),
  rules: (
    <>
      <path d="M4 8h16M4 16h16" />
      <circle cx="9" cy="8" r="2.2" fill="currentColor" stroke="none" />
      <circle cx="15" cy="16" r="2.2" fill="currentColor" stroke="none" />
    </>
  ),
  simulator: <path d="M3 12h3l2.2-5 3.2 10 2.4-6 1.6 3H21" />,
  pipeline: (
    <>
      <circle cx="6" cy="12" r="2.2" />
      <circle cx="12" cy="7" r="2.2" />
      <circle cx="12" cy="17" r="2.2" />
      <circle cx="18" cy="12" r="2.2" />
      <path d="M8 11.2 10.2 8.4M8 12.8 10.2 15.6M14 8.2 16.2 10.8M14 15.8 16.2 13.2" />
    </>
  ),
  model: (
    <>
      <circle cx="12" cy="12" r="3" />
      <path d="M12 3.5v2.2M12 18.3v2.2M3.5 12h2.2M18.3 12h2.2M6 6l1.6 1.6M16.4 16.4 18 18M18 6l-1.6 1.6M7.6 16.4 6 18" />
    </>
  ),
  chevron: <path d="m9 6 6 6-6 6" />,
  search: (
    <>
      <circle cx="11" cy="11" r="6" />
      <path d="m16 16 4 4" />
    </>
  ),
  trend: <path d="M4 16.5 9.2 11l3 3L20 6.5M14.5 6.5H20V12" />,
  bell: (
    <>
      <path d="M6.5 16.5h11l-1.2-2.1V10a4.3 4.3 0 0 0-8.6 0v4.4L6.5 16.5Z" />
      <path d="M10 16.5a2 2 0 0 0 4 0" />
    </>
  ),
  file: (
    <>
      <path d="M7 3.5h6.2L18 8.2V20a1.2 1.2 0 0 1-1.2 1.2H7.2A1.2 1.2 0 0 1 6 20V4.7A1.2 1.2 0 0 1 7.2 3.5H7Z" />
      <path d="M13 3.8V8h4" />
    </>
  ),
  logout: (
    <>
      <path d="M10 7V5.5A1.5 1.5 0 0 1 11.5 4h7A1.5 1.5 0 0 1 20 5.5v13a1.5 1.5 0 0 1-1.5 1.5h-7A1.5 1.5 0 0 1 10 18.5V17" />
      <path d="M4 12h10M11 8.5 14.5 12 11 15.5" />
    </>
  ),
  eye: (
    <>
      <path d="M2.8 12S6.2 6.8 12 6.8 21.2 12 21.2 12 17.8 17.2 12 17.2 2.8 12 2.8 12Z" />
      <circle cx="12" cy="12" r="2.4" />
    </>
  ),
  plus: <path d="M12 6v12M6 12h12" />,
  refresh: (
    <>
      <path d="M20 12a8 8 0 1 1-2.2-5.5" />
      <path d="M20 4.5V9h-4.5" />
    </>
  ),
  play: <path d="M8 6.5v11l9-5.5-9-5.5Z" fill="currentColor" stroke="none" />,
  stop: <rect x="7" y="7" width="10" height="10" rx="1.5" fill="currentColor" stroke="none" />,
  pulse: (
    <>
      <circle cx="12" cy="12" r="8" />
      <path d="M5 12h3l1.6-3 2.6 6 1.8-3H19" />
    </>
  ),
  spark: (
    <path d="M12 3.5 13.4 9 19 10.5 13.4 12 12 17.5 10.6 12 5 10.5 10.6 9 12 3.5Z" />
  ),
  warning: (
    <>
      <path d="M12 4.2 20.2 19H3.8L12 4.2Z" />
      <path d="M12 10v4" />
      <path d="M12 16.6h.01" />
    </>
  ),
  close: <path d="M7 7l10 10M17 7 7 17" />,
  user: (
    <>
      <circle cx="12" cy="8" r="3" />
      <path d="M5.5 19.2a6.5 6.5 0 0 1 13 0" />
    </>
  ),
  sliders: (
    <>
      <path d="M4 7h16M4 12h16M4 17h16" />
      <circle cx="8" cy="7" r="2" fill="white" />
      <circle cx="15" cy="12" r="2" fill="white" />
      <circle cx="10" cy="17" r="2" fill="white" />
    </>
  ),
}

export function Icon({ name, ...props }: { name: IconName } & SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 24 24"
      width="18"
      height="18"
      aria-hidden="true"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      {paths[name]}
    </svg>
  )
}
