import { useMemo, useState } from 'react';
import { Link, Navigate, useNavigate, useSearchParams } from 'react-router-dom';
import Icon from '../components/Icon.jsx';
import { useSession } from '../state/SessionState.jsx';
import { getSafeAuthRedirectTarget } from '../utils/demoAuth.js';

const SIGNUP_INITIAL = {
  firstName: '',
  lastName: '',
  email: '',
  password: '',
};

const LOGIN_INITIAL = {
  email: '',
  password: '',
};

const EMAIL_PATTERN = /^\S+@\S+\.\S+$/;

export default function Auth() {
  const { isAuthenticated, logIn, signUp } = useSession();
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const [signupForm, setSignupForm] = useState(SIGNUP_INITIAL);
  const [loginForm, setLoginForm] = useState(LOGIN_INITIAL);
  const [signupErrors, setSignupErrors] = useState({});
  const [loginErrors, setLoginErrors] = useState({});
  const [authMessage, setAuthMessage] = useState(null);
  const [oauthMessage, setOauthMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const mode = searchParams.get('mode') === 'login' ? 'login' : 'signup';
  const redirectTarget = getSafeAuthRedirectTarget(searchParams.get('from'), '/dashboard');
  const passwordStrength = useMemo(() => getPasswordStrength(signupForm.password), [signupForm.password]);

  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }

  function updateMode(nextMode) {
    const nextParams = new URLSearchParams(searchParams);
    nextParams.set('mode', nextMode);
    setSearchParams(nextParams, { replace: true });
    setAuthMessage(null);
    setOauthMessage('');
  }

  function updateSignup(field) {
    return (event) => {
      setSignupForm((prev) => ({ ...prev, [field]: event.target.value }));
      setSignupErrors((prev) => ({ ...prev, [field]: undefined }));
      setAuthMessage(null);
    };
  }

  function updateLogin(field) {
    return (event) => {
      setLoginForm((prev) => ({ ...prev, [field]: event.target.value }));
      setLoginErrors((prev) => ({ ...prev, [field]: undefined }));
      setAuthMessage(null);
    };
  }

  async function handleSignup(event) {
    event.preventDefault();
    const errors = validateSignup(signupForm);
    setSignupErrors(errors);
    setOauthMessage('');

    if (Object.keys(errors).length > 0) return;

    setSubmitting(true);
    setAuthMessage(null);

    try {
      await signUp(signupForm);
      navigate(redirectTarget, { replace: true });
    } catch (error) {
      setAuthMessage({ kind: 'error', text: error.message || 'Unable to create account right now.' });
    } finally {
      setSubmitting(false);
    }
  }

  async function handleLogin(event) {
    event.preventDefault();
    const errors = validateLogin(loginForm);
    setLoginErrors(errors);
    setOauthMessage('');

    if (Object.keys(errors).length > 0) return;

    setSubmitting(true);
    setAuthMessage(null);

    try {
      await logIn(loginForm);
      navigate(redirectTarget, { replace: true });
    } catch (error) {
      setAuthMessage({ kind: 'error', text: error.message || 'Invalid email or password.' });
    } finally {
      setSubmitting(false);
    }
  }

  function showOauthMessage(provider) {
    setAuthMessage(null);
    setOauthMessage(`${provider} login is coming soon.`);
  }

  return (
    <div className="auth-page">
      <div className="auth-page__bg" aria-hidden="true">
        <span className="auth-page__blob auth-page__blob--1" />
        <span className="auth-page__blob auth-page__blob--2" />
        <span className="auth-page__blob auth-page__blob--3" />
        <span className="auth-page__blob auth-page__blob--4" />
        <span className="auth-page__blob auth-page__blob--5" />
        <span className="auth-page__grid" />
      </div>

      <div className="auth-page__card-wrap">
        <div className="auth-card">
          <Link to="/" className="auth-card__logo">
            <span className="auth-card__logo-mark" aria-hidden="true">
              <svg width="16" height="16" viewBox="0 0 18 18" fill="none">
                <path d="M4 9.5 L7.5 13 L14.5 5.5" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </span>
            <span>Expense Tracker</span>
          </Link>

          <div className="auth-card__tabs" role="tablist" aria-label="Authentication mode">
            <button
              type="button"
              className={`auth-card__tab${mode === 'signup' ? ' is-active' : ''}`}
              onClick={() => updateMode('signup')}
              role="tab"
              aria-selected={mode === 'signup'}
            >
              Sign up
            </button>
            <button
              type="button"
              className={`auth-card__tab${mode === 'login' ? ' is-active' : ''}`}
              onClick={() => updateMode('login')}
              role="tab"
              aria-selected={mode === 'login'}
            >
              Log in
            </button>
          </div>

          <div className="auth-card__panel">
            <h1 className="auth-card__title">
              {mode === 'signup' ? 'Create your account' : 'Welcome back'}
            </h1>
            <p className="auth-card__subtitle">
              {mode === 'signup'
                ? 'Track your money locally first, then grow into the rest of the app.'
                : 'Log in to your local demo account and pick up where you left off.'}
            </p>

            <div className="auth-card__oauth-row">
              <button type="button" className="auth-card__oauth-btn" onClick={() => showOauthMessage('Google')}>
                <GoogleMark />
                Google
              </button>
              <button type="button" className="auth-card__oauth-btn" onClick={() => showOauthMessage('GitHub')}>
                <GitHubMark />
                GitHub
              </button>
            </div>

            <div className="auth-card__divider">
              <span />
              <span>or with email</span>
              <span />
            </div>

            {authMessage ? (
              <div className="auth-card__message auth-card__message--error" role="alert">
                <Icon name="alert" size={14} strokeWidth={2} />
                <span>{authMessage.text}</span>
              </div>
            ) : null}

            {oauthMessage ? (
              <div className="auth-card__message" role="status" aria-live="polite">
                <Icon name="sparkle" size={14} strokeWidth={2} />
                <span>{oauthMessage}</span>
              </div>
            ) : null}

            {mode === 'signup' ? (
              <form className="auth-card__form" onSubmit={handleSignup} noValidate>
                <div className="auth-card__field-row">
                  <AuthField label="First name" error={signupErrors.firstName}>
                    <input
                      type="text"
                      value={signupForm.firstName}
                      onChange={updateSignup('firstName')}
                      placeholder="Ayush"
                      autoComplete="given-name"
                      className={signupErrors.firstName ? 'is-error' : ''}
                    />
                  </AuthField>

                  <AuthField label="Last name" error={signupErrors.lastName}>
                    <input
                      type="text"
                      value={signupForm.lastName}
                      onChange={updateSignup('lastName')}
                      placeholder="Sharma"
                      autoComplete="family-name"
                      className={signupErrors.lastName ? 'is-error' : ''}
                    />
                  </AuthField>
                </div>

                <AuthField label="Email" error={signupErrors.email}>
                  <input
                    type="email"
                    value={signupForm.email}
                    onChange={updateSignup('email')}
                    placeholder="you@example.com"
                    autoComplete="email"
                    className={signupErrors.email ? 'is-error' : ''}
                  />
                </AuthField>

                <AuthField label="Password" error={signupErrors.password}>
                  <input
                    type="password"
                    value={signupForm.password}
                    onChange={updateSignup('password')}
                    placeholder="Min. 8 characters"
                    autoComplete="new-password"
                    className={signupErrors.password ? 'is-error' : ''}
                  />
                  <div className="auth-card__strength" aria-hidden="true">
                    {[0, 1, 2, 3].map((segment) => (
                      <span
                        key={segment}
                        className={`auth-card__strength-seg${
                          segment < passwordStrength.score ? ` is-${passwordStrength.tone}` : ''
                        }`}
                      />
                    ))}
                  </div>
                  <div className="auth-card__strength-label">
                    {passwordStrength.label || 'Use at least 8 characters.'}
                  </div>
                </AuthField>

                <button type="submit" className="auth-card__submit" disabled={submitting}>
                  {submitting ? 'Creating account...' : 'Create account'}
                </button>

                <p className="auth-card__terms">
                  Demo-only local auth. Your account and data stay on this device.
                </p>
              </form>
            ) : (
              <form className="auth-card__form" onSubmit={handleLogin} noValidate>
                <AuthField label="Email" error={loginErrors.email}>
                  <input
                    type="email"
                    value={loginForm.email}
                    onChange={updateLogin('email')}
                    placeholder="you@example.com"
                    autoComplete="email"
                    className={loginErrors.email ? 'is-error' : ''}
                  />
                </AuthField>

                <AuthField label="Password" error={loginErrors.password}>
                  <input
                    type="password"
                    value={loginForm.password}
                    onChange={updateLogin('password')}
                    placeholder="Your password"
                    autoComplete="current-password"
                    className={loginErrors.password ? 'is-error' : ''}
                  />
                </AuthField>

                <button type="submit" className="auth-card__submit" disabled={submitting}>
                  {submitting ? 'Logging in...' : 'Log in'}
                </button>

                <p className="auth-card__terms">
                  Local demo session only. Use the same device to return to this account.
                </p>
              </form>
            )}
          </div>

          <div className="auth-card__footer">
            {mode === 'signup' ? (
              <>
                Already have an account?{' '}
                <button type="button" onClick={() => updateMode('login')}>
                  Log in
                </button>
              </>
            ) : (
              <>
                Don&apos;t have an account?{' '}
                <button type="button" onClick={() => updateMode('signup')}>
                  Sign up
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function AuthField({ label, error, children }) {
  return (
    <label className="auth-card__field">
      <span>{label}</span>
      {children}
      {error ? <small>{error}</small> : null}
    </label>
  );
}

function validateSignup(form) {
  const errors = {};

  if (!String(form.firstName || '').trim()) errors.firstName = 'Please enter your first name.';
  if (!String(form.lastName || '').trim()) errors.lastName = 'Please enter your last name.';
  if (!EMAIL_PATTERN.test(String(form.email || '').trim())) errors.email = "That email doesn't look right.";
  if (String(form.password || '').length < 8) errors.password = 'Use at least 8 characters.';

  return errors;
}

function validateLogin(form) {
  const errors = {};

  if (!EMAIL_PATTERN.test(String(form.email || '').trim())) errors.email = "That email doesn't look right.";
  if (!String(form.password || '').trim()) errors.password = 'Please enter your password.';

  return errors;
}

function getPasswordStrength(password) {
  const value = String(password || '');
  let score = 0;

  if (value.length >= 8) score += 1;
  if (/[A-Z]/.test(value)) score += 1;
  if (/\d/.test(value)) score += 1;
  if (/[^A-Za-z0-9]/.test(value)) score += 1;

  if (!value) return { score: 0, tone: 'weak', label: '' };
  if (score <= 1) return { score, tone: 'weak', label: 'Weak' };
  if (score === 2) return { score, tone: 'medium', label: 'Fair' };
  if (score === 3) return { score, tone: 'strong', label: 'Good' };
  return { score, tone: 'strong', label: 'Strong' };
}

function GoogleMark() {
  return (
    <svg viewBox="0 0 18 18" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <path fill="#4285F4" d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.875 2.684-6.615z" />
      <path fill="#34A853" d="M9 18c2.43 0 4.467-.806 5.956-2.184l-2.908-2.258c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332C2.438 15.983 5.482 18 9 18z" />
      <path fill="#FBBC05" d="M3.964 10.707c-.18-.54-.282-1.117-.282-1.707s.102-1.167.282-1.707V4.961H.957C.347 6.175 0 7.55 0 9s.348 2.825.957 4.039l3.007-2.332z" />
      <path fill="#EA4335" d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0 5.482 0 2.438 2.017.957 4.961L3.964 7.293C4.672 5.163 6.656 3.58 9 3.58z" />
    </svg>
  );
}

function GitHubMark() {
  return (
    <svg viewBox="0 0 18 18" fill="currentColor" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <path d="M9 0C4.03 0 0 4.03 0 9c0 3.98 2.582 7.352 6.162 8.544.45.082.615-.195.615-.434 0-.214-.008-.78-.012-1.53-2.504.544-3.033-1.207-3.033-1.207-.41-1.04-1-1.317-1-1.317-.817-.559.062-.547.062-.547.903.063 1.378.927 1.378.927.803 1.376 2.107.978 2.62.748.082-.582.314-.978.572-1.202-1.998-.227-4.1-1-4.1-4.449 0-.982.35-1.786.924-2.416-.092-.228-.4-1.142.088-2.38 0 0 .754-.241 2.47.921A8.594 8.594 0 0 1 9 4.267c.763.004 1.532.104 2.25.303 1.714-1.162 2.467-.921 2.467-.921.49 1.238.182 2.152.09 2.38.575.63.922 1.434.922 2.416 0 3.457-2.105 4.22-4.11 4.441.323.278.61.827.61 1.666 0 1.203-.011 2.172-.011 2.47 0 .24.162.52.62.432C15.422 16.348 18 12.978 18 9c0-4.97-4.03-9-9-9z" />
    </svg>
  );
}
