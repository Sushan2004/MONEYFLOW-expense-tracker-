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
    colorVar: '#96B2FF',
    builtin: true,
  },
  {
    id: 'cat-transport',
    name: 'Transport',
    icon: 'car',
    colorVar: '#71C9DB',
    builtin: true,
  },
  {
    id: 'cat-shopping',
    name: 'Shopping',
    icon: 'bag',
    colorVar: '#E1AD76',
    builtin: true,
  },
  {
    id: 'cat-home',
    name: 'Home',
    icon: 'home',
    colorVar: '#BBA9EC',
    builtin: true,
  },
  {
    id: 'cat-subs',
    name: 'Subscriptions',
    icon: 'repeat',
    colorVar: '#E167DF',
    builtin: true,
  },
  {
    id: 'cat-fun',
    name: 'Entertainment',
    icon: 'film',
    colorVar: '#E898B0',
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
    colorVar: '#96B2FF',
    builtin: true,
  },
];
