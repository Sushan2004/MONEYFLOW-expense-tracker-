import { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { Link, useNavigate, useParams } from 'react-router-dom';
import EmptyState from '../components/EmptyState.jsx';
import Icon from '../components/Icon.jsx';
import TransactionAvatar from '../components/TransactionAvatar.jsx';
import TransactionEditSheet from '../components/TransactionEditSheet.jsx';
import { useAppState } from '../state/AppState.jsx';
import { getCategoryAccentStyle } from '../utils/categoryAppearance.js';
import { formatCurrency, fullDate, todayIso } from '../utils/format.js';
import { accountById, categoryById, uniqueId } from '../utils/selectors.js';

function frequencyLabel(value) {
  switch (value) {
    case 'weekly':
      return 'Weekly';
    case 'biweekly':
      return 'Biweekly';
    case 'monthly':
      return 'Monthly';
    case 'yearly':
      return 'Yearly';
    default:
      return 'One-time';
  }
}

export default function TransactionDetail() {
  const { id } = useParams();
  const { state, dispatch } = useAppState();
  const navigate = useNavigate();
  const [isEditing, setIsEditing] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const portalTarget = typeof document !== 'undefined' ? document.body : null;

  const tx = state.transactions.find((transaction) => transaction.id === id) || null;
  const savingsTransfer = state.savingsTransfers.find((transfer) => transfer.id === id) || null;
  const linkedIncomeEntry = tx
    ? state.incomeEntries.find((entry) => entry.transactionId === tx.id) || null
    : null;

  const category = tx ? categoryById(state.categories, tx.categoryId) : null;
  const fallbackIncomeSource = tx
    ? state.incomeSources.find(
      (source) => source.name.toLowerCase() === String(tx.merchant || '').trim().toLowerCase()
    ) || null
    : null;
  const incomeSource = linkedIncomeEntry?.sourceId
    ? state.incomeSources.find((source) => source.id === linkedIncomeEntry.sourceId) || null
    : fallbackIncomeSource;
  const goal = savingsTransfer
    ? state.goals.find((item) => item.id === savingsTransfer.goalId) || null
    : null;
  const account = tx ? accountById(state.accounts, tx.accountId) : null;

  const entry = useMemo(() => {
    if (tx?.type === 'income') {
      return {
        id: tx.id,
        kind: 'income',
        title: tx.merchant || incomeSource?.name || 'Income',
        amount: Math.abs(tx.amount),
        date: tx.date,
        note: linkedIncomeEntry?.note || tx.note || '',
        sourceId: linkedIncomeEntry?.sourceId || incomeSource?.id || '',
        recurring: linkedIncomeEntry
          ? linkedIncomeEntry.frequency !== 'one-time'
          : Boolean(tx.recurring),
        frequency: linkedIncomeEntry?.frequency || (tx.recurring ? tx.frequency || 'monthly' : 'one-time'),
      };
    }

    if (savingsTransfer) {
      return {
        id: savingsTransfer.id,
        kind: 'transfer',
        title: savingsTransfer.name || goal?.name || 'Savings transfer',
        amount: Math.abs(savingsTransfer.amount),
        date: savingsTransfer.date,
        note: savingsTransfer.note || '',
        goalId: savingsTransfer.goalId,
        recurring: Boolean(savingsTransfer.recurring),
        frequency: savingsTransfer.frequency || 'one-time',
      };
    }

    if (tx) {
      return {
        id: tx.id,
        kind: 'expense',
        title: tx.merchant,
        amount: Math.abs(tx.amount),
        date: tx.date,
        note: tx.note || '',
        categoryId: tx.categoryId,
        accountId: tx.accountId || '',
        recurring: Boolean(tx.recurring),
        frequency: tx.recurring ? tx.frequency || 'monthly' : 'one-time',
      };
    }

    return null;
  }, [goal, incomeSource, linkedIncomeEntry, savingsTransfer, tx]);

  useEffect(() => {
    if (!showDeleteDialog) return undefined;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    function handleKeyDown(event) {
      if (event.key === 'Escape') {
        event.preventDefault();
        setShowDeleteDialog(false);
      }
    }

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [showDeleteDialog]);

  if (state.status !== 'ready') return null;

  if (!entry) {
    return (
      <>
        <header className="topbar">
          <Link to="/transactions" className="btn btn--secondary">
            <Icon name="arrowLeft" size={14} />
            Back
          </Link>
        </header>
        <EmptyState
          title="Transaction not found"
          copy="It may have been deleted or the link is wrong."
          action={(
            <Link to="/transactions" className="btn btn--primary">Back to all transactions</Link>
          )}
        />
      </>
    );
  }

  const isIncome = entry.kind === 'income';
  const isTransfer = entry.kind === 'transfer';
  const iconStyle = isTransfer
    ? getCategoryAccentStyle(goal?.color, 0.16)
    : getCategoryAccentStyle(category?.colorVar, 0.16);
  const deleteTitle = isTransfer ? 'Delete savings transfer' : 'Delete transaction';
  const deleteMessage = isTransfer
    ? 'Are you sure you want to delete this savings transfer? This action cannot be undone.'
    : 'Are you sure you want to delete this transaction? This action cannot be undone.';

  function handleCreateSource(payload) {
    const nextSource = {
      id: uniqueId('isrc'),
      createdAt: todayIso(),
      ...payload,
    };

    dispatch({ type: 'incomeSource/add', payload: nextSource });
    dispatch({
      type: 'toast/show',
      payload: { message: 'Income source added.', kind: 'success' },
    });
    return nextSource;
  }

  function handleConfirmDelete() {
    if (isTransfer) {
      dispatch({ type: 'savingsTransfer/delete', payload: entry.id });
      dispatch({
        type: 'toast/show',
        payload: { message: 'Savings transfer deleted.', kind: 'success' },
      });
      navigate('/transactions');
      return;
    }

    if (isIncome && linkedIncomeEntry) {
      dispatch({ type: 'incomeEntry/delete', payload: linkedIncomeEntry.id });
      dispatch({
        type: 'toast/show',
        payload: { message: 'Income transaction deleted.', kind: 'success' },
      });
      navigate('/transactions');
      return;
    }

    dispatch({ type: 'tx/delete', payload: entry.id });
    dispatch({ type: 'toast/show', payload: { message: 'Transaction deleted.', kind: 'success' } });
    navigate('/transactions');
  }

  function handleDuplicate() {
    if (isTransfer && savingsTransfer) {
      const nextId = uniqueId('svtx');
      dispatch({
        type: 'goal/transfer',
        payload: {
          id: nextId,
          goalId: savingsTransfer.goalId,
          amount: savingsTransfer.amount,
          date: todayIso(),
          note: savingsTransfer.note || '',
          name: savingsTransfer.name || entry.title,
          recurring: savingsTransfer.recurring,
          frequency: savingsTransfer.frequency,
          createdAt: todayIso(),
        },
      });
      dispatch({ type: 'toast/show', payload: { message: 'Duplicated.', kind: 'success' } });
      navigate(`/transactions/${nextId}`);
      return;
    }

    if (isIncome && linkedIncomeEntry) {
      const nextTransactionId = uniqueId('t');
      dispatch({
        type: 'incomeEntry/add',
        payload: {
          ...linkedIncomeEntry,
          id: uniqueId('inc'),
          transactionId: nextTransactionId,
          date: todayIso(),
          createdAt: todayIso(),
        },
      });
      dispatch({
        type: 'tx/update',
        payload: {
          id: nextTransactionId,
          merchant: entry.title,
        },
      });
      dispatch({ type: 'toast/show', payload: { message: 'Duplicated.', kind: 'success' } });
      navigate(`/transactions/${nextTransactionId}`);
      return;
    }

    if (!tx) return;
    const copy = { ...tx, id: uniqueId('t'), date: todayIso() };
    dispatch({ type: 'tx/add', payload: copy });
    dispatch({ type: 'toast/show', payload: { message: 'Duplicated.', kind: 'success' } });
    navigate(`/transactions/${copy.id}`);
  }

  function handleSave(payload) {
    dispatch({ type: 'entry/save', payload });
    dispatch({
      type: 'toast/show',
      payload: { message: 'Transaction updated.', kind: 'success' },
    });
    setIsEditing(false);
  }

  return (
    <>
      <header className="topbar">
        <Link to="/transactions" className="btn btn--secondary" aria-label="Back to transactions">
          <Icon name="arrowLeft" size={14} />
          Back
        </Link>
        <div className="topbar__actions">
          <button type="button" className="btn btn--secondary" onClick={() => setIsEditing(true)}>
            <Icon name="edit" size={14} />
            Edit
          </button>
          <button type="button" className="btn btn--secondary" onClick={handleDuplicate}>
            <Icon name="repeat" size={14} />
            Duplicate
          </button>
          <button type="button" className="btn btn--danger" onClick={() => setShowDeleteDialog(true)}>
            <Icon name="trash" size={14} />
            Delete
          </button>
        </div>
      </header>

      <section className="card card--lg tx-detail-card" style={{ maxWidth: 760 }}>
        <div className="tx-detail__hero">
          {isTransfer ? (
            <div className="tx-detail__icon" style={{ ...iconStyle, width: 64, height: 64, borderRadius: 16 }}>
              <Icon name="wallet" size={30} stroke="currentColor" />
            </div>
          ) : (
            <TransactionAvatar
              transaction={tx}
              category={category}
              size={32}
              className="tx-detail__icon"
              style={{ width: 64, height: 64, borderRadius: 16 }}
            />
          )}
          <div>
            <div style={{ fontSize: 20, fontWeight: 500 }}>{entry.title}</div>
            <div className="t-caption">{fullDate(entry.date)}</div>
          </div>
        </div>

        <div
          className={`tx-detail__amount${isIncome ? ' tx-detail__amount--income' : ''}${isTransfer ? ' tx-detail__amount--transfer' : ''} tnum`}
        >
          {isTransfer ? '' : isIncome ? '+' : '-'}
          {formatCurrency(entry.amount)}
        </div>

        <div className="tx-detail__list" style={{ fontSize: 14 }}>
          {isTransfer ? (
            <>
              <div className="row row--between"><span>Type</span><span>Saving / Transfer</span></div>
              <div className="row row--between"><span>Savings goal</span><span>{goal?.name || '-'}</span></div>
              <div className="row row--between"><span>Recurring</span><span>{entry.recurring ? 'Yes' : 'No'}</span></div>
              <div className="row row--between"><span>Frequency</span><span>{entry.recurring ? frequencyLabel(entry.frequency) : '-'}</span></div>
            </>
          ) : isIncome ? (
            <>
              <div className="row row--between"><span>Type</span><span>Income</span></div>
              <div className="row row--between"><span>Source</span><span>{incomeSource?.name || 'Manual income'}</span></div>
              <div className="row row--between"><span>Category</span><span>{category?.name || 'Income'}</span></div>
              <div className="row row--between"><span>Recurring</span><span>{entry.recurring ? 'Yes' : 'No'}</span></div>
              <div className="row row--between"><span>Frequency</span><span>{entry.recurring ? frequencyLabel(entry.frequency) : '-'}</span></div>
            </>
          ) : (
            <>
              <div className="row row--between"><span>Category</span><span>{category?.name || '-'}</span></div>
              <div className="row row--between"><span>Account</span><span>{account?.name || 'Manual entry'}</span></div>
              <div className="row row--between"><span>Type</span><span>Expense</span></div>
              <div className="row row--between"><span>Recurring</span><span>{entry.recurring ? 'Yes' : 'No'}</span></div>
              <div className="row row--between"><span>Frequency</span><span>{entry.recurring ? frequencyLabel(entry.frequency) : '-'}</span></div>
            </>
          )}
        </div>

        {entry.note ? (
          <>
            <div className="tx-detail__divider" />
            <div className="t-eyebrow" style={{ marginBottom: 6 }}>Note</div>
            <p className="t-body">{entry.note}</p>
          </>
        ) : null}
      </section>

      <TransactionEditSheet
        open={isEditing}
        entry={entry}
        categories={state.categories}
        accounts={state.accounts}
        incomeSources={state.incomeSources}
        goals={state.goals}
        onClose={() => setIsEditing(false)}
        onSave={handleSave}
        onCreateSource={handleCreateSource}
      />

      {showDeleteDialog && portalTarget
        ? createPortal(
          <div
            className="sheet-backdrop tx-delete__backdrop"
            role="presentation"
            onClick={(event) => {
              if (event.target === event.currentTarget) setShowDeleteDialog(false);
            }}
          >
            <section
              className="sheet tx-delete__sheet"
              role="dialog"
              aria-modal="true"
              aria-labelledby="transaction-delete-title"
              aria-describedby="transaction-delete-message"
            >
              <div className="sheet__head tx-delete__head">
                <div>
                  <h2 id="transaction-delete-title" className="t-h2">{deleteTitle}</h2>
                  <div id="transaction-delete-message" className="t-caption tx-delete__message">
                    {deleteMessage}
                  </div>
                </div>
                <button
                  type="button"
                  className="picker-sheet__close"
                  onClick={() => setShowDeleteDialog(false)}
                  aria-label="Close delete confirmation"
                >
                  <Icon name="x" size={16} strokeWidth={2} />
                </button>
              </div>

              <div className="tx-delete__actions">
                <button
                  type="button"
                  className="btn btn--secondary"
                  onClick={() => setShowDeleteDialog(false)}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="btn btn--danger"
                  onClick={handleConfirmDelete}
                >
                  Delete
                </button>
              </div>
            </section>
          </div>,
          portalTarget
        )
        : null}
    </>
  );
}
