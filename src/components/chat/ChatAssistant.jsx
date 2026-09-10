import { useCallback, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { FiMessageCircle, FiX, FiPlus, FiArrowUp, FiMic, FiStopCircle } from 'react-icons/fi';
import { useAppState } from '../../state/AppState.jsx';
import { formatCurrency } from '../../utils/format.js';
import { answerQuery, QUICK_QUERIES } from '../../utils/chatAnswers.js';
import SpendingDoughnutChart from '../SpendingDoughnutChart.jsx';
import './chat.css';

const makeThread = () => ({ id: crypto.randomUUID(), title: 'New conversation', messages: [] });
function restore(key) {
  try {
    const data = JSON.parse(localStorage.getItem(key));
    if (data?.version === 1 && Array.isArray(data.threads)) {
      const threads = data.threads.filter((t) => typeof t.id === 'string' && typeof t.title === 'string' && Array.isArray(t.messages))
        .slice(0, 20).map((t) => ({ ...t, messages: t.messages.filter((m) => typeof m.id === 'string' && typeof m.text === 'string' && ['user', 'assistant'].includes(m.role))
          .slice(-100).map((m) => ({ ...m, cards: Array.isArray(m.cards) ? m.cards.filter((c) => c && typeof c.label === 'string' && Number.isFinite(c.amount)) : [] })) }));
      if (threads.length) return { ...data, threads, activeId: threads.some((t) => t.id === data.activeId) ? data.activeId : threads[0].id };
    }
  } catch { /* Corrupt or unavailable storage starts a usable in-memory conversation. */ }
  const thread = makeThread();
  return { version: 1, threads: [thread], activeId: thread.id, open: false, width: 380 };
}

function DataCard({ card, theme, onNavigate }) {
  const href = typeof card.href === 'string' && /^\/(transactions|goals|budget)([/?]|$)/.test(card.href) ? card.href : '/transactions';
  const amount = formatCurrency(card.amount);
  const segments = Array.isArray(card.segments) ? card.segments.filter((s) => s && typeof s.categoryId === 'string' && Number.isFinite(s.amount)) : [];
  return <article className="chat-card" title={`${card.label}: ${amount}${card.limit ? ` of ${formatCurrency(card.limit)}` : ''}`}>
    <div className="chat-card-heading"><Link to={href} onClick={onNavigate}>{card.label} <span aria-hidden="true">↗</span></Link><span>{card.detail}</span></div>
    <strong className="chat-card-amount">{amount}</strong>
    {Number.isFinite(card.limit) && card.limit > 0 && <>
      <div className="chat-progress" role="meter" aria-label={card.label} aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.min(100, Math.round(card.amount / card.limit * 100))} aria-valuetext={`${amount} of ${formatCurrency(card.limit)}`}>
        <span style={{ width: `${Math.min(100, card.amount / card.limit * 100)}%`, background: card.kind === 'budget' && card.amount > card.limit ? 'var(--danger)' : undefined }} />
      </div>
      <small>{Math.round(card.amount / card.limit * 100)}% of {formatCurrency(card.limit)}{card.kind === 'budget' && card.amount > card.limit ? ' · Over budget' : ''}</small>
    </>}
    {card.kind === 'spending' && segments.length > 0 && <>
      <SpendingDoughnutChart segments={segments} total={card.amount} theme={theme} />
      <div className="chat-legend">{segments.map((s) => <Link key={s.categoryId} to={`/transactions?category=${encodeURIComponent(s.categoryId)}&month=${card.month}`} onClick={onNavigate} title={`${s.name}: ${formatCurrency(s.amount)}`}><span>{s.name}</span><strong>{formatCurrency(s.amount)}</strong></Link>)}</div>
    </>}
  </article>;
}

export default function ChatAssistant({ userId, onDockChange }) {
  const { state, resolvedTheme } = useAppState();
  const storageKey = `et:chat:${userId}`;
  const [saved, setSaved] = useState(() => restore(storageKey));
  const [mobile, setMobile] = useState(() => !window.matchMedia('(min-width: 1024px)').matches);
  const [open, setOpen] = useState(() => window.matchMedia('(min-width: 1024px)').matches && Boolean(saved.open));
  const [width, setWidth] = useState(() => Math.min(480, Math.max(360, Number(saved.width) || 380)));
  const [input, setInput] = useState('');
  const [pending, setPending] = useState(null);
  const [error, setError] = useState('');
  const [storageError, setStorageError] = useState(false);
  const [listening, setListening] = useState(false);
  const [drag, setDrag] = useState(0);
  const panel = useRef(null);
  const inputRef = useRef(null);
  const messagesRef = useRef(null);
  const launchRef = useRef(null);
  const recognition = useRef(null);
  const timer = useRef(null);
  const pendingRef = useRef(false);
  const gesture = useRef(null);
  const suppressDragClick = useRef(false);
  const latestState = useRef(state);
  latestState.current = state;
  const active = saved.threads.find((t) => t.id === saved.activeId) || saved.threads[0];
  const isMac = /mac|iphone|ipad/i.test(navigator.userAgentData?.platform || navigator.platform || '');
  const shortcut = isMac ? '⌘ /' : 'Ctrl /';
  const Speech = window.SpeechRecognition || window.webkitSpeechRecognition;
  const close = useCallback(() => {
    setOpen(false);
    setDrag(0);
    recognition.current?.abort();
    requestAnimationFrame(() => launchRef.current?.focus({ preventScroll: true }));
  }, []);

  useEffect(() => {
    const mq = window.matchMedia('(min-width: 1024px)');
    const update = () => { setMobile(!mq.matches); setDrag(0); };
    mq.addEventListener('change', update);
    return () => mq.removeEventListener('change', update);
  }, []);
  useEffect(() => {
    onDockChange(open && !mobile ? width : 0);
    return () => onDockChange(0);
  }, [open, mobile, width, onDockChange]);
  useEffect(() => {
    try {
      localStorage.setItem(storageKey, JSON.stringify({ ...saved, open, width }));
      setStorageError(false);
    } catch { setStorageError(true); }
  }, [saved, open, width, storageKey]);
  useEffect(() => {
    const handle = (e) => {
      if ((isMac ? e.metaKey : e.ctrlKey) && e.code === 'Slash' && !e.repeat) { e.preventDefault(); if (open) close(); else setOpen(true); }
      if (e.key === 'Escape' && open) { e.preventDefault(); close(); }
    };
    window.addEventListener('keydown', handle);
    return () => window.removeEventListener('keydown', handle);
  }, [isMac, open, close]);
  useEffect(() => {
    if (!open) { recognition.current?.abort(); return undefined; }
    // VisualViewport tracks both keyboard resizing and the viewport's iOS scroll offset.
    const update = () => {
      if (!panel.current) return;
      const viewport = window.visualViewport;
      panel.current.style.setProperty('--chat-height', `${viewport?.height || window.innerHeight}px`);
      panel.current.style.setProperty('--chat-top', `${viewport?.offsetTop || 0}px`);
    };
    update();
    window.visualViewport?.addEventListener('resize', update);
    window.visualViewport?.addEventListener('scroll', update);
    window.addEventListener('resize', update);
    // Avoid opening the software keyboard before the user chooses to type.
    (mobile ? panel.current : inputRef.current)?.focus({ preventScroll: true });
    return () => {
      window.visualViewport?.removeEventListener('resize', update);
      window.visualViewport?.removeEventListener('scroll', update);
      window.removeEventListener('resize', update);
    };
  }, [open, mobile]);
  useEffect(() => {
    if (!open || !mobile) return undefined;
    const app = panel.current?.closest('.app');
    const background = app ? [...app.children].filter((el) => !el.classList.contains('chat-panel')) : [];
    const previous = background.map((el) => el.inert);
    app?.classList.add('chat-mobile-open');
    background.forEach((el) => { el.inert = true; });
    const oldOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      background.forEach((el, i) => { el.inert = previous[i]; });
      app?.classList.remove('chat-mobile-open');
      document.body.style.overflow = oldOverflow;
    };
  }, [open, mobile]);
  useEffect(() => {
    const box = messagesRef.current;
    if (box) box.scrollTop = box.scrollHeight;
  }, [active.messages, active.id, pending, open]);
  useEffect(() => {
    const el = inputRef.current;
    if (el) { el.style.height = 'auto'; el.style.height = `${Math.min(120, el.scrollHeight)}px`; }
  }, [input, open]);
  useEffect(() => () => { clearTimeout(timer.current); recognition.current?.abort(); }, []);

  function send(text = input) {
    const query = text.trim().slice(0, 2000);
    if (!query || pendingRef.current) return;
    pendingRef.current = true;
    const threadId = active.id;
    setInput(''); setError(''); setPending(threadId);
    setSaved((prev) => ({ ...prev, threads: prev.threads.map((t) => t.id === threadId ? { ...t, title: t.messages.length ? t.title : query.slice(0, 45), messages: [...t.messages, { id: crypto.randomUUID(), role: 'user', text: query }].slice(-100) } : t) }));
    // Yield so the progress state paints before deriving the answer from local records.
    timer.current = setTimeout(() => {
      try {
        const response = answerQuery(query, latestState.current);
        setSaved((prev) => ({ ...prev, threads: prev.threads.map((t) => t.id === threadId ? { ...t, messages: [...t.messages, { ...response, id: crypto.randomUUID(), role: 'assistant' }].slice(-100) } : t) }));
      } catch { setError('Unable to summarize these records. Please try again.'); }
      finally { pendingRef.current = false; setPending(null); }
    }, 180);
  }
  function voice() {
    if (listening) { recognition.current?.stop(); return; }
    if (!Speech) return;
    setError('');
    const rec = new Speech();
    recognition.current = rec;
    rec.lang = navigator.language || 'en-US';
    rec.interimResults = false;
    rec.onstart = () => setListening(true);
    rec.onend = () => setListening(false);
    rec.onerror = (event) => { setListening(false); if (event.error !== 'aborted') setError('Voice input is unavailable or microphone access was denied. You can still type.'); };
    rec.onresult = (event) => {
      const transcript = Array.from(event.results).map((r) => r[0].transcript).join(' ');
      setInput((prev) => `${prev}${prev ? ' ' : ''}${transcript}`.slice(0, 2000));
      inputRef.current?.focus();
    };
    try { rec.start(); } catch { setListening(false); setError('Voice input could not start. Please type your question.'); }
  }
  function newThread() {
    recognition.current?.abort();
    const thread = makeThread();
    setSaved((prev) => ({ ...prev, threads: [thread, ...prev.threads].slice(0, 20), activeId: thread.id }));
    setInput(''); setError('');
    inputRef.current?.focus();
  }
  function trapFocus(e) {
    if (!mobile || e.key !== 'Tab') return;
    const controls = [...panel.current.querySelectorAll('button:not(:disabled), a, textarea, select, [tabindex="0"]')].filter((el) => el.getClientRects().length);
    const first = controls[0]; const last = controls.at(-1);
    if (e.shiftKey && (document.activeElement === first || document.activeElement === panel.current)) { e.preventDefault(); last?.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first?.focus(); }
  }
  const onNavigate = () => { if (mobile) close(); };
  return <>
    {!open && <button className="chat-launch" ref={launchRef} onClick={() => setOpen(true)} aria-label="Open Moneyflow assistant" aria-expanded={false} aria-controls="moneyflow-chat" title={`Open assistant (${shortcut})`}><FiMessageCircle size={23} /><span>Ask Moneyflow</span><kbd>{shortcut}</kbd></button>}
    {open && <aside id="moneyflow-chat" ref={panel} className={`chat-panel${mobile ? ' chat-panel--mobile' : ''}`} role={mobile ? 'dialog' : 'complementary'} aria-modal={mobile || undefined} aria-labelledby="chat-title" tabIndex={-1} onKeyDown={trapFocus} style={{ width: mobile ? undefined : width, transform: mobile && drag ? `translateY(${drag}px)` : undefined }}>
      {!mobile && <div className="chat-resize" role="separator" aria-label="Resize assistant panel" aria-orientation="vertical" aria-valuemin={360} aria-valuemax={480} aria-valuenow={width} tabIndex={0}
        onKeyDown={(e) => { if (['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(e.key)) { e.preventDefault(); setWidth((v) => e.key === 'Home' ? 360 : e.key === 'End' ? 480 : Math.min(480, Math.max(360, v + (e.key === 'ArrowLeft' ? 20 : -20)))); } }}
        onPointerDown={(e) => { e.currentTarget.setPointerCapture(e.pointerId); gesture.current = { x: e.clientX, width }; }}
        onPointerMove={(e) => { if (gesture.current && e.currentTarget.hasPointerCapture(e.pointerId)) setWidth(Math.min(480, Math.max(360, gesture.current.width + gesture.current.x - e.clientX))); }}
        onPointerUp={() => { gesture.current = null; }} onPointerCancel={() => { gesture.current = null; }} />}
      {mobile && <button className="chat-drag" aria-label="Close chat, or drag down to dismiss" onClick={() => { if (!suppressDragClick.current) close(); suppressDragClick.current = false; }}
        onPointerDown={(e) => { e.currentTarget.setPointerCapture(e.pointerId); suppressDragClick.current = false; gesture.current = { y: e.clientY }; }}
        onPointerMove={(e) => { if (gesture.current && e.currentTarget.hasPointerCapture(e.pointerId)) setDrag(Math.max(0, e.clientY - gesture.current.y)); }}
        onPointerUp={(e) => { const distance = gesture.current ? e.clientY - gesture.current.y : 0; suppressDragClick.current = Math.abs(distance) > 5; gesture.current = null; setDrag(0); if (distance > 90) close(); }} onPointerCancel={() => { gesture.current = null; setDrag(0); }}><span /></button>}
      <header className="chat-header"><div className="chat-avatar"><FiMessageCircle size={21} /></div><div><h2 id="chat-title">Moneyflow assistant</h2><p><span className="chat-status-dot" />Your money, in focus</p></div><button className="chat-icon" onClick={close} aria-label="Close assistant" title={`Close (${shortcut})`}><FiX size={22} /></button></header>
      <div className="chat-threads"><label className="sr-only" htmlFor="chat-thread">Conversation history</label><select id="chat-thread" value={active.id} disabled={Boolean(pending)} onChange={(e) => { recognition.current?.abort(); setSaved((prev) => ({ ...prev, activeId: e.target.value })); setInput(''); setError(''); }}>{saved.threads.map((t) => <option key={t.id} value={t.id}>{t.title}</option>)}</select><button className="chat-icon" disabled={Boolean(pending)} onClick={newThread} aria-label="New conversation" title="New conversation"><FiPlus size={21} /></button></div>
      {storageError && <p className="chat-notice" role="status">History could not be saved in this browser. This conversation is still available until you leave.</p>}
      <div className="chat-messages" ref={messagesRef} role="log" aria-label="Conversation" aria-live="polite" aria-relevant="additions text">
        {!active.messages.length && <div className="chat-welcome"><span className="chat-welcome-mark"><FiMessageCircle size={28} /></span><p className="chat-eyebrow">A LITTLE CLARITY</p><h3>Make sense of<br />your money.</h3><p>Explore your spending, check a budget, or see what’s coming up.</p><div className="chat-local-note">Answers from your saved records.<br />No external AI service.</div></div>}
        {active.messages.map((m) => <div key={m.id} className={`chat-message chat-message--${m.role}`}><span className="chat-speaker">{m.role === 'user' ? 'You' : 'Moneyflow'}</span><p>{m.text}</p>{m.role === 'assistant' && m.cards?.map((c, i) => <DataCard key={i} card={c} theme={resolvedTheme} onNavigate={onNavigate} />)}{m.footnote && <small>{m.footnote}</small>}{m.generatedAt && <time dateTime={m.generatedAt}>Snapshot · {new Date(m.generatedAt).toLocaleString([], { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}</time>}</div>)}
        {pending === active.id && <div className="chat-thinking" role="status"><span /><span /><span /><p>Checking your records…</p></div>}
      </div>
      <form className="chat-composer" onSubmit={(e) => { e.preventDefault(); send(); }}>
        <div className="chat-chips" aria-label="Suggested questions">{QUICK_QUERIES.map((q) => <button type="button" key={q} disabled={Boolean(pending)} onClick={() => send(q)}>{q}</button>)}</div>
        {error && <p className="chat-notice" role="alert">{error}</p>}
        <div className="chat-input-row"><label className="sr-only" htmlFor="chat-input">Ask about your money</label><textarea id="chat-input" ref={inputRef} rows={1} maxLength={2000} value={input} placeholder="Ask about your money…" onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing && !mobile) { e.preventDefault(); send(); } }} />
          {Speech && <button type="button" className={`chat-icon${listening ? ' chat-listening' : ''}`} onClick={voice} aria-label={listening ? 'Stop voice input' : 'Start voice input'} aria-pressed={listening} title="Dictate a question (browser speech service)">{listening ? <FiStopCircle size={20} /> : <FiMic size={20} />}</button>}
          <button className="chat-send" type="submit" aria-label="Send message" disabled={!input.trim() || Boolean(pending)}><FiArrowUp size={22} /></button></div>
        <div className="chat-footer">{listening ? 'Listening… tap stop when finished.' : mobile ? 'Saved on this device' : `Shift + Enter for a new line · ${shortcut} to toggle`}</div>
        {Speech && <small className="chat-voice-note">Voice uses your browser’s speech service and may send audio for transcription.</small>}
      </form>
    </aside>}
  </>;
}
