import PropTypes from 'prop-types';

const PATHS = {
  home: <path d="M3 9l7-6 7 6v9a1 1 0 0 1-1 1h-4v-6H8v6H4a1 1 0 0 1-1-1V9z" />,
  list: <path d="M3 5h14M5 10h10M7 15h6" />,
  clock: (
    <>
      <circle cx="10" cy="10" r="6.5" />
      <path d="M10 6v4l2.5 1.5" />
    </>
  ),
  bars: <path d="M3 16V9m4 7V5m4 11v-4m4 4V7" />,
  grid: (
    <>
      <rect x="3" y="3" width="6" height="6" rx="1.5" />
      <rect x="11" y="3" width="6" height="6" rx="1.5" />
      <rect x="3" y="11" width="6" height="6" rx="1.5" />
      <rect x="11" y="11" width="6" height="6" rx="1.5" />
    </>
  ),
  wallet: (
    <>
      <rect x="2.5" y="5" width="15" height="11" rx="2.5" />
      <path d="M2.5 9h15" />
    </>
  ),
  star: <path d="M10 2.5l2.4 4.9 5.4.8-3.9 3.8.9 5.4L10 14.9l-4.8 2.5.9-5.4L2.2 8.2l5.4-.8L10 2.5z" />,
  settings: (
    <>
      <circle cx="10" cy="10" r="2.5" />
      <path d="M10 2v2M10 16v2M2 10h2M16 10h2M4.4 4.4l1.4 1.4M14.2 14.2l1.4 1.4M4.4 15.6l1.4-1.4M14.2 5.8l1.4-1.4" />
    </>
  ),
  info: (
    <>
      <circle cx="10" cy="10" r="7" />
      <path d="M10 9.5v4.2M10 6.5v.1" />
    </>
  ),
  search: (
    <>
      <circle cx="9" cy="9" r="5.5" />
      <path d="M13 13l3.5 3.5" />
    </>
  ),
  plus: <path d="M10 4v12M4 10h12" />,
  minus: <path d="M4 10h12" />,
  expand: (
    <>
      <path d="M8 4H4v4" />
      <path d="M12 4h4v4" />
      <path d="M16 12v4h-4" />
      <path d="M4 12v4h4" />
      <path d="M4 8l5-5" />
      <path d="M16 8l-5-5" />
      <path d="M16 12l-5 5" />
      <path d="M4 12l5 5" />
    </>
  ),
  arrowLeft: <path d="M12 5l-5 5 5 5M7 10h9" />,
  arrowDown: <path d="M10 4v11m-4-4l4 4 4-4" />,
  arrowUp: <path d="M10 16V5m-4 4l4-4 4 4" />,
  more: (
    <>
      <circle cx="5" cy="10" r="1.2" />
      <circle cx="10" cy="10" r="1.2" />
      <circle cx="15" cy="10" r="1.2" />
    </>
  ),
  edit: <path d="M3 17v-3l9.5-9.5 3 3L6 17H3zM12 4.5l3 3" />,
  trash: (
    <>
      <path d="M3 6h14M8 6V4h4v2M5 6l1 11h8l1-11" />
    </>
  ),
  download: <path d="M10 3v9m-4-4l4 4 4-4M3 16h14" />,
  check: <path d="M4 10.5l3.5 3.5L16 5.5" />,
  x: <path d="M5 5l10 10M15 5L5 15" />,
  refresh: <path d="M3 10a7 7 0 0112-4.9L17 7M17 10a7 7 0 01-12 4.9L3 13M17 4v3h-3M3 16v-3h3" />,
  calendar: (
    <>
      <rect x="3" y="4.5" width="14" height="13" rx="2" />
      <path d="M3 8h14M7 3v3M13 3v3" />
    </>
  ),
  filter: <path d="M3 5h14l-5 7v4l-4 1v-5L3 5z" />,
  sort: <path d="M5 5h12M6 10h10M8 15h6" />,
  card: (
    <>
      <rect x="2.5" y="5" width="15" height="11" rx="2" />
      <path d="M2.5 9h15M5 13h3" />
    </>
  ),
  bag: (
    <>
      <path d="M5 7h10l-1 11H6L5 7z" />
      <path d="M8 7V5a2 2 0 014 0v2" />
    </>
  ),
  coffee: (
    <>
      <path d="M3 6h10v5a3 3 0 01-3 3H6a3 3 0 01-3-3V6z" />
      <path d="M13 8h2a2 2 0 010 4h-2" />
    </>
  ),
  car: (
    <>
      <path d="M3 11l1.5-4h11L17 11v4H3v-4z" />
      <circle cx="6" cy="14.5" r="1.2" />
      <circle cx="14" cy="14.5" r="1.2" />
    </>
  ),
  heart: <path d="M10 17s-6-3.7-6-9a3.5 3.5 0 016.5-2.2A3.5 3.5 0 0116 8c0 5.3-6 9-6 9z" />,
  film: (
    <>
      <rect x="3" y="4" width="14" height="12" rx="1.5" />
      <path d="M3 8h14M3 12h14M7 4v12M13 4v12" />
    </>
  ),
  repeat: <path d="M5 9a4 4 0 016-3.5L13 6 M15 11a4 4 0 01-6 3.5L7 14M13 4v3h-3M7 16v-3h3" />,
  sparkle: <path d="M10 3v3M10 14v3M3 10h3M14 10h3M5.5 5.5l2 2M12.5 12.5l2 2M5.5 14.5l2-2M12.5 7.5l2-2" />,
  alert: (
    <>
      <path d="M10 3l8 14H2L10 3z" />
      <path d="M10 8v4M10 14.5v.1" />
    </>
  ),
};

export default function Icon({ name, size = 16, stroke = 'currentColor', strokeWidth = 1.5, ...rest }) {
  const path = PATHS[name];
  if (!path) return null;
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 20 20"
      fill="none"
      stroke={stroke}
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...rest}
    >
      {path}
    </svg>
  );
}

Icon.propTypes = {
  name: PropTypes.string.isRequired,
  size: PropTypes.number,
  stroke: PropTypes.string,
  strokeWidth: PropTypes.number,
};
