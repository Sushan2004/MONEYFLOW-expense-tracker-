import PropTypes from 'prop-types';
import { useEffect, useMemo, useState } from 'react';
import CategoryIcon from './CategoryIcon.jsx';
import ColorPickerModal from './ColorPickerModal.jsx';
import Icon from './Icon.jsx';
import IconPickerModal from './IconPickerModal.jsx';
import {
  CATEGORY_ICON_OPTIONS,
  DEFAULT_CATEGORY_COLOR,
  DEFAULT_CATEGORY_ICON,
  EXTENDED_CATEGORY_ICON_OPTIONS,
  getCategoryAccentStyle,
  normalizeCategoryColor,
  normalizeCategoryIcon,
} from '../utils/categoryAppearance.js';

function pickInitialIcon(usedSet) {
  if (!usedSet.has(DEFAULT_CATEGORY_ICON)) return DEFAULT_CATEGORY_ICON;
  const fromSuggested = CATEGORY_ICON_OPTIONS.find((option) => !usedSet.has(option.value));
  if (fromSuggested) return fromSuggested.value;
  const fromExtended = EXTENDED_CATEGORY_ICON_OPTIONS.find((option) => !usedSet.has(option.value));
  return fromExtended?.value || DEFAULT_CATEGORY_ICON;
}

export default function CategoryCreator({
  categories,
  title = 'Create category',
  description = 'Custom categories stay local to this demo workspace.',
  submitLabel = 'Save category',
  onCancel,
  onSave,
}) {
  const usedIcons = useMemo(
    () => categories.map((category) => category.icon).filter(Boolean),
    [categories]
  );
  const usedSet = useMemo(() => new Set(usedIcons), [usedIcons]);

  const [name, setName] = useState('');
  const [icon, setIcon] = useState(() => pickInitialIcon(usedSet));
  const [color, setColor] = useState(DEFAULT_CATEGORY_COLOR);
  const [iconPickerOpen, setIconPickerOpen] = useState(false);
  const [colorPickerOpen, setColorPickerOpen] = useState(false);

  useEffect(() => {
    if (usedSet.has(icon)) {
      setIcon(pickInitialIcon(usedSet));
    }
  }, [usedSet, icon]);

  const trimmedName = name.trim();
  const duplicateName = useMemo(
    () => categories.some((category) => category.name.trim().toLowerCase() === trimmedName.toLowerCase()),
    [categories, trimmedName]
  );
  const duplicateIcon = usedSet.has(icon);
  const canSave = trimmedName.length > 0 && !duplicateName && !duplicateIcon;
  const previewColor = normalizeCategoryColor(color);
  const safeIcon = normalizeCategoryIcon(icon);
  const allSuggestedTaken = CATEGORY_ICON_OPTIONS.every((option) => usedSet.has(option.value));

  function handleSubmit(event) {
    if (event && typeof event.preventDefault === 'function') event.preventDefault();
    if (!canSave) return;
    onSave({
      name: trimmedName,
      icon: safeIcon,
      colorVar: previewColor,
    });
  }

  function handleNameKeyDown(event) {
    if (event.key === 'Enter') {
      event.preventDefault();
      handleSubmit(event);
    }
  }

  function selectIcon(value) {
    if (usedSet.has(value)) return;
    setIcon(value);
    setIconPickerOpen(false);
  }

  function selectColor(hex) {
    setColor(normalizeCategoryColor(hex));
    setColorPickerOpen(false);
  }

  return (
    <section className="card card--lg category-create-card">
      <div className="category-create-card__head">
        <div>
          <h2 className="t-h2">{title}</h2>
          <div className="t-caption">{description}</div>
        </div>
      </div>

      <div className="category-create">
        <label className="field">
          <span className="field__label">Category name</span>
          <input
            className={`input${trimmedName && duplicateName ? ' input--error' : ''}`}
            value={name}
            onChange={(event) => setName(event.target.value)}
            onKeyDown={handleNameKeyDown}
            placeholder="Examples: Pets, Travel, Gifts"
            maxLength={24}
          />
          {trimmedName && duplicateName ? (
            <span className="field__error">A category with this name already exists.</span>
          ) : (
            <span className="field__hint">Keep it short so it fits well in reports and filters.</span>
          )}
        </label>

        <div
          className="category-create__preview"
          style={{
            background: getCategoryAccentStyle(previewColor, 0.08).backgroundColor,
            borderColor: getCategoryAccentStyle(previewColor, 0.32).backgroundColor,
          }}
        >
          <span
            className="category-create__preview-icon"
            style={getCategoryAccentStyle(previewColor, 0.18)}
          >
            <CategoryIcon category={{ icon: safeIcon }} size={22} />
          </span>
          <div className="category-create__preview-meta">
            <span className="category-create__preview-name">
              {trimmedName || 'New category'}
            </span>
            <span className="category-create__preview-sub">
              <span className="category-create__preview-dot" style={{ background: previewColor }} aria-hidden="true" />
              <span className="tnum">{previewColor}</span>
            </span>
          </div>
        </div>

        <button
          type="button"
          className="category-create__chooser category-create__chooser--full"
          onClick={() => setColorPickerOpen(true)}
        >
          <span
            className="category-create__chooser-swatch category-create__chooser-swatch--solid"
            style={{ background: previewColor }}
            aria-hidden="true"
          />
          <span className="category-create__chooser-meta">
            <span className="category-create__chooser-label">Color</span>
            <span className="category-create__chooser-value tnum">{previewColor}</span>
          </span>
          <span className="category-create__chooser-cta">Change</span>
        </button>

        <div className="field">
          <span className="field__label">Suggested icons</span>
          <div className="category-create__icon-grid">
            {CATEGORY_ICON_OPTIONS.map((option) => {
              const isSelected = safeIcon === option.value;
              const isUsed = usedSet.has(option.value) && !isSelected;
              return (
                <button
                  key={option.value}
                  type="button"
                  className={`category-create__icon-option${isSelected ? ' is-selected' : ''}${isUsed ? ' is-disabled' : ''}`}
                  onClick={() => !isUsed && setIcon(option.value)}
                  aria-label={isUsed ? `${option.label} (already used)` : option.label}
                  aria-pressed={isSelected}
                  aria-disabled={isUsed}
                  disabled={isUsed}
                  title={isUsed ? 'Already used by another category' : option.label}
                >
                  <span
                    className="category-create__icon-swatch"
                    style={getCategoryAccentStyle(previewColor, isUsed ? 0.06 : isSelected ? 0.2 : 0.14)}
                  >
                    <CategoryIcon category={{ icon: option.value }} size={18} />
                  </span>
                  <span className="category-create__icon-name">{option.label}</span>
                </button>
              );
            })}
            <button
              type="button"
              className="category-create__icon-option category-create__icon-option--more"
              onClick={() => setIconPickerOpen(true)}
              aria-label="More icons"
            >
              <span className="category-create__icon-swatch category-create__icon-swatch--more">
                <Icon name="more" size={18} strokeWidth={2} />
              </span>
              <span className="category-create__icon-name">More icons</span>
            </button>
          </div>
          {duplicateIcon ? (
            <span className="field__error">This icon is already used by another category.</span>
          ) : allSuggestedTaken ? (
            <span className="field__hint">All suggested icons are taken — open “More icons” for additional options.</span>
          ) : (
            <span className="field__hint">Each category needs a unique icon. Already-used icons are dimmed.</span>
          )}
        </div>

        <div className="category-create__actions">
          {onCancel ? (
            <button type="button" className="btn btn--secondary" onClick={onCancel}>
              Cancel
            </button>
          ) : null}
          <button
            type="button"
            className="btn btn--primary"
            disabled={!canSave}
            onClick={handleSubmit}
          >
            {submitLabel}
          </button>
        </div>
      </div>

      <IconPickerModal
        open={iconPickerOpen}
        value={safeIcon}
        color={previewColor}
        usedIcons={usedIcons}
        onClose={() => setIconPickerOpen(false)}
        onSelect={selectIcon}
      />
      <ColorPickerModal
        open={colorPickerOpen}
        value={previewColor}
        onClose={() => setColorPickerOpen(false)}
        onSave={selectColor}
      />
    </section>
  );
}

CategoryCreator.propTypes = {
  categories: PropTypes.arrayOf(
    PropTypes.shape({
      id: PropTypes.string.isRequired,
      name: PropTypes.string.isRequired,
      icon: PropTypes.string,
    })
  ).isRequired,
  title: PropTypes.string,
  description: PropTypes.string,
  submitLabel: PropTypes.string,
  onCancel: PropTypes.func,
  onSave: PropTypes.func.isRequired,
};
