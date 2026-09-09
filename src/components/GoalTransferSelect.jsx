import PropTypes from 'prop-types';
import { useEffect, useRef, useState } from 'react';
import Icon from './Icon.jsx';
import { formatCurrency } from '../utils/format.js';

export default function GoalTransferSelect({ goals, value, onChange, disabled = false }) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef(null);
  const selectedGoal = goals.find((goal) => goal.id === value) || goals[0] || null;

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

    document.addEventListener('pointerdown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('pointerdown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [open]);

  return (
    <div
      ref={rootRef}
      className={`goal-select${open ? ' is-open' : ''}${disabled ? ' is-disabled' : ''}`}
    >
      <button
        type="button"
        className="goal-select__trigger"
        onClick={() => {
          if (!disabled) setOpen((current) => !current);
        }}
        aria-haspopup="listbox"
        aria-expanded={open}
        disabled={disabled}
      >
        {selectedGoal ? (
          <span className="goal-select__value">
            <span className="goal-select__identity">
              <span className="goal-select__dot" style={{ background: selectedGoal.color }} aria-hidden="true" />
              <span className="goal-select__name">{selectedGoal.name}</span>
            </span>
            <span className="goal-select__meta tnum">
              {formatCurrency(selectedGoal.current)} / {formatCurrency(selectedGoal.target)}
            </span>
          </span>
        ) : (
          <span className="goal-select__value">
            <span className="goal-select__placeholder">Select a savings goal</span>
          </span>
        )}
        <span className="goal-select__chevron" aria-hidden="true">
          <Icon name="arrowDown" size={14} strokeWidth={1.8} />
        </span>
      </button>

      {open && selectedGoal ? (
        <div className="goal-select__menu" role="listbox" aria-label="Savings goals">
          {goals.map((goal) => {
            const active = goal.id === selectedGoal.id;

            return (
              <button
                key={goal.id}
                type="button"
                className={`goal-select__option${active ? ' is-active' : ''}`}
                onClick={() => {
                  onChange(goal.id);
                  setOpen(false);
                }}
                role="option"
                aria-selected={active}
              >
                <span className="goal-select__identity">
                  <span className="goal-select__dot" style={{ background: goal.color }} aria-hidden="true" />
                  <span className="goal-select__name">{goal.name}</span>
                </span>
                <span className="goal-select__meta tnum">
                  {formatCurrency(goal.current)} / {formatCurrency(goal.target)}
                </span>
              </button>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}

GoalTransferSelect.propTypes = {
  goals: PropTypes.arrayOf(
    PropTypes.shape({
      id: PropTypes.string.isRequired,
      name: PropTypes.string.isRequired,
      current: PropTypes.number.isRequired,
      target: PropTypes.number.isRequired,
      color: PropTypes.string.isRequired,
    })
  ).isRequired,
  value: PropTypes.string,
  onChange: PropTypes.func.isRequired,
  disabled: PropTypes.bool,
};
