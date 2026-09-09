import {
  DEFAULT_CATEGORY_COLOR,
  DEFAULT_CATEGORY_ICON,
} from '../utils/categoryAppearance.js';

export { DEFAULT_CATEGORY_COLOR, DEFAULT_CATEGORY_ICON } from '../utils/categoryAppearance.js';

export const DEFAULT_CATEGORIES = [
  {
    id: 'cat-food',
    name: 'Food',
    icon: 'coffee',
    colorVar: '#10B981',
    builtin: true,
  },
  {
    id: 'cat-transport',
    name: 'Transport',
    icon: 'car',
    colorVar: '#0EA5E9',
    builtin: true,
  },
  {
    id: 'cat-shopping',
    name: 'Shopping',
    icon: 'bag',
    colorVar: '#F59E0B',
    builtin: true,
  },
  {
    id: 'cat-home',
    name: 'Home',
    icon: 'home',
    colorVar: '#6366F1',
    builtin: true,
  },
  {
    id: 'cat-subs',
    name: 'Subscriptions',
    icon: 'repeat',
    colorVar: '#14B8A6',
    builtin: true,
  },
  {
    id: 'cat-fun',
    name: 'Entertainment',
    icon: 'film',
    colorVar: '#EC4899',
    builtin: true,
  },
  {
    id: 'cat-health',
    name: 'Health',
    icon: 'heart',
    colorVar: '#EF4444',
    builtin: true,
  },
  {
    id: 'cat-other',
    name: 'Other',
    icon: DEFAULT_CATEGORY_ICON,
    colorVar: DEFAULT_CATEGORY_COLOR,
    builtin: true,
  },
  {
    id: 'cat-income',
    name: 'Income',
    icon: 'trendingUp',
    colorVar: '#10B981',
    builtin: true,
  },
];
