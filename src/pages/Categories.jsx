import { createPortal } from 'react-dom';
import { useEffect, useMemo, useState } from 'react';
import CategoryCreator from '../components/CategoryCreator.jsx';
import CategoryIcon from '../components/CategoryIcon.jsx';
import Icon from '../components/Icon.jsx';
import { useAppState } from '../state/AppState.jsx';
import { formatCurrency } from '../utils/format.js';
import { colorWithAlpha, getCategoryAccentStyle } from '../utils/categoryAppearance.js';
import { uniqueId } from '../utils/selectors.js';

export default function Categories() {
  const { state, dispatch } = useAppState();
  const { budgets, categories, transactions, status } = state;
  const [isAdding, setIsAdding] = useState(false);
  const [activeCategoryId, setActiveCategoryId] = useState(null);
  const [pendingDeleteId, setPendingDeleteId] = useState(null);
  const portalTarget = typeof document !== 'undefined' ? document.body : null;

  const counts = useMemo(() => {
    const map = new Map();

    transactions.forEach((transaction) => {
      const key = transaction.categoryId;
      if (!map.has(key)) map.set(key, { count: 0, sum: 0 });
      const entry = map.get(key);
      entry.count += 1;
      entry.sum += Math.abs(transaction.amount);
    });

    return map;
  }, [transactions]);

  const budgetedCategoryIds = useMemo(
    () => new Set(budgets.map((budget) => budget.categoryId)),
    [budgets]
  );

  const categoryRows = useMemo(
    () =>
      categories.map((category) => {
        const stats = counts.get(category.id) || { count: 0, sum: 0 };
        const avg = stats.count ? stats.sum / stats.count : 0;
        const usedInTransactions = stats.count > 0;
        const usedInBudgets = budgetedCategoryIds.has(category.id);
        const custom = !category.builtin;
        const deletable = custom && !usedInTransactions && !usedInBudgets;

        let deleteBlockMessage = null;
        if (custom) {
          if (usedInTransactions && usedInBudgets) {
            deleteBlockMessage = 'This category is being used in transactions and budgets and cannot be deleted.';
          } else if (usedInTransactions) {
            deleteBlockMessage = 'This category is being used in transactions and cannot be deleted.';
          } else if (usedInBudgets) {
            deleteBlockMessage = 'This category is being used in budgets and cannot be deleted.';
          }
        }

        const activityCopy = usedInTransactions
          ? `${stats.count} ${stats.count === 1 ? 'entry' : 'entries'} / avg ${formatCurrency(avg)}${usedInBudgets ? ' / budget set' : ''}`
          : usedInBudgets
            ? 'No entries yet / budget set'
            : 'No entries yet';

        return {
          category,
          deletable,
          deleteBlockMessage,
          hasEntries: usedInTransactions,
          isBudgeted: usedInBudgets,
          stats,
          activityCopy,
        };
      }),
    [budgetedCategoryIds, categories, counts]
  );

  const customCount = categories.filter((category) => !category.builtin).length;
  const pendingDeleteCategory = useMemo(
    () => categoryRows.find((row) => row.category.id === pendingDeleteId) || null,
    [categoryRows, pendingDeleteId]
  );

  useEffect(() => {
    if (!activeCategoryId) return;
    if (!categoryRows.some((row) => row.category.id === activeCategoryId && !row.category.builtin)) {
      setActiveCategoryId(null);
    }
  }, [activeCategoryId, categoryRows]);

  useEffect(() => {
    if (!pendingDeleteCategory) return undefined;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    function handleKeyDown(event) {
      if (event.key === 'Escape') {
        event.preventDefault();
        setPendingDeleteId(null);
      }
    }

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [pendingDeleteCategory]);

  if (status !== 'ready') return null;

  function handleCreateCategory(payload) {
    dispatch({
      type: 'category/add',
      payload: {
        id: uniqueId('cat'),
        ...payload,
        builtin: false,
      },
    });
    dispatch({
      type: 'toast/show',
      payload: { message: 'Category added successfully.', kind: 'success' },
    });
    setIsAdding(false);
  }

  function handleRowToggle(row) {
    if (row.category.builtin) return;
    setActiveCategoryId((value) => (value === row.category.id ? null : row.category.id));
  }

  function handleDeleteRequest(row) {
    if (row.deleteBlockMessage) {
      dispatch({
        type: 'toast/show',
        payload: { message: row.deleteBlockMessage, kind: 'warning' },
      });
      setActiveCategoryId(row.category.id);
      return;
    }

    setPendingDeleteId(row.category.id);
    setActiveCategoryId(row.category.id);
  }

  function handleConfirmDelete() {
    if (!pendingDeleteCategory?.deletable) {
      setPendingDeleteId(null);
      return;
    }

    dispatch({ type: 'category/delete', payload: pendingDeleteCategory.category.id });
    dispatch({
      type: 'toast/show',
      payload: { message: 'Custom category deleted.', kind: 'success' },
    });
    setPendingDeleteId(null);
    setActiveCategoryId(null);
  }

  return (
    <>
      <header className="topbar">
        <div className="topbar__title-block">
          <h1 className="topbar__title">Categories</h1>
          <span className="t-caption">
            {customCount > 0
              ? `${categories.length} total categories, including ${customCount} custom`
              : 'Built-in defaults ready for manual tracking'}
          </span>
        </div>
        <button
          type="button"
          className="btn btn--secondary"
          onClick={() => setIsAdding((value) => !value)}
        >
          <Icon name={isAdding ? 'minus' : 'plus'} size={14} strokeWidth={2} />
          {isAdding ? 'Close' : 'New category'}
        </button>
      </header>

      {isAdding ? (
        <CategoryCreator
          categories={categories}
          onCancel={() => setIsAdding(false)}
          onSave={handleCreateCategory}
        />
      ) : null}

      <section className="card card--lg categories-panel">
        <div className="categories-list">
          {categoryRows.map((row) => {
            const { category, activityCopy, deletable, deleteBlockMessage, hasEntries, isBudgeted, stats } = row;
            const active = activeCategoryId === category.id;
            const totalValue = hasEntries ? formatCurrency(stats.sum) : isBudgeted ? 'Budget set' : 'Ready to use';
            const totalLabel = hasEntries
              ? 'Tracked total'
              : deleteBlockMessage
                ? 'Protected while in use'
                : isBudgeted
                  ? 'No spend yet'
                  : 'Waiting for first entry';

            return (
              <article
                key={category.id}
                className={`category-card${category.builtin ? ' category-card--builtin' : ' category-card--custom'}${active ? ' is-active' : ''}`}
                tabIndex={category.builtin ? undefined : 0}
                role={category.builtin ? undefined : 'button'}
                aria-expanded={category.builtin ? undefined : active}
                onClick={() => handleRowToggle(row)}
                onKeyDown={(event) => {
                  if (category.builtin) return;
                  if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault();
                    handleRowToggle(row);
                  }
                }}
                style={{
                  borderColor: colorWithAlpha(category.colorVar, active ? 0.42 : 0.18),
                }}
              >
                <div className="category-card__main">
                  <span
                    className="category-card__icon"
                    style={getCategoryAccentStyle(category.colorVar, 0.14)}
                  >
                    <CategoryIcon category={category} size={22} />
                  </span>

                  <div className="category-card__copy">
                    <div className="category-card__title">
                      <span className="category-card__name">{category.name}</span>
                      <span className={`category-card__badge${category.builtin ? ' is-builtin' : ''}`}>
                        {category.builtin ? 'Built-in' : 'Custom'}
                      </span>
                    </div>

                    <div className="category-card__meta">
                      <span
                        className="category-card__dot"
                        style={{ background: category.colorVar }}
                        aria-hidden="true"
                      />
                      <span>{activityCopy}</span>
                    </div>
                  </div>
                </div>

                <div className="category-card__summary">
                  <span className={`category-card__amount tnum${hasEntries ? '' : ' is-empty'}`}>
                    {totalValue}
                  </span>
                  <span className="category-card__amount-label">{totalLabel}</span>
                </div>

                {!category.builtin ? (
                  <button
                    type="button"
                    className={`category-card__action${deletable ? '' : ' is-locked'}`}
                    onClick={(event) => {
                      event.stopPropagation();
                      handleDeleteRequest(row);
                    }}
                    aria-label={deletable ? `Delete ${category.name}` : `${category.name} cannot be deleted`}
                    title={deletable ? 'Delete custom category' : deleteBlockMessage}
                  >
                    <Icon name="trash" size={14} strokeWidth={1.8} />
                  </button>
                ) : null}
              </article>
            );
          })}
        </div>
      </section>

      {pendingDeleteCategory && portalTarget
        ? createPortal(
          <div
            className="sheet-backdrop category-delete__backdrop"
            onClick={(event) => {
              if (event.target === event.currentTarget) setPendingDeleteId(null);
            }}
          >
            <section
              className="sheet category-delete__sheet"
              role="dialog"
              aria-modal="true"
              aria-labelledby="category-delete-title"
            >
              <div className="sheet__head category-delete__head">
                <div>
                  <h2 id="category-delete-title" className="t-h2">Delete this custom category?</h2>
                  <div className="t-caption">This action cannot be undone.</div>
                </div>
                <button
                  type="button"
                  className="picker-sheet__close"
                  onClick={() => setPendingDeleteId(null)}
                  aria-label="Close delete confirmation"
                >
                  <Icon name="x" size={16} strokeWidth={2} />
                </button>
              </div>

              <div className="category-delete__preview">
                <span
                  className="category-delete__preview-icon"
                  style={getCategoryAccentStyle(pendingDeleteCategory.category.colorVar, 0.14)}
                  aria-hidden="true"
                >
                  <CategoryIcon category={pendingDeleteCategory.category} size={20} />
                </span>
                <div className="category-delete__preview-copy">
                  <div className="category-delete__preview-name">
                    {pendingDeleteCategory.category.name}
                  </div>
                  <div className="category-delete__preview-meta">
                    It will be removed from categories and future selectors immediately.
                  </div>
                </div>
              </div>

              <div className="category-delete__actions">
                <button
                  type="button"
                  className="btn btn--secondary"
                  onClick={() => setPendingDeleteId(null)}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="btn btn--danger"
                  onClick={handleConfirmDelete}
                >
                  Delete category
                </button>
              </div>
            </section>
          </div>,
          portalTarget,
        )
        : null}
    </>
  );
}
