// Leitura em voz alta (Web Speech API, voz instalada no celular). Sem internet e sem custo.
import { useEffect, useState } from 'react';

const ok = typeof window !== 'undefined' && 'speechSynthesis' in window;
let ouvintes = new Set();
let atual = null;
const avisar = () => ouvintes.forEach((f) => f(atual));

function voz(lang) {
  const vs = window.speechSynthesis.getVoices();
  const pref = lang.slice(0, 2);
  return vs.find((v) => v.lang === lang && /google|natural|enhanced|premium/i.test(v.name))
    || vs.find((v) => v.lang === lang) || vs.find((v) => v.lang?.startsWith(pref)) || null;
}

export const limparTexto = (h) => String(h || '')
  .replace(/<span class="frac"><span>([^<]*)<\/span><span>([^<]*)<\/span><\/span>/g, ' $1 sobre $2 ')
  .replace(/<[^>]+>/g, ' ').replace(/×/g, ' vezes ').replace(/÷/g, ' dividido por ').replace(/→/g, ', ')
  .replace(/(\d)\s*\/\s*(\d)/g, '$1 sobre $2').replace(/²/g, ' ao quadrado').replace(/³/g, ' ao cubo').replace(/%/g, ' por cento')
  .replace(/\s+/g, ' ').trim();

// partes: [{ texto, lang }]
export function falar(id, partes) {
  if (!ok) return;
  window.speechSynthesis.cancel();
  atual = id; avisar();
  const lista = partes.filter((p) => p.texto);
  lista.forEach((p, i) => {
    const u = new SpeechSynthesisUtterance(limparTexto(p.texto));
    u.lang = p.lang || 'pt-BR'; const v = voz(u.lang); if (v) u.voice = v; u.rate = 0.95;
    if (i === lista.length - 1) u.onend = u.onerror = () => { if (atual === id) { atual = null; avisar(); } };
    window.speechSynthesis.speak(u);
  });
}
export function parar() { if (ok) window.speechSynthesis.cancel(); atual = null; avisar(); }

export function BotaoOuvir({ id, partes, rotulo = 'Ouvir', className = 'link pequeno' }) {
  const [tocando, setTocando] = useState(atual === id);
  useEffect(() => { const f = (a) => setTocando(a === id); ouvintes.add(f); return () => { ouvintes.delete(f); }; }, [id]);
  if (!ok) return null;
  return (
    <button type="button" className={className + ' ouvir'} onClick={() => (tocando ? parar() : falar(id, typeof partes === 'function' ? partes() : partes))} aria-label={tocando ? 'Parar leitura' : rotulo}>
      {tocando ? '⏹ Parar' : `🔊 ${rotulo}`}
    </button>
  );
}
