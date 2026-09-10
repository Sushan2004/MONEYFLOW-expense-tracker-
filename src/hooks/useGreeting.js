import { useEffect, useState } from 'react';
import { greetingFor } from '../utils/format.js';

export default function useGreeting() {
  const [greeting, setGreeting] = useState(() => greetingFor());
  useEffect(() => {
    const update = () => setGreeting(greetingFor());
    const timer = window.setInterval(update, 30_000);
    window.addEventListener('focus', update);
    return () => { window.clearInterval(timer); window.removeEventListener('focus', update); };
  }, []);
  return greeting;
}
