import { Link } from 'react-router-dom';
import Icon from '../components/Icon.jsx';

const FEATURES = [
  { icon: 'clock', title: 'Monthly budgets', body: 'Set sensible limits per category and watch progress at a glance.' },
  { icon: 'bars', title: 'Reports & cashflow', body: 'See where money goes with bars and a custom Sankey flow chart.' },
  { icon: 'star', title: 'Savings goals', body: 'Track progress toward the things you actually want.' },
  { icon: 'wallet', title: 'Multiple accounts', body: 'Checking, savings, and credit handled consistently.' },
];

export default function About() {
  return (
    <>
      <header className="page-hero">
        <span className="t-eyebrow">About</span>
        <h1 className="t-h1">A calm place for your numbers.</h1>
        <p>
          Expense Tracker is a personal expense tracker with a mint-green visual identity.
          The product is built on a few principles: clarity over decoration, speed over density,
          and trust over playfulness. Every screen has one obvious primary action.
        </p>
      </header>

      <section className="dash-grid" style={{ alignItems: 'start' }}>
        <div className="card card--lg">
          <div className="t-eyebrow" style={{ marginBottom: 14 }}>The mission</div>
          <p style={{ marginBottom: 12 }}>
            Most finance apps drown the user in features. Expense Tracker is the opposite:
            you should feel in control of your money within a few seconds of opening it.
          </p>
          <p style={{ color: 'var(--text-2)' }}>
            Important numbers are big. Categories are colored consistently. Bright red is reserved
            for destructive actions only. Income amounts get a subtle emerald, expenses stay neutral.
            The result is a finance app that feels premium without trying too hard.
          </p>
        </div>

        <div className="card card--lg">
          <div className="t-eyebrow" style={{ marginBottom: 14 }}>What you can do</div>
          <ul className="stack" style={{ gap: 14 }}>
            {FEATURES.map((f) => (
              <li key={f.title} className="row" style={{ gap: 12, alignItems: 'flex-start' }}>
                <span style={{
                  width: 36, height: 36, borderRadius: 12,
                  background: 'var(--mint-wash)', color: 'var(--forest)',
                  display: 'grid', placeItems: 'center', flex: '0 0 auto',
                }}>
                  <Icon name={f.icon} size={18} />
                </span>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 500 }}>{f.title}</div>
                  <div className="t-caption">{f.body}</div>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section style={{ marginTop: 24 }}>
        <Link to="/" className="btn btn--primary">
          <Icon name="arrowLeft" size={14} />
          Back to dashboard
        </Link>
      </section>
    </>
  );
}
