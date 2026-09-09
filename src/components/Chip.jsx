import PropTypes from 'prop-types';

export default function Chip({
  selected = false,
  secondary = false,
  as: Tag = 'button',
  className = '',
  children,
  ...rest
}) {
  let cls = 'chip';
  if (selected && secondary) cls += ' is-secondary-selected';
  else if (selected) cls += ' is-selected';
  if (className) cls += ` ${className}`;
  return (
    <Tag className={cls} {...(Tag === 'button' ? { type: 'button' } : {})} {...rest}>
      {children}
    </Tag>
  );
}

Chip.propTypes = {
  selected: PropTypes.bool,
  secondary: PropTypes.bool,
  as: PropTypes.elementType,
  className: PropTypes.string,
  children: PropTypes.node,
};
