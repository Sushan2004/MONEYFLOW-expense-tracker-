import PropTypes from 'prop-types';
import CategoryIcon from './CategoryIcon.jsx';
import useMerchantLogo from '../hooks/useMerchantLogo.js';
import { getCategoryAccentStyle } from '../utils/categoryAppearance.js';

export default function TransactionAvatar({
  transaction,
  category,
  size = 16,
  className = '',
  style,
}) {
  const amount = Number(transaction?.amount) || 0;
  const isExpense = transaction?.type === 'expense' || (transaction?.type !== 'income' && amount < 0);
  const isIncome = transaction?.type === 'income' || amount > 0;
  const { logoUrl, showLogo, handleLoad, handleError } = useMerchantLogo(transaction?.merchant, {
    enabled: isExpense,
  });

  const classes = `transaction-avatar${showLogo ? ' has-logo' : ''}${className ? ` ${className}` : ''}`;
  const fallbackStyle = {
    ...getCategoryAccentStyle(category?.colorVar, isIncome ? 0.18 : 0.14),
    ...style,
  };

  return (
    <span className={classes} style={showLogo ? style : fallbackStyle} aria-hidden="true">
      {showLogo ? (
        <img
          className="transaction-avatar__logo"
          src={logoUrl}
          alt=""
          loading="lazy"
          decoding="async"
          onLoad={handleLoad}
          onError={handleError}
        />
      ) : (
        <CategoryIcon category={category} categoryId={transaction?.categoryId} size={size} />
      )}
    </span>
  );
}

TransactionAvatar.propTypes = {
  transaction: PropTypes.shape({
    merchant: PropTypes.string,
    amount: PropTypes.number,
    type: PropTypes.string,
    categoryId: PropTypes.string,
  }).isRequired,
  category: PropTypes.object,
  size: PropTypes.number,
  className: PropTypes.string,
  style: PropTypes.object,
};
