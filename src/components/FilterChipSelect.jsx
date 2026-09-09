import PropTypes from 'prop-types';
import { useEffect, useId, useMemo, useRef, useState } from 'react';
import Icon from './Icon.jsx';

function chipClassName({ selected, secondary, className = '' }) {
  let cls = 'chip filter-chip';
  if (selected && secondary) cls += ' is-secondary-selected';
  else if (selected) cls += ' is-selected';
  if (className) cls += ` ${className}`;
  return cls;
}

export default function FilterChipSelect({
  value,
  options,
  onChange,
  ariaLabel,
  icon,
  iconStrokeWidth = 1.7,
  selected = false,
  secondary = false,
  prefix = '',
  className = '',
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef(null);
  const listboxId = useId();

  const activeOption = useMemo(
    () => options.find((option) => option.value === value) || options[0],
    [options, value]
  );

  useEffect(() => {
    if (!open) return undefined;

    function handlePointerDown(event) {
      if (!rootRef.current?.contains(event.target)) {
        setOpen(false);
      }
    }

    function handleKeyDown(event) {
      if (event.key === 'Escape') {
        setOpen(false);
      }
    }

    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [open]);

  return (
    <div
      ref={rootRef}
      className={chipClassName({ selected, secondary, className })}
    >
      <button
        type="button"
        className="filter-chip__trigger"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={open ? listboxId : undefined}
        aria-label={ariaLabel}
        onClick={() => setOpen((current) => !current)}
      >
        {icon && <Icon name={icon} size={12} strokeWidth={iconStrokeWidth} />}
        <span className="filter-chip__label">
          {prefix ? `${prefix}: ${activeOption?.label || ''}` : activeOption?.label || ''}
        </span>
        <Icon
          name="arrowDown"
          size={12}
          strokeWidth={1.7}
          className={`filter-chip__chevron${open ? ' is-open' : ''}`}
        />
      </button>

      {open && (
        <div id={listboxId} className="filter-chip__menu" role="listbox" aria-label={ariaLabel}>
          {options.map((option) => {
            const isActive = option.value === value;
            return (
              <button
                key={option.value}
                type="button"
                role="option"
                aria-selected={isActive}
                className={`filter-chip__option${isActive ? ' is-active' : ''}`}
                onClick={() => {
                  onChange(option.value);
                  setOpen(false);
                }}
              >
                {option.label}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

FilterChipSelect.propTypes = {
  value: PropTypes.string.isRequired,
  options: PropTypes.arrayOf(
    PropTypes.shape({
      value: PropTypes.string.isRequired,
      label: PropTypes.string.isRequired,
    })
  ).isRequired,
  onChange: PropTypes.func.isRequired,
  ariaLabel: PropTypes.string.isRequired,
  icon: PropTypes.string,
  iconStrokeWidth: PropTypes.number,
  selected: PropTypes.bool,
  secondary: PropTypes.bool,
  prefix: PropTypes.string,
  className: PropTypes.string,
};
