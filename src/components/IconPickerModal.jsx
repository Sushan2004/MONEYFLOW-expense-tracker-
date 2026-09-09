import PropTypes from 'prop-types';
import { useEffect, useId, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import CategoryIcon from './CategoryIcon.jsx';
import Icon from './Icon.jsx';
import {
  EXTENDED_CATEGORY_ICON_OPTIONS,
  getCategoryAccentStyle,
} from '../utils/categoryAppearance.js';

export default function IconPickerModal({ open, value, color, usedIcons, onClose, onSelect }) {
  const usedSet = useMemo(
    () => new Set((usedIcons || []).filter((iconName) => iconName !== value)),
    [usedIcons, value]
  );
  const [query, setQuery] = useState('');
  const searchRef = useRef(null);
  const closeButtonRef = useRef(null);
  const titleId = useId();
  const portalTarget = typeof document !== 'undefined' ? document.body : null;

  useEffect(() => {
    if (!open) return undefined;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    setQuery('');

    const frame = window.requestAnimationFrame(() => {
      searchRef.current?.focus();
    });

    function handleKeyDown(event) {
      if (event.key === 'Escape') {
        event.preventDefault();
        onClose();
      }
    }

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      window.cancelAnimationFrame(frame);
      document.body.style.overflow = previousOverflow;
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [open, onClose]);

  const filtered = useMemo(() => {
    const trimmed = query.trim().toLowerCase();
    if (!trimmed) return EXTENDED_CATEGORY_ICON_OPTIONS;
    return EXTENDED_CATEGORY_ICON_OPTIONS.filter((option) => {
      const haystack = `${option.label} ${option.value} ${option.keywords || ''}`.toLowerCase();
      return haystack.includes(trimmed);
    });
  }, [query]);

  if (!open || !portalTarget) return null;

  function handleBackdropClick(event) {
    if (event.target === event.currentTarget) onClose();
  }

  return createPortal(
    <div className="sheet-backdrop picker-backdrop" onClick={handleBackdropClick}>
      <section
        className="sheet picker-sheet"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
      >
        <div className="picker-sheet__head">
          <div>
            <h2 id={titleId} className="t-h2">Choose an icon</h2>
            <div className="t-caption">Search or browse icons for your category.</div>
          </div>
          <button
            ref={closeButtonRef}
            type="button"
            className="picker-sheet__close"
            onClick={onClose}
            aria-label="Close icon picker"
          >
            <Icon name="x" size={16} strokeWidth={2} />
          </button>
        </div>

        <div className="picker-sheet__search">
          <Icon name="search" size={14} strokeWidth={2} />
          <input
            ref={searchRef}
            type="text"
            className="picker-sheet__search-input"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search icons (e.g. coffee, gym, travel)"
            aria-label="Search icons"
          />
        </div>

        <div className="picker-sheet__body">
          {filtered.length === 0 ? (
            <div className="picker-sheet__empty">
              No icons match &ldquo;{query}&rdquo;.
            </div>
          ) : (
            <div className="icon-picker-grid">
              {filtered.map((option) => {
                const selected = option.value === value;
                const used = usedSet.has(option.value);
                return (
                  <button
                    key={option.value}
                    type="button"
                    className={`icon-picker-grid__item${selected ? ' is-selected' : ''}${used ? ' is-disabled' : ''}`}
                    onClick={() => !used && onSelect(option.value)}
                    aria-label={used ? `${option.label} (already used)` : option.label}
                    aria-pressed={selected}
                    aria-disabled={used}
                    disabled={used}
                    title={used ? 'Already used by another category' : option.label}
                  >
                    <span
                      className="icon-picker-grid__swatch"
                      style={getCategoryAccentStyle(color, used ? 0.06 : selected ? 0.2 : 0.16)}
                    >
                      <CategoryIcon category={{ icon: option.value }} size={18} />
                    </span>
                    <span className="icon-picker-grid__name">{option.label}</span>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </section>
    </div>,
    portalTarget,
  );
}

IconPickerModal.propTypes = {
  open: PropTypes.bool.isRequired,
  value: PropTypes.string,
  color: PropTypes.string,
  usedIcons: PropTypes.arrayOf(PropTypes.string),
  onClose: PropTypes.func.isRequired,
  onSelect: PropTypes.func.isRequired,
};
