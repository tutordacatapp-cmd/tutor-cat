import { useEffect, useMemo, useRef, useState } from 'react';
import { corrigir, respostaEmTexto, MATERIAS } from '../conteudo.js';
import { nomeTopico } from '../progresso.js';

const embaralhar = (a) => a.map((x) => [Math.random(), x]).sort((p, q) => p[0] - q[0]).map((p) => p[1]);
const Html = ({ html, className }) => <div className={className} dangerouslySetInnerHTML={{ __html: html }} />;

// Depois de um erro, o botão "Entendi" só libera após alguns segundos:
// a ideia é ler a explicação em vez de pular para a próxima no chute.
const ESPERA_ERRO_MS = 4000;

export default function Licao({ titulo, questoes, aoResponder, aoTerminar }) {
  const [i, setI] = useState(0);
  const [valor, setValor] = useState('');
  const [resultado, setResultado] = useState(null); // {ok, aviso, escolhida}
  const [placar, setPlacar] = useState(0);
  const [liberado, setLiberado] = useState(true);
  const inicio = useRef(Date.now());
  const q = questoes[i];
  const opcoes = useMemo(() => (q?.tipo === 'mc' ? embaralhar(q.alternativas) : []), [q]);
  const materia = MATERIAS.find((m) => m.id === q?.materia);

  useEffect(() => {
    inicio.current = Date.now();
    setValor('');
    setResultado(null);
    setLiberado(true);
  }, [i]);

  if (!questoes.length)
    return (
      <div className="cartao">
        <p>Não há questões para revisar agora. 🎉</p>
        <button className="btn" onClick={() => aoTerminar(0, 0)}>Voltar</button>
      </div>
    );

  if (i >= questoes.length)
    return (
      <div className="cartao fim">
        <h2>Lição concluída!</h2>
        <p className="placar">{placar} / {questoes.length}</p>
        <p className="mudo">{placar === questoes.length ? 'Perfeito!' : 'As que você errou vão voltar nas próximas lições.'}</p>
        <button className="btn" onClick={() => aoTerminar(placar, questoes.length)}>Continuar</button>
      </div>
    );

  function responder(v) {
    if (resultado) return;
    const r = corrigir(q, v);
    if (r.invalida) {
      setResultado({ ok: false, invalida: true });
      setTimeout(() => setResultado(null), 1800);
      return;
    }
    setResultado({ ...r, escolhida: v });
    if (r.ok) setPlacar((p) => p + 1);
    else {
      setLiberado(false);
      setTimeout(() => setLiberado(true), ESPERA_ERRO_MS);
    }
    aoResponder({
      questao_id: q.id,
      topico_id: q.topico,
      materia: q.materia,
      correta: !!r.ok,
      resposta: String(v),
      tempo_ms: Date.now() - inicio.current,
    });
  }

  return (
    <div className="licao" style={{ '--s': materia?.cor, '--s-soft': materia?.suave }}>
      <div className="licao-topo">
        <span className="etiqueta">{titulo || nomeTopico(q.topico)}</span>
        <span className="mudo">{i + 1} de {questoes.length}</span>
      </div>
      <div className="progresso"><i style={{ width: `${(i / questoes.length) * 100}%` }} /></div>

      <div className="cartao questao">
        <Html className="enunciado" html={q.enunciado} />

        {q.tipo === 'mc' ? (
          <div className="opcoes">
            {opcoes.map((o, k) => {
              let cls = '';
              if (resultado && !resultado.invalida) {
                if (o === q.resposta) cls = 'certa';
                else if (o === resultado.escolhida) cls = 'errada';
              }
              return (
                <button key={o} className={cls} disabled={!!resultado} onClick={() => responder(o)}>
                  <b>{'ABCDE'[k]}</b> <span dangerouslySetInnerHTML={{ __html: o }} />
                </button>
              );
            })}
          </div>
        ) : (
          <form className="resposta" onSubmit={(e) => { e.preventDefault(); if (valor.trim()) responder(valor); }}>
            <input
              value={valor}
              onChange={(e) => setValor(e.target.value)}
              disabled={!!resultado && !resultado.invalida}
              inputMode={q.tipo === 'text' ? 'text' : 'decimal'}
              placeholder={q.tipo === 'frac' ? 'ex.: 3/4' : 'Sua resposta'}
              autoFocus
            />
            <button className="btn" disabled={!valor.trim() || (!!resultado && !resultado.invalida)}>Conferir</button>
          </form>
        )}

        {resultado?.invalida && <p className="aviso">Não entendi essa resposta. Confira o formato e tente de novo.</p>}

        {resultado && !resultado.invalida && (
          <div className={'retorno ' + (resultado.ok ? 'ok' : 'erro')}>
            <p className="veredito">{resultado.ok ? 'Acertou! 🎉' : 'Não foi dessa vez.'}</p>
            {resultado.aviso && <p>{resultado.aviso}</p>}
            {!resultado.ok && q.tipo !== 'mc' && <p>Resposta certa: <b>{respostaEmTexto(q)}</b></p>}
            {q.explicacao && <Html className="explicacao" html={q.explicacao} />}
            <button className="btn" disabled={!liberado} onClick={() => setI(i + 1)}>
              {resultado.ok ? 'Próxima' : liberado ? 'Entendi, próxima' : 'Leia a explicação…'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
