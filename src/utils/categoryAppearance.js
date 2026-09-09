import {
  FiActivity,
  FiAirplay,
  FiAnchor,
  FiAward,
  FiBell,
  FiBook,
  FiBookOpen,
  FiBookmark,
  FiBriefcase,
  FiCamera,
  FiCloud,
  FiCoffee,
  FiCompass,
  FiCpu,
  FiCreditCard,
  FiDollarSign,
  FiDroplet,
  FiFeather,
  FiFileText,
  FiFilm,
  FiFlag,
  FiGift,
  FiGlobe,
  FiGrid,
  FiHash,
  FiHeadphones,
  FiHeart,
  FiHome,
  FiImage,
  FiKey,
  FiLayers,
  FiMapPin,
  FiMonitor,
  FiMoon,
  FiMusic,
  FiPackage,
  FiPaperclip,
  FiPenTool,
  FiPhone,
  FiPieChart,
  FiRepeat,
  FiScissors,
  FiShield,
  FiShoppingBag,
  FiShoppingCart,
  FiSmartphone,
  FiStar,
  FiSun,
  FiTag,
  FiTarget,
  FiTool,
  FiTrendingUp,
  FiTruck,
  FiUmbrella,
  FiUser,
  FiUsers,
  FiVideo,
  FiWatch,
  FiWifi,
  FiZap,
} from 'react-icons/fi';

export const DEFAULT_CATEGORY_ICON = 'sparkle';
export const DEFAULT_CATEGORY_COLOR = '#10B981';
const HEX_COLOR_PATTERN = /^#(?:[0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})$/;

const LEGACY_CATEGORY_COLORS = {
  '--cat-1': '#D1E7DB',
  '--cat-2': '#A7F3D0',
  '--cat-3': '#6EE7B7',
  '--cat-4': '#34D399',
  '--cat-5': '#10B981',
  '--cat-6': '#059669',
  '--cat-7': '#0B3D2E',
};

export const CATEGORY_ICON_COMPONENTS = {
  home: FiHome,
  coffee: FiCoffee,
  bag: FiShoppingBag,
  cart: FiShoppingCart,
  car: FiTruck,
  heart: FiHeart,
  film: FiFilm,
  receipt: FiFileText,
  repeat: FiRepeat,
  book: FiBookOpen,
  plane: FiMapPin,
  sparkle: FiGrid,
  // extended
  music: FiMusic,
  headphones: FiHeadphones,
  camera: FiCamera,
  image: FiImage,
  video: FiVideo,
  smartphone: FiSmartphone,
  phone: FiPhone,
  monitor: FiMonitor,
  cpu: FiCpu,
  wifi: FiWifi,
  airplay: FiAirplay,
  globe: FiGlobe,
  briefcase: FiBriefcase,
  compass: FiCompass,
  anchor: FiAnchor,
  map: FiMapPin,
  gift: FiGift,
  award: FiAward,
  star: FiStar,
  flag: FiFlag,
  bookmark: FiBookmark,
  bell: FiBell,
  hash: FiHash,
  tag: FiTag,
  layers: FiLayers,
  target: FiTarget,
  user: FiUser,
  users: FiUsers,
  shield: FiShield,
  key: FiKey,
  tool: FiTool,
  package: FiPackage,
  paperclip: FiPaperclip,
  penTool: FiPenTool,
  scissors: FiScissors,
  watch: FiWatch,
  feather: FiFeather,
  cloud: FiCloud,
  droplet: FiDroplet,
  sun: FiSun,
  moon: FiMoon,
  zap: FiZap,
  activity: FiActivity,
  pieChart: FiPieChart,
  trendingUp: FiTrendingUp,
  dollar: FiDollarSign,
  card: FiCreditCard,
  umbrella: FiUmbrella,
  bookSolid: FiBook,
};

export const CATEGORY_ICON_OPTIONS = [
  { value: 'home', label: 'Home' },
  { value: 'coffee', label: 'Food' },
  { value: 'bag', label: 'Shopping' },
  { value: 'car', label: 'Transport' },
  { value: 'heart', label: 'Health' },
  { value: 'film', label: 'Entertainment' },
  { value: 'receipt', label: 'Bills' },
  { value: 'repeat', label: 'Subscriptions' },
  { value: 'book', label: 'Education' },
  { value: 'plane', label: 'Travel' },
  { value: 'sparkle', label: 'Other' },
];

export const EXTENDED_CATEGORY_ICON_OPTIONS = [
  ...CATEGORY_ICON_OPTIONS,
  { value: 'cart', label: 'Groceries', keywords: 'grocery store market' },
  { value: 'gift', label: 'Gifts', keywords: 'present birthday' },
  { value: 'music', label: 'Music', keywords: 'song audio' },
  { value: 'headphones', label: 'Audio', keywords: 'podcast headphones' },
  { value: 'camera', label: 'Photo', keywords: 'photography' },
  { value: 'image', label: 'Photos', keywords: 'image gallery' },
  { value: 'video', label: 'Video', keywords: 'streaming film' },
  { value: 'smartphone', label: 'Phone', keywords: 'mobile cell' },
  { value: 'phone', label: 'Calls', keywords: 'telephone' },
  { value: 'monitor', label: 'Tech', keywords: 'computer screen' },
  { value: 'cpu', label: 'Hardware', keywords: 'tech device' },
  { value: 'wifi', label: 'Internet', keywords: 'wifi network' },
  { value: 'airplay', label: 'Streaming', keywords: 'cast tv' },
  { value: 'globe', label: 'Web', keywords: 'world internet' },
  { value: 'briefcase', label: 'Work', keywords: 'job office business' },
  { value: 'compass', label: 'Adventure', keywords: 'explore travel' },
  { value: 'anchor', label: 'Boating', keywords: 'sea ocean' },
  { value: 'map', label: 'Trips', keywords: 'location map' },
  { value: 'award', label: 'Awards', keywords: 'achievement' },
  { value: 'star', label: 'Favorites', keywords: 'rating star' },
  { value: 'flag', label: 'Goals', keywords: 'milestone' },
  { value: 'bookmark', label: 'Saved', keywords: 'bookmark mark' },
  { value: 'bell', label: 'Reminders', keywords: 'notification alert' },
  { value: 'hash', label: 'Tags', keywords: 'hash label' },
  { value: 'tag', label: 'Label', keywords: 'price tag' },
  { value: 'layers', label: 'Stacks', keywords: 'group' },
  { value: 'target', label: 'Targets', keywords: 'goal aim' },
  { value: 'user', label: 'Personal', keywords: 'self person' },
  { value: 'users', label: 'Family', keywords: 'group people' },
  { value: 'shield', label: 'Insurance', keywords: 'security protection' },
  { value: 'key', label: 'Rent', keywords: 'house lock keys' },
  { value: 'tool', label: 'Repairs', keywords: 'tool fix maintenance' },
  { value: 'package', label: 'Packages', keywords: 'shipping delivery' },
  { value: 'paperclip', label: 'Documents', keywords: 'file attachment' },
  { value: 'penTool', label: 'Design', keywords: 'creative pen' },
  { value: 'scissors', label: 'Beauty', keywords: 'salon haircut' },
  { value: 'watch', label: 'Wearables', keywords: 'time watch' },
  { value: 'feather', label: 'Light', keywords: 'gentle small' },
  { value: 'cloud', label: 'Cloud', keywords: 'cloud weather services' },
  { value: 'droplet', label: 'Water', keywords: 'utilities water' },
  { value: 'sun', label: 'Energy', keywords: 'sun bright power' },
  { value: 'moon', label: 'Sleep', keywords: 'night moon' },
  { value: 'zap', label: 'Electric', keywords: 'power utilities' },
  { value: 'activity', label: 'Fitness', keywords: 'sport gym workout' },
  { value: 'pieChart', label: 'Investing', keywords: 'pie chart finance' },
  { value: 'trendingUp', label: 'Income', keywords: 'growth trend money' },
  { value: 'dollar', label: 'Cash', keywords: 'dollar money' },
  { value: 'card', label: 'Card', keywords: 'credit card payment' },
  { value: 'umbrella', label: 'Weather', keywords: 'rain umbrella' },
];

export function normalizeCategoryIcon(value) {
  return CATEGORY_ICON_COMPONENTS[value] ? value : DEFAULT_CATEGORY_ICON;
}

function expandHexColor(value) {
  const normalized = value.trim();
  if (!HEX_COLOR_PATTERN.test(normalized)) return null;
  if (normalized.length === 7) return normalized.toUpperCase();

  const [hash, r, g, b] = normalized;
  return `${hash}${r}${r}${g}${g}${b}${b}`.toUpperCase();
}

export function normalizeCategoryColor(value) {
  if (!value) return DEFAULT_CATEGORY_COLOR;

  const legacyColor = LEGACY_CATEGORY_COLORS[value];
  if (legacyColor) return legacyColor;

  return expandHexColor(String(value)) || DEFAULT_CATEGORY_COLOR;
}

export function resolveCategoryColor(value) {
  return normalizeCategoryColor(value);
}

export function hexToRgb(hex) {
  if (typeof hex !== 'string') return null;

  const normalized = hex.trim().replace('#', '');
  if (![3, 6].includes(normalized.length)) return null;

  const full = normalized.length === 3
    ? normalized.split('').map((part) => `${part}${part}`).join('')
    : normalized;

  const value = Number.parseInt(full, 16);
  if (Number.isNaN(value)) return null;

  return {
    r: (value >> 16) & 255,
    g: (value >> 8) & 255,
    b: value & 255,
  };
}

export function rgbToHex({ r, g, b }) {
  const clamp = (n) => Math.max(0, Math.min(255, Math.round(n)));
  const toHex = (n) => clamp(n).toString(16).padStart(2, '0');
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`.toUpperCase();
}

export function rgbToHsv({ r, g, b }) {
  const rn = r / 255;
  const gn = g / 255;
  const bn = b / 255;
  const max = Math.max(rn, gn, bn);
  const min = Math.min(rn, gn, bn);
  const delta = max - min;

  let h = 0;
  if (delta !== 0) {
    if (max === rn) h = ((gn - bn) / delta) % 6;
    else if (max === gn) h = (bn - rn) / delta + 2;
    else h = (rn - gn) / delta + 4;
    h *= 60;
    if (h < 0) h += 360;
  }
  const s = max === 0 ? 0 : delta / max;
  const v = max;
  return { h, s, v };
}

export function hsvToRgb({ h, s, v }) {
  const c = v * s;
  const hh = (h % 360) / 60;
  const x = c * (1 - Math.abs((hh % 2) - 1));
  let r1 = 0; let g1 = 0; let b1 = 0;
  if (hh >= 0 && hh < 1) { r1 = c; g1 = x; }
  else if (hh < 2) { r1 = x; g1 = c; }
  else if (hh < 3) { g1 = c; b1 = x; }
  else if (hh < 4) { g1 = x; b1 = c; }
  else if (hh < 5) { r1 = x; b1 = c; }
  else { r1 = c; b1 = x; }
  const m = v - c;
  return {
    r: Math.round((r1 + m) * 255),
    g: Math.round((g1 + m) * 255),
    b: Math.round((b1 + m) * 255),
  };
}

export function colorWithAlpha(value, alpha = 0.16) {
  const color = resolveCategoryColor(value);
  const rgb = hexToRgb(color);

  if (!rgb) return color;
  return `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${alpha})`;
}

export function getCategoryAccentStyle(value, alpha = 0.14) {
  const color = resolveCategoryColor(value);

  return {
    color,
    backgroundColor: colorWithAlpha(color, alpha),
  };
}
