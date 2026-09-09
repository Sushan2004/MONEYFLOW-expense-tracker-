import PropTypes from 'prop-types';
import { formatCurrency, formatPercent } from '../utils/format.js';
import Icon from './Icon.jsx';

export default function BalanceCard({
  total,
  income,
  spending,
  savingsRate,
  accountsCount = 0,
  mode = 'balance',
}) {
  const isCashflow = mode === 'cashflow';
  const secondaryLabel = isCashflow
    ? 'This month, from manual entries'
    : `Across ${accountsCount} ${accountsCount === 1 ? 'account' : 'accounts'}`;

  return (
    <section className="balance" aria-label={isCashflow ? 'Net cashflow' : 'Total balance'}>
      <div className="balance__row">
        <span className="balance__label">{isCashflow ? 'Net cashflow' : 'Total balance'}</span>
        <span className="balance__label">{secondaryLabel}</span>
      </div>
      <div className="balance__amount tnum">{formatCurrency(total)}</div>
      <div className="balance__stats">
        <div>
          <div className="balance__stat-label">
            <Icon name="arrowDown" size={11} strokeWidth={1.8} />
            Income
          </div>
          <div className="balance__stat-value tnum">{formatCurrency(income)}</div>
        </div>
        <div>
          <div className="balance__stat-label">
            <Icon name="arrowUp" size={11} strokeWidth={1.8} />
            Spending
          </div>
          <div className="balance__stat-value tnum">{formatCurrency(Math.abs(spending))}</div>
        </div>
        <div>
          <div className="balance__stat-label">Savings rate</div>
          <div className="balance__stat-value tnum">{formatPercent(savingsRate)}</div>
        </div>
      </div>
    </section>
  );
}

BalanceCard.propTypes = {
  total: PropTypes.number.isRequired,
  income: PropTypes.number.isRequired,
  spending: PropTypes.number.isRequired,
  savingsRate: PropTypes.number.isRequired,
  accountsCount: PropTypes.number,
  mode: PropTypes.oneOf(['balance', 'cashflow']),
};
