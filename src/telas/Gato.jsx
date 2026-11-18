import { useState } from 'react';
import { MATERIAS } from '../conteudo.js';
import { gatoSVG, PELAGENS, CENARIOS } from '../mascote/arte.js';
import { ITENS, PERSONAGEM, MEDALHAS, DIAS_CENARIO, titulo } from '../mascote/regras.js';

const Svg = ({ html, className }) => <div className={className} dangerouslySetInnerHTML={{ __html: html }} />;

function fala(est, m) {
  if (est.dormindo) return 'Zzz... 😴 Faz uns dias que a gente não estuda. Responde uma questão pra me acordar!';
  if (!m.nome) return 'Ei! Eu ainda não tenho nome... ✏️';
  const falta = ITENS.filter((i) => (est.acertos[i.m] || 0) < i.need)
    .map((i) => ({ i, f: i.need - (est.acertos[i.m] || 0) }))
    .sort((a, b) => a.f - b.f)[0];
  if (falta) {
    const mat = MATERIAS.find((x) => x.id === falta.i.m).nome;
    return `Faltam só <b>${falta.f}</b> acerto${falta.f > 1 ? 's' : ''} em ${mat} pra eu ganhar ${falta.i.em} <b>${falta.i.nm}</b>!`;
  }
  return 'Você já me deu todas as roupas. Você é demais! 😸';
}

const AVISO = { salvando: '⏳ Salvando…', salvo: '✓ Tudo salvo', erro: '⚠️ Não consegui salvar. Verifique a internet.' };

export default function Gato({ est, mascote, mudar, voltar, salvo = 'salvo' }) {
  const [mat, setMat] = useState('mt');
  const t = titulo(est);
  const pct = t.prox ? Math.round((100 * (est.total - t.de)) / (t.prox[0] - t.de)) : 100;
  const m = mascote;
  const ok = est.acertos[mat] || 0;
  const medalhas = MEDALHAS.filter((x) => x.v(est) >= x.n).length;

  return (
    <div className="pilha">
      <div className="linha">
        <button className="voltar" onClick={voltar}>← Início</button>
        <span className={'g-salvo ' + salvo} role="status">{AVISO[salvo]}</span>
      </div>

      <div className="g-hero">
        <div className="g-bolha" dangerouslySetInnerHTML={{ __html: fala(est, m) }} />
        <Svg className="g-palco" html={gatoSVG({ eq: m.eq, pelagem: m.pelagem, cenario: m.cenario, dormindo: est.dormindo, vivo: true, rotulo: m.nome || 'Seu gato' })} />
        <div className="g-id">
          <input className="g-nome" maxLength={20} placeholder="✏️ Dê um nome" value={m.nome} onChange={(e) => mudar({ nome: e.target.value })} aria-label="Nome do gato" />
          <div className="g-pelos" role="group" aria-label="Cor do gato">
            {Object.entries(PELAGENS).map(([k, f]) => (
              <button key={k} className={'g-pelo' + (m.pelagem === k ? ' on' : '')} style={{ '--f': f.f, '--o': f.o }} aria-label={f.nm} title={f.nm} onClick={() => mudar({ pelagem: k })} />
            ))}
          </div>
          <p className="pequeno mudo" style={{ margin: 0 }}>As mudanças são salvas sozinhas.</p>
          <div className="g-titulo">👑 {t.nm} <span>nível {t.i + 1}</span></div>
          <div className="g-xp">
            <div className="barra"><i style={{ width: pct + '%' }} /></div>
            <span>{t.prox ? <>{est.total} / {t.prox[0]} ⭐ → <b>{t.prox[1]}</b></> : <>{est.total} ⭐ · nível máximo!</>}</span>
          </div>
        </div>
      </div>

      <div className="cartao pilha">
        <h3>👕 Guarda-roupa</h3>
        <nav className="abas">
          {MATERIAS.map((x) => {
            const n = ITENS.filter((i) => i.m === x.id && (est.acertos[x.id] || 0) >= i.need).length;
            return <button key={x.id} aria-selected={mat === x.id} onClick={() => setMat(x.id)}>{x.nome} <small>{n}/4</small></button>;
          })}
        </nav>
        <p className="mudo pequeno">Personagem: <b>{PERSONAGEM[mat]}</b> · {ok} acertos em {MATERIAS.find((x) => x.id === mat).nome}</p>
        <div className="g-grade">
          {ITENS.filter((i) => i.m === mat).map((i) => {
            const livre = ok >= i.need, vestindo = m.eq[i.slot] === i.id;
            return (
              <button key={i.id} className={'g-peca' + (livre ? '' : ' trancada') + (vestindo ? ' on' : '')} disabled={!livre}
                onClick={() => { const eq = { ...m.eq }; if (vestindo) delete eq[i.slot]; else eq[i.slot] = i.id; mudar({ eq }); }}>
                <Svg className="g-mini" html={gatoSVG({ eq: { [i.slot]: i.id }, pelagem: m.pelagem, rotulo: i.nm })} />
                <b>{livre ? '' : '🔒 '}{i.nm}</b>
                <span className="pequeno mudo">{livre ? (vestindo ? '✓ vestindo' : 'toque p/ vestir') : `faltam ${i.need - ok}`}</span>
                {!livre && <div className="barra fina"><i style={{ width: Math.round((100 * ok) / i.need) + '%' }} /></div>}
              </button>
            );
          })}
        </div>
      </div>

      <div className="cartao pilha">
        <h3>🏞️ Cenários</h3>
        <div className="g-grade">
          {CENARIOS.map((c) => {
            const n = DIAS_CENARIO[c.id], livre = (est.diasMissao || 0) >= n, aqui = m.cenario === c.id;
            return (
              <button key={c.id} className={'g-peca' + (livre ? '' : ' trancada') + (aqui ? ' on' : '')} disabled={!livre} onClick={() => mudar({ cenario: c.id })}>
                <Svg className="g-mini cena" html={gatoSVG({ eq: m.eq, pelagem: m.pelagem, cenario: c.id, rotulo: c.nm })} />
                <b>{livre ? '' : '🔒 '}{c.nm}</b>
                <span className="pequeno mudo">{livre ? (aqui ? '✓ aqui' : 'ir pra cá') : `${n} dias de missão`}</span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="cartao pilha">
        <div className="linha"><h3>🏅 Medalhas</h3><span className="pilula">{medalhas}/{MEDALHAS.length}</span></div>
        <div className="g-medalhas">
          {MEDALHAS.map((x) => {
            const v = x.v(est), tem = v >= x.n;
            return (
              <div key={x.id} className={'g-medalha' + (tem ? '' : ' trancada')} title={x.ds}>
                <div className="moeda">{x.em}</div>
                <b>{x.nm}</b>
                <span className="pequeno mudo">{tem ? x.ds : `${Math.min(v, x.n)}/${x.n}`}</span>
              </div>
            );
          })}
        </div>
      </div>

      <button className="btn" style={{ alignSelf: 'center' }} disabled={salvo === 'salvando'} onClick={voltar}>
        {salvo === 'salvando' ? 'Salvando…' : 'Pronto ✓'}
      </button>
    </div>
  );
}

// Janela de comemoração quando o aluno ganha algo novo.
export function Comemoracao({ conquista, mascote, aoVestir, aoFechar }) {
  const { em, t, d, item, cenario } = conquista;
  const eq = item ? { ...mascote.eq, [item.slot]: item.id } : mascote.eq;
  return (
    <div className="g-pop" onClick={(e) => e.target === e.currentTarget && aoFechar()}>
      <div className="g-pop-cartao" role="dialog" aria-modal="true" aria-label={t}>
        <div className="confete" aria-hidden="true">{Array.from({ length: 24 }, (_, k) => <i key={k} style={{ '--x': (k * 37) % 100 + '%', '--h': (k * 47) % 360, '--d': (k % 6) * 0.12 + 's' }} />)}</div>
        <Svg className="g-pop-gato" html={gatoSVG({ eq, pelagem: mascote.pelagem, cenario: cenario || mascote.cenario, vivo: true, rotulo: t })} />
        <div className="g-pop-em">{em}</div>
        <h3>{t}</h3>
        <p className="mudo">{d}</p>
        <div className="linha" style={{ justifyContent: 'center' }}>
          {item && <button className="btn" onClick={aoVestir}>Vestir agora</button>}
          {cenario && <button className="btn" onClick={aoVestir}>Ir pra lá</button>}
          <button className="btn fantasma" onClick={aoFechar}>{item || cenario ? 'Depois' : 'Oba!'}</button>
        </div>
      </div>
    </div>
  );
}
