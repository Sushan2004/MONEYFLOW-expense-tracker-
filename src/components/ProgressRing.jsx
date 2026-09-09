import PropTypes from 'prop-types';

export default function ProgressRing({ value, max = 100, size = 110, stroke = 9, label, sublabel }) {
  const ratio = max > 0 ? Math.max(0, Math.min(1, value / max)) : 0;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference * (1 - ratio);

  let color = 'var(--emerald)';
  if (max > 0 && value / max > 1) color = 'var(--danger)';
  else if (max > 0 && value / max >= 0.8) color = 'var(--warning)';

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden="true">
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        stroke="var(--mint-wash)"
        strokeWidth={stroke}
        fill="none"
      />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        stroke={color}
        strokeWidth={stroke}
        fill="none"
        strokeLinecap="round"
        strokeDasharray={circumference}
        strokeDashoffset={offset}
        transform={`rotate(-90 ${size / 2} ${size / 2})`}
        style={{ transition: 'stroke-dashoffset 320ms ease' }}
      />
      {label && (
        <text
          x={size / 2}
          y={size / 2 - 2}
          textAnchor="middle"
          fontSize={size * 0.18}
          fontWeight="500"
          fill="var(--ink)"
          style={{ letterSpacing: '-0.02em' }}
        >
          {label}
        </text>
      )}
      {sublabel && (
        <text
          x={size / 2}
          y={size / 2 + size * 0.16}
          textAnchor="middle"
          fontSize={size * 0.1}
          fill="var(--text-3)"
        >
          {sublabel}
        </text>
      )}
    </svg>
  );
}

ProgressRing.propTypes = {
  value: PropTypes.number.isRequired,
  max: PropTypes.number,
  size: PropTypes.number,
  stroke: PropTypes.number,
  label: PropTypes.string,
  sublabel: PropTypes.string,
};
