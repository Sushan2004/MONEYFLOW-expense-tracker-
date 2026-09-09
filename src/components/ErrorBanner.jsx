import PropTypes from 'prop-types';
import Icon from './Icon.jsx';

export default function ErrorBanner({ message, onRetry }) {
  return (
    <div className="error-banner" role="alert">
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
        <Icon name="alert" size={14} strokeWidth={1.8} />
        {message}
      </span>
      {onRetry && (
        <button type="button" className="btn btn--secondary" onClick={onRetry}>
          <Icon name="refresh" size={14} strokeWidth={1.8} />
          Retry
        </button>
      )}
    </div>
  );
}

ErrorBanner.propTypes = {
  message: PropTypes.string.isRequired,
  onRetry: PropTypes.func,
};
