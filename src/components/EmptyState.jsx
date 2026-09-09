import PropTypes from 'prop-types';

export default function EmptyState({ title, copy, action, illustration }) {
  return (
    <div className="empty">
      {illustration || (
        <svg width="92" height="64" viewBox="0 0 92 64" aria-hidden="true">
          <rect x="6" y="14" width="80" height="44" rx="10" fill="var(--mint-wash)" />
          <rect x="18" y="26" width="40" height="6" rx="3" fill="var(--mint)" />
          <rect x="18" y="38" width="56" height="6" rx="3" fill="var(--sage)" />
          <circle cx="74" cy="14" r="10" fill="var(--mint)" />
          <path d="M70 14h8M74 10v8" stroke="var(--forest)" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
      )}
      <div>
        <div className="empty__title">{title}</div>
        {copy && <div className="empty__copy">{copy}</div>}
      </div>
      {action}
    </div>
  );
}

EmptyState.propTypes = {
  title: PropTypes.string.isRequired,
  copy: PropTypes.string,
  action: PropTypes.node,
  illustration: PropTypes.node,
};
