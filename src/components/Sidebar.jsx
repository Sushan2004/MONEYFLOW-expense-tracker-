import { NavLink } from 'react-router-dom';
import PropTypes from 'prop-types';
import Icon from './Icon.jsx';

const NAV = [
  { to: '/dashboard', label: 'Dashboard', icon: 'home', end: true },
  { to: '/transactions', label: 'Transactions', icon: 'list' },
  { to: '/budget', label: 'Budget', icon: 'clock' },
  { to: '/reports', label: 'Reports', icon: 'bars' },
  { to: '/categories', label: 'Categories', icon: 'grid' },
  { to: '/wallet', label: 'Accounts', icon: 'wallet' },
  { to: '/goals', label: 'Income & Savings', icon: 'star' },
];

export default function Sidebar({ user }) {
  return (
    <aside className="sidebar" aria-label="Primary">
      <div className="sidebar__brand">
        <span className="sidebar__brand-mark" aria-hidden="true">
          <svg width="14" height="14" viewBox="0 0 18 18" fill="none">
            <path d="M4 9.5 L7.5 13 L14.5 5.5" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </span>
        <span className="sidebar__brand-name">Expense Tracker</span>
      </div>
      <nav className="sidebar__nav">
        {NAV.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            className={({ isActive }) => `sidebar__link${isActive ? ' is-active' : ''}`}
            aria-label={item.label}
          >
            <Icon name={item.icon} size={16} />
            <span>{item.label}</span>
          </NavLink>
        ))}
      </nav>
      <div className="sidebar__divider" aria-hidden="true" />
      <NavLink to="/settings" className="sidebar__profile" aria-label="Settings">
        <span className="sidebar__avatar">{user?.initial || 'Y'}</span>
        <span className="sidebar__profile-meta">
          <span className="sidebar__profile-name">{user?.name || 'You'}</span>
          <span className="sidebar__profile-role">Settings</span>
        </span>
      </NavLink>
    </aside>
  );
}

Sidebar.propTypes = {
  user: PropTypes.shape({ name: PropTypes.string, initial: PropTypes.string }),
};
