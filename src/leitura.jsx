// Preferências de leitura deste aparelho: tamanho do texto e fonte para dislexia.
import { useState } from 'react';
import '@fontsource/opendyslexic/400.css';
import '@fontsource/opendyslexic/700.css';

const CHAVE = 'tutor-leitura';
export function lerPrefs() { try { return { tamanho: 'normal', fonte: 'padrao', ...JSON.parse(localStorage.getItem(CHAVE) || '{}') }; } catch { return { tamanho: 'normal', fonte: 'padrao' }; } }
export function aplicarPrefs(p = lerPrefs()) {
  const h = document.documentElement;
  h.dataset.tamanho = p.tamanho; h.dataset.fonte = p.fonte;
}

export function BotaoLeitura() {
  const [aberto, setAberto] = useState(false);
  const [p, setP] = useState(lerPrefs);
  const mudar = (x) => { const n = { ...p, ...x }; setP(n); try { localStorage.setItem(CHAVE, JSON.stringify(n)); } catch { /* sem armazenamento */ } aplicarPrefs(n); };
  return (
    <span className="leitura-wrap">
      <button className="sair" onClick={() => setAberto(!aberto)} title="Tamanho do texto e fonte" aria-expanded={aberto} aria-label="Ajustes de leitura">Aa</button>
      {aberto && (
        <div className="leitura-painel cartao pilha" role="dialog" aria-label="Ajustes de leitura">
          <b>Tamanho do texto</b>
          <div className="seg">
            {[['normal', 'A', 'Normal'], ['grande', 'A', 'Grande'], ['maior', 'A', 'Maior']].map(([id, l, nome], i) => (
              <button key={id} className={p.tamanho === id ? 'on' : ''} onClick={() => mudar({ tamanho: id })} aria-pressed={p.tamanho === id} title={nome} style={{ fontSize: 14 + i * 4 }}>{l}</button>
            ))}
          </div>
          <b>Fonte</b>
          <div className="seg">
            <button className={p.fonte === 'padrao' ? 'on' : ''} onClick={() => mudar({ fonte: 'padrao' })} aria-pressed={p.fonte === 'padrao'}>Padrão</button>
            <button className={p.fonte === 'dislexia' ? 'on' : ''} onClick={() => mudar({ fonte: 'dislexia' })} aria-pressed={p.fonte === 'dislexia'} style={{ fontFamily: 'OpenDyslexic' }}>Dislexia</button>
          </div>
          <span className="mudo mini">Fica salvo neste aparelho. A fonte para dislexia (OpenDyslexic) tem letras com a base mais pesada, que ajudam algumas pessoas a não trocar letras.</span>
          <button className="link pequeno" style={{ alignSelf: 'flex-end' }} onClick={() => setAberto(false)}>Fechar</button>
        </div>
      )}
    </span>
  );
}
