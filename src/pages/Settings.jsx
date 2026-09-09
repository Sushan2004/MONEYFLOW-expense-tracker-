import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import BudgetPopoverSelect from '../components/BudgetPopoverSelect.jsx';
import Icon from '../components/Icon.jsx';
import { clearStoredAppState, useAppState } from '../state/AppState.jsx';
import { useSession } from '../state/SessionState.jsx';
import { getCurrencyDisplayName, getCurrencySymbol } from '../utils/currencyApi.js';
import { exportAppBackupJson, exportTransactionsCsv } from '../utils/exportData.js';
import { formatCurrency } from '../utils/format.js';

const ACCOUNT_ROWS = [
  { name: 'Profile', hint: 'Name, email, avatar', icon: 'info', badge: 'Coming soon' },
  { name: 'Security', hint: 'Password and 2-factor', icon: 'check', badge: 'Coming soon' },
];

const NOTIFICATION_ROWS = [
  { name: 'Budget warnings', hint: 'When you hit 80% of any budget', icon: 'alert', badge: 'Coming soon' },
  { name: 'Monthly summary', hint: 'A short note on the 1st', icon: 'info', badge: 'Coming soon' },
];

const THEME_OPTIONS = [
  {
    value: 'light',
    label: 'Light mode',
    hint: 'Bright canvas with soft mint accents',
    icon: 'sun',
  },
  {
    value: 'dark',
    label: 'Dark mode',
    hint: 'Deep Forest dark theme',
    icon: 'moon',
  },
  {
    value: 'system',
    label: 'System default',
    hint: 'Follow your device appearance',
    icon: 'settings',
  },
];

function SettingsInfoRows({ rows }) {
  return (
    <div className="settings-list">
      {rows.map((row) => (
        <div key={row.name} className="settings-row">
          <span className="row" style={{ gap: 12 }}>
            <span
              style={{
                width: 32,
                height: 32,
                borderRadius: 9,
                background: 'var(--accent-soft-bg)',
                color: 'var(--accent-soft-ink)',
                display: 'grid',
                placeItems: 'center',
              }}
            >
              <Icon name={row.icon} size={15} />
            </span>
            <span>
              <div className="settings-row__title-row">
                <span className="settings-row__name">{row.name}</span>
                {row.badge ? <span className="settings-row__badge">{row.badge}</span> : null}
              </div>
              <div className="settings-row__hint">{row.hint}</div>
            </span>
          </span>
          {row.badge ? null : <Icon name="more" size={16} stroke="var(--text-3)" />}
        </div>
      ))}
    </div>
  );
}

export default function Settings() {
  const {
    state,
    dispatch,
    resolvedTheme,
    systemTheme,
    displayCurrencyCode,
    currencyApiConfigured,
    setDisplayCurrency,
  } = useAppState();
  const { currentUser, logOut } = useSession();
  const [isExportOpen, setIsExportOpen] = useState(false);
  const navigate = useNavigate();
  const hasTransactions = state.transactions.length > 0;
  const currencyState = state.currency;
  const activeCurrencyRate = currencyState?.rates?.[displayCurrencyCode]?.rate || 1;
  const activeCurrencyUpdatedAt = currencyState?.rates?.[displayCurrencyCode]?.updatedAt || null;
  const currencyOptions = useMemo(
    () =>
      (currencyState?.availableCodes || ['USD']).map((code) => ({
        value: code,
        label: code,
        meta: getCurrencyDisplayName(code),
        visual: (
          <span className="settings-currency__visual" aria-hidden="true">
            {getCurrencySymbol(code)}
          </span>
        ),
      })),
    [currencyState?.availableCodes]
  );
  const currencyPreview = useMemo(
    () =>
      formatCurrency(1234.56, {
        currencyCode: displayCurrencyCode,
        rate: activeCurrencyRate,
      }),
    [activeCurrencyRate, displayCurrencyCode]
  );
  const ratePreview = useMemo(() => {
    if (displayCurrencyCode === 'USD') return 'Base currency: USD';
    return `1 USD ≈ ${formatCurrency(1, {
      currencyCode: displayCurrencyCode,
      rate: activeCurrencyRate,
    })}`;
  }, [activeCurrencyRate, displayCurrencyCode]);
  const rateUpdatedLabel = activeCurrencyUpdatedAt
    ? new Date(activeCurrencyUpdatedAt).toLocaleString('en-US', {
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
      })
    : null;

  function handleExportCsv() {
    exportTransactionsCsv({
      transactions: state.transactions,
      categories: state.categories,
      accounts: state.accounts,
      incomeEntries: state.incomeEntries,
      incomeSources: state.incomeSources,
    });
    dispatch({
      type: 'toast/show',
      payload: { message: 'CSV export downloaded.', kind: 'success' },
    });
    setIsExportOpen(false);
  }

  function handleExportJson() {
    exportAppBackupJson({
      state,
      settings: {
        displayCurrency: state.currency?.code || 'USD',
        baseCurrency: state.currency?.baseCode || 'USD',
      },
    });
    dispatch({
      type: 'toast/show',
      payload: { message: 'JSON backup downloaded.', kind: 'success' },
    });
    setIsExportOpen(false);
  }

  if (state.status !== 'ready') return null;

  return (
    <>
      <header className="topbar">
        <div className="topbar__title-block">
          <h1 className="topbar__title">Settings</h1>
          <span className="t-caption">{state.user?.email || 'No profile connected'}</span>
        </div>
      </header>

      <div className="dash-grid" style={{ alignItems: 'start' }}>
        <div className="stack">
          <section>
            <div className="t-eyebrow" style={{ marginBottom: 8 }}>Account</div>
            <SettingsInfoRows rows={ACCOUNT_ROWS} />
          </section>

          <section>
            <div className="t-eyebrow" style={{ marginBottom: 8 }}>Notifications</div>
            <SettingsInfoRows rows={NOTIFICATION_ROWS} />
          </section>

          <section>
            <div className="t-eyebrow" style={{ marginBottom: 8 }}>Export data</div>
            <div className="settings-list">
              <div className="settings-row">
                <span className="settings-row__content">
                  <div className="settings-row__name">Download your data</div>
                  <div className="settings-row__hint">
                    {hasTransactions
                      ? 'Download a transactions CSV or a full JSON backup of your app data'
                      : 'JSON backup is ready any time. CSV becomes available after you add transactions.'}
                  </div>
                </span>
                <button
                  type="button"
                  className="btn btn--secondary"
                  onClick={() => setIsExportOpen(true)}
                >
                  <Icon name="download" size={14} />
                  Export Data
                </button>
              </div>
            </div>
          </section>

          <section>
            <div className="t-eyebrow" style={{ marginBottom: 8 }}>Currency</div>
            <div className="settings-list">
              <div className="settings-row settings-row--wide-control">
                <span className="settings-row__content">
                  <div className="settings-row__name">Display currency</div>
                  <div className="settings-row__hint">
                    All amounts stay stored in USD. Changing this only affects how money is shown across the app.
                  </div>
                  <div className="settings-row__meta-note">
                    Preview: <span className="tnum">{currencyPreview}</span> / {ratePreview}
                  </div>
                  {rateUpdatedLabel ? (
                    <div className="settings-row__meta-note">Rate updated {rateUpdatedLabel}</div>
                  ) : null}
                  {currencyState?.error ? (
                    <div className="settings-row__error">{currencyState.error}</div>
                  ) : null}
                  {!currencyApiConfigured ? (
                    <div className="settings-row__meta-note">
                      Add <code>VITE_UNIRATE_API_KEY</code> to enable live UniRate conversion.
                    </div>
                  ) : null}
                </span>
                <div className="settings-row__control">
                  <BudgetPopoverSelect
                    value={displayCurrencyCode}
                    options={currencyOptions}
                    onChange={(code) => {
                      void setDisplayCurrency(code);
                    }}
                    placeholder="Choose currency"
                    ariaLabel="Select display currency"
                    disabled={currencyState?.isLoading}
                    keyboardSearch
                    emptyLabel="No currency found."
                  />
                </div>
              </div>
            </div>
          </section>
        </div>

        <div className="stack">
          <section>
            <div className="t-eyebrow" style={{ marginBottom: 8 }}>Appearance</div>
            <div className="appearance-grid">
              {THEME_OPTIONS.map((option) => {
                const active = state.themeMode === option.value;
                const previewClass =
                  option.value === 'light'
                    ? 'appearance-option__preview--light'
                    : option.value === 'dark'
                      ? 'appearance-option__preview--dark'
                      : resolvedTheme === 'dark'
                        ? 'appearance-option__preview--dark'
                        : 'appearance-option__preview--light';

                return (
                  <button
                    key={option.value}
                    type="button"
                    className={`appearance-option${active ? ' is-active' : ''}`}
                    onClick={() => dispatch({ type: 'theme/set', payload: option.value })}
                    aria-pressed={active}
                  >
                    <span className={`appearance-option__preview ${previewClass}`} aria-hidden="true">
                      <span className="appearance-option__preview-top" />
                      <span className="appearance-option__preview-card" />
                      <span className="appearance-option__preview-card appearance-option__preview-card--small" />
                    </span>
                    <span className="appearance-option__copy">
                      <span className="appearance-option__title-row">
                        <span className="appearance-option__title">{option.label}</span>
                        {active ? (
                          <span className="appearance-option__badge">
                            <Icon name="check" size={12} strokeWidth={2} />
                            Selected
                          </span>
                        ) : null}
                      </span>
                      <span className="appearance-option__hint">{option.hint}</span>
                      {option.value === 'system' ? (
                        <span className="appearance-option__meta">
                          Currently using {systemTheme === 'dark' ? 'Deep Forest dark' : 'Light mode'}
                        </span>
                      ) : null}
                    </span>
                  </button>
                );
              })}
            </div>
          </section>

          <section>
            <div className="t-eyebrow" style={{ marginBottom: 8 }}>Workspace</div>
            <div className="settings-list">
              <div className="settings-row">
                <span>
                  <div className="settings-row__name">Start fresh</div>
                  <div className="settings-row__hint">Clear local demo data and return to an empty workspace</div>
                </span>
                <button
                  type="button"
                  className="btn btn--secondary"
                  onClick={() => {
                    clearStoredAppState(currentUser?.id);
                    window.location.reload();
                  }}
                >
                  <Icon name="refresh" size={14} />
                  Clear data
                </button>
              </div>
            </div>
          </section>

          <section>
            <div className="t-eyebrow" style={{ marginBottom: 8 }}>Session</div>
            <div className="settings-list">
              <div className="settings-row">
                <span>
                  <div className="settings-row__name">Log out</div>
                  <div className="settings-row__hint">End this local demo session and return to the landing page</div>
                </span>
                <button
                  type="button"
                  className="btn btn--danger"
                  onClick={() => {
                    logOut();
                    navigate('/', { replace: true });
                  }}
                >
                  <Icon name="x" size={14} />
                  Log out
                </button>
              </div>
            </div>
          </section>
        </div>
      </div>

      {isExportOpen ? (
        <div
          className="sheet-backdrop"
          role="presentation"
          onClick={() => setIsExportOpen(false)}
        >
          <div
            className="sheet export-sheet"
            role="dialog"
            aria-modal="true"
            aria-labelledby="export-sheet-title"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="sheet__head export-sheet__head">
              <div>
                <div className="t-eyebrow">Export</div>
                <h2 id="export-sheet-title" className="t-h1">Choose export format</h2>
                <div className="t-caption">Download transactions for spreadsheets or export a full backup.</div>
              </div>
              <button
                type="button"
                className="export-sheet__close"
                aria-label="Close export options"
                onClick={() => setIsExportOpen(false)}
              >
                <Icon name="x" size={16} />
              </button>
            </div>

            <div className="export-sheet__options">
              <article className="export-option">
                <div className="export-option__icon" aria-hidden="true">
                  <Icon name="list" size={18} />
                </div>
                <div className="export-option__copy">
                  <div className="export-option__title">CSV</div>
                  <div className="export-option__eyebrow">Best for Excel / Google Sheets</div>
                  <p className="export-option__body">
                    Exports transactions in spreadsheet format with date, type, category, name, amount, note, and source.
                  </p>
                </div>
                <div className="export-option__actions">
                  <button
                    type="button"
                    className="btn btn--secondary"
                    disabled={!hasTransactions}
                    onClick={handleExportCsv}
                  >
                    <Icon name="download" size={14} />
                    Download CSV
                  </button>
                  {!hasTransactions ? (
                    <div className="export-option__meta">Add transactions to enable CSV export.</div>
                  ) : null}
                </div>
              </article>

              <article className="export-option">
                <div className="export-option__icon" aria-hidden="true">
                  <Icon name="grid" size={18} />
                </div>
                <div className="export-option__copy">
                  <div className="export-option__title">JSON</div>
                  <div className="export-option__eyebrow">Best for backup</div>
                  <p className="export-option__body">
                    Exports full app data including transactions, categories, budgets, income, savings, and settings.
                  </p>
                </div>
                <div className="export-option__actions">
                  <button
                    type="button"
                    className="btn btn--secondary"
                    onClick={handleExportJson}
                  >
                    <Icon name="download" size={14} />
                    Download JSON
                  </button>
                </div>
              </article>
            </div>

            <div className="export-sheet__footer">
              <button
                type="button"
                className="btn btn--ghost"
                onClick={() => setIsExportOpen(false)}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
