import PropTypes from 'prop-types';

export default function ProgressBar({ value, max = 100, warningAt = 0.8 }) {
  const ratio = max > 0 ? value / max : 0;
  const pct = Math.max(0, Math.min(1, ratio)) * 100;
  let mod = '';
  if (ratio > 1) mod = ' pbar__fill--danger';
  else if (ratio >= warningAt) mod = ' pbar__fill--warn';

  return (
    <div className="pbar" role="progressbar" aria-valuemin={0} aria-valuemax={max} aria-valuenow={value}>
      <div className={`pbar__fill${mod}`} style={{ width: `${pct}%` }} />
    </div>
  );
}

ProgressBar.propTypes = {
  value: PropTypes.number.isRequired,
  max: PropTypes.number,
  warningAt: PropTypes.number,
};
