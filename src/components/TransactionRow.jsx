import PropTypes from 'prop-types';
import { Link } from 'react-router-dom';
import TransactionAvatar from './TransactionAvatar.jsx';
import { formatCurrency } from '../utils/format.js';
import { resolveCategoryColor } from '../utils/categoryAppearance.js';

export default function TransactionRow({ transaction, category, account, active = false, asLink = true }) {
  const isIncome = transaction.type === 'income';
  const sign = isIncome ? '+' : '-';
  const accentColor = resolveCategoryColor(category?.colorVar);
  const rowStyle = { '--trow-accent': accentColor };
  const meta = [
    category?.name || 'Other',
    account?.name?.replace('Main Checking', 'Main') || 'Manual entry',
    transaction.recurring ? 'Recurring' : null,
  ].filter(Boolean).join(' / ');

  const inner = (
    <>
      <TransactionAvatar
        transaction={transaction}
        category={category}
        size={15}
        className="trow__icon"
      />
      <span className="trow__main">
        <span className="trow__merchant">{transaction.merchant}</span>
        <span className="trow__meta">{meta}</span>
      </span>
      <span className={`trow__amount tnum${isIncome ? ' trow__amount--income' : ''}`}>
        {sign}
        {formatCurrency(Math.abs(transaction.amount))}
      </span>
    </>
  );

  if (!asLink) {
    return <div className={`trow${active ? ' is-active' : ''}`} style={rowStyle}>{inner}</div>;
  }

  return (
    <Link
      to={`/transactions/${transaction.id}`}
      className={`trow${active ? ' is-active' : ''}`}
      style={rowStyle}
      aria-label={`${transaction.merchant}, ${sign}${Math.abs(transaction.amount)}`}
    >
      {inner}
    </Link>
  );
}

TransactionRow.propTypes = {
  transaction: PropTypes.object.isRequired,
  category: PropTypes.object,
  account: PropTypes.object,
  active: PropTypes.bool,
  asLink: PropTypes.bool,
};
