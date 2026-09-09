import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import EmptyState from '../components/EmptyState.jsx';
import ErrorBanner from '../components/ErrorBanner.jsx';
import FilterChipSelect from '../components/FilterChipSelect.jsx';
import Icon from '../components/Icon.jsx';
import Skeleton from '../components/Skeleton.jsx';
import TransactionAvatar from '../components/TransactionAvatar.jsx';
import TransactionRow from '../components/TransactionRow.jsx';
import useLocalStorage from '../hooks/useLocalStorage.js';
import { useAppState } from '../state/AppState.jsx';
import { formatCurrency, formatDayLabel, fullDate } from '../utils/format.js';
import { accountById, categoryById, groupByDay } from '../utils/selectors.js';

const SORT_OPTIONS = [
  { value: 'newest', label: 'Newest' },
  { value: 'oldest', label: 'Oldest' },
  { value: 'amount-desc', label: 'Highest amount' },
  { value: 'amount-asc', label: 'Lowest amount' },
];

const DATE_OPTIONS = [
  { value: 'all', label: 'All time' },
  { value: '7', label: 'Last 7 days' },
  { value: '30', label: 'Last 30 days' },
  { value: 'month', label: 'This month' },
];

const TYPE_OPTIONS = [
  { value: 'all', label: 'All types' },
  { value: 'expense', label: 'Expenses' },
  { value: 'income', label: 'Income' },
];

export default function Transactions() {
  const { state } = useAppState();
  const { transactions, categories, accounts, status, error } = state;
  const [search, setSearch] = useState('');
  const [type, setType] = useState('all');
  const [categoryId, setCategoryId] = useState('all');
  const [accountId, setAccountId] = useState('all');
  const [dateRange, setDateRange] = useLocalStorage('et:tx-date-range', 'month');
  const [sort, setSort] = useLocalStorage('et:tx-sort', 'newest');
  const hasTransactions = transactions.length > 0;
  const hasAccounts = accounts.length > 0;
  const effectiveAccountId = hasAccounts ? accountId : 'all';

  useEffect(() => {
    if (!hasAccounts && accountId !== 'all') {
      setAccountId('all');
    }
  }, [accountId, hasAccounts]);

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    let list = transactions.filter((transaction) => {
      if (type !== 'all' && transaction.type !== type) return false;
      if (categoryId !== 'all' && transaction.categoryId !== categoryId) return false;
      if (effectiveAccountId !== 'all' && transaction.accountId !== effectiveAccountId) return false;

      if (query) {
        const haystack = `${transaction.merchant} ${transaction.note || ''}`.toLowerCase();
        if (!haystack.includes(query)) return false;
      }

      if (dateRange !== 'all') {
        const today = new Date();
        const transactionDate = new Date(`${transaction.date}T00:00:00`);

        if (dateRange === 'month') {
          if (
            transactionDate.getMonth() !== today.getMonth()
            || transactionDate.getFullYear() !== today.getFullYear()
          ) {
            return false;
          }
        } else {
          const diff = (today - transactionDate) / 86_400_000;
          if (diff > Number(dateRange)) return false;
        }
      }

      return true;
    });

    list = list.slice();

    switch (sort) {
      case 'oldest':
        list.sort((a, b) => (a.date < b.date ? -1 : 1));
        break;
      case 'amount-desc':
        list.sort((a, b) => Math.abs(b.amount) - Math.abs(a.amount));
        break;
      case 'amount-asc':
        list.sort((a, b) => Math.abs(a.amount) - Math.abs(b.amount));
        break;
      case 'newest':
      default:
        list.sort((a, b) => (a.date < b.date ? 1 : -1));
    }

    return list;
  }, [transactions, search, type, categoryId, effectiveAccountId, dateRange, sort]);

  const grouped = useMemo(() => groupByDay(filtered), [filtered]);
  const categoryOptions = useMemo(
    () => [
      { value: 'all', label: 'All categories' },
      ...categories.map((category) => ({ value: category.id, label: category.name })),
    ],
    [categories]
  );
  const accountOptions = useMemo(
    () => [
      { value: 'all', label: 'All accounts' },
      ...accounts.map((account) => ({ value: account.id, label: account.name })),
    ],
    [accounts]
  );

  const params = useParams();
  const activeId = params.id;
  const selected = activeId
    ? filtered.find((transaction) => transaction.id === activeId)
    : filtered[0];

  if (status === 'loading' || status === 'idle') {
    return <TransactionsSkeleton />;
  }

  if (status === 'error') {
    return (
      <ErrorBanner
        message={`Couldn't load transactions - ${error || 'unknown error'}.`}
        onRetry={() => window.location.reload()}
      />
    );
  }

  return (
    <>
      <header className="topbar">
        <div className="topbar__title-block">
          <h1 className="topbar__title">Transactions</h1>
          <span className="t-caption">
            {hasTransactions ? `${filtered.length} of ${transactions.length} entries` : 'No transactions yet'}
          </span>
        </div>
        <div className="topbar__actions">
          <label className="search" aria-label="Search transactions">
            <Icon name="search" size={14} />
            <input
              type="search"
              placeholder={hasTransactions ? `Search ${transactions.length} entries` : 'Search transactions'}
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          </label>
          <Link to="/add" className="btn btn--primary">
            <Icon name="plus" size={14} strokeWidth={2} />
            Add entry
          </Link>
        </div>
      </header>

      {hasTransactions ? (
        <>
          <div className="tx-toolbar" role="group" aria-label="Transaction filters">
            <FilterChipSelect
              icon="filter"
              value={type}
              options={TYPE_OPTIONS}
              onChange={setType}
              selected={type !== 'all'}
              ariaLabel="Filter by type"
            />
            <FilterChipSelect
              value={categoryId}
              options={categoryOptions}
              onChange={setCategoryId}
              selected={categoryId !== 'all'}
              ariaLabel="Filter by category"
            />
            {hasAccounts ? (
              <FilterChipSelect
                value={accountId}
                options={accountOptions}
                onChange={setAccountId}
                selected={accountId !== 'all'}
                ariaLabel="Filter by account"
              />
            ) : null}
            <FilterChipSelect
              icon="calendar"
              value={dateRange}
              options={DATE_OPTIONS}
              onChange={setDateRange}
              selected={dateRange !== 'all'}
              secondary
              ariaLabel="Date range"
            />
            <FilterChipSelect
              icon="sort"
              value={sort}
              options={SORT_OPTIONS}
              onChange={setSort}
              prefix="Sort"
              ariaLabel="Sort"
            />
          </div>

          <div className="tx-layout">
            <section className="card card--lg" aria-label="Transaction list">
              {filtered.length === 0 ? (
                <EmptyState
                  title="No matching transactions"
                  copy="Try clearing a filter or widening your date range."
                  action={(
                    <button
                      type="button"
                      className="btn btn--secondary"
                      onClick={() => {
                        setSearch('');
                        setType('all');
                        setCategoryId('all');
                        setAccountId('all');
                        setDateRange('all');
                      }}
                    >
                      Clear filters
                    </button>
                  )}
                />
              ) : (
                grouped.map((group) => (
                  <div className="daygroup" key={group.date}>
                    <div className="daygroup__head">
                      <span className="daygroup__date">{formatDayLabel(group.date)}</span>
                      <span className="daygroup__total tnum">
                        {group.total >= 0 ? '+' : '-'}
                        {formatCurrency(Math.abs(group.total))}
                      </span>
                    </div>
                    <div className="daygroup__list">
                      {group.items.map((transaction) => (
                        <TransactionRow
                          key={transaction.id}
                          transaction={transaction}
                          category={categoryById(categories, transaction.categoryId)}
                          account={accountById(accounts, transaction.accountId)}
                          active={selected?.id === transaction.id}
                        />
                      ))}
                    </div>
                  </div>
                ))
              )}
            </section>

            <aside className="tx-detail" aria-label="Transaction preview">
              {selected ? (
                <DetailPreview
                  transaction={selected}
                  category={categoryById(categories, selected.categoryId)}
                  account={accountById(accounts, selected.accountId)}
                />
              ) : (
                <div className="card card--lg">
                  <div className="t-eyebrow">Detail</div>
                  <p className="t-body" style={{ marginTop: 12, color: 'var(--text-2)' }}>
                    Select an entry to see details here.
                  </p>
                </div>
              )}
            </aside>
          </div>
        </>
      ) : (
        <section className="card card--lg">
          <EmptyState
            title="No transactions yet"
            copy="Add your first expense to start building your history."
          />
        </section>
      )}
    </>
  );
}

function DetailPreview({ transaction, category, account }) {
  const isIncome = transaction.type === 'income';

  return (
    <div className="card card--lg">
      <div className="row row--between" style={{ marginBottom: 14 }}>
        <span className="t-eyebrow">Detail</span>
        <Link to={`/transactions/${transaction.id}`} className="section-head__action">Open</Link>
      </div>
      <div className="tx-detail__hero">
        <TransactionAvatar
          transaction={transaction}
          category={category}
          size={26}
          className="tx-detail__icon"
        />
        <div>
          <div style={{ fontSize: 16, fontWeight: 500 }}>{transaction.merchant}</div>
          <div className="t-caption">{fullDate(transaction.date)}</div>
        </div>
      </div>
      <div className={`tx-detail__amount${isIncome ? ' tx-detail__amount--income' : ''} tnum`}>
        {isIncome ? '+' : '-'}
        {formatCurrency(Math.abs(transaction.amount))}
      </div>
      <div className="tx-detail__list">
        <div className="row row--between"><span>Category</span><span>{category?.name || '-'}</span></div>
        <div className="row row--between"><span>Account</span><span>{account?.name || 'Manual entry'}</span></div>
        <div className="row row--between"><span>Type</span><span>{isIncome ? 'Income' : 'Expense'}</span></div>
        <div className="row row--between"><span>Recurring</span><span>{transaction.recurring ? 'Yes' : '-'}</span></div>
      </div>
      {transaction.note ? (
        <>
          <div className="tx-detail__divider" />
          <div className="t-caption" style={{ marginBottom: 4 }}>Note</div>
          <p className="t-body" style={{ color: 'var(--ink)' }}>{transaction.note}</p>
        </>
      ) : null}
    </div>
  );
}

function TransactionsSkeleton() {
  return (
    <>
      <header className="topbar">
        <Skeleton width={180} height={26} />
        <Skeleton width={300} height={36} radius={10} />
      </header>
      <div className="tx-toolbar">
        {Array.from({ length: 5 }).map((_, index) => (
          <Skeleton key={index} width={120} height={28} radius={100} />
        ))}
      </div>
      <Skeleton height={420} radius={16} />
    </>
  );
}
