import { useEffect, useMemo, useRef, useState } from 'react';
import { corrigir, respostaEmTexto, MATERIAS, parecida, dicas, tempoLeitura, tempoExplicacao, topico } from '../conteudo.js';
import { nomeTopico } from '../progresso.js';
import { BotaoOuvir, parar } from '../fala.jsx';

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
      <div className="mt-h linha" style={{ justifyContent: 'space-between' }}><span>{ok ? 'Modo tutor' : 'Modo tutor · bora entender o que rolou'}</span>
        <BotaoOuvir id={'tutor-' + q.id} rotulo="Ouvir explicação" partes={() => [
          !ok && { texto: `Você marcou ${escolhida}. A certa é ${certa}.` },
          { texto: `Por que é ${certa}: ${T.certa || q.explicacao || ''}` },
          ...(!ok && T.alternativas?.[escolhida] ? [{ texto: `Sobre ${escolhida}: ${T.alternativas[escolhida]}` }] : []),
          { texto: pontos.length ? 'O que cai na prova: ' + pontos.join('. ') : '' },
          { texto: T.pegadinha ? 'Cuidado com a pegadinha: ' + T.pegadinha : '' },
        ].filter(Boolean)} /></div>
      {!ok && <div className="mt-sec mt-mine"><b>✏️ Você marcou: <span dangerouslySetInnerHTML={{ __html: escolhida }} /></b><div>A certa é <b dangerouslySetInnerHTML={{ __html: certa }} />. Tranquilo: errar aqui é melhor que errar na prova.</div></div>}
      <div className="mt-sec mt-ok"><b>✅ Por que é <span dangerouslySetInnerHTML={{ __html: certa }} /></b><Html html={T.certa || q.explicacao || ''} /></div>
      {ok ? <details className="mt-extra"><summary>Ver o que cai na prova{outras.length ? ' e por que as outras não rolam' : ''}</summary>{extra}</details> : extra}
    </div>
  );
}

// ✏️ Rascunho com o dedo (do tutor original): para fazer conta, escrever a palavra, separar sílabas…
function Rascunho() {
  const ref = useRef(null);
  const desenhando = useRef(false);
  useEffect(() => {
    const c = ref.current; if (!c) return;
    const w = Math.min(c.parentElement.clientWidth || 320, 680), h = 220, dpr = window.devicePixelRatio || 1;
    c.width = w * dpr; c.height = h * dpr; c.style.width = '100%'; c.style.maxWidth = w + 'px'; c.style.height = h + 'px';
    const g = c.getContext('2d'); g.scale(dpr, dpr); g.lineWidth = 3; g.lineCap = 'round'; g.lineJoin = 'round';
    g.strokeStyle = getComputedStyle(document.body).color || '#1B2340';
    const pos = (e) => { const r = c.getBoundingClientRect(); return [(e.clientX - r.left) * w / r.width, (e.clientY - r.top) * h / r.height]; };
    const ini = (e) => { e.preventDefault(); desenhando.current = true; c.setPointerCapture?.(e.pointerId); const [x, y] = pos(e); g.beginPath(); g.moveTo(x, y); g.lineTo(x + 0.1, y + 0.1); g.stroke(); };
    const mov = (e) => { if (!desenhando.current) return; e.preventDefault(); const [x, y] = pos(e); g.lineTo(x, y); g.stroke(); };
    const fim = () => { desenhando.current = false; };
    c.addEventListener('pointerdown', ini); c.addEventListener('pointermove', mov);
    c.addEventListener('pointerup', fim); c.addEventListener('pointercancel', fim); c.addEventListener('pointerleave', fim);
    return () => { c.removeEventListener('pointerdown', ini); c.removeEventListener('pointermove', mov); c.removeEventListener('pointerup', fim); c.removeEventListener('pointercancel', fim); c.removeEventListener('pointerleave', fim); };
  }, []);
  const limpar = () => { const c = ref.current; c.getContext('2d').clearRect(0, 0, c.width, c.height); };
  return (
    <div className="rascunho">
      <canvas ref={ref} />
      <div className="linha"><button className="link" onClick={limpar}>🧽 Limpar</button><span className="mudo pequeno">Escreva com o dedo ✏️ (não vale nota)</span></div>
    </div>
  );
}

// "Tente lembrar primeiro": nas questões de resposta curta, o aluno escreve antes de ver as alternativas.
const normLivre = (s) => semTags(s).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[.!?;:,"'’]/g, '').replace(/\s+/g, ' ').trim();
export function podeLembrar(q) {
  if (q.tipo !== 'mc') return false;
  const r = semTags(q.resposta);
  if (r.length > 24 || r.split(' ').length > 3) return false;
  if (/^(sim|não|são iguais)$/i.test(r)) return false;
  if (/qual (frase|trecho|separação)|ordem crescente|está correta|corretamente|qual destes números|qual número é maior|o que é maior/i.test(semTags(q.enunciado))) return false;
  return true;
}

// Uma questão: trava de leitura nas alternativas, dicas, correção e explicação.
function Pergunta({ q, gato, aoResponder, aoLembrou, aoAvisar, comDicas = true, lembrar = false }) {
  const [avisando, setAvisando] = useState(null); // null | 'aberto' | 'enviado'
  const [valor, setValor] = useState('');
  const [res, setRes] = useState(null);
  const [lida, setLida] = useState(q.tipo !== 'mc');
  const [fase, setFase] = useState(lembrar && podeLembrar(q) ? 'lembrar' : 'normal'); // lembrar | revelou | normal
  const [memoria, setMemoria] = useState('');
  const [quaseMemoria, setQuaseMemoria] = useState(null);
  const [rascunho, setRascunho] = useState(false);
  const [nDicas, setNDicas] = useState(0);
  const inicio = useRef(Date.now());
  const opcoes = useMemo(() => (q.tipo === 'mc' ? embaralhar(q.alternativas) : []), [q]);
  const lista = useMemo(() => (comDicas ? dicas(q) : []), [q, comDicas]);
  const msLeitura = useMemo(() => tempoLeitura(q), [q]);

  useEffect(() => {
    if (q.tipo !== 'mc' || fase === 'lembrar') return;
    const t = setTimeout(() => setLida(true), fase === 'revelou' ? 800 : msLeitura);
    return () => clearTimeout(t);
  }, [q, msLeitura, fase]);

  function tentarLembrar(e) {
    e.preventDefault();
    if (!memoria.trim()) return;
    const ok = normLivre(memoria) === normLivre(q.resposta);
    if (ok) {
      const acento = semTags(memoria).trim().toLowerCase() !== semTags(q.resposta).trim().toLowerCase();
      setRes({ ok: true, escolhida: q.resposta, frase: 'De memória! 🧠', memoria: true, aviso: acento ? `Atenção à escrita certa: ${semTags(q.resposta)}.` : null });
      aoResponder(true, memoria, Date.now() - inicio.current, false, { lembrou: true });
      aoLembrou && aoLembrou();
      setFase('normal');
    } else {
      setQuaseMemoria(memoria);
      setFase('revelou');
    }
  }

  function responder(v) {
    if (res && !res.invalida) return;
    const r = corrigir(q, v);
    if (r.invalida) { setRes({ invalida: true }); setTimeout(() => setRes(null), 1800); return; }
    setRes({ ...r, escolhida: v, frase: sortear(r.ok ? FRASES_OK : FRASES_ERRO) });
    aoResponder(!!r.ok, String(v), Date.now() - inicio.current, nDicas > 0, { lembrou: false, tentativa_memoria: quaseMemoria || null });
  }

  return (
    <div className="questao">
      <Html className="enunciado" html={q.enunciado} />
      <BotaoOuvir id={'q-' + q.id} rotulo="Ouvir a questão" partes={() => [
        { texto: q.enunciado, lang: q.materia === 'en' && /[a-z]{3,} [a-z]{2,}/i.test(semTags(q.enunciado)) && !/[ãçéêíóôõú]/i.test(semTags(q.enunciado)) ? 'en-US' : 'pt-BR' },
        ...(q.tipo === 'mc' && fase !== 'lembrar' && lida ? opcoes.map((o, k) => ({ texto: `${'ABCDE'[k]}: ${o}`, lang: q.materia === 'en' && !/[ãçéêíóôõú]/i.test(o) ? 'en-US' : 'pt-BR' })) : []),
      ]} />
      {fase === 'lembrar' ? (
        <div className="lembrar">
          <p className="pequeno"><b>🧠 Tente lembrar primeiro.</b> Escreva a resposta; as alternativas aparecem depois.</p>
          <form className="resposta" onSubmit={tentarLembrar}>
            <input value={memoria} onChange={(e) => setMemoria(e.target.value)} placeholder="O que você lembra?" autoCapitalize="none" />
            <button className="btn" disabled={!memoria.trim()}>Conferir</button>
          </form>
          <button className="link pequeno" onClick={() => setFase('revelou')}>Não lembro, mostrar as alternativas</button>
        </div>
      ) : q.tipo === 'mc' && !(res?.memoria) ? (
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
          {quaseMemoria && !res && <p className="mudo pequeno">Você escreveu “{quaseMemoria}”. Não era bem isso, mas foi bom tentar: agora escolha.</p>}
          {!lida && <div className="barra-leitura"><div><i style={{ animationDuration: (fase === 'revelou' ? 800 : msLeitura) + 'ms' }} /></div><span>Leia a questão com calma…</span></div>}
        </>
      ) : res?.memoria ? (
        <p className="lembrou">🧠 Você lembrou sozinho(a): <b dangerouslySetInnerHTML={{ __html: q.resposta }} /> · ⭐ dobrada!</p>
      ) : (
        <form className="resposta" onSubmit={(e) => { e.preventDefault(); if (valor.trim()) responder(valor); }}>
          <input value={valor} onChange={(e) => setValor(e.target.value)} disabled={!!res && !res.invalida}
            inputMode={q.tipo === 'text' ? 'text' : 'decimal'} placeholder={q.tipo === 'frac' ? 'ex.: 3/4' : 'Sua resposta'} />
          <button className="btn" disabled={!valor.trim() || (!!res && !res.invalida)}>Conferir</button>
        </form>
      )}

      {!res && (
        <div className="pilha" style={{ gap: 6 }}>
          <button className="link" onClick={() => setRascunho(!rascunho)}>{rascunho ? '✏️ Fechar rascunho' : '✏️ Rascunho'}</button>
          {rascunho && <Rascunho />}
        </div>
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
          {aoAvisar && (avisando === 'enviado' ? <span className="mudo pequeno">Obrigado! O professor vai conferir. 🙏</span>
            : avisando === 'aberto' ? (
              <span className="linha" style={{ justifyContent: 'flex-start', flexWrap: 'wrap', gap: 6 }}>
                {['A resposta certa está errada', 'Não entendi a explicação', 'A pergunta está confusa'].map((m) => (
                  <button key={m} className="chip" onClick={() => { aoAvisar(q, m); setAvisando('enviado'); }}>{m}</button>
                ))}
              </span>
            ) : <button className="link pequeno" style={{ alignSelf: 'flex-start' }} onClick={() => setAvisando('aberto')}>🚩 Achei um erro nesta questão</button>)}
        </div>
      )}
    </div>
  );
}

// Lição. Fluxo de erro (tutor original): erro → tempo de leitura → questão parecida obrigatória →
// errou de novo: explicação + mais uma parecida → libera a próxima.
export default function Licao({ titulo, questoes, aoResponder, aoAvisar, aoEvento = () => {}, aoTerminar, gato, modo = 'licao', lembrar = 'sempre' }) {
  const [i, setI] = useState(0);
  const [placar, setPlacar] = useState(0);
  const [etapa, setEtapa] = useState('pergunta'); // pergunta | provar | parecida | liberado
  const [prova, setProva] = useState(null);
  const usadas = useRef([]);
  const q = questoes[i];
  // Ajuste da turma: 'sempre' | 'as_vezes' (uma sim, uma não) | 'nunca'
  const lembrarAqui = lembrar === true || lembrar === 'sempre' || (lembrar === 'as_vezes' && i % 2 === 0);
  const materia = MATERIAS.find((m) => m.id === q?.materia);

  useEffect(() => { setEtapa('pergunta'); setProva(null); parar(); window.scrollTo({ top: 0 }); }, [i]);
  useEffect(() => () => parar(), []);

  const registrar = (questao, ok, resposta, tempo, contexto, dica, extra = {}) => aoResponder({
    questao_id: questao.id, topico_id: questao.topico, materia: questao.materia, correta: ok, resposta, tempo_ms: tempo,
    contexto, usou_dica: !!dica, lembrou: !!extra.lembrou, tentativa_memoria: extra.tentativa_memoria || null,
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

  function respondeuPrincipal(ok, resposta, tempo, dica, extra) {
    registrar(q, ok, resposta, tempo, modo === 'revisao' ? 'revisao' : 'licao', dica, extra);
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

  function respondeuParecida(ok, resposta, tempo, dica, extra) {
    registrar(prova.q, ok, resposta, tempo, 'parecida', dica, extra);
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
        <Pergunta key={q.id + '-' + i} q={q} gato={gato} aoResponder={respondeuPrincipal} aoAvisar={aoAvisar} lembrar={lembrarAqui} aoLembrou={() => aoEvento('lembrou')} />

        {etapa === 'provar' && (
          <div className="provar">
            <BotaoEspera ms={tempoExplicacao(q)} rotulo="Agora prove que entendeu ▸" onClick={() => abrirParecida(0)} />
            <span className="mudo pequeno">Para liberar a <b>Próxima</b>: leia a explicação e acerte uma questão parecida.</span>
          </div>
        )}

        {prova?.q && (
          <div className="caixa-parecida">
            <div className="titulo-parecida">{prova.nivel ? 'Mais uma parecida' : 'Uma parecida pra fixar'} <span className="mudo pequeno">· mesmo raciocínio, outros dados</span></div>
            <Pergunta key={prova.q.id} q={prova.q} aoResponder={respondeuParecida} aoAvisar={aoAvisar} comDicas={false} />
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
