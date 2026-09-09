import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Icon from '../components/Icon.jsx';

const initialForm = { name: '', email: '', password: '', confirm: '' };

const PREVIEW_ITEMS = [
  { icon: 'list', title: 'Track every entry', body: 'Capture expenses and income in one calm place.', badge: 'History' },
  { icon: 'bars', title: 'See reports clearly', body: 'Charts stay clean and focused when real data arrives.', badge: 'Reports' },
  { icon: 'clock', title: 'Plan with budgets', body: 'Built-in categories help you organize spending from day one.', badge: 'Budget' },
];

export default function Signup() {
  const [form, setForm] = useState(initialForm);
  const [touched, setTouched] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const navigate = useNavigate();

  const errors = validate(form);
  const isValid = Object.keys(errors).length === 0;

  function update(field) {
    return (event) => setForm({ ...form, [field]: event.target.value });
  }

  function blur(field) {
    return () => setTouched({ ...touched, [field]: true });
  }

  function show(field) {
    return touched[field] && errors[field];
  }

  async function onSubmit(event) {
    event.preventDefault();
    setTouched({ name: true, email: true, password: true, confirm: true });
    if (!isValid) return;

    setSubmitting(true);
    await new Promise((resolve) => setTimeout(resolve, 700));
    setSubmitting(false);
    setSuccess(true);
    setTimeout(() => navigate('/'), 900);
  }

  return (
    <div className="auth">
      <div className="auth__pane">
        <div className="auth__brand">
          <span className="auth__brand-mark" aria-hidden="true">
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
              <path d="M4 9.5 L7.5 13 L14.5 5.5" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </span>
          <span className="auth__brand-name">Expense Tracker</span>
        </div>

        <h1 className="auth__headline">Take quiet control of your money.</h1>
        <p className="auth__sub">
          A calm, mint-green expense tracker that puts the numbers you care about a tap away.
        </p>

        {success ? (
          <div className="card card--lg" role="status" aria-live="polite">
            <div className="row" style={{ gap: 12 }}>
              <span
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 12,
                  background: 'var(--accent-soft-bg)',
                  color: 'var(--accent-soft-ink)',
                  display: 'grid',
                  placeItems: 'center',
                }}
              >
                <Icon name="check" size={18} strokeWidth={2.4} />
              </span>
              <div>
                <div style={{ fontSize: 15, fontWeight: 500 }}>Welcome aboard, {form.name.split(' ')[0]}.</div>
                <div className="t-caption">Taking you to your dashboard...</div>
              </div>
            </div>
          </div>
        ) : (
          <form className="auth__form" onSubmit={onSubmit} noValidate>
            <Field
              label="Full name"
              hint="As you'd like it shown on your dashboard."
              error={show('name')}
            >
              <input
                className={`input${show('name') ? ' input--error' : ''}`}
                type="text"
                autoComplete="name"
                value={form.name}
                onChange={update('name')}
                onBlur={blur('name')}
                placeholder="Max Madison"
                aria-invalid={Boolean(show('name'))}
              />
            </Field>
            <Field label="Email" error={show('email')}>
              <input
                className={`input${show('email') ? ' input--error' : ''}`}
                type="email"
                autoComplete="email"
                value={form.email}
                onChange={update('email')}
                onBlur={blur('email')}
                placeholder="you@domain.com"
                aria-invalid={Boolean(show('email'))}
              />
            </Field>
            <Field label="Password" hint="At least 8 characters." error={show('password')}>
              <input
                className={`input${show('password') ? ' input--error' : ''}`}
                type="password"
                autoComplete="new-password"
                value={form.password}
                onChange={update('password')}
                onBlur={blur('password')}
                aria-invalid={Boolean(show('password'))}
              />
            </Field>
            <Field label="Confirm password" error={show('confirm')}>
              <input
                className={`input${show('confirm') ? ' input--error' : ''}`}
                type="password"
                autoComplete="new-password"
                value={form.confirm}
                onChange={update('confirm')}
                onBlur={blur('confirm')}
                aria-invalid={Boolean(show('confirm'))}
              />
            </Field>

            <button
              type="submit"
              className="btn btn--primary btn--lg btn--block"
              disabled={submitting}
              style={{ marginTop: 8 }}
            >
              {submitting ? 'Creating your account...' : 'Create account'}
            </button>
            <p className="auth__alt-link">
              Already have an account? <Link to="/">Continue to dashboard</Link>
            </p>
          </form>
        )}
      </div>

      <aside className="auth__hero" aria-hidden="true">
        <h2>Money you can read at a glance.</h2>
        <p>Mint-green clarity over busy charts. Your numbers, calmly arranged.</p>
        <div className="auth__preview">
          {PREVIEW_ITEMS.map((item) => (
            <div key={item.title} className="auth__preview-row">
              <span
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: 9,
                  background: 'var(--auth-accent-soft)',
                  display: 'grid',
                  placeItems: 'center',
                }}
              >
                <Icon name={item.icon} size={16} stroke="var(--mint)" />
              </span>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13, fontWeight: 500 }}>{item.title}</div>
                <div style={{ fontSize: 11, color: 'var(--auth-accent-text)' }}>{item.body}</div>
              </div>
              <div
                style={{
                  fontSize: 11,
                  color: 'var(--mint)',
                  padding: '4px 8px',
                  borderRadius: 999,
                  background: 'var(--auth-accent-soft)',
                }}
              >
                {item.badge}
              </div>
            </div>
          ))}
        </div>
      </aside>
    </div>
  );
}

function Field({ label, hint, error, children }) {
  return (
    <label className="field">
      <span className="field__label">{label}</span>
      {children}
      {error ? (
        <span className="field__error">{error}</span>
      ) : (
        hint && <span className="field__hint">{hint}</span>
      )}
    </label>
  );
}

function validate(form) {
  const errors = {};
  if (!form.name.trim()) errors.name = 'Please enter your full name.';
  if (!/^\S+@\S+\.\S+$/.test(form.email)) errors.email = "That email doesn't look right.";
  if (form.password.length < 8) errors.password = 'Use at least 8 characters.';
  if (form.confirm !== form.password) errors.confirm = "Passwords don't match.";
  return errors;
}
