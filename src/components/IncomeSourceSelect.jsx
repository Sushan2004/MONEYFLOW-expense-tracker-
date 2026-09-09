import PropTypes from 'prop-types';
import { useEffect, useMemo, useRef, useState } from 'react';
import Icon from './Icon.jsx';
import { DEFAULT_CATEGORY_COLOR } from '../utils/categoryAppearance.js';

export default function IncomeSourceSelect({
  sources,
  value,
  onChange,
  onCreateSource,
  disabled = false,
}) {
  const [open, setOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [draftName, setDraftName] = useState('');
  const rootRef = useRef(null);
  const inputRef = useRef(null);

  const selectedSource = useMemo(
    () => sources.find((source) => source.id === value) || null,
    [sources, value]
  );
  const trimmedName = draftName.trim();
  const duplicateName = useMemo(
    () => sources.some((source) => source.name.toLowerCase() === trimmedName.toLowerCase()),
    [sources, trimmedName]
  );
  const canCreate = trimmedName.length > 0 && !duplicateName;

  useEffect(() => {
    if (!open) return undefined;

    function handlePointerDown(event) {
      if (!rootRef.current?.contains(event.target)) {
        closePopover();
      }
    }

    function handleKeyDown(event) {
      if (event.key === 'Escape') {
        closePopover();
      }
    }

    document.addEventListener('pointerdown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('pointerdown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [open]);

  useEffect(() => {
    if (!open || !creating) return undefined;

    const frame = window.requestAnimationFrame(() => {
      inputRef.current?.focus();
    });

    return () => window.cancelAnimationFrame(frame);
  }, [creating, open]);

  function closePopover() {
    setOpen(false);
    setCreating(false);
    setDraftName('');
  }

  function handleCreate() {
    if (!canCreate) return;

    onCreateSource({
      name: trimmedName,
      color: DEFAULT_CATEGORY_COLOR,
    });
    closePopover();
  }

  return (
    <div
      ref={rootRef}
      className={`source-select${open ? ' is-open' : ''}${disabled ? ' is-disabled' : ''}`}
    >
      <button
        type="button"
        className="source-select__trigger"
        onClick={() => {
          if (!disabled) {
            setOpen((current) => !current);
            if (open) {
              setCreating(false);
              setDraftName('');
            }
          }
        }}
        aria-haspopup="listbox"
        aria-expanded={open}
        disabled={disabled}
      >
        {selectedSource ? (
          <span className="source-select__value">
            <span className="source-select__identity">
              <span
                className="source-select__dot"
                style={{ background: selectedSource.color || DEFAULT_CATEGORY_COLOR }}
                aria-hidden="true"
              />
              <span className="source-select__name">{selectedSource.name}</span>
            </span>
          </span>
        ) : (
          <span className="source-select__placeholder">Pick a source</span>
        )}
        <span className="source-select__chevron" aria-hidden="true">
          <Icon name="arrowDown" size={14} strokeWidth={1.8} />
        </span>
      </button>

      {open ? (
        <div className="source-select__menu">
          {creating ? (
            <div className="source-select__create">
              <div className="source-select__create-head">
                <div className="source-select__create-title">New income source</div>
                <button
                  type="button"
                  className="source-select__dismiss"
                  onClick={() => {
                    setCreating(false);
                    setDraftName('');
                  }}
                  aria-label="Close new income source form"
                >
                  <Icon name="x" size={13} strokeWidth={2} />
                </button>
              </div>

              <input
                ref={inputRef}
                className={`input source-select__input${trimmedName && duplicateName ? ' input--error' : ''}`}
                value={draftName}
                onChange={(event) => setDraftName(event.target.value)}
                placeholder="Front Desk, Salary, Freelance..."
                maxLength={40}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') {
                    event.preventDefault();
                    handleCreate();
                  }
                }}
              />

              {trimmedName && duplicateName ? (
                <div className="field__error">A source with this name already exists.</div>
              ) : (
                <div className="field__hint">It will be saved and selected for this income entry.</div>
              )}

              <div className="source-select__create-actions">
                <button
                  type="button"
                  className="btn btn--secondary"
                  onClick={() => {
                    setCreating(false);
                    setDraftName('');
                  }}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="btn btn--primary"
                  disabled={!canCreate}
                  onClick={handleCreate}
                >
                  Save source
                </button>
              </div>
            </div>
          ) : (
            <>
              <div className="source-select__options" role="listbox" aria-label="Income sources">
                {sources.length > 0 ? (
                  sources.map((source) => {
                    const active = source.id === value;

                    return (
                      <button
                        key={source.id}
                        type="button"
                        className={`source-select__option${active ? ' is-active' : ''}`}
                        onClick={() => {
                          onChange(source.id);
                          closePopover();
                        }}
                        role="option"
                        aria-selected={active}
                      >
                        <span className="source-select__identity">
                          <span
                            className="source-select__dot"
                            style={{ background: source.color || DEFAULT_CATEGORY_COLOR }}
                            aria-hidden="true"
                          />
                          <span className="source-select__name">{source.name}</span>
                        </span>
                        {active ? (
                          <span className="source-select__check" aria-hidden="true">
                            <Icon name="check" size={14} strokeWidth={2} />
                          </span>
                        ) : null}
                      </button>
                    );
                  })
                ) : (
                  <div className="source-select__empty">No income sources yet.</div>
                )}
              </div>

              <div className="source-select__footer">
                <button
                  type="button"
                  className="source-select__add"
                  onClick={() => setCreating(true)}
                >
                  <Icon name="plus" size={14} strokeWidth={2} />
                  Add new income source
                </button>
              </div>
            </>
          )}
        </div>
      ) : null}
    </div>
  );
}

IncomeSourceSelect.propTypes = {
  sources: PropTypes.arrayOf(
    PropTypes.shape({
      id: PropTypes.string.isRequired,
      name: PropTypes.string.isRequired,
      color: PropTypes.string,
    })
  ).isRequired,
  value: PropTypes.string,
  onChange: PropTypes.func.isRequired,
  onCreateSource: PropTypes.func.isRequired,
  disabled: PropTypes.bool,
};
