import { useEffect, useMemo, useState } from 'react';
import PropTypes from 'prop-types';
import BudgetPopoverSelect from './BudgetPopoverSelect.jsx';
import CategoryIcon from './CategoryIcon.jsx';
import GoalTransferSelect from './GoalTransferSelect.jsx';
import Icon from './Icon.jsx';
import IncomeSourceSelect from './IncomeSourceSelect.jsx';
import SegmentedControl from './SegmentedControl.jsx';
import { getCategoryAccentStyle } from '../utils/categoryAppearance.js';

const TYPE_OPTIONS = [
  { value: 'expense', label: 'Expense' },
  { value: 'income', label: 'Income' },
  { value: 'transfer', label: 'Saving / Transfer' },
];

const FREQUENCY_OPTIONS = [
  { value: 'weekly', label: 'Weekly' },
  { value: 'biweekly', label: 'Biweekly' },
  { value: 'monthly', label: 'Monthly' },
  { value: 'yearly', label: 'Yearly' },
];

function createInitialForm(entry, expenseCategories, incomeSources, goals) {
  return {
    type: entry.kind,
    title: entry.title || '',
    amountStr: entry.amount ? String(entry.amount) : '',
    date: entry.date || '',
    categoryId: entry.categoryId || expenseCategories[0]?.id || '',
    accountId: entry.accountId || '',
    sourceId: entry.sourceId || incomeSources[0]?.id || '',
    goalId: entry.goalId || goals[0]?.id || '',
    recurring: Boolean(entry.recurring),
    frequency: entry.frequency && entry.frequency !== 'one-time' ? entry.frequency : 'monthly',
    note: entry.note || '',
  };
}

export default function TransactionEditSheet({
  open,
  entry,
  categories,
  accounts,
  incomeSources,
  goals,
  onClose,
  onSave,
  onCreateSource,
}) {
  const expenseCategories = useMemo(
    () => categories.filter((category) => category.id !== 'cat-income'),
    [categories]
  );
  const categoryOptions = useMemo(
    () =>
      expenseCategories.map((category) => ({
        value: category.id,
        label: category.name,
        visual: (
          <span
            className="tx-edit__category-visual"
            style={getCategoryAccentStyle(category.colorVar, 0.14)}
          >
            <CategoryIcon category={category} categoryId={category.id} size={16} />
          </span>
        ),
      })),
    [expenseCategories]
  );

  const [form, setForm] = useState(() =>
    createInitialForm(entry, expenseCategories, incomeSources, goals)
  );
  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (!open) return;
    setForm(createInitialForm(entry, expenseCategories, incomeSources, goals));
    setErrors({});
  }, [entry, expenseCategories, goals, incomeSources, open]);

  useEffect(() => {
    if (!open) return;

    setForm((current) => {
      if (current.type === 'expense' && !current.categoryId && expenseCategories[0]?.id) {
        return { ...current, categoryId: expenseCategories[0].id };
      }

      if (current.type === 'income' && !current.sourceId && incomeSources[0]?.id) {
        return { ...current, sourceId: incomeSources[0].id };
      }

      if (current.type === 'transfer' && !current.goalId && goals[0]?.id) {
        return { ...current, goalId: goals[0].id };
      }

      return current;
    });
  }, [expenseCategories, goals, incomeSources, open]);

  if (!open) return null;

  const amount = Number.parseFloat(form.amountStr);
  const noIncomeSources = incomeSources.length === 0;
  const noGoals = goals.length === 0;

  function updateField(key, value) {
    setForm((current) => ({ ...current, [key]: value }));
    setErrors((current) => {
      const errorKey = key === 'amountStr' ? 'amount' : key;
      if (!current[errorKey]) return current;
      const next = { ...current };
      delete next[errorKey];
      return next;
    });
  }

  function handleTypeChange(nextType) {
    setForm((current) => {
      const next = { ...current, type: nextType };

      if (nextType === 'expense' && !next.categoryId) {
        next.categoryId = expenseCategories[0]?.id || '';
      }
      if (nextType === 'income' && !next.sourceId) {
        next.sourceId = incomeSources[0]?.id || '';
      }
      if (nextType === 'transfer' && !next.goalId) {
        next.goalId = goals[0]?.id || '';
      }

      return next;
    });
    setErrors({});
  }

  function handleCreateSource(payload) {
    const created = onCreateSource?.(payload);
    if (created?.id) {
      setForm((current) => ({ ...current, sourceId: created.id }));
      setErrors((current) => {
        if (!current.sourceId) return current;
        const next = { ...current };
        delete next.sourceId;
        return next;
      });
    }
  }

  function validate() {
    const nextErrors = {};

    if (!form.title.trim()) nextErrors.title = 'Name is required.';
    if (!Number.isFinite(amount) || amount <= 0) nextErrors.amount = 'Amount must be greater than 0.';
    if (!form.date) nextErrors.date = 'Date is required.';
    if (form.type === 'expense' && !form.categoryId) nextErrors.categoryId = 'Choose an expense category.';
    if (form.type === 'income' && !form.sourceId) nextErrors.sourceId = 'Choose an income source.';
    if (form.type === 'transfer' && !form.goalId) nextErrors.goalId = 'Choose a savings goal.';

    return nextErrors;
  }

  function handleSubmit(event) {
    event.preventDefault();

    const nextErrors = validate();
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    onSave({
      id: entry.id,
      type: form.type,
      title: form.title.trim(),
      amount,
      date: form.date,
      categoryId: form.type === 'expense' ? form.categoryId : null,
      accountId: form.type === 'expense' ? form.accountId || null : null,
      sourceId: form.type === 'income' ? form.sourceId : null,
      goalId: form.type === 'transfer' ? form.goalId : null,
      recurring: form.recurring,
      frequency: form.recurring ? form.frequency : 'one-time',
      note: form.note.trim(),
    });
  }

  return (
    <div className="sheet-backdrop tx-edit-backdrop" role="presentation" onClick={onClose}>
      <div
        className="sheet tx-edit-sheet"
        role="dialog"
        aria-modal="true"
        aria-labelledby="transaction-edit-title"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="sheet__head tx-edit-sheet__head">
          <div>
            <div className="t-eyebrow">Edit</div>
            <h2 id="transaction-edit-title" className="t-h1">Edit transaction</h2>
            <div className="t-caption">Update the entry and keep every total, chart, and budget in sync.</div>
          </div>
          <button
            type="button"
            className="tx-edit-sheet__close"
            onClick={onClose}
            aria-label="Close edit transaction form"
          >
            <Icon name="x" size={16} />
          </button>
        </div>

        <form className="tx-edit-form" onSubmit={handleSubmit}>
          <section className="card tx-edit-form__panel">
            <div className="field">
              <span className="field__label">Type</span>
              <SegmentedControl
                value={form.type}
                onChange={handleTypeChange}
                options={TYPE_OPTIONS}
                ariaLabel="Transaction type"
              />
            </div>

            <div className="tx-edit-form__grid">
              <label className="field">
                <span className="field__label">Transaction name</span>
                <input
                  className={`input${errors.title ? ' input--error' : ''}`}
                  value={form.title}
                  onChange={(event) => updateField('title', event.target.value)}
                  placeholder="Name this transaction"
                />
                {errors.title ? <span className="field__error">{errors.title}</span> : null}
              </label>

              <label className="field">
                <span className="field__label">Amount</span>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  className={`input tnum${errors.amount ? ' input--error' : ''}`}
                  value={form.amountStr}
                  onChange={(event) => updateField('amountStr', event.target.value)}
                  placeholder="0.00"
                />
                {errors.amount ? <span className="field__error">{errors.amount}</span> : null}
              </label>

              <label className="field">
                <span className="field__label">Date</span>
                <input
                  type="date"
                  className={`input${errors.date ? ' input--error' : ''}`}
                  value={form.date}
                  onChange={(event) => updateField('date', event.target.value)}
                />
                {errors.date ? <span className="field__error">{errors.date}</span> : null}
              </label>

              {form.type === 'expense' ? (
                <div className="field">
                  <span className="field__label">Expense category</span>
                  <BudgetPopoverSelect
                    value={form.categoryId}
                    options={categoryOptions}
                    onChange={(value) => updateField('categoryId', value)}
                    placeholder="Choose a category"
                    ariaLabel="Expense category"
                  />
                  {errors.categoryId ? <span className="field__error">{errors.categoryId}</span> : null}
                </div>
              ) : null}

              {form.type === 'expense' ? (
                <label className="field">
                  <span className="field__label">Account / source</span>
                  <select
                    className="select"
                    value={form.accountId}
                    onChange={(event) => updateField('accountId', event.target.value)}
                  >
                    <option value="">Manual entry</option>
                    {accounts.map((account) => (
                      <option key={account.id} value={account.id}>{account.name}</option>
                    ))}
                  </select>
                  <span className="field__hint">Optional for manual expense tracking.</span>
                </label>
              ) : null}

              {form.type === 'income' ? (
                <div className="field">
                  <span className="field__label">Income source</span>
                  <IncomeSourceSelect
                    sources={incomeSources}
                    value={form.sourceId}
                    onChange={(value) => updateField('sourceId', value)}
                    onCreateSource={handleCreateSource}
                    disabled={false}
                  />
                  {errors.sourceId ? <span className="field__error">{errors.sourceId}</span> : null}
                  {!errors.sourceId && noIncomeSources ? (
                    <span className="field__hint">Create an income source before saving this as income.</span>
                  ) : null}
                </div>
              ) : null}

              {form.type === 'transfer' ? (
                <div className="field">
                  <span className="field__label">Savings goal</span>
                  <GoalTransferSelect
                    goals={goals}
                    value={form.goalId}
                    onChange={(value) => updateField('goalId', value)}
                    disabled={noGoals}
                  />
                  {errors.goalId ? <span className="field__error">{errors.goalId}</span> : null}
                  {!errors.goalId && noGoals ? (
                    <span className="field__hint">Create a savings goal before saving this as a transfer.</span>
                  ) : null}
                </div>
              ) : null}
            </div>
          </section>

          <section className="card tx-edit-form__panel tx-edit-form__panel--secondary">
            <div className="tx-edit-form__meta-grid">
              <div className="row row--between tx-edit-form__switch-row">
                <span className="field__label">Recurring</span>
                <button
                  type="button"
                  className={`switch${form.recurring ? ' is-on' : ''}`}
                  role="switch"
                  aria-checked={form.recurring}
                  aria-label="Recurring status"
                  onClick={() => updateField('recurring', !form.recurring)}
                />
              </div>

              {form.recurring ? (
                <label className="field">
                  <span className="field__label">Frequency</span>
                  <select
                    className="select"
                    value={form.frequency}
                    onChange={(event) => updateField('frequency', event.target.value)}
                  >
                    {FREQUENCY_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>{option.label}</option>
                    ))}
                  </select>
                </label>
              ) : null}
            </div>

            <label className="field">
              <span className="field__label">Note</span>
              <textarea
                className="textarea"
                value={form.note}
                onChange={(event) => updateField('note', event.target.value)}
                rows={3}
                placeholder="Add a note if you want extra context."
              />
            </label>
          </section>

          <div className="tx-edit-form__actions">
            <button type="button" className="btn btn--secondary" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn btn--primary">
              Save changes
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

const categoryShape = PropTypes.shape({
  id: PropTypes.string.isRequired,
  name: PropTypes.string.isRequired,
  colorVar: PropTypes.string,
  icon: PropTypes.string,
});

const accountShape = PropTypes.shape({
  id: PropTypes.string.isRequired,
  name: PropTypes.string.isRequired,
});

const sourceShape = PropTypes.shape({
  id: PropTypes.string.isRequired,
  name: PropTypes.string.isRequired,
  color: PropTypes.string,
});

const goalShape = PropTypes.shape({
  id: PropTypes.string.isRequired,
  name: PropTypes.string.isRequired,
  current: PropTypes.number.isRequired,
  target: PropTypes.number.isRequired,
  color: PropTypes.string.isRequired,
});

TransactionEditSheet.propTypes = {
  open: PropTypes.bool.isRequired,
  entry: PropTypes.shape({
    id: PropTypes.string.isRequired,
    kind: PropTypes.oneOf(['expense', 'income', 'transfer']).isRequired,
    title: PropTypes.string,
    amount: PropTypes.number.isRequired,
    date: PropTypes.string,
    note: PropTypes.string,
    categoryId: PropTypes.string,
    accountId: PropTypes.string,
    sourceId: PropTypes.string,
    goalId: PropTypes.string,
    recurring: PropTypes.bool,
    frequency: PropTypes.string,
  }).isRequired,
  categories: PropTypes.arrayOf(categoryShape).isRequired,
  accounts: PropTypes.arrayOf(accountShape).isRequired,
  incomeSources: PropTypes.arrayOf(sourceShape).isRequired,
  goals: PropTypes.arrayOf(goalShape).isRequired,
  onClose: PropTypes.func.isRequired,
  onSave: PropTypes.func.isRequired,
  onCreateSource: PropTypes.func,
};
