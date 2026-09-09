import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import CategoryCreator from '../components/CategoryCreator.jsx';
import CategoryIcon from '../components/CategoryIcon.jsx';
import IncomeSourceSelect from '../components/IncomeSourceSelect.jsx';
import Icon from '../components/Icon.jsx';
import SegmentedControl from '../components/SegmentedControl.jsx';
import useLocalStorage from '../hooks/useLocalStorage.js';
import { useAppState } from '../state/AppState.jsx';
import { formatCurrency, todayIso } from '../utils/format.js';
import {
  colorWithAlpha,
  getCategoryAccentStyle,
  resolveCategoryColor,
} from '../utils/categoryAppearance.js';
import { uniqueId } from '../utils/selectors.js';

const KEYS = [
  '7', '8', '9', 'Back',
  '4', '5', '6', '+',
  '1', '2', '3', '-',
  '.', '0', '00', '=',
];

const FREQUENCY_OPTIONS = [
  { value: 'one-time', label: 'One-time' },
  { value: 'weekly', label: 'Weekly' },
  { value: 'biweekly', label: 'Biweekly' },
  { value: 'monthly', label: 'Monthly' },
  { value: 'yearly', label: 'Yearly' },
];

export default function AddEntry() {
  const { state, dispatch } = useAppState();
  const navigate = useNavigate();
  const [defaultType, setDefaultType] = useLocalStorage('et:last-entry-type', 'expense');
  const [defaultAccount, setDefaultAccount] = useLocalStorage('et:last-account', null);
  const [type, setType] = useState(defaultType);
  const [amountStr, setAmountStr] = useState('0');
  const [pendingOp, setPendingOp] = useState(null);

  // Expense state
  const [categoryId, setCategoryId] = useState('');
  const [accountId, setAccountId] = useState('');
  const [merchant, setMerchant] = useState('');
  const [recurring, setRecurring] = useState(false);
  const [categoryCreatorTrigger, setCategoryCreatorTrigger] = useState(null);

  // Income state
  const [sourceId, setSourceId] = useState('');
  const [frequency, setFrequency] = useState('monthly');
  const [savePercentStr, setSavePercentStr] = useState('0');
  const [splitState, setSplitState] = useState({});

  // Shared
  const [note, setNote] = useState('');
  const [date, setDate] = useState(todayIso());

  const hasAccounts = state.accounts.length > 0;
  const expenseCategories = useMemo(
    () => state.categories.filter((category) => category.id !== 'cat-income'),
    [state.categories]
  );

  const preferredAccountId = useMemo(() => {
    if (defaultAccount && state.accounts.some((account) => account.id === defaultAccount)) {
      return defaultAccount;
    }
    return '';
  }, [defaultAccount, state.accounts]);

  useEffect(() => {
    setDefaultType(type);
  }, [type, setDefaultType]);

  useEffect(() => {
    if (!categoryId && expenseCategories[0]?.id) {
      setCategoryId(expenseCategories[0].id);
    }
  }, [categoryId, expenseCategories]);

  useEffect(() => {
    if (!sourceId && state.incomeSources[0]?.id) {
      setSourceId(state.incomeSources[0].id);
    }
    if (sourceId && !state.incomeSources.some((s) => s.id === sourceId)) {
      setSourceId(state.incomeSources[0]?.id || '');
    }
  }, [sourceId, state.incomeSources]);

  useEffect(() => {
    setSplitState((prev) => {
      const next = {};
      state.goals.forEach((goal, index) => {
        next[goal.id] = prev[goal.id] != null
          ? prev[goal.id]
          : (index === 0 ? 100 : 0);
      });
      return next;
    });
  }, [state.goals]);

  useEffect(() => {
    if (!accountId && preferredAccountId) {
      setAccountId(preferredAccountId);
    }
  }, [accountId, preferredAccountId]);

  useEffect(() => {
    if (accountId && state.accounts.some((account) => account.id === accountId)) {
      setDefaultAccount(accountId);
      return;
    }

    if (accountId && !state.accounts.some((account) => account.id === accountId)) {
      setAccountId('');
    }
  }, [accountId, setDefaultAccount, state.accounts]);

  useEffect(() => {
    if (categoryId === 'cat-other') {
      setCategoryCreatorTrigger((value) => value || 'other');
      return;
    }
    setCategoryCreatorTrigger((value) => (value === 'other' ? null : value));
  }, [categoryId]);

  const amount = Number(amountStr) || 0;
  const savePercent = Math.max(0, Math.min(100, Number(savePercentStr) || 0));
  const savedAmount = (amount * savePercent) / 100;
  const checkingPortion = amount - savedAmount;
  const goals = state.goals;
  const splitTotal = useMemo(
    () => goals.reduce((sum, g) => sum + (Number(splitState[g.id]) || 0), 0),
    [goals, splitState]
  );
  const splitValid = goals.length === 0 || savePercent === 0 || Math.round(splitTotal) === 100;

  const validExpense = type === 'expense' && amount > 0 && categoryId && merchant.trim().length > 0;
  const validIncome = type === 'income' && amount > 0 && !!sourceId && splitValid;
  const valid = validExpense || validIncome;
  const showCategoryCreator = categoryCreatorTrigger !== null;

  function press(key) {
    if (key === 'Back') {
      setAmountStr((value) => (value.length <= 1 ? '0' : value.slice(0, -1)));
      return;
    }
    if (['+', '-'].includes(key)) {
      setPendingOp({ op: key, prev: amount });
      setAmountStr('0');
      return;
    }
    if (key === '=') {
      if (pendingOp) {
        const { op, prev } = pendingOp;
        const next = op === '+' ? prev + amount : prev - amount;
        setAmountStr(String(Number(next.toFixed(2))));
        setPendingOp(null);
      }
      return;
    }
    if (key === '.') {
      if (!amountStr.includes('.')) setAmountStr(`${amountStr}.`);
      return;
    }
    if (key === '00') {
      setAmountStr((value) => (value === '0' ? '0' : `${value}00`));
      return;
    }
    setAmountStr((value) => (value === '0' ? key : `${value}${key}`));
  }

  function handleSplitChange(goalId, value) {
    const numeric = Math.max(0, Math.min(100, Number(value) || 0));
    setSplitState((prev) => ({ ...prev, [goalId]: numeric }));
  }

  function handleSave() {
    if (!valid) return;

    if (type === 'expense') {
      const transaction = {
        id: uniqueId('t'),
        merchant: merchant.trim(),
        categoryId,
        accountId: accountId || null,
        amount: -Math.abs(amount),
        date,
        note: note.trim(),
        recurring,
        type: 'expense',
      };
      dispatch({ type: 'tx/add', payload: transaction });
      dispatch({
        type: 'toast/show',
        payload: { message: 'Expense added.', kind: 'success' },
      });
      navigate('/transactions');
      return;
    }

    // Income
    const splitConfig = goals.length > 0 && savePercent > 0
      ? goals
          .map((g) => ({ goalId: g.id, percent: Number(splitState[g.id]) || 0 }))
          .filter((entry) => entry.percent > 0)
      : [];

    dispatch({
      type: 'incomeEntry/add',
      payload: {
        id: uniqueId('inc'),
        sourceId,
        amount,
        frequency,
        note: note.trim(),
        savePercent,
        splitConfig,
        date,
        createdAt: todayIso(),
      },
    });
    dispatch({
      type: 'toast/show',
      payload: { message: 'Income added successfully.', kind: 'success' },
    });
    navigate('/transactions');
  }

  function handleCreateCategory(payload) {
    const nextCategory = {
      id: uniqueId('cat'),
      ...payload,
      builtin: false,
    };
    dispatch({ type: 'category/add', payload: nextCategory });
    dispatch({
      type: 'toast/show',
      payload: { message: 'Category added successfully.', kind: 'success' },
    });
    setCategoryId(nextCategory.id);
    setCategoryCreatorTrigger(null);
  }

  function handleCreateSource({ name, color }) {
    const id = uniqueId('isrc');
    dispatch({
      type: 'incomeSource/add',
      payload: { id, name, color, createdAt: todayIso() },
    });
    dispatch({
      type: 'toast/show',
      payload: { message: 'Income source added.', kind: 'success' },
    });
    setSourceId(id);
  }

  if (state.status !== 'ready') return null;

  return (
    <>
      <header className="topbar">
        <div className="topbar__title-block">
          <h1 className="topbar__title">Add entry</h1>
          <span className="t-caption">Track income, expenses, and recurring bills manually</span>
        </div>
        <Link to="/transactions" className="btn btn--secondary" aria-label="Cancel">
          <Icon name="x" size={14} strokeWidth={2} />
          Cancel
        </Link>
      </header>

      <div className="dash-grid" style={{ alignItems: 'start' }}>
        <section className="card card--lg stack stack--lg" style={{ gap: 18 }}>
          <SegmentedControl
            value={type}
            onChange={setType}
            options={[
              { value: 'expense', label: 'Expense' },
              { value: 'income', label: 'Income' },
            ]}
            ariaLabel="Entry type"
          />

          <div
            className={`amount-display tnum${type === 'income' ? ' amount-display--income' : ''}`}
            aria-live="polite"
          >
            {type === 'expense' ? '-' : '+'}
            {formatCurrency(amount)}
            {pendingOp ? (
              <div style={{ fontSize: 13, color: 'var(--text-3)', marginTop: 4 }}>
                pending {pendingOp.op}
              </div>
            ) : null}
          </div>

          <div className="keypad">
            {KEYS.map((key) => {
              let mod = '';
              if (['+', '-'].includes(key)) mod = ' keypad__btn--op';
              if (key === '=') mod = ' keypad__btn--eq';

              return (
                <button
                  key={key}
                  type="button"
                  className={`keypad__btn${mod}`}
                  onClick={() => press(key)}
                  aria-label={`Key ${key}`}
                >
                  {key}
                </button>
              );
            })}
          </div>

          <button
            type="button"
            className="btn btn--primary btn--lg btn--block"
            disabled={!valid}
            onClick={handleSave}
          >
            Save {type === 'income' ? 'income' : 'expense'}
          </button>
        </section>

        {type === 'expense' ? (
          <div className="stack">
            <section className="card card--lg">
              <div className="row row--between" style={{ marginBottom: 10 }}>
                <div className="t-eyebrow">Category</div>
                <button
                  type="button"
                  className="btn btn--ghost category-inline-create-btn"
                  onClick={() => setCategoryCreatorTrigger('button')}
                >
                  <Icon name="plus" size={14} strokeWidth={2} />
                  New category
                </button>
              </div>
              <div className="cat-grid">
                {expenseCategories.map((category) => {
                  const isSelected = categoryId === category.id;
                  const accent = resolveCategoryColor(category.colorVar);
                  const tileStyle = isSelected
                    ? { background: colorWithAlpha(accent, 0.08), borderColor: colorWithAlpha(accent, 0.45) }
                    : undefined;
                  return (
                    <button
                      type="button"
                      key={category.id}
                      className={`cat-tile${isSelected ? ' is-selected' : ''}`}
                      onClick={() => setCategoryId(category.id)}
                      aria-pressed={isSelected}
                      style={tileStyle}
                    >
                      <span className="cat-tile__icon" style={getCategoryAccentStyle(accent, 0.14)}>
                        <CategoryIcon category={category} size={20} />
                      </span>
                      <span className="cat-tile__label">{category.name}</span>
                    </button>
                  );
                })}
              </div>
            </section>

            {showCategoryCreator ? (
              <CategoryCreator
                categories={state.categories}
                title={categoryCreatorTrigger === 'other' ? 'Create a custom category for "Other"' : 'Create category'}
                description={
                  categoryCreatorTrigger === 'other'
                    ? 'Pick a clearer name, icon, and color so this category stands out in reports.'
                    : 'Custom categories stay local to this demo workspace and will be available for future transactions.'
                }
                onCancel={() => setCategoryCreatorTrigger(null)}
                onSave={handleCreateCategory}
              />
            ) : null}

            <section className="card card--lg stack" style={{ gap: 14 }}>
              <label className="field">
                <span className="field__label">Merchant</span>
                <input
                  className="input"
                  value={merchant}
                  onChange={(event) => setMerchant(event.target.value)}
                  placeholder="Amazon, Walmart, Starbucks, Netflix..."
                />
              </label>

              {hasAccounts ? (
                <label className="field">
                  <span className="field__label">Account (optional)</span>
                  <select
                    className="select"
                    value={accountId}
                    onChange={(event) => setAccountId(event.target.value)}
                  >
                    <option value="">Manual entry</option>
                    {state.accounts.map((account) => (
                      <option key={account.id} value={account.id}>{account.name}</option>
                    ))}
                  </select>
                  <span className="field__hint">You can still save this entry without assigning an account.</span>
                </label>
              ) : (
                <div className="manual-note">
                  <span className="manual-note__icon" aria-hidden="true">
                    <Icon name="wallet" size={16} />
                  </span>
                  <div>
                    <div className="manual-note__title">No bank account needed</div>
                    <div className="manual-note__copy">
                      Manual tracking works right away. Bank sync can be added later from Accounts.
                    </div>
                  </div>
                </div>
              )}

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
                <span className="field__label">Note (optional)</span>
                <textarea
                  className="textarea"
                  value={note}
                  onChange={(event) => setNote(event.target.value)}
                  placeholder="Anything worth remembering?"
                  rows={3}
                />
              </label>
              <div className="row row--between" style={{ paddingTop: 4 }}>
                <span className="t-label">Recurring</span>
                <button
                  type="button"
                  className={`switch${recurring ? ' is-on' : ''}`}
                  role="switch"
                  aria-checked={recurring}
                  onClick={() => setRecurring((value) => !value)}
                  aria-label="Mark recurring"
                />
              </div>
            </section>
          </div>
        ) : (
          <div className="stack">
            <section className="card card--lg stack" style={{ gap: 14 }}>
              <div className="t-eyebrow">Income source</div>

              <div className="field">
                <span className="field__label">Pick a source</span>
                <IncomeSourceSelect
                  sources={state.incomeSources}
                  value={sourceId}
                  onChange={setSourceId}
                  onCreateSource={handleCreateSource}
                />
                <span className="field__hint">
                  {state.incomeSources.length === 0
                    ? 'Open the picker to create your first income source.'
                    : 'Choose a saved source or add a new one from the picker.'}
                </span>
              </div>

              <label className="field">
                <span className="field__label">Date received</span>
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

              <label className="field">
                <span className="field__label">Note (optional)</span>
                <textarea
                  className="textarea"
                  value={note}
                  onChange={(event) => setNote(event.target.value)}
                  placeholder="Anything worth remembering?"
                  rows={2}
                />
              </label>
            </section>

            <section className="card card--lg stack" style={{ gap: 12 }}>
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
                    ? 'Create a savings goal to enable percentage saving.'
                    : amount > 0
                      ? `${formatCurrency(savedAmount)} goes to savings · ${formatCurrency(checkingPortion)} stays in checking.`
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
            </section>
          </div>
        )}
      </div>
    </>
  );
}
