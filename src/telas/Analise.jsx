// Cartão de análise de uma questão: acerto, alternativa errada mais marcada e o porquê provável.
import { respostaEmTexto } from '../conteudo.js';
import { nomeTopico } from '../progresso.js';

const pct = (x) => (x == null ? '–' : Math.round(x * 100) + '%');
const cor = (x) => (x == null ? '' : x >= 0.8 ? 'verde' : x >= 0.6 ? 'amarelo' : 'vermelho');

export default function AnaliseQuestao({ q, x, compacta = false }) {
  const [errada, n] = x.maisMarcada || [];
  const porque = errada && q.tutor?.alternativas?.[errada];
  return (
    <div className={'cartao erro-comum' + (compacta ? ' compacta' : '')}>
      {!compacta && <div className="linha"><span className="etiqueta">{q.habilidade || nomeTopico(q.topico)}</span><span className={'pilula ' + cor(x.taxa)}>{pct(x.taxa)} de acerto · {x.nAlunos} aluno{x.nAlunos === 1 ? '' : 's'}</span></div>}
      <div className="enunciado-p" dangerouslySetInnerHTML={{ __html: q.enunciado }} />
      <p className="mudo pequeno" style={{ margin: 0 }}>✅ Certa: <span dangerouslySetInnerHTML={{ __html: respostaEmTexto(q) }} /></p>
      {errada && (
        <div className="pequeno">❌ Mais marcada errada: {(q.alternativas || []).includes(errada) ? <b dangerouslySetInnerHTML={{ __html: errada }} /> : <b>{errada}</b>} ({n}×){porque && <div className="mudo">Confusão provável: {porque}</div>}</div>
      )}
      {x.memoria.length > 0 && <div className="pequeno mudo">🧠 Ao tentar lembrar, escreveram: {[...new Set(x.memoria)].slice(0, 5).map((m) => `“${m}”`).join(', ')}</div>}
      {(x.lembrou > 0 || x.tempoMediano) && <div className="pequeno mudo">{x.lembrou > 0 ? `${x.lembrou} acerto(s) de memória · ` : ''}{x.tempoMediano ? `tempo típico ${Math.round(x.tempoMediano / 1000)} s` : ''}</div>}
    </div>
  );
}

