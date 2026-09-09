import PropTypes from 'prop-types';
import Icon from './Icon.jsx';

export default function ToastHost({ toast }) {
  if (!toast) return null;
  const isWarning = toast.kind === 'warning';
  return (
    <div className="toast-host" role="status" aria-live="polite">
      <div className={`toast${isWarning ? ' toast--warning' : ''}`}>
        <Icon name={isWarning ? 'alert' : 'check'} size={14} strokeWidth={2} />
        <span>{toast.message}</span>
      </div>
    </div>
  );
}

ToastHost.propTypes = {
  toast: PropTypes.shape({
    message: PropTypes.string.isRequired,
    kind: PropTypes.oneOf(['success', 'warning']),
  }),
};
