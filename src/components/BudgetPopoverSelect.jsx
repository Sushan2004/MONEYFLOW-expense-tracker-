import PropTypes from 'prop-types';
import { useEffect, useMemo, useRef, useState } from 'react';
import Icon from './Icon.jsx';

export default function BudgetPopoverSelect({
  value,
  options,
  onChange,
  placeholder,
  ariaLabel,
  disabled = false,
  keyboardSearch = false,
  emptyLabel = 'No options found.',
}) {
  const [open, setOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const rootRef = useRef(null);
  const clearSearchTimeoutRef = useRef(null);

  const selectedOption = useMemo(
    () => options.find((option) => option.value === value) || null,
    [options, value]
  );

  const filteredOptions = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();
    if (!keyboardSearch || !query) return options;

    return options.filter((option) => {
      const haystack = [option.value, option.label, option.meta]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();

      return haystack.includes(query);
    });
  }, [keyboardSearch, options, searchTerm]);

  function clearPendingSearchReset() {
    if (!clearSearchTimeoutRef.current) return;
    window.clearTimeout(clearSearchTimeoutRef.current);
    clearSearchTimeoutRef.current = null;
  }

  function scheduleSearchReset() {
    clearPendingSearchReset();
    clearSearchTimeoutRef.current = window.setTimeout(() => {
      setSearchTerm('');
      clearSearchTimeoutRef.current = null;
    }, 900);
  }

  useEffect(() => {
    if (!open) return undefined;

    function handlePointerDown(event) {
      if (!rootRef.current?.contains(event.target)) {
        setOpen(false);
        setSearchTerm('');
      }
    }

    function handleKeyDown(event) {
      if (event.key === 'Escape') {
        setOpen(false);
        setSearchTerm('');
        return;
      }

      if (!keyboardSearch) return;
      if (event.altKey || event.ctrlKey || event.metaKey) return;

      if (event.key === 'Backspace') {
        if (!searchTerm) return;
        event.preventDefault();
        setSearchTerm((current) => current.slice(0, -1));
        scheduleSearchReset();
        return;
      }

      if (event.key.length !== 1) return;

      event.preventDefault();
      setSearchTerm((current) => `${current}${event.key}`);
      scheduleSearchReset();
    }

    document.addEventListener('pointerdown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      clearPendingSearchReset();
      document.removeEventListener('pointerdown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [keyboardSearch, open, searchTerm]);

  useEffect(() => {
    if (open) return;
    setSearchTerm('');
    clearPendingSearchReset();
  }, [open]);

  return (
    <div
      ref={rootRef}
      className={`budget-select${open ? ' is-open' : ''}${disabled ? ' is-disabled' : ''}`}
    >
      <button
        type="button"
        className="budget-select__trigger"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={ariaLabel}
        disabled={disabled}
        onClick={() => {
          if (!disabled) setOpen((current) => !current);
        }}
      >
        {selectedOption ? (
          <span className="budget-select__content">
            <span className="budget-select__main">
              {selectedOption.visual ? (
                <span className="budget-select__visual" aria-hidden="true">
                  {selectedOption.visual}
                </span>
              ) : null}
              <span className="budget-select__text">
                <span className="budget-select__label">{selectedOption.label}</span>
                {selectedOption.meta ? (
                  <span className="budget-select__meta">{selectedOption.meta}</span>
                ) : null}
              </span>
            </span>
          </span>
        ) : (
          <span className="budget-select__content">
            <span className="budget-select__placeholder">{placeholder}</span>
          </span>
        )}

        <span className="budget-select__chevron" aria-hidden="true">
          <Icon name="arrowDown" size={14} strokeWidth={1.8} />
        </span>
      </button>

      {open ? (
        <div className="budget-select__menu" role="listbox" aria-label={ariaLabel}>
          {keyboardSearch && searchTerm ? (
            <div className="budget-select__search-pill" aria-live="polite">
              Searching: <strong>{searchTerm}</strong>
            </div>
          ) : null}

          {filteredOptions.length === 0 ? (
            <div className="budget-select__empty" role="status">
              {emptyLabel}
            </div>
          ) : filteredOptions.map((option) => {
            const active = option.value === value;

            return (
              <button
                key={option.value}
                type="button"
                role="option"
                aria-selected={active}
                className={`budget-select__option${active ? ' is-active' : ''}`}
                onClick={() => {
                  onChange(option.value);
                  setOpen(false);
                  setSearchTerm('');
                }}
              >
                <span className="budget-select__main">
                  {option.visual ? (
                    <span className="budget-select__visual" aria-hidden="true">
                      {option.visual}
                    </span>
                  ) : null}
                  <span className="budget-select__text">
                    <span className="budget-select__label">{option.label}</span>
                    {option.meta ? (
                      <span className="budget-select__meta">{option.meta}</span>
                    ) : null}
                  </span>
                </span>

                {active ? (
                  <span className="budget-select__check" aria-hidden="true">
                    <Icon name="check" size={14} strokeWidth={2} />
                  </span>
                ) : null}
              </button>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}

BudgetPopoverSelect.propTypes = {
  value: PropTypes.string,
  options: PropTypes.arrayOf(
    PropTypes.shape({
      value: PropTypes.string.isRequired,
      label: PropTypes.string.isRequired,
      meta: PropTypes.string,
      visual: PropTypes.node,
    })
  ).isRequired,
  onChange: PropTypes.func.isRequired,
  placeholder: PropTypes.string,
  ariaLabel: PropTypes.string.isRequired,
  disabled: PropTypes.bool,
  keyboardSearch: PropTypes.bool,
  emptyLabel: PropTypes.string,
};
