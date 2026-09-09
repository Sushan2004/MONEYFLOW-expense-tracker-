import { Link } from 'react-router-dom';
import Icon from '../components/Icon.jsx';
import { useAppState } from '../state/AppState.jsx';
import { formatCurrency } from '../utils/format.js';
import { totalBalance } from '../utils/selectors.js';

const TYPE_LABEL = {
  checking: 'Checking',
  savings: 'Savings',
  credit: 'Credit card',
};

export default function Wallet() {
  const { state } = useAppState();
  const { accounts, status } = state;
  const hasAccounts = accounts.length > 0;

  if (status !== 'ready') return null;

  return (
    <>
      <header className="topbar">
        <div className="topbar__title-block">
          <h1 className="topbar__title">Accounts</h1>
          <span className="t-caption">
            {hasAccounts ? `Total: ${formatCurrency(totalBalance(accounts))}` : 'Bank sync is optional'}
          </span>
        </div>
      </header>

      {hasAccounts ? (
        <section className="acct-grid" style={{ marginBottom: 20 }}>
          {accounts.map((account) => {
            const isCredit = account.type === 'credit';

            return (
              <div key={account.id} className={`acct${isCredit ? ' acct--credit' : ''}`}>
                <div className="row row--between">
                  <span className="acct__label">{TYPE_LABEL[account.type] || 'Account'}</span>
                  <Icon
                    name={account.type === 'credit' ? 'card' : 'wallet'}
                    size={16}
                    stroke={isCredit ? 'var(--mint)' : 'var(--text-3)'}
                  />
                </div>
                <div className="acct__name">{account.name}</div>
                <div className="acct__balance tnum">
                  {account.balance < 0 ? '-' : ''}
                  {formatCurrency(Math.abs(account.balance))}
                </div>
                {isCredit ? (
                  <div style={{ fontSize: 12, color: 'var(--mint)', marginTop: 4 }}>
                    Outstanding balance
                  </div>
                ) : null}
              </div>
            );
          })}
        </section>
      ) : null}

      <section className="card card--lg wallet-placeholder">
        <div className="wallet-placeholder__icon" aria-hidden="true">
          <Icon name="wallet" size={18} />
        </div>
        <div className="wallet-placeholder__body">
          <div className="wallet-placeholder__eyebrow">Manual-first mode</div>
          <h2 className="wallet-placeholder__title">
            {hasAccounts ? 'Bank sync can come later' : 'You can use the app without connecting a bank'}
          </h2>
          <p className="wallet-placeholder__copy">
            Add income, expenses, recurring bills, and reports manually right now. If you want bank imports later,
            this page can host a Plaid-style sync flow without changing the rest of the app.
          </p>
          <div className="wallet-placeholder__actions">
            <Link to="/add" className="btn btn--primary">
              <Icon name="plus" size={14} strokeWidth={2} />
              Add manual entry
            </Link>
            <button type="button" className="btn btn--secondary" disabled>
              <Icon name="card" size={14} />
              Coming soon: Bank sync
            </button>
          </div>
        </div>
      </section>
    </>
  );
}
