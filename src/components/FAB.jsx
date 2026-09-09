import PropTypes from 'prop-types';
import Icon from './Icon.jsx';

export default function FAB({ onClick, label = 'Add entry' }) {
  return (
    <button type="button" className="fab" onClick={onClick} aria-label={label}>
      <Icon name="plus" size={22} strokeWidth={2} />
    </button>
  );
}

FAB.propTypes = {
  onClick: PropTypes.func,
  label: PropTypes.string,
};
