import { useEffect, useMemo, useState } from 'react';
import PropTypes from 'prop-types';
import ColorPickerModal from '../components/ColorPickerModal.jsx';
import EmptyState from '../components/EmptyState.jsx';
import GoalTransferSelect from '../components/GoalTransferSelect.jsx';
import Icon from '../components/Icon.jsx';
import { useAppState } from '../state/AppState.jsx';
import {
  DEFAULT_CATEGORY_COLOR,
  colorWithAlpha,
  normalizeCategoryColor,
} from '../utils/categoryAppearance.js';
import { formatCurrency, fullDate, todayIso } from '../utils/format.js';
import { checkingBalance, totalSavings, uniqueId } from '../utils/selectors.js';

const FREQUENCY_OPTIONS = [
  { value: 'one-time', label: 'One-time' },
  { value: 'weekly', label: 'Weekly' },
  { value: 'biweekly', label: 'Biweekly' },
  { value: 'monthly', label: 'Monthly' },
  { value: 'yearly', label: 'Yearly' },
];

const FREQUENCY_LABEL = Object.fromEntries(FREQUENCY_OPTIONS.map((f) => [f.value, f.label]));

export default function Goals() {
  const { state, dispatch } = useAppState();
  const { incomeSources, incomeEntries, goals, transactions, status } = state;

  const [sourceEditor, setSourceEditor] = useState(null);
  const [isAddingEntry, setIsAddingEntry] = useState(false);
  const [isAddingGoal, setIsAddingGoal] = useState(false);

  const checking = useMemo(
    () => checkingBalance({ transactions, goals }),
    [transactions, goals]
  );
  const savedTotal = useMemo(() => totalSavings(goals), [goals]);
  const sourcesById = useMemo(
    () => Object.fromEntries(incomeSources.map((s) => [s.id, s])),
    [incomeSources]
  );
  const sourceSummaries = useMemo(
    () =>
      incomeSources.map((source) => {
        const entries = incomeEntries.filter((entry) => entry.sourceId === source.id);
        return {
          source,
          entryCount: entries.length,
          totalAmount: entries.reduce((sum, entry) => sum + entry.amount, 0),
        };
      }),
    [incomeEntries, incomeSources]
  );

  if (status !== 'ready') return null;

  function handleAddSource(payload) {
    dispatch({
      type: 'incomeSource/add',
      payload: { id: uniqueId('isrc'), createdAt: todayIso(), ...payload },
    });
    dispatch({
      type: 'toast/show',
      payload: { message: 'Income source added.', kind: 'success' },
    });
    setSourceEditor(null);
  }

  function handleUpdateSource(sourceId, payload) {
    dispatch({
      type: 'incomeSource/update',
      payload: { id: sourceId, ...payload },
    });
    dispatch({
      type: 'toast/show',
      payload: { message: 'Income source updated.', kind: 'success' },
    });
    setSourceEditor(null);
  }

  function handleDeleteSource(id) {
    if (incomeEntries.some((entry) => entry.sourceId === id)) {
      dispatch({
        type: 'toast/show',
        payload: {
          message: 'Source has income entries. Remove those first.',
          kind: 'error',
        },
      });
      return;
    }
    dispatch({ type: 'incomeSource/delete', payload: id });
    dispatch({
      type: 'toast/show',
      payload: { message: 'Source removed.', kind: 'success' },
    });
  }

  function handleAddEntry(payload) {
    dispatch({
      type: 'incomeEntry/add',
      payload: { id: uniqueId('inc'), createdAt: todayIso(), ...payload },
    });
    dispatch({
      type: 'toast/show',
      payload: { message: 'Income added successfully.', kind: 'success' },
    });
    setIsAddingEntry(false);
  }

  function handleDeleteEntry(id) {
    dispatch({ type: 'incomeEntry/delete', payload: id });
    dispatch({
      type: 'toast/show',
      payload: { message: 'Income entry removed.', kind: 'success' },
    });
  }

  function handleAddGoal(payload) {
    dispatch({
      type: 'goal/add',
      payload: { id: uniqueId('goal'), current: 0, createdAt: todayIso(), ...payload },
    });
    dispatch({
      type: 'toast/show',
      payload: { message: 'Savings goal added.', kind: 'success' },
    });
    setIsAddingGoal(false);
  }

  function handleDeleteGoal(id) {
    dispatch({ type: 'goal/delete', payload: id });
    dispatch({
      type: 'toast/show',
      payload: { message: 'Goal removed.', kind: 'success' },
    });
  }

  function handleTransfer({ goalId, amount }) {
    const goal = goals.find((g) => g.id === goalId);
    const numericAmount = Number(amount);

    if (
      !goal
      || !Number.isFinite(numericAmount)
      || numericAmount <= 0
      || numericAmount > Math.max(0, checking)
    ) {
      dispatch({
        type: 'toast/show',
        payload: {
          message: 'Transfer amount is no longer valid.',
          kind: 'error',
        },
      });
      return;
    }

    dispatch({ type: 'goal/transfer', payload: { goalId, amount: numericAmount } });
    dispatch({
      type: 'toast/show',
      payload: {
        message: `Moved ${formatCurrency(numericAmount)} to ${goal.name}.`,
        kind: 'success',
      },
    });
  }

  return (
    <>
      <header className="topbar">
        <div className="topbar__title-block">
          <h1 className="topbar__title">Income &amp; Savings</h1>
          <span className="t-caption">
            Manage income sources, log income entries, and track savings goals.
          </span>
        </div>
      </header>

      <section className="is-stats">
        <div className="is-stat is-stat--checking">
          <div className="is-stat__label">Checking balance</div>
          <div className="is-stat__value tnum">{formatCurrency(checking)}</div>
          <div className="is-stat__sub">
            {incomeEntries.length} income {incomeEntries.length === 1 ? 'entry' : 'entries'}
            {goals.length > 0 ? ` / ${formatCurrency(savedTotal)} moved to savings` : ''}
          </div>
        </div>
        <div className="is-stat is-stat--savings">
          <div className="is-stat__label">Total savings</div>
          <div className="is-stat__value tnum">{formatCurrency(savedTotal)}</div>
          <div className="is-stat__sub">
            Across {goals.length} {goals.length === 1 ? 'goal' : 'goals'}
          </div>
        </div>
      </section>

      <section className="card card--lg is-section">
        <div className="is-section__head">
          <div>
            <h2 className="t-h2">Income sources</h2>
            <span className="t-caption">
              Reusable labels for the places your money comes from.
            </span>
          </div>
          <button
            type="button"
            className="btn btn--secondary"
            onClick={() =>
              setSourceEditor((value) => (value?.type === 'add' ? null : { type: 'add' }))
            }
          >
            <Icon name={sourceEditor ? 'minus' : 'plus'} size={14} strokeWidth={2} />
            {sourceEditor ? 'Close' : 'Add source'}
          </button>
        </div>

        {sourceEditor ? (
          <SourceForm
            key={sourceEditor.type === 'edit' ? sourceEditor.sourceId : 'add-source'}
            sources={incomeSources}
            source={sourceEditor.type === 'edit' ? sourcesById[sourceEditor.sourceId] : null}
            onCancel={() => setSourceEditor(null)}
            onSave={(payload) => {
              if (sourceEditor.type === 'edit') {
                handleUpdateSource(sourceEditor.sourceId, payload);
                return;
              }

              handleAddSource(payload);
            }}
          />
        ) : null}

        {incomeSources.length === 0 ? (
          <EmptyState
            title="No income sources yet"
            copy="Create your first income source to add income faster."
          />
        ) : (
          <div className="is-source-cards">
            {sourceSummaries.map(({ source, entryCount, totalAmount }) => (
              <SourceCard
                key={source.id}
                source={source}
                entryCount={entryCount}
                totalAmount={totalAmount}
                onEdit={() => setSourceEditor({ type: 'edit', sourceId: source.id })}
                onDelete={handleDeleteSource}
              />
            ))}
          </div>
        )}
      </section>

      <section className="card card--lg is-section">
        <div className="is-section__head">
          <div>
            <h2 className="t-h2">Income entries</h2>
            <span className="t-caption">
              Each entry deposits money into checking and shows up in transactions.
            </span>
          </div>
          <button
            type="button"
            className="btn btn--secondary"
            onClick={() => setIsAddingEntry((value) => !value)}
            disabled={incomeSources.length === 0}
            title={incomeSources.length === 0 ? 'Create an income source first' : undefined}
          >
            <Icon name={isAddingEntry ? 'minus' : 'plus'} size={14} strokeWidth={2} />
            {isAddingEntry ? 'Close' : 'Add income'}
          </button>
        </div>

        {isAddingEntry && incomeSources.length > 0 ? (
          <EntryForm
            sources={incomeSources}
            goals={goals}
            onCancel={() => setIsAddingEntry(false)}
            onSave={handleAddEntry}
          />
        ) : null}

        {incomeEntries.length === 0 ? (
          <EmptyState
            title="No income yet"
            copy={
              incomeSources.length === 0
                ? 'Create an income source first, then add your first entry.'
                : 'Add your first income entry to start tracking deposits.'
            }
          />
        ) : (
          <div className="is-income-list">
            {incomeEntries.map((entry) => (
              <EntryRow
                key={entry.id}
                entry={entry}
                source={sourcesById[entry.sourceId]}
                onDelete={handleDeleteEntry}
              />
            ))}
          </div>
        )}
      </section>

      <section className="card card--lg is-section">
        <div className="is-section__head">
          <div>
            <h2 className="t-h2">Move money to savings</h2>
            <span className="t-caption">
              Available in checking: <span className="tnum">{formatCurrency(Math.max(0, checking))}</span>
            </span>
          </div>
        </div>
        <TransferForm goals={goals} available={checking} onTransfer={handleTransfer} />
      </section>

      <section className="card card--lg is-section">
        <div className="is-section__head">
          <div>
            <h2 className="t-h2">Savings goals</h2>
            <span className="t-caption">
              {goals.length > 0
                ? `${formatCurrency(savedTotal)} saved across ${goals.length} ${goals.length === 1 ? 'goal' : 'goals'}.`
                : 'Create your first goal to start dividing savings.'}
            </span>
          </div>
          <button
            type="button"
            className="btn btn--secondary"
            onClick={() => setIsAddingGoal((value) => !value)}
          >
            <Icon name={isAddingGoal ? 'minus' : 'plus'} size={14} strokeWidth={2} />
            {isAddingGoal ? 'Close' : 'New goal'}
          </button>
        </div>

        {isAddingGoal ? (
          <GoalForm
            goals={goals}
            onCancel={() => setIsAddingGoal(false)}
            onSave={handleAddGoal}
          />
        ) : null}

        {goals.length === 0 ? (
          <EmptyState
            title="No goals yet"
            copy="Create your first savings goal to start saving."
          />
        ) : (
          <div className="is-goal-grid">
            {goals.map((goal) => (
              <GoalCard key={goal.id} goal={goal} onDelete={handleDeleteGoal} />
            ))}
          </div>
        )}
      </section>
    </>
  );
}

/* ----------------------------- Source form ------------------------------ */

function SourceForm({ sources, source, onCancel, onSave }) {
  const [name, setName] = useState(source?.name || '');
  const [color, setColor] = useState(source?.color || DEFAULT_CATEGORY_COLOR);
  const [colorPickerOpen, setColorPickerOpen] = useState(false);

  const trimmedName = name.trim();
  const duplicate = useMemo(
    () =>
      sources.some(
        (s) =>
          s.id !== source?.id
          && s.name.toLowerCase() === trimmedName.toLowerCase()
      ),
    [source?.id, sources, trimmedName]
  );
  const canSave = trimmedName.length > 0 && !duplicate;

  function handleSave() {
    if (!canSave) return;
    onSave({ name: trimmedName, color: normalizeCategoryColor(color) });
  }

  return (
    <div className="is-form">
      <div className="is-form-grid">
        <label className="field">
          <span className="field__label">Source name</span>
          <input
            className={`input${trimmedName && duplicate ? ' input--error' : ''}`}
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="Front Desk, Salary, Freelance..."
            maxLength={40}
            onKeyDown={(event) => {
              if (event.key === 'Enter') {
                event.preventDefault();
                handleSave();
              }
            }}
          />
          {trimmedName && duplicate ? (
            <span className="field__error">A source with this name already exists.</span>
          ) : null}
        </label>
      </div>

      <button
        type="button"
        className="category-create__chooser category-create__chooser--full"
        onClick={() => setColorPickerOpen(true)}
      >
        <span
          className="category-create__chooser-swatch category-create__chooser-swatch--solid"
          style={{ background: color }}
          aria-hidden="true"
        />
        <span className="category-create__chooser-meta">
          <span className="category-create__chooser-label">Color (optional)</span>
          <span className="category-create__chooser-value tnum">{color}</span>
        </span>
        <span className="category-create__chooser-cta">Change</span>
      </button>

      <div className="is-form__actions">
        <button type="button" className="btn btn--secondary" onClick={onCancel}>Cancel</button>
        <button type="button" className="btn btn--primary" disabled={!canSave} onClick={handleSave}>
          {source ? 'Save changes' : 'Save source'}
        </button>
      </div>

      <ColorPickerModal
        open={colorPickerOpen}
        value={color}
        onClose={() => setColorPickerOpen(false)}
        onSave={(hex) => {
          setColor(normalizeCategoryColor(hex));
          setColorPickerOpen(false);
        }}
      />
    </div>
  );
}

/* ----------------------------- Source chip ------------------------------ */

function SourceChip({ source, inUse, onDelete }) {
  return (
    <div
      className="is-source-chip"
      style={{
        borderColor: colorWithAlpha(source.color, 0.45),
        background: colorWithAlpha(source.color, 0.08),
      }}
    >
      <span className="is-source-chip__dot" style={{ background: source.color }} aria-hidden="true" />
      <span className="is-source-chip__name">{source.name}</span>
      <button
        type="button"
        className="is-source-chip__delete"
        onClick={() => onDelete(source.id)}
        aria-label={`Remove ${source.name}`}
        title={inUse ? 'Has income entries — remove those first' : 'Remove source'}
        disabled={inUse}
      >
        <Icon name="x" size={12} strokeWidth={2} />
      </button>
    </div>
  );
}

function SourceCard({ source, entryCount, totalAmount, onEdit, onDelete }) {
  const inUse = entryCount > 0;

  return (
    <article
      className="is-source-card"
      style={{ borderColor: colorWithAlpha(source.color, 0.28) }}
    >
      <div className="is-source-card__identity">
        <span className="is-source-chip__dot" style={{ background: source.color }} aria-hidden="true" />
        <div className="is-source-card__copy">
          <div className="is-source-card__name">{source.name}</div>
          <div className="is-source-card__sub">
            {entryCount > 0
              ? `${entryCount} ${entryCount === 1 ? 'income entry' : 'income entries'}`
              : 'No income entries yet'}
          </div>
        </div>
      </div>

      <div className="is-source-card__stats">
        <div className="is-source-card__stat">
          <span className="is-source-card__stat-label">Entries</span>
          <span className="is-source-card__stat-value tnum">{entryCount}</span>
        </div>
        <div className="is-source-card__stat">
          <span className="is-source-card__stat-label">Total received</span>
          <span className="is-source-card__stat-value tnum">{formatCurrency(totalAmount)}</span>
        </div>
      </div>

      <div className="is-source-card__actions">
        <button
          type="button"
          className="btn btn--secondary is-source-card__btn"
          onClick={onEdit}
          aria-label={`Edit ${source.name}`}
        >
          <Icon name="edit" size={13} strokeWidth={1.8} />
          Edit
        </button>
        <button
          type="button"
          className="btn btn--secondary is-source-card__btn is-source-card__btn--danger"
          onClick={() => onDelete(source.id)}
          aria-label={`Remove ${source.name}`}
          title={inUse ? 'Has income entries - remove those first' : 'Remove source'}
          disabled={inUse}
        >
          <Icon name="trash" size={13} strokeWidth={1.8} />
          Delete
        </button>
      </div>
    </article>
  );
}

/* ----------------------------- Entry form ------------------------------- */

function EntryForm({ sources, goals, onCancel, onSave }) {
  const [sourceId, setSourceId] = useState(sources[0]?.id || '');
  const [amountStr, setAmountStr] = useState('');
  const [date, setDate] = useState(todayIso());
  const [frequency, setFrequency] = useState('one-time');
  const [note, setNote] = useState('');
  const [savePercentStr, setSavePercentStr] = useState('0');
  const [splitState, setSplitState] = useState(() =>
    Object.fromEntries(goals.map((g, i) => [g.id, i === 0 ? 100 : 0]))
  );

  const amount = Number(amountStr) || 0;
  const savePercent = Math.max(0, Math.min(100, Number(savePercentStr) || 0));
  const savedAmount = (amount * savePercent) / 100;
  const checkingPortion = amount - savedAmount;

  const splitTotal = useMemo(
    () => goals.reduce((sum, g) => sum + (Number(splitState[g.id]) || 0), 0),
    [goals, splitState]
  );
  const splitValid = goals.length === 0 || savePercent === 0 || Math.round(splitTotal) === 100;
  const canSave = !!sourceId && amount > 0 && splitValid;

  function handleSplitChange(goalId, value) {
    const numeric = Math.max(0, Math.min(100, Number(value) || 0));
    setSplitState((prev) => ({ ...prev, [goalId]: numeric }));
  }

  function handleSave() {
    if (!canSave) return;
    const splitConfig = goals.length > 0 && savePercent > 0
      ? goals
          .map((g) => ({ goalId: g.id, percent: Number(splitState[g.id]) || 0 }))
          .filter((entry) => entry.percent > 0)
      : [];
    onSave({
      sourceId,
      amount,
      frequency,
      note: note.trim(),
      savePercent,
      splitConfig,
      date,
    });
  }

  return (
    <div className="is-form">
      <div className="is-form-grid">
        <label className="field">
          <span className="field__label">Income source</span>
          <select
            className="select"
            value={sourceId}
            onChange={(event) => setSourceId(event.target.value)}
          >
            {sources.map((source) => (
              <option key={source.id} value={source.id}>{source.name}</option>
            ))}
          </select>
        </label>
        <label className="field">
          <span className="field__label">Amount received</span>
          <input
            type="number"
            className="input tnum"
            value={amountStr}
            onChange={(event) => setAmountStr(event.target.value)}
            placeholder="0.00"
            min="0"
            step="0.01"
          />
        </label>
        <label className="field">
          <span className="field__label">Date</span>
          <input
            type="date"
            className="input"
            value={date}
            onChange={(event) => setDate(event.target.value)}
          />
        </label>
        <label className="field">
          <span className="field__label">Frequency</span>
          <select
            className="select"
            value={frequency}
            onChange={(event) => setFrequency(event.target.value)}
          >
            {FREQUENCY_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>{option.label}</option>
            ))}
          </select>
        </label>
      </div>

      <label className="field">
        <span className="field__label">Note (optional)</span>
        <textarea
          className="textarea"
          value={note}
          onChange={(event) => setNote(event.target.value)}
          placeholder="Anything worth remembering"
          rows={2}
        />
      </label>

      <div className="is-save-percent">
        <div className="is-save-percent__head">
          <span className="field__label">Save a percentage</span>
          <span className="is-save-percent__value tnum">{savePercent}%</span>
        </div>
        <input
          type="range"
          className="is-save-percent__slider"
          min={0}
          max={100}
          step={5}
          value={savePercent}
          onChange={(event) => setSavePercentStr(event.target.value)}
          disabled={goals.length === 0}
        />
        <div className="is-save-percent__hint">
          {goals.length === 0
            ? 'Create a savings goal first to enable percentage saving.'
            : amount > 0
              ? `${formatCurrency(savedAmount)} goes to savings / ${formatCurrency(checkingPortion)} stays in checking.`
              : 'Enter an amount to see how the split works.'}
        </div>
      </div>

      {goals.length > 1 && savePercent > 0 ? (
        <div className="is-split">
          <div className="is-split__head">
            <span className="field__label">Split across goals</span>
            <span className={`is-split__total tnum${splitValid ? '' : ' is-split__total--error'}`}>
              Total: {Math.round(splitTotal)}%
            </span>
          </div>
          <div className="is-split__rows">
            {goals.map((goal) => {
              const percent = Number(splitState[goal.id]) || 0;
              const portion = (savedAmount * percent) / 100;
              return (
                <div key={goal.id} className="is-split__row">
                  <span className="is-split__dot" style={{ background: goal.color }} aria-hidden="true" />
                  <span className="is-split__name">{goal.name}</span>
                  <input
                    type="number"
                    className="input is-split__input"
                    min={0}
                    max={100}
                    value={percent}
                    onChange={(event) => handleSplitChange(goal.id, event.target.value)}
                    aria-label={`Percent for ${goal.name}`}
                  />
                  <span className="is-split__percent">%</span>
                  <span className="is-split__portion tnum">{formatCurrency(portion)}</span>
                </div>
              );
            })}
          </div>
          {!splitValid ? (
            <span className="field__error">Goal split must total 100%.</span>
          ) : null}
        </div>
      ) : null}

      <div className="is-form__actions">
        <button type="button" className="btn btn--secondary" onClick={onCancel}>Cancel</button>
        <button type="button" className="btn btn--primary" disabled={!canSave} onClick={handleSave}>
          Add income
        </button>
      </div>
    </div>
  );
}

/* ----------------------------- Entry row -------------------------------- */

function EntryRow({ entry, source, onDelete }) {
  const savedAmount = (entry.amount * entry.savePercent) / 100;
  const sourceName = source?.name || 'Unknown source';
  const sourceColor = source?.color || DEFAULT_CATEGORY_COLOR;

  return (
    <div className="is-income-row">
      <div className="is-income-row__main">
        <div className="is-income-row__title">
          <span className="is-source-chip__dot" style={{ background: sourceColor }} aria-hidden="true" />
          {sourceName}
          <span className="is-income-row__badge">{FREQUENCY_LABEL[entry.frequency] || 'One-time'}</span>
        </div>
        <div className="t-caption">
          {fullDate(entry.date)}
          {entry.note ? ` / ${entry.note}` : ''}
        </div>
        {entry.savePercent > 0 ? (
          <div className="t-caption is-income-row__split">
            {entry.savePercent}% saved ({formatCurrency(savedAmount)})
          </div>
        ) : null}
      </div>
      <div className="is-income-row__amount tnum">+{formatCurrency(entry.amount)}</div>
      <button
        type="button"
        className="is-income-row__delete"
        onClick={() => onDelete(entry.id)}
        aria-label={`Remove income from ${sourceName}`}
        title="Remove income entry"
      >
        <Icon name="trash" size={14} strokeWidth={1.6} />
      </button>
    </div>
  );
}

/* ----------------------------- Transfer form ---------------------------- */

function TransferForm({ goals, available, onTransfer }) {
  const [goalId, setGoalId] = useState(goals[0]?.id || '');
  const [amountStr, setAmountStr] = useState('');

  useEffect(() => {
    if (goals.length === 0) {
      setGoalId('');
      return;
    }

    if (!goals.some((goal) => goal.id === goalId)) {
      setGoalId(goals[0].id);
    }
  }, [goalId, goals]);

  const availableBalance = Math.max(0, Number(available) || 0);
  const parsedAmount = Number.parseFloat(amountStr);
  const amount = Number.isFinite(parsedAmount) ? parsedAmount : 0;
  const selectedGoal = goals.find((goal) => goal.id === goalId) || null;
  const noGoals = goals.length === 0;
  const noChecking = availableBalance <= 0;
  const hasAmount = amountStr.trim().length > 0 && amount > 0;
  const overAvailable = amount > availableBalance;
  const valid = !noGoals && !noChecking && Boolean(selectedGoal) && hasAmount && !overAvailable;

  function handleSubmit(event) {
    event.preventDefault();
    if (!valid || !selectedGoal) return;
    onTransfer({ goalId: selectedGoal.id, amount });
    setAmountStr('');
  }

  if (noGoals) {
    return (
      <div className="is-transfer is-transfer--disabled">
        Create a savings goal first before transferring money.
      </div>
    );
  }

  return (
    <form className="is-transfer" onSubmit={handleSubmit}>
      <div className="field is-transfer__field">
        <span className="field__label">To savings goal</span>
        <GoalTransferSelect
          goals={goals}
          value={goalId}
          onChange={setGoalId}
        />
        <span className="field__hint is-transfer__hint-spacer" aria-hidden="true"> </span>
      </div>
      <label className="field is-transfer__field">
        <span className="field__label">Amount</span>
        <input
          type="number"
          className={`input tnum is-transfer__amount${overAvailable ? ' input--error' : ''}`}
          value={amountStr}
          onChange={(event) => setAmountStr(event.target.value)}
          placeholder="0.00"
          min="0"
          step="0.01"
        />
        {overAvailable ? (
          <span className="field__error">
            Amount exceeds available checking ({formatCurrency(availableBalance)}).
          </span>
        ) : noChecking ? (
          <span className="field__hint">Add income to checking before transferring.</span>
        ) : (
          <span className="field__hint">
            Available: <span className="tnum">{formatCurrency(availableBalance)}</span>
          </span>
        )}
      </label>
      <div className="field is-transfer__field is-transfer__field--action">
        <span className="field__label is-transfer__label-spacer" aria-hidden="true">Transfer</span>
        <div className="is-transfer__action">
          <button
            type="submit"
            className="btn btn--primary is-transfer__submit"
            disabled={!valid}
          >
            Transfer
          </button>
        </div>
        <span className="field__hint is-transfer__hint-spacer" aria-hidden="true"> </span>
      </div>
    </form>
  );
}

/* ----------------------------- Goal form -------------------------------- */

function GoalForm({ goals, onCancel, onSave }) {
  const [name, setName] = useState('');
  const [targetStr, setTargetStr] = useState('');
  const [deadline, setDeadline] = useState('');
  const [color, setColor] = useState(DEFAULT_CATEGORY_COLOR);
  const [colorPickerOpen, setColorPickerOpen] = useState(false);

  const trimmedName = name.trim();
  const target = Number(targetStr) || 0;
  const duplicateName = useMemo(
    () => goals.some((g) => g.name.toLowerCase() === trimmedName.toLowerCase()),
    [goals, trimmedName]
  );
  const canSave = trimmedName.length > 0 && target > 0 && !duplicateName;

  function handleSave() {
    if (!canSave) return;
    onSave({
      name: trimmedName,
      target,
      deadline: deadline || null,
      color: normalizeCategoryColor(color),
    });
  }

  return (
    <div className="is-form">
      <div className="is-form-grid">
        <label className="field">
          <span className="field__label">Goal name</span>
          <input
            className={`input${trimmedName && duplicateName ? ' input--error' : ''}`}
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="Emergency fund, Vacation, Laptop..."
            maxLength={40}
          />
          {trimmedName && duplicateName ? (
            <span className="field__error">A goal with this name already exists.</span>
          ) : null}
        </label>
        <label className="field">
          <span className="field__label">Target amount</span>
          <input
            type="number"
            className="input tnum"
            value={targetStr}
            onChange={(event) => setTargetStr(event.target.value)}
            placeholder="0.00"
            min="0"
            step="0.01"
          />
        </label>
        <label className="field">
          <span className="field__label">Deadline (optional)</span>
          <input
            type="date"
            className="input"
            value={deadline}
            onChange={(event) => setDeadline(event.target.value)}
          />
        </label>
      </div>

      <button
        type="button"
        className="category-create__chooser category-create__chooser--full"
        onClick={() => setColorPickerOpen(true)}
      >
        <span
          className="category-create__chooser-swatch category-create__chooser-swatch--solid"
          style={{ background: color }}
          aria-hidden="true"
        />
        <span className="category-create__chooser-meta">
          <span className="category-create__chooser-label">Color accent</span>
          <span className="category-create__chooser-value tnum">{color}</span>
        </span>
        <span className="category-create__chooser-cta">Change</span>
      </button>

      <div className="is-form__actions">
        <button type="button" className="btn btn--secondary" onClick={onCancel}>Cancel</button>
        <button type="button" className="btn btn--primary" disabled={!canSave} onClick={handleSave}>
          Save goal
        </button>
      </div>

      <ColorPickerModal
        open={colorPickerOpen}
        value={color}
        onClose={() => setColorPickerOpen(false)}
        onSave={(hex) => {
          setColor(normalizeCategoryColor(hex));
          setColorPickerOpen(false);
        }}
      />
    </div>
  );
}

/* ----------------------------- Goal card -------------------------------- */

function GoalCard({ goal, onDelete }) {
  const ratio = goal.target > 0 ? goal.current / goal.target : 0;
  const pct = Math.min(100, Math.round(ratio * 100));
  const remaining = Math.max(0, goal.target - goal.current);
  const cardStyle = {
    borderColor: colorWithAlpha(goal.color, 0.32),
  };

  return (
    <article className="is-goal-card" style={cardStyle}>
      <header className="is-goal-card__head">
        <div className="is-goal-card__title">
          <span className="is-goal-card__dot" style={{ background: goal.color }} aria-hidden="true" />
          <span>{goal.name}</span>
        </div>
        <button
          type="button"
          className="is-goal-card__delete"
          onClick={() => onDelete(goal.id)}
          aria-label={`Remove ${goal.name}`}
          title={goal.current > 0
            ? `Remove (loses ${formatCurrency(goal.current)} of progress)`
            : 'Remove goal'}
        >
          <Icon name="trash" size={14} strokeWidth={1.6} />
        </button>
      </header>

      <div className="is-goal-card__amounts tnum">
        <span className="is-goal-card__current">{formatCurrency(goal.current)}</span>
        <span className="is-goal-card__sep">of {formatCurrency(goal.target)}</span>
      </div>

      <div className="is-goal-card__bar">
        <div
          className="is-goal-card__bar-fill"
          style={{ width: `${pct}%`, background: goal.color }}
        />
      </div>

      <div className="is-goal-card__meta">
        <span>{pct}% complete</span>
        <span>{remaining > 0 ? `${formatCurrency(remaining)} to go` : 'Goal reached'}</span>
      </div>

      {goal.deadline ? (
        <div className="t-caption">By {fullDate(goal.deadline)}</div>
      ) : null}
    </article>
  );
}

/* ----------------------------- PropTypes -------------------------------- */

const sourceShape = PropTypes.shape({
  id: PropTypes.string.isRequired,
  name: PropTypes.string.isRequired,
  color: PropTypes.string.isRequired,
});

const goalShape = PropTypes.shape({
  id: PropTypes.string.isRequired,
  name: PropTypes.string.isRequired,
  target: PropTypes.number.isRequired,
  current: PropTypes.number.isRequired,
  deadline: PropTypes.string,
  color: PropTypes.string.isRequired,
});

SourceForm.propTypes = {
  sources: PropTypes.arrayOf(sourceShape).isRequired,
  source: sourceShape,
  onCancel: PropTypes.func.isRequired,
  onSave: PropTypes.func.isRequired,
};

SourceChip.propTypes = {
  source: sourceShape.isRequired,
  inUse: PropTypes.bool,
  onDelete: PropTypes.func.isRequired,
};

SourceCard.propTypes = {
  source: sourceShape.isRequired,
  entryCount: PropTypes.number.isRequired,
  totalAmount: PropTypes.number.isRequired,
  onEdit: PropTypes.func.isRequired,
  onDelete: PropTypes.func.isRequired,
};

EntryForm.propTypes = {
  sources: PropTypes.arrayOf(sourceShape).isRequired,
  goals: PropTypes.arrayOf(goalShape).isRequired,
  onCancel: PropTypes.func.isRequired,
  onSave: PropTypes.func.isRequired,
};

EntryRow.propTypes = {
  entry: PropTypes.shape({
    id: PropTypes.string.isRequired,
    sourceId: PropTypes.string,
    amount: PropTypes.number.isRequired,
    frequency: PropTypes.string.isRequired,
    note: PropTypes.string,
    savePercent: PropTypes.number.isRequired,
    splitConfig: PropTypes.array,
    date: PropTypes.string.isRequired,
  }).isRequired,
  source: sourceShape,
  onDelete: PropTypes.func.isRequired,
};

TransferForm.propTypes = {
  goals: PropTypes.arrayOf(goalShape).isRequired,
  available: PropTypes.number.isRequired,
  onTransfer: PropTypes.func.isRequired,
};

GoalForm.propTypes = {
  goals: PropTypes.arrayOf(goalShape).isRequired,
  onCancel: PropTypes.func.isRequired,
  onSave: PropTypes.func.isRequired,
};

GoalCard.propTypes = {
  goal: goalShape.isRequired,
  onDelete: PropTypes.func.isRequired,
};
