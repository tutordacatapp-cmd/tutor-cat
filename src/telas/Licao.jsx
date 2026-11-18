import { useEffect, useMemo, useRef, useState } from 'react';
import { corrigir, respostaEmTexto, MATERIAS, parecida, dicas, tempoLeitura, tempoExplicacao, topico } from '../conteudo.js';
import { nomeTopico } from '../progresso.js';

const embaralhar = (a) => a.map((x) => [Math.random(), x]).sort((p, q) => p[0] - q[0]).map((p) => p[1]);
const Html = ({ html, className }) => <div className={className} dangerouslySetInnerHTML={{ __html: html }} />;
const FRASES_OK = ['Isso!', 'Mandou bem!', 'Miau! ✨', 'Arrasou!', 'Boa!'];
const FRASES_ERRO = ['Quase!', 'Bora entender?', 'Acontece!', 'Vamos juntos!'];
const sortear = (a) => a[Math.floor(Math.random() * a.length)];

// Botão que só libera depois de um tempo, mostrando o tempo correndo (tutor original: "Lendo… 5s").
function BotaoEspera({ ms, rotulo, onClick }) {
  const [p, setP] = useState(0);
  useEffect(() => {
    const t0 = performance.now(); let id;
    const tick = () => { const x = Math.min(1, (performance.now() - t0) / ms); setP(x); if (x < 1) id = requestAnimationFrame(tick); };
    id = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(id);
  }, [ms]);
  const pronto = p >= 1;
  return (
    <button className={'btn' + (pronto ? '' : ' espera')} disabled={!pronto} onClick={onClick} style={{ '--p': (p * 100).toFixed(1) + '%' }}>
      {pronto ? rotulo : `Lendo… ${Math.ceil((ms * (1 - p)) / 1000)}s`}
    </button>
  );
}

// Modo tutor no estilo Mehlman (tutor original): sua resposta, por que a certa é certa,
// por que cada alternativa errada não serve, o que cai na prova e a pegadinha.
const semTags = (h) => String(h).replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
function ideiaCentral(q) {
  const t = topico(q.topico); if (!t) return '';
  const fr = (semTags(t.explicacao_html).match(/.+?(?:[.!?](?=\s|$)|$)/g) || []).map((x) => x.trim()).filter(Boolean);
  let o = ''; for (const f of fr) { if ((o + ' ' + f).length > 260 && o) break; o += (o ? ' ' : '') + f; } return o;
}
function ModoTutor({ q, ok, escolhida }) {
  const T = q.tutor || {};
  const certa = respostaEmTexto(q);
  const outras = q.tipo === 'mc' && T.alternativas
    ? q.alternativas.filter((a) => a !== q.resposta && T.alternativas[a]).sort((a, b) => (b === escolhida) - (a === escolhida))
    : [];
  const pontos = T.pontos?.length ? T.pontos : [ideiaCentral(q)].filter(Boolean);
  const extra = (
    <>
      {outras.length > 0 && (
        <div className="mt-sec mt-bad"><b>❌ Por que as outras não rolam</b>
          {outras.map((a) => (
            <div key={a} className={'mt-alt' + (a === escolhida ? ' mine' : '')}>
              <b dangerouslySetInnerHTML={{ __html: a }} />{a === escolhida && <span className="mt-tag"> sua resposta</span>}
              <div>{T.alternativas[a]}</div>
            </div>
          ))}
        </div>
      )}
      {!ok && q.tipo !== 'mc' && T.erroComum && <div className="mt-sec mt-bad"><b>❌ Onde costuma escorregar</b><div>{T.erroComum}</div></div>}
      {pontos.length > 0 && <div className="mt-sec mt-key"><b>🎯 O que cai na prova</b>{pontos.length > 1 ? <ul>{pontos.map((p, i) => <li key={i}>{p}</li>)}</ul> : <div>{pontos[0]}</div>}</div>}
      {T.pegadinha && <div className="mt-sec mt-trap"><b>⚠️ Cuidado com a pegadinha</b><div>{T.pegadinha}</div></div>}
    </>
  );
  return (
    <div className={'mtutor' + (ok ? '' : ' err')}>
      <div className="mt-h">{ok ? 'Modo tutor' : 'Modo tutor · bora entender o que rolou'}</div>
      {!ok && <div className="mt-sec mt-mine"><b>✏️ Você marcou: <span dangerouslySetInnerHTML={{ __html: escolhida }} /></b><div>A certa é <b dangerouslySetInnerHTML={{ __html: certa }} />. Tranquilo: errar aqui é melhor que errar na prova.</div></div>}
      <div className="mt-sec mt-ok"><b>✅ Por que é <span dangerouslySetInnerHTML={{ __html: certa }} /></b><Html html={T.certa || q.explicacao || ''} /></div>
      {ok ? <details className="mt-extra"><summary>Ver o que cai na prova{outras.length ? ' e por que as outras não rolam' : ''}</summary>{extra}</details> : extra}
    </div>
  );
}

// Uma questão: trava de leitura nas alternativas, dicas, correção e explicação.
function Pergunta({ q, gato, aoResponder, comDicas = true }) {
  const [valor, setValor] = useState('');
  const [res, setRes] = useState(null);
  const [lida, setLida] = useState(q.tipo !== 'mc');
  const [nDicas, setNDicas] = useState(0);
  const inicio = useRef(Date.now());
  const opcoes = useMemo(() => (q.tipo === 'mc' ? embaralhar(q.alternativas) : []), [q]);
  const lista = useMemo(() => (comDicas ? dicas(q) : []), [q, comDicas]);
  const msLeitura = useMemo(() => tempoLeitura(q), [q]);

  useEffect(() => {
    if (q.tipo !== 'mc') return;
    const t = setTimeout(() => setLida(true), msLeitura);
    return () => clearTimeout(t);
  }, [q, msLeitura]);

  function responder(v) {
    if (res && !res.invalida) return;
    const r = corrigir(q, v);
    if (r.invalida) { setRes({ invalida: true }); setTimeout(() => setRes(null), 1800); return; }
    setRes({ ...r, escolhida: v, frase: sortear(r.ok ? FRASES_OK : FRASES_ERRO) });
    aoResponder(!!r.ok, String(v), Date.now() - inicio.current, nDicas > 0);
  }

  return (
    <div className="questao">
      <Html className="enunciado" html={q.enunciado} />
      {q.tipo === 'mc' ? (
        <>
          <div className={'opcoes' + (lida ? '' : ' travada')}>
            {opcoes.map((o, k) => {
              let cls = '';
              if (res && !res.invalida) { if (o === q.resposta) cls = 'certa'; else if (o === res.escolhida) cls = 'errada'; }
              return (
                <button key={o} className={cls} disabled={!lida || (!!res && !res.invalida)} onClick={() => responder(o)}>
                  <b>{'ABCDE'[k]}</b> <span dangerouslySetInnerHTML={{ __html: o }} />
                </button>
              );
            })}
          </div>
          {!lida && <div className="barra-leitura"><div><i style={{ animationDuration: msLeitura + 'ms' }} /></div><span>Leia a questão com calma…</span></div>}
        </>
      ) : (
        <form className="resposta" onSubmit={(e) => { e.preventDefault(); if (valor.trim()) responder(valor); }}>
          <input value={valor} onChange={(e) => setValor(e.target.value)} disabled={!!res && !res.invalida}
            inputMode={q.tipo === 'text' ? 'text' : 'decimal'} placeholder={q.tipo === 'frac' ? 'ex.: 3/4' : 'Sua resposta'} />
          <button className="btn" disabled={!valor.trim() || (!!res && !res.invalida)}>Conferir</button>
        </form>
      )}

      {!res && lista.length > 0 && (
        <div className="dicas">
          {lista.slice(0, nDicas).map((d, i) => <div key={i} className="dica"><b>💡 Dica {i + 1}</b><div>{d}</div></div>)}
          {nDicas < lista.length && <button className="link" onClick={() => setNDicas(nDicas + 1)}>💡 {nDicas ? 'Mais uma dica' : 'Quero uma dica'}</button>}
        </div>
      )}

      {res?.invalida && <p className="aviso">Não entendi essa resposta. Confira o formato e tente de novo.</p>}
      {res && !res.invalida && (
        <div className={'retorno ' + (res.ok ? 'ok' : 'erro')}>
          <div className="veredito-linha">
            {gato && <span className={'qgato ' + (res.ok ? 'ok' : 'erro')} aria-hidden="true"><span dangerouslySetInnerHTML={{ __html: gato }} /><i>{res.frase}</i></span>}
            <p className="veredito">{res.ok ? 'Acertou! 🎉' : 'Não foi dessa vez.'}</p>
          </div>
          {res.aviso && <p>{res.aviso}</p>}
          <ModoTutor q={q} ok={res.ok} escolhida={res.escolhida} />
        </div>
      )}
    </div>
  );
}

// Lição. Fluxo de erro (tutor original): erro → tempo de leitura → questão parecida obrigatória →
// errou de novo: explicação + mais uma parecida → libera a próxima.
export default function Licao({ titulo, questoes, aoResponder, aoEvento = () => {}, aoTerminar, gato, modo = 'licao' }) {
  const [i, setI] = useState(0);
  const [placar, setPlacar] = useState(0);
  const [etapa, setEtapa] = useState('pergunta'); // pergunta | provar | parecida | liberado
  const [prova, setProva] = useState(null);
  const usadas = useRef([]);
  const q = questoes[i];
  const materia = MATERIAS.find((m) => m.id === q?.materia);

  useEffect(() => { setEtapa('pergunta'); setProva(null); window.scrollTo({ top: 0 }); }, [i]);

  const registrar = (questao, ok, resposta, tempo) => aoResponder({
    questao_id: questao.id, topico_id: questao.topico, materia: questao.materia, correta: ok, resposta, tempo_ms: tempo,
  });

  if (!questoes.length)
    return (
      <div className="cartao">
        <p>Não há questões para revisar agora. 🎉</p>
        <button className="btn" onClick={() => aoTerminar()}>Voltar</button>
      </div>
    );

  if (i >= questoes.length)
    return (
      <div className="cartao fim">
        <h2>{modo === 'revisao' ? 'Revisão concluída!' : 'Lição concluída!'}</h2>
        <p className="placar">{placar} / {questoes.length}</p>
        <p className="mudo">{placar === questoes.length ? 'Perfeito!' : 'As que você errou vão voltar nas próximas lições.'}</p>
        <button className="btn" onClick={() => aoTerminar()}>Continuar</button>
      </div>
    );

  function respondeuPrincipal(ok, resposta, tempo) {
    registrar(q, ok, resposta, tempo);
    aoEvento(ok ? 'acerto' : 'erro', { revisao: modo === 'revisao' });
    if (ok) { setPlacar((p) => p + 1); setEtapa('liberado'); } else setEtapa('provar');
  }

  function abrirParecida(nivel) {
    const pq = parecida(q, [q.id, ...usadas.current]);
    if (!pq) { setProva({ semParecida: true }); setEtapa('liberado'); return; }
    usadas.current.push(pq.id);
    setProva({ q: pq, nivel, resultado: null });
    setEtapa('parecida');
  }

  function respondeuParecida(ok, resposta, tempo) {
    registrar(prova.q, ok, resposta, tempo);
    aoEvento(ok ? 'acerto' : 'erro', {});
    if (ok) { if (prova.nivel === 0) aoEvento('corrigiu'); setProva({ ...prova, resultado: 'ok' }); setEtapa('liberado'); return; }
    if (prova.nivel >= 1) { setProva({ ...prova, resultado: 'travou' }); setEtapa('liberado'); return; }
    setProva({ ...prova, resultado: 'errou' });
  }

  return (
    <div className="licao" style={{ '--s': materia?.cor, '--s-soft': materia?.suave }}>
      <div className="licao-topo">
        <span className="etiqueta">{titulo || nomeTopico(q.topico)}</span>
        <span className="mudo">{i + 1} de {questoes.length}</span>
      </div>
      <div className="progresso"><i style={{ width: `${(i / questoes.length) * 100}%` }} /></div>

      <div className="cartao pilha">
        <Pergunta key={q.id + '-' + i} q={q} gato={gato} aoResponder={respondeuPrincipal} />

        {etapa === 'provar' && (
          <div className="provar">
            <BotaoEspera ms={tempoExplicacao(q)} rotulo="Agora prove que entendeu ▸" onClick={() => abrirParecida(0)} />
            <span className="mudo pequeno">Para liberar a <b>Próxima</b>: leia a explicação e acerte uma questão parecida.</span>
          </div>
        )}

        {prova?.q && (
          <div className="caixa-parecida">
            <div className="titulo-parecida">{prova.nivel ? 'Mais uma parecida' : 'Uma parecida pra fixar'} <span className="mudo pequeno">· mesmo raciocínio, outros dados</span></div>
            <Pergunta key={prova.q.id} q={prova.q} aoResponder={respondeuParecida} comDicas={false} />
            {prova.resultado === 'ok' && <p className="veredito ok-txt">Agora sim. Entendeu! 🧠</p>}
            {prova.resultado === 'errou' && (
              <div className="provar">
                <BotaoEspera ms={tempoExplicacao(prova.q)} rotulo="Quero mais uma ▸" onClick={() => abrirParecida(1)} />
                <span className="mudo pequeno">Leia a explicação dessa também.</span>
              </div>
            )}
            {prova.resultado === 'travou' && <p className="mudo pequeno">Essa ficou para a revisão e volta depois. Vale levar a dúvida para o professor na próxima aula.</p>}
          </div>
        )}
        {prova?.semParecida && <p className="mudo pequeno">Leia bem a explicação: essa questão volta na revisão.</p>}

        {etapa === 'liberado' && (
          <button className="btn proxima" onClick={() => setI(i + 1)}>{i + 1 < questoes.length ? 'Próxima ▸' : 'Ver resultado'}</button>
        )}
      </div>
    </div>
  );
}
