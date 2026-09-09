import { createPortal } from 'react-dom';
import { useEffect, useMemo, useState } from 'react';
import BudgetPopoverSelect from '../components/BudgetPopoverSelect.jsx';
import CategoryIcon from '../components/CategoryIcon.jsx';
import EmptyState from '../components/EmptyState.jsx';
import Icon from '../components/Icon.jsx';
import ProgressBar from '../components/ProgressBar.jsx';
import SegmentedControl from '../components/SegmentedControl.jsx';
import { useAppState } from '../state/AppState.jsx';
import { getCategoryAccentStyle } from '../utils/categoryAppearance.js';
import {
  addDays,
  currentBudgetPeriodKey,
  formatBudgetPeriodLabel,
  formatCurrency,
  isoMonth,
  isoWeekStart,
  isoYear,
  startOfWeek,
} from '../utils/format.js';
import {
  getBudgetCategoryData,
  getBudgetSummaryForPeriod,
  getBudgetableCategories,
} from '../utils/selectors.js';

const BUDGET_PERIOD_OPTIONS = [
  { value: 'weekly', label: 'Weekly' },
  { value: 'monthly', label: 'Monthly' },
  { value: 'yearly', label: 'Yearly' },
];

export default function Budget() {
  const { state, dispatch } = useAppState();
  const { budgets, transactions, categories, status } = state;
  const [selectedPeriodType, setSelectedPeriodType] = useState('monthly');
  const [selectedPeriodKey, setSelectedPeriodKey] = useState(() => currentBudgetPeriodKey('monthly'));
  const [isBudgetFormOpen, setIsBudgetFormOpen] = useState(false);
  const [activeBudgetKey, setActiveBudgetKey] = useState(null);
  const [pendingDeleteKey, setPendingDeleteKey] = useState(null);

  const expenseCategories = useMemo(
    () => getBudgetableCategories(categories),
    [categories]
  );
  const periodOptions = useMemo(
    () => getBudgetPeriodOptions(selectedPeriodType),
    [selectedPeriodType]
  );
  const selectedPeriodLabel = useMemo(
    () => formatBudgetPeriodLabel(selectedPeriodType, selectedPeriodKey),
    [selectedPeriodKey, selectedPeriodType]
  );
  const categoryData = useMemo(
    () => getBudgetCategoryData(budgets, transactions, categories, selectedPeriodType, selectedPeriodKey),
    [budgets, transactions, categories, selectedPeriodType, selectedPeriodKey]
  );
  const summary = useMemo(
    () => getBudgetSummaryForPeriod(budgets, transactions, categories, selectedPeriodType, selectedPeriodKey),
    [budgets, transactions, categories, selectedPeriodType, selectedPeriodKey]
  );
  const pendingDeleteBudget = useMemo(
    () =>
      categoryData.find(
        (item) => getBudgetKey(item.categoryId, item.periodType, item.periodKey) === pendingDeleteKey
      ) || null,
    [categoryData, pendingDeleteKey]
  );
  const periodFieldLabel = selectedPeriodType === 'weekly'
    ? 'Week'
    : selectedPeriodType === 'yearly'
      ? 'Year'
      : 'Month';
  const periodDescription = selectedPeriodType === 'weekly'
    ? 'Weekly plans for expense categories only'
    : selectedPeriodType === 'yearly'
      ? 'Yearly plans for expense categories only'
      : 'Monthly plans for expense categories only';

  useEffect(() => {
    const nextKey = currentBudgetPeriodKey(selectedPeriodType);
    setSelectedPeriodKey(nextKey);
    setActiveBudgetKey(null);
    setPendingDeleteKey(null);
  }, [selectedPeriodType]);

  useEffect(() => {
    if (!periodOptions.some((option) => option.value === selectedPeriodKey)) {
      setSelectedPeriodKey(periodOptions[0]?.value || currentBudgetPeriodKey(selectedPeriodType));
    }
  }, [periodOptions, selectedPeriodKey, selectedPeriodType]);

  useEffect(() => {
    if (activeBudgetKey && !categoryData.some((item) => getBudgetKey(item.categoryId, item.periodType, item.periodKey) === activeBudgetKey)) {
      setActiveBudgetKey(null);
    }

    if (pendingDeleteKey && !categoryData.some((item) => getBudgetKey(item.categoryId, item.periodType, item.periodKey) === pendingDeleteKey)) {
      setPendingDeleteKey(null);
    }
  }, [activeBudgetKey, categoryData, pendingDeleteKey]);

  if (status !== 'ready') return null;

  function handleSaveBudget(payload) {
    const exists = budgets.some(
      (budget) =>
        budget.categoryId === payload.categoryId
        && budget.periodType === payload.periodType
        && budget.periodKey === payload.periodKey
    );

    dispatch({ type: 'budget/update', payload });
    dispatch({
      type: 'toast/show',
      payload: {
        message: exists ? 'Budget updated.' : 'Category budget added.',
        kind: 'success',
      },
    });
    setSelectedPeriodType(payload.periodType);
    setSelectedPeriodKey(payload.periodKey);
    setIsBudgetFormOpen(false);
  }

  function handleBudgetToggle(item) {
    const key = getBudgetKey(item.categoryId, item.periodType, item.periodKey);
    setActiveBudgetKey((value) => (value === key ? null : key));
  }

  function handleDeleteRequest(item) {
    const key = getBudgetKey(item.categoryId, item.periodType, item.periodKey);
    setPendingDeleteKey(key);
    setActiveBudgetKey(key);
  }

  function handleDeleteBudget() {
    if (!pendingDeleteBudget) return;

    dispatch({
      type: 'budget/delete',
      payload: {
        categoryId: pendingDeleteBudget.categoryId,
        periodType: pendingDeleteBudget.periodType,
        periodKey: pendingDeleteBudget.periodKey,
      },
    });
    dispatch({
      type: 'toast/show',
      payload: { message: 'Budget removed.', kind: 'success' },
    });
    setPendingDeleteKey(null);
    setActiveBudgetKey(null);
  }

  return (
    <>
      <header className="topbar">
        <div className="topbar__title-block">
          <h1 className="topbar__title">Budget</h1>
          <span className="t-caption">{selectedPeriodLabel}</span>
        </div>

        <div className="topbar__actions budget-toolbar">
          <div className="budget-toolbar__toggle">
            <SegmentedControl
              value={selectedPeriodType}
              onChange={setSelectedPeriodType}
              options={BUDGET_PERIOD_OPTIONS}
              ariaLabel="Budget period filter"
            />
          </div>

          <label className="budget-toolbar__period">
            <span className="budget-toolbar__month-label">{periodFieldLabel}</span>
            <BudgetPopoverSelect
              value={selectedPeriodKey}
              options={periodOptions}
              onChange={setSelectedPeriodKey}
              placeholder={`Select ${periodFieldLabel.toLowerCase()}`}
              ariaLabel={`Select ${periodFieldLabel.toLowerCase()}`}
            />
          </label>

          <button
            type="button"
            className="btn btn--primary budget-toolbar__action"
            onClick={() => setIsBudgetFormOpen(true)}
            disabled={expenseCategories.length === 0}
          >
            <Icon name="plus" size={14} strokeWidth={2} />
            Add category budget
          </button>
        </div>
      </header>

      <section className="budget-overview-grid">
        <BudgetMetricCard
          tone="budget"
          label="Total budget"
          value={formatCurrency(summary.totalBudget)}
          copy={categoryData.length > 0
            ? `${categoryData.length} ${categoryData.length === 1 ? 'category' : 'categories'} planned`
            : 'No budgets set yet'}
        />
        <BudgetMetricCard
          tone="spent"
          label="Total spent"
          value={formatCurrency(summary.totalSpent)}
          copy={summary.totalBudget > 0
            ? `${Math.round(summary.usedRatio * 100)}% of plan used`
            : 'Add budgets to compare spending'}
        />
        <BudgetMetricCard
          tone={summary.remaining < 0 ? 'over' : 'remaining'}
          label="Remaining budget"
          value={formatCurrency(Math.abs(summary.remaining))}
          copy={summary.remaining < 0
            ? `${formatCurrency(Math.abs(summary.remaining))} over this period`
            : `${formatCurrency(summary.remaining)} left to spend`}
        />
        <BudgetMetricCard
          tone={summary.overBudgetAmount > 0 ? 'over' : 'safe'}
          label="Over-budget amount"
          value={formatCurrency(summary.overBudgetAmount)}
          copy={summary.overBudgetAmount > 0
            ? `${formatCount(summary.overBudgetCount, 'category')} over plan`
            : 'All tracked budgets are within plan'}
        />
      </section>

      {categoryData.length === 0 ? (
        <section className="card card--lg budget-empty-card">
          <EmptyState
            title={`No ${selectedPeriodType} budgets set for ${selectedPeriodLabel}`}
            copy={`Add ${selectedPeriodType} category budgets to track spending limits.`}
            action={(
              <button
                type="button"
                className="btn btn--primary"
                onClick={() => setIsBudgetFormOpen(true)}
                disabled={expenseCategories.length === 0}
              >
                <Icon name="plus" size={14} strokeWidth={2} />
                Add category budget
              </button>
            )}
          />
        </section>
      ) : (
        <section className="card card--lg budget-categories-card">
          <header className="section-head budget-categories-card__head">
            <div>
              <h2 className="section-head__title">Category budgets</h2>
              <span className="t-caption">{periodDescription}</span>
            </div>
            <span className="t-caption">{categoryData.length} tracked</span>
          </header>

          <div className="budget-category-grid">
            {categoryData.map((item) => {
              const itemKey = getBudgetKey(item.categoryId, item.periodType, item.periodKey);

              return (
                <BudgetCategoryTile
                  key={itemKey}
                  item={item}
                  active={activeBudgetKey === itemKey}
                  onDeleteRequest={() => handleDeleteRequest(item)}
                  onToggle={() => handleBudgetToggle(item)}
                />
              );
            })}
          </div>
        </section>
      )}

      <BudgetFormModal
        open={isBudgetFormOpen}
        categories={expenseCategories}
        budgets={budgets}
        defaultPeriodType={selectedPeriodType}
        defaultPeriodKey={selectedPeriodKey}
        onClose={() => setIsBudgetFormOpen(false)}
        onSave={handleSaveBudget}
      />

      <BudgetDeleteModal
        budget={pendingDeleteBudget}
        periodLabel={pendingDeleteBudget ? formatBudgetPeriodLabel(pendingDeleteBudget.periodType, pendingDeleteBudget.periodKey) : ''}
        onClose={() => setPendingDeleteKey(null)}
        onConfirm={handleDeleteBudget}
      />
    </>
  );
}

function BudgetMetricCard({ label, value, copy, tone = 'budget' }) {
  return (
    <section className={`budget-metric-card budget-metric-card--${tone}`}>
      <div className="budget-metric-card__label">{label}</div>
      <div className="budget-metric-card__value tnum">{value}</div>
      <div className="budget-metric-card__copy">{copy}</div>
    </section>
  );
}

function BudgetCategoryTile({ item, active, onDeleteRequest, onToggle }) {
  const badgeText =
    item.status === 'over'
      ? 'Over budget'
      : item.status === 'warn'
        ? 'Near limit'
        : 'Safe';

  const statusCopy =
    item.status === 'over'
      ? `Over budget by ${formatCurrency(item.overBy)}`
      : item.status === 'warn'
        ? `${item.usedPercent}% used - Getting close`
        : `${item.usedPercent}% used`;

  return (
    <article
      className={`budget-category-tile budget-category-tile--${item.status}${active ? ' is-active' : ''}`}
      tabIndex={0}
      onClick={onToggle}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          onToggle();
        }
      }}
    >
      <div className="budget-category-tile__head">
        <span className="budget-category-tile__title row" style={{ gap: 10 }}>
          <span
            className="budget-category-tile__icon"
            style={getCategoryAccentStyle(item.colorVar, 0.14)}
            aria-hidden="true"
          >
            <CategoryIcon category={item} categoryId={item.categoryId} size={16} />
          </span>
          <span>
            <span className="budget-category-tile__name">{item.name}</span>
            <span className="budget-category-tile__threshold">
              Alert at {item.thresholdPercent}%
            </span>
          </span>
        </span>

        <span className="budget-category-tile__head-actions">
          <span className={`budget-category-tile__badge budget-category-tile__badge--${item.status}`}>
            {badgeText}
          </span>
          <button
            type="button"
            className="budget-category-tile__action"
            onClick={(event) => {
              event.stopPropagation();
              onDeleteRequest();
            }}
            aria-label={`Delete ${item.name} budget`}
            title="Delete budget"
          >
            <Icon name="trash" size={14} strokeWidth={1.8} />
          </button>
        </span>
      </div>

      <div className="budget-category-tile__summary">
        <div className="budget-category-tile__amount-line tnum">
          <span className="budget-category-tile__spent">{formatCurrency(item.spent)}</span>
          <span className="budget-category-tile__budget">of {formatCurrency(item.budget)}</span>
        </div>
        <div className="budget-category-tile__remaining">
          {item.status === 'over'
            ? `${formatCurrency(item.overBy)} over budget`
            : `${formatCurrency(item.remaining)} remaining`}
        </div>
      </div>

      <div className="budget-category-tile__meta-grid">
        <div className="budget-category-tile__meta">
          <span className="budget-category-tile__meta-label">Budget</span>
          <span className="budget-category-tile__meta-value tnum">{formatCurrency(item.budget)}</span>
        </div>
        <div className="budget-category-tile__meta">
          <span className="budget-category-tile__meta-label">Spent</span>
          <span className="budget-category-tile__meta-value tnum">{formatCurrency(item.spent)}</span>
        </div>
        <div className="budget-category-tile__meta">
          <span className="budget-category-tile__meta-label">Remaining</span>
          <span className="budget-category-tile__meta-value tnum">
            {item.status === 'over'
              ? `-${formatCurrency(item.overBy)}`
              : formatCurrency(item.remaining)}
          </span>
        </div>
        <div className="budget-category-tile__meta">
          <span className="budget-category-tile__meta-label">Progress</span>
          <span className="budget-category-tile__meta-value tnum">{item.usedPercent}%</span>
        </div>
      </div>

      <div className="budget-category-tile__progress">
        <ProgressBar
          value={item.spent}
          max={item.budget || item.spent || 1}
          warningAt={item.alertThreshold}
        />
      </div>

      <div className={`budget-category-tile__status budget-category-tile__status--${item.status}`}>
        {statusCopy}
      </div>
    </article>
  );
}

function BudgetDeleteModal({ budget, periodLabel, onClose, onConfirm }) {
  const portalTarget = typeof document !== 'undefined' ? document.body : null;

  useEffect(() => {
    if (!budget || !portalTarget) return undefined;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    function handleKeyDown(event) {
      if (event.key === 'Escape') {
        event.preventDefault();
        onClose();
      }
    }

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [budget, onClose, portalTarget]);

  if (!budget || !portalTarget) return null;

  return createPortal(
    <div
      className="sheet-backdrop budget-delete__backdrop"
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <section
        className="sheet budget-delete__sheet"
        role="dialog"
        aria-modal="true"
        aria-labelledby="budget-delete-title"
      >
        <div className="sheet__head budget-delete__head">
          <div>
            <h2 id="budget-delete-title" className="t-h2">Delete this budget?</h2>
            <div className="t-caption">
              This will remove the budget limit for this category, but it will not delete any transactions.
            </div>
          </div>
          <button
            type="button"
            className="picker-sheet__close"
            onClick={onClose}
            aria-label="Close budget delete dialog"
          >
            <Icon name="x" size={16} strokeWidth={2} />
          </button>
        </div>

        <div className="budget-delete__preview">
          <span
            className="budget-delete__preview-icon"
            style={getCategoryAccentStyle(budget.colorVar, 0.14)}
            aria-hidden="true"
          >
            <CategoryIcon category={budget} categoryId={budget.categoryId} size={18} />
          </span>
          <div className="budget-delete__preview-copy">
            <div className="budget-delete__preview-name">{budget.name}</div>
            <div className="budget-delete__preview-meta">
              {periodLabel} / {formatCurrency(budget.budget)} budget limit
            </div>
          </div>
        </div>

        <div className="budget-delete__actions">
          <button type="button" className="btn btn--secondary" onClick={onClose}>
            Cancel
          </button>
          <button type="button" className="btn btn--danger" onClick={onConfirm}>
            Delete budget
          </button>
        </div>
      </section>
    </div>,
    portalTarget,
  );
}

function BudgetFormModal({
  open,
  categories,
  budgets,
  defaultPeriodType,
  defaultPeriodKey,
  onClose,
  onSave,
}) {
  const portalTarget = typeof document !== 'undefined' ? document.body : null;
  const [periodType, setPeriodType] = useState(defaultPeriodType);
  const [categoryId, setCategoryId] = useState(categories[0]?.id || '');
  const [amountStr, setAmountStr] = useState('');
  const [periodKey, setPeriodKey] = useState(defaultPeriodKey);
  const [thresholdStr, setThresholdStr] = useState('80');

  const categoryOptions = useMemo(
    () =>
      categories.map((category) => ({
        value: category.id,
        label: category.name,
        visual: (
          <span
            className="budget-select__category-icon"
            style={getCategoryAccentStyle(category.colorVar, 0.14)}
          >
            <CategoryIcon category={category} size={16} />
          </span>
        ),
      })),
    [categories]
  );
  const periodOptions = useMemo(
    () => getBudgetPeriodOptions(periodType),
    [periodType]
  );

  useEffect(() => {
    if (!open) return;

    setPeriodType(defaultPeriodType);
    setCategoryId(categories[0]?.id || '');
    setAmountStr('');
    setPeriodKey(defaultPeriodKey);
    setThresholdStr('80');
  }, [categories, defaultPeriodKey, defaultPeriodType, open]);

  useEffect(() => {
    if (!periodOptions.some((option) => option.value === periodKey)) {
      setPeriodKey(periodOptions[0]?.value || currentBudgetPeriodKey(periodType));
    }
  }, [periodKey, periodOptions, periodType]);

  useEffect(() => {
    if (!open || !portalTarget) return undefined;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    function handleKeyDown(event) {
      if (event.key === 'Escape') {
        event.preventDefault();
        onClose();
      }
    }

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [onClose, open, portalTarget]);

  if (!open || !portalTarget) return null;

  const amount = Number(amountStr);
  const thresholdPercent = Math.max(0, Math.min(100, Number(thresholdStr) || 80));
  const canSave = Boolean(categoryId) && Boolean(periodKey) && Number.isFinite(amount) && amount > 0;
  const existingBudget = budgets.find(
    (budget) =>
      budget.categoryId === categoryId
      && budget.periodType === periodType
      && budget.periodKey === periodKey
  );
  const amountLabel = `${capitalize(periodType)} budget amount`;
  const periodFieldLabel = periodType === 'weekly'
    ? 'Week'
    : periodType === 'yearly'
      ? 'Year'
      : 'Month';

  function handleAmountChange(event) {
    const next = event.target.value;
    if (next === '' || /^\d*(\.\d{0,2})?$/.test(next)) {
      setAmountStr(next);
    }
  }

  return createPortal(
    <div
      className="sheet-backdrop budget-form__backdrop"
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <section
        className="sheet budget-form__sheet"
        role="dialog"
        aria-modal="true"
        aria-labelledby="budget-form-title"
      >
        <div className="sheet__head budget-form__head">
          <div>
            <h2 id="budget-form-title" className="t-h2">Add category budget</h2>
            <div className="t-caption">
              Set a spending limit for one expense category in the current or a future period.
            </div>
          </div>
          <button
            type="button"
            className="picker-sheet__close"
            onClick={onClose}
            aria-label="Close budget form"
          >
            <Icon name="x" size={16} strokeWidth={2} />
          </button>
        </div>

        <div className="budget-form">
          <div className="field budget-form__field budget-form__field--span">
            <span className="field__label">Budget period</span>
            <SegmentedControl
              value={periodType}
              onChange={setPeriodType}
              options={BUDGET_PERIOD_OPTIONS}
              ariaLabel="Budget period"
            />
          </div>

          <div className="budget-form__grid">
            <div className="field budget-form__field">
              <span className="field__label">Expense category</span>
              <BudgetPopoverSelect
                value={categoryId}
                options={categoryOptions}
                onChange={setCategoryId}
                placeholder="Select expense category"
                ariaLabel="Expense category"
                disabled={categoryOptions.length === 0}
              />
            </div>

            <label className="field budget-form__field">
              <span className="field__label">{amountLabel}</span>
              <input
                type="text"
                inputMode="decimal"
                className="input tnum budget-form__control"
                value={amountStr}
                onChange={handleAmountChange}
                placeholder="0.00"
              />
              <span className="field__hint">Enter a positive spending limit for this period.</span>
            </label>

            <div className="field budget-form__field">
              <span className="field__label">{periodFieldLabel}</span>
              <BudgetPopoverSelect
                value={periodKey}
                options={periodOptions}
                onChange={setPeriodKey}
                placeholder={`Select ${periodFieldLabel.toLowerCase()}`}
                ariaLabel={`Select ${periodFieldLabel.toLowerCase()}`}
              />
            </div>

            <label className="field budget-form__field">
              <span className="field__label">Alert threshold</span>
              <div className="budget-form__threshold">
                <input
                  type="number"
                  className="input tnum budget-form__control"
                  value={thresholdStr}
                  onChange={(event) => setThresholdStr(event.target.value)}
                  min="0"
                  max="100"
                  step="5"
                />
                <span className="budget-form__threshold-suffix">%</span>
              </div>
              <span className="field__hint">A warning appears once spending reaches this level.</span>
            </label>
          </div>

          {existingBudget ? (
            <div className="budget-form__notice">
              A budget already exists for this category and period. Saving will update it.
            </div>
          ) : null}

          <div className="budget-form__actions">
            <button type="button" className="btn btn--secondary" onClick={onClose}>
              Cancel
            </button>
            <button
              type="button"
              className="btn btn--primary"
              disabled={!canSave}
              onClick={() => {
                if (!canSave) return;
                onSave({
                  categoryId,
                  periodType,
                  periodKey,
                  amount,
                  alertThreshold: thresholdPercent / 100,
                });
              }}
            >
              {existingBudget ? 'Update budget' : 'Save budget'}
            </button>
          </div>
        </div>
      </section>
    </div>,
    portalTarget,
  );
}

function formatCount(value, noun) {
  const plural = noun.endsWith('y') ? `${noun.slice(0, -1)}ies` : `${noun}s`;
  return `${value} ${value === 1 ? noun : plural}`;
}

function getBudgetKey(categoryId, periodType, periodKey) {
  return `${categoryId}:${periodType}:${periodKey}`;
}

function getBudgetPeriodOptions(periodType) {
  const today = new Date();

  if (periodType === 'weekly') {
    const start = startOfWeek(today);
    return Array.from({ length: 52 }, (_, index) => {
      const weekStart = addDays(start, index * 7);
      const value = isoWeekStart(weekStart);

      return {
        value,
        label: formatBudgetPeriodLabel('weekly', value, today),
        meta: index === 0 ? 'Current week' : index === 1 ? 'Next week' : null,
        visual: <Icon name="calendar" size={15} strokeWidth={1.8} />,
      };
    });
  }

  if (periodType === 'yearly') {
    const year = Number(isoYear(today));
    return Array.from({ length: 10 }, (_, index) => {
      const value = String(year + index);
      return {
        value,
        label: value,
        meta: index === 0 ? 'Current year' : null,
        visual: <Icon name="calendar" size={15} strokeWidth={1.8} />,
      };
    });
  }

  const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
  return Array.from({ length: 24 }, (_, index) => {
    const next = new Date(monthStart);
    next.setMonth(monthStart.getMonth() + index);
    const value = isoMonth(next);

    return {
      value,
      label: formatBudgetPeriodLabel('monthly', value, today),
      meta: index === 0 ? 'Current month' : null,
      visual: <Icon name="calendar" size={15} strokeWidth={1.8} />,
    };
  });
}

function capitalize(value) {
  return value ? `${value[0].toUpperCase()}${value.slice(1)}` : value;
}
