import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import Icon from '../components/Icon.jsx';
import useGreeting from '../hooks/useGreeting.js';
import { useSession } from '../state/SessionState.jsx';
import './Landing.css';

const FEATURES = [
  ['list', 'Every entry. One clear picture.', 'Log income and expenses, organize categories, and keep your everyday spending in view.'],
  ['wallet', 'Give your budget a little breathing room.', 'Set category limits and see what is left before your next purchase.'],
  ['bars', 'Find the story behind the numbers.', 'Explore spending reports and see how your money moves across the periods that matter to you.'],
  ['star', 'Make room for your next big thing.', 'Create savings goals and track the money you put toward each milestone.'],
  ['sparkle', 'A little help making sense of it all.', 'Ask the local assistant about spending, budgets, and estimated upcoming recurring bills.'],
  ['grid', 'Your money, your categories.', 'Personalize categories with colors and icons that make your records easy to recognize.'],
];
const PREVIEWS = {
  Spending: { label: 'Monthly spending', value: '$1,240', note: '$360 left in your sample budget', rows: [['Groceries', '$420', 68], ['Shopping', '$280', 46], ['Transport', '$160', 28]] },
  Budget: { label: 'Monthly budget', value: '$1,600', note: '78% of your sample budget used', rows: [['Spent', '$1,240', 78], ['Remaining', '$360', 23], ['Budget', '$1,600', 100]] },
  Goals: { label: 'Adventure fund', value: '$750', note: 'Halfway to a $1,500 sample goal', rows: [['Adventure fund', '50%', 50], ['New laptop', '70%', 70], ['Rainy day fund', '35%', 35]] },
};
const FAQS = [
  ['Can I use Moneyflow on my phone?', 'Yes. Open the website in your phone’s browser. The dashboard and assistant adapt to a smaller screen. You can also use it in a browser on Windows or Mac.'],
  ['Where is my data stored?', 'Your account, entries, and chat history are stored in this browser on this device. They do not automatically sync to another device. Clearing browser storage can remove them. This project uses demo local authentication.'],
  ['How does the assistant work?', 'The assistant matches supported questions and calculates answers from your saved records. It can show spending summaries, budget comparisons, and estimated recurring bills. It is a local, rule-based assistant; it does not connect to a generative AI service.'],
  ['Do I need to connect my bank?', 'No. You enter your own transactions and manage your budgets and goals. Moneyflow does not currently connect to banks or move money for you.'],
];

export default function Landing() {
  const { isAuthenticated } = useSession();
  const greeting = useGreeting();
  const root = useRef(null);
  const [preview, setPreview] = useState('Spending');
  const [paused, setPaused] = useState(false);
  const sample = PREVIEWS[preview];
  const target = isAuthenticated ? '/dashboard' : '/auth?mode=signup';
  const cta = isAuthenticated ? 'Open dashboard' : 'Get started free';

  useEffect(() => {
    if (!('IntersectionObserver' in window) || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return undefined;
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('mf-visible');
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.08 });
    root.current.querySelectorAll('[data-reveal]').forEach((element) => {
      element.classList.add('mf-reveal');
      observer.observe(element);
    });
    return () => observer.disconnect();
  }, []);

  return (
    <div className={`mf-site${paused ? ' mf-paused' : ''}`} ref={root}>
      <a className="mf-skip" href="#main-content">Skip to content</a>
      <header className="mf-header">
        <Link className="mf-brand" to="/" aria-label="Moneyflow home"><span><Icon name="bars" size={23} /></span>moneyflow<span className="mf-brand-dot">.</span></Link>
        <nav className="mf-nav" aria-label="Main navigation"><a href="#features">Features</a><a href="#about">How it works</a><a href="#questions">FAQs</a></nav>
        <div className="mf-header-actions">
          {!isAuthenticated && <Link className="mf-login" to="/auth?mode=login">Log in</Link>}
          <Link className="mf-button mf-button-small" to={target}>{isAuthenticated ? 'Dashboard' : 'Sign up'}<span aria-hidden="true">↗</span></Link>
        </div>
      </header>

      <main id="main-content">
        <section className="mf-hero">
          <div className="mf-hero-copy">
            <p className="mf-eyebrow"><span className="mf-status-dot" /> A clearer view of your everyday money</p>
            <h1>Less money stress.<br />More <em>living.</em></h1>
            <p className="mf-intro">See where it goes. Plan where it grows. Bring your spending, budgets, and savings together in one calm space.</p>
            <div className="mf-actions"><Link className="mf-button" to={target}>{cta}<span aria-hidden="true">↗</span></Link><a className="mf-text-link" href="#features">Explore the features <span aria-hidden="true">↓</span></a></div>
            <p className="mf-hero-note"><Icon name="check" /> Free to use <span>·</span> No bank connection needed</p>
          </div>
          <div className="mf-preview-stage" id="preview">
            <div className="mf-orbit mf-orbit-one" aria-hidden="true" /><div className="mf-orbit mf-orbit-two" aria-hidden="true" />
            <div className="mf-phone">
              <div className="mf-phone-top" aria-hidden="true"><span>9:41</span><i /><span>▰</span></div>
              <div className="mf-phone-brand">moneyflow<span>✳</span></div>
              <p className="mf-greeting">{greeting}</p>
              <div className="mf-phone-tabs" role="group" aria-label="Sample preview views">{Object.keys(PREVIEWS).map((name) => <button key={name} type="button" aria-pressed={preview === name} onClick={() => setPreview(name)}>{name}</button>)}</div>
              <div className="mf-phone-card" key={preview} aria-live="polite" aria-atomic="true">
                <p>{sample.label}</p><strong>{sample.value}<span>.00</span></strong>
                <svg className="mf-line-chart" viewBox="0 0 280 110" role="img" aria-label="Illustrative upward trend">
                  <defs><linearGradient id="mf-chart-fill" x1="0" y1="0" x2="0" y2="1"><stop stopColor="currentColor" stopOpacity=".22" /><stop offset="1" stopColor="currentColor" stopOpacity="0" /></linearGradient></defs>
                  <path className="mf-chart-grid" d="M0 25H280M0 65H280M0 105H280" />
                  <path fill="url(#mf-chart-fill)" stroke="none" d="M0 95C30 95 25 65 60 68S95 50 120 53S160 20 190 28S230 12 280 10V110H0Z" />
                  <path className="mf-chart-line" d="M0 95C30 95 25 65 60 68S95 50 120 53S160 20 190 28S230 12 280 10" />
                </svg>
                <small><Icon name="check" />{sample.note}</small>
              </div>
              <div className="mf-phone-breakdown"><h3>{preview === 'Goals' ? 'Your next milestones' : 'At a glance'}</h3>{sample.rows.map(([label, value, width]) => <div className="mf-mini-row" key={label}><div><span>{label}</span><b>{value}</b></div><i><span style={{ width: `${width}%` }} /></i></div>)}</div>
              <p className="mf-sample-label">Interactive preview · Sample data</p>
              <div className="mf-phone-bottom" aria-hidden="true"><Icon name="home" /><Icon name="bars" /><Icon name="star" /><Icon name="settings" /></div>
            </div>
            <div className="mf-floating-card mf-floating-goal"><span className="mf-mini-icon"><Icon name="star" size={22} /></span><div><b>Little steps. Bigger plans.</b><span>Your next adventure starts here.</span></div></div>
            <div className="mf-floating-card mf-floating-chat"><span className="mf-mini-icon"><Icon name="sparkle" size={22} /></span><div><b>Meet your money assistant</b><span>Answers from your saved records.</span></div></div>
          </div>
        </section>

        <section className="mf-benefits" aria-label="Moneyflow at a glance"><span><Icon name="wallet" /> Spending, made clear</span><span><Icon name="star" /> Goals, kept in sight</span><span><Icon name="sparkle" /> Insights, close at hand</span><span><Icon name="grid" /> Mobile, Mac & Windows browsers</span></section>

        <section className="mf-section" id="features">
          <div className="mf-section-heading" data-reveal><p className="mf-eyebrow">Small habits. A clearer picture.</p><h2>Everything you need to<br />find your financial footing.</h2><p>Less jumping between numbers. More understanding what they mean.</p></div>
          <div className="mf-feature-grid">{FEATURES.map(([icon, title, body], index) => <article className="mf-feature" data-reveal key={title} style={{ '--mf-delay': `${index % 3 * 80}ms` }}><span className="mf-feature-icon"><Icon name={icon} size={27} /></span><h3>{title}</h3><p>{body}</p><Link className="mf-text-link" to={target}>Explore Moneyflow <span aria-hidden="true">↗</span></Link></article>)}</div>
        </section>

        <section className="mf-life-section" id="about" data-reveal>
          <div className="mf-life-art"><div className="mf-life-caption"><span>A little more room for</span><strong>what matters.</strong></div><div className="mf-life-goal"><Icon name="star" size={23} /><div><b>Your next adventure</b><span>Turn a someday into a savings goal.</span></div></div></div>
          <div className="mf-life-copy"><p className="mf-eyebrow">Make yourself at home</p><h2>A fresh start.<br />Three simple steps.</h2><ol>{[['Set up your space', 'Create a local account and choose the categories that fit your life.'], ['Bring in the everyday', 'Add your income and expenses. Set a budget and a goal to work toward.'], ['See the bigger picture', 'Review your reports or ask the assistant a question about your saved data.']].map(([title, body], i) => <li key={title}><span>0{i + 1}</span><div><h3>{title}</h3><p>{body}</p></div></li>)}</ol><Link className="mf-text-link" to={target}>{cta} <span aria-hidden="true">↗</span></Link></div>
        </section>

        <section className="mf-section mf-faq-section" id="questions" data-reveal><div><p className="mf-eyebrow">A few things to know</p><h2>Good questions.<br />Clear answers.</h2><p>Know how your space works before you get started.</p></div><div className="mf-faq-list">{FAQS.map(([question, answer]) => <details key={question}><summary>{question}<span aria-hidden="true">+</span></summary><p>{answer}</p></details>)}</div></section>

        <section className="mf-closing" data-reveal>
          <div className="mf-streaks" aria-hidden="true">{Array.from({ length: 22 }, (_, i) => <i key={i} style={{ left: `${(i * 47) % 100}%`, '--mf-duration': `${4 + i % 5}s`, '--mf-delay': `${-i * .7}s` }} />)}</div>
          <div className="mf-closing-copy"><p className="mf-eyebrow">Your next chapter starts here</p><h2>Make space for<br /><em>a little more life.</em></h2><Link className="mf-button" to={target}>{cta}<span aria-hidden="true">↗</span></Link><p>Start with today. Build from there.</p></div>
          <button type="button" className="mf-motion-control" aria-pressed={paused} onClick={() => setPaused(!paused)}>{paused ? 'Resume animations' : 'Pause animations'}</button>
        </section>
      </main>
      <footer className="mf-footer"><Link className="mf-brand" to="/">moneyflow.</Link><p>A CSC 365 project by Ayush and Sushan.<br /><span>Local demo accounts. Data stays in this browser.</span></p><a href="#main-content">Back to top ↑</a></footer>
    </div>
  );
}
