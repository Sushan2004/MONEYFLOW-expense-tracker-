import PropTypes from 'prop-types';

export default function Skeleton({ height = 16, width = '100%', radius = 8, style }) {
  return (
    <div
      className="skeleton"
      style={{ height, width, borderRadius: radius, ...style }}
      aria-hidden="true"
    />
  );
}

Skeleton.propTypes = {
  height: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
  width: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
  radius: PropTypes.number,
  style: PropTypes.object,
};
