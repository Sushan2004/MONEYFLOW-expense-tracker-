import PropTypes from 'prop-types';
import { CATEGORY_ICON_COMPONENTS, DEFAULT_CATEGORY_ICON, normalizeCategoryIcon } from '../utils/categoryAppearance.js';

export default function CategoryIcon({ category, categoryId, size = 16 }) {
  const fallbackId = categoryId || category?.id;
  const iconName = normalizeCategoryIcon(category?.icon || fallbackId || DEFAULT_CATEGORY_ICON);
  const IconComponent = CATEGORY_ICON_COMPONENTS[iconName] || CATEGORY_ICON_COMPONENTS[DEFAULT_CATEGORY_ICON];

  if (!IconComponent) return null;

  return <IconComponent size={size} aria-hidden="true" />;
}

CategoryIcon.propTypes = {
  category: PropTypes.shape({
    id: PropTypes.string,
    icon: PropTypes.string,
  }),
  categoryId: PropTypes.string,
  size: PropTypes.number,
};
