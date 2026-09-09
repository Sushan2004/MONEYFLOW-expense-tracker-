import PropTypes from 'prop-types';

export default function StatCard({ label, value, delta, deltaTone = 'up' }) {
  return (
    <div className="stat">
      <div className="stat__label t-eyebrow">{label}</div>
      <div className="stat__value tnum">{value}</div>
      {delta && <div className={`stat__delta stat__delta--${deltaTone}`}>{delta}</div>}
    </div>
  );
}

StatCard.propTypes = {
  label: PropTypes.string.isRequired,
  value: PropTypes.string.isRequired,
  delta: PropTypes.string,
  deltaTone: PropTypes.oneOf(['up', 'warn']),
};
