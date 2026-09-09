import PropTypes from 'prop-types';
import { useEffect, useId, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import Icon from './Icon.jsx';
import {
  DEFAULT_CATEGORY_COLOR,
  hexToRgb,
  hsvToRgb,
  normalizeCategoryColor,
  rgbToHex,
  rgbToHsv,
} from '../utils/categoryAppearance.js';

const PRESETS = [
  '#10B981', '#0EA5E9', '#6366F1', '#A855F7', '#EC4899',
  '#EF4444', '#F97316', '#F59E0B', '#84CC16', '#14B8A6',
];

function clampHsv(value) {
  return {
    h: Math.max(0, Math.min(360, value.h)),
    s: Math.max(0, Math.min(1, value.s)),
    v: Math.max(0, Math.min(1, value.v)),
  };
}

function hexFromHsv(hsv) {
  return rgbToHex(hsvToRgb(hsv));
}

function parseRgbInput(value) {
  const num = Number.parseInt(value, 10);
  if (Number.isNaN(num)) return null;
  return Math.max(0, Math.min(255, num));
}

export default function ColorPickerModal({ open, value, onClose, onSave }) {
  const initialHex = useMemo(() => normalizeCategoryColor(value || DEFAULT_CATEGORY_COLOR), [value]);
  const [hsv, setHsv] = useState(() => rgbToHsv(hexToRgb(initialHex)));
  const [hexDraft, setHexDraft] = useState(initialHex);
  const svRef = useRef(null);
  const hueRef = useRef(null);
  const saveButtonRef = useRef(null);
  const titleId = useId();
  const portalTarget = typeof document !== 'undefined' ? document.body : null;

  const currentRgb = useMemo(() => hsvToRgb(hsv), [hsv]);
  const currentHex = useMemo(() => rgbToHex(currentRgb), [currentRgb]);
  const hueColor = `hsl(${Math.round(hsv.h)}, 100%, 50%)`;

  useEffect(() => {
    if (!open) return;
    const next = rgbToHsv(hexToRgb(initialHex));
    setHsv(next);
    setHexDraft(initialHex);
  }, [open, initialHex]);

  useEffect(() => {
    setHexDraft(currentHex);
  }, [currentHex]);

  useEffect(() => {
    if (!open) return undefined;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const frame = window.requestAnimationFrame(() => {
      saveButtonRef.current?.focus();
    });

    function handleKeyDown(event) {
      if (event.key === 'Escape') {
        event.preventDefault();
        onClose();
      }
    }

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      window.cancelAnimationFrame(frame);
      document.body.style.overflow = previousOverflow;
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [open, onClose]);

  function updateFromSv(event) {
    const node = svRef.current;
    if (!node) return;
    const rect = node.getBoundingClientRect();
    const x = (event.clientX - rect.left) / rect.width;
    const y = (event.clientY - rect.top) / rect.height;
    setHsv((prev) => clampHsv({ ...prev, s: x, v: 1 - y }));
  }

  function updateFromHue(event) {
    const node = hueRef.current;
    if (!node) return;
    const rect = node.getBoundingClientRect();
    const x = (event.clientX - rect.left) / rect.width;
    setHsv((prev) => clampHsv({ ...prev, h: Math.max(0, Math.min(1, x)) * 360 }));
  }

  function bindPointer(handler) {
    return (event) => {
      event.preventDefault();
      const target = event.currentTarget;
      target.setPointerCapture(event.pointerId);
      handler(event);

      function move(moveEvent) {
        handler(moveEvent);
      }
      function up(upEvent) {
        target.releasePointerCapture(upEvent.pointerId);
        target.removeEventListener('pointermove', move);
        target.removeEventListener('pointerup', up);
        target.removeEventListener('pointercancel', up);
      }

      target.addEventListener('pointermove', move);
      target.addEventListener('pointerup', up);
      target.addEventListener('pointercancel', up);
    };
  }

  function handleHexChange(event) {
    const next = event.target.value;
    setHexDraft(next);
    const trimmed = next.startsWith('#') ? next : `#${next}`;
    const rgb = hexToRgb(trimmed);
    if (rgb) setHsv(rgbToHsv(rgb));
  }

  function handleHexBlur() {
    setHexDraft(currentHex);
  }

  function handleRgbChange(channel, value) {
    const next = parseRgbInput(value);
    if (next === null) return;
    const merged = { ...currentRgb, [channel]: next };
    setHsv(rgbToHsv(merged));
  }

  function handlePreset(hex) {
    const rgb = hexToRgb(hex);
    if (rgb) setHsv(rgbToHsv(rgb));
  }

  function handleSave() {
    onSave(currentHex);
  }

  if (!open || !portalTarget) return null;

  const svBackground = `linear-gradient(to top, #000, transparent), linear-gradient(to right, #fff, ${hueColor})`;
  const hueBackground = 'linear-gradient(to right, #ff0000 0%, #ffff00 17%, #00ff00 33%, #00ffff 50%, #0000ff 67%, #ff00ff 83%, #ff0000 100%)';

  return createPortal(
    <div
      className="sheet-backdrop picker-backdrop"
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <section
        className="sheet picker-sheet picker-sheet--color"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
      >
        <div className="picker-sheet__head">
          <div>
            <h2 id={titleId} className="t-h2">Pick a color</h2>
            <div className="t-caption">Choose any color, then save to apply it as the category accent.</div>
          </div>
          <button
            type="button"
            className="picker-sheet__close"
            onClick={onClose}
            aria-label="Close color picker"
          >
            <Icon name="x" size={16} strokeWidth={2} />
          </button>
        </div>

        <div className="color-picker">
          <div
            ref={svRef}
            className="color-picker__sv"
            style={{ background: svBackground }}
            onPointerDown={bindPointer(updateFromSv)}
            role="presentation"
          >
            <span
              className="color-picker__sv-thumb"
              style={{
                left: `${hsv.s * 100}%`,
                top: `${(1 - hsv.v) * 100}%`,
                background: currentHex,
              }}
            />
          </div>

          <div
            ref={hueRef}
            className="color-picker__hue"
            style={{ background: hueBackground }}
            onPointerDown={bindPointer(updateFromHue)}
            role="presentation"
          >
            <span
              className="color-picker__hue-thumb"
              style={{ left: `${(hsv.h / 360) * 100}%`, background: hueColor }}
            />
          </div>

          <div className="color-picker__preview">
            <span className="color-picker__swatch" style={{ background: currentHex }} aria-hidden="true" />
            <div className="color-picker__preview-meta">
              <span className="color-picker__preview-label">Live preview</span>
              <span className="color-picker__preview-hex tnum">{currentHex}</span>
            </div>
          </div>

          <div className="color-picker__inputs">
            <label className="color-picker__field">
              <span className="color-picker__field-label">HEX</span>
              <input
                type="text"
                className="input color-picker__input"
                value={hexDraft}
                onChange={handleHexChange}
                onBlur={handleHexBlur}
                spellCheck={false}
                maxLength={7}
                aria-label="Hex color value"
              />
            </label>
            {(['r', 'g', 'b']).map((channel) => (
              <label key={channel} className="color-picker__field color-picker__field--rgb">
                <span className="color-picker__field-label">{channel.toUpperCase()}</span>
                <input
                  type="number"
                  className="input color-picker__input"
                  value={currentRgb[channel]}
                  onChange={(event) => handleRgbChange(channel, event.target.value)}
                  min={0}
                  max={255}
                  aria-label={`${channel.toUpperCase()} channel`}
                />
              </label>
            ))}
          </div>

          <div className="color-picker__presets" role="group" aria-label="Preset colors">
            {PRESETS.map((hex) => {
              const selected = hex.toUpperCase() === currentHex.toUpperCase();
              return (
                <button
                  key={hex}
                  type="button"
                  className={`color-picker__preset${selected ? ' is-selected' : ''}`}
                  style={{ background: hex }}
                  onClick={() => handlePreset(hex)}
                  aria-label={`Use ${hex}`}
                  aria-pressed={selected}
                  title={hex}
                />
              );
            })}
          </div>

          <div className="color-picker__actions">
            <button type="button" className="btn btn--secondary" onClick={onClose}>
              Cancel
            </button>
            <button
              ref={saveButtonRef}
              type="button"
              className="btn btn--primary"
              onClick={handleSave}
            >
              Save color
            </button>
          </div>
        </div>
      </section>
    </div>,
    portalTarget,
  );
}

ColorPickerModal.propTypes = {
  open: PropTypes.bool.isRequired,
  value: PropTypes.string,
  onClose: PropTypes.func.isRequired,
  onSave: PropTypes.func.isRequired,
};
