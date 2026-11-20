// Aba Impacto: o app está ajudando? Uso, aprendizado (antes × depois) e erros corrigidos.
import { useState } from 'react';
import { impacto } from '../impacto.js';

const pct = (x) => (x == null ? '–' : Math.round(x * 100) + '%');
const pp = (x) => (x == null ? '–' : (x >= 0 ? '+' : '') + Math.round(x * 100) + ' p.p.');
const horas = (m) => (m < 60 ? `${m} min` : `${Math.floor(m / 60)} h ${m % 60} min`);
const dataBR = (iso) => iso.split('-').reverse().slice(0, 2).join('/');

function Grafico({ dados }) {
  if (dados.length < 2) return <p className="mudo pequeno">O gráfico aparece a partir da segunda semana de uso.</p>;
  const W = 340, H = 150, m = { l: 30, r: 8, t: 10, b: 24 }, w = W - m.l - m.r, h = H - m.t - m.b;
  const maxN = Math.max(...dados.map((d) => d.n)), bw = w / dados.length;
  const pts = dados.map((d, i) => [m.l + bw * i + bw / 2, d.taxa == null ? null : m.t + h * (1 - d.taxa)]);
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="grafico" role="img" aria-label="Respostas e acerto por semana">
      {[0, 0.5, 1].map((y) => <g key={y}><line x1={m.l} x2={W - m.r} y1={m.t + h * (1 - y)} y2={m.t + h * (1 - y)} className="g-grade" /><text x={m.l - 4} y={m.t + h * (1 - y) + 4} className="g-eixo" textAnchor="end">{y * 100}%</text></g>)}
      {dados.map((d, i) => <rect key={d.semana} x={m.l + bw * i + bw * 0.2} width={bw * 0.6} y={m.t + h * (1 - d.n / maxN)} height={h * d.n / maxN} className="g-barra"><title>{d.n} respostas</title></rect>)}
      <polyline points={pts.filter((p) => p[1] != null).map((p) => p.join(',')).join(' ')} className="g-linha" />
      {pts.map((p, i) => p[1] != null && <circle key={i} cx={p[0]} cy={p[1]} r="3.5" className="g-ponto"><title>{pct(dados[i].taxa)} de acerto</title></circle>)}
      {dados.map((d, i) => <text key={d.semana} x={m.l + bw * i + bw / 2} y={H - 6} className="g-eixo" textAnchor="middle">{dataBR(d.semana)}</text>)}
    </svg>
  );
}

export default function Impacto({ turmaNome, alunos, tentativas }) {
  const [aviso, setAviso] = useState('');
  const x = impacto(tentativas, alunos);
  if (!x.respostas) return <div className="cartao"><p className="mudo">Ainda não há respostas nesta turma. Os indicadores aparecem conforme os alunos usam o app.</p></div>;

  const resumo = `Tutor da Cat · ${turmaNome}\n` +
    `• ${x.ativos} de ${x.alunos} alunos usaram o app (${x.ativosSemana} nesta semana)\n` +
    `• ${x.respostas} questões respondidas, cerca de ${horas(x.tempoMin)} de estudo ativo\n` +
    (x.nComparaveis ? `• Acerto médio: ${pct(x.antes)} nas primeiras respostas → ${pct(x.depois)} nas mais recentes (${pp(x.depois - x.antes)}, ${x.nComparaveis} alunos com dados suficientes)\n` : '') +
    `• ${x.corrigidas} de ${x.erradas} questões erradas foram depois acertadas pelo mesmo aluno (${pct(x.erradas ? x.corrigidas / x.erradas : null)})`;
  const copiar = async () => { try { await navigator.clipboard.writeText(resumo); setAviso('Copiado!'); } catch { setAviso('Não consegui copiar.'); } };

  return (
    <div className="pilha">
      <div className="kpis">
        <div className="kpi"><b>{x.ativos}<small>/{x.alunos}</small></b><span>alunos usaram</span><em>{x.ativosSemana} nesta semana</em></div>
        <div className="kpi"><b>{x.respostas}</b><span>questões respondidas</span><em>≈ {horas(x.tempoMin)} de estudo</em></div>
        <div className="kpi"><b>{x.nComparaveis ? pp(x.depois - x.antes) : '–'}</b><span>acerto: antes → depois</span><em>{x.nComparaveis ? `${pct(x.antes)} → ${pct(x.depois)}` : 'precisa de 20+ respostas por aluno'}</em></div>
        <div className="kpi"><b>{pct(x.erradas ? x.corrigidas / x.erradas : null)}</b><span>erros corrigidos</span><em>{x.corrigidas} de {x.erradas} questões</em></div>
      </div>

      <div className="cartao pilha">
        <h3>📈 Semana a semana</h3>
        <Grafico dados={x.evolucao} />
        <span className="mudo mini">Barras: questões respondidas. Linha: acerto (sem contar as questões parecidas de reforço).</span>
      </div>

      <div className="cartao pilha">
        <h3>👩‍🎓 Por aluno</h3>
        <table className="tabela compacta">
          <thead><tr><th>Aluno</th><th className="num">Antes</th><th className="num">Agora</th><th className="num">Erros corrig.</th></tr></thead>
          <tbody>
            {x.porAluno.map(({ a, n, antes, depois, ganho, erradas, corrigidas, dias }) => (
              <tr key={a.id}>
                <td>{a.nome.split(' ')[0]}<br /><span className="mudo mini">{n} quest. · {dias} dia{dias === 1 ? '' : 's'}</span></td>
                <td className="num">{pct(antes)}</td>
                <td className="num">{depois == null ? '–' : <span className={'pilula ' + (ganho > 0.05 ? 'verde' : ganho < -0.05 ? 'vermelho' : 'amarelo')}>{pct(depois)}</span>}</td>
                <td className="num">{erradas ? `${corrigidas}/${erradas}` : '–'}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <span className="mudo mini">Antes = primeiras respostas do aluno; agora = as mais recentes (até 20 de cada lado, mínimo 20 no total). {x.melhoraram} de {x.nComparaveis} melhoraram mais de 5 pontos.</span>
      </div>

      {x.topicos.length > 0 && (
        <div className="cartao pilha">
          <h3>📚 Tópicos: antes × depois</h3>
          {x.topicos.slice(0, 8).map((t) => (
            <div key={t.id} className="topico-imp pequeno">
              <span>{t.nome}<br /><span className="mudo mini">{t.n} respostas</span></span>
              <span className="sem-quebra">{pct(t.antes)} → <b>{pct(t.depois)}</b> <span className={t.ganho > 0 ? 'ok-txt' : 'erro-ed'}>({pp(t.ganho)})</span></span>
            </div>
          ))}
          <span className="mudo mini">Compara a primeira metade das respostas da turma em cada tópico com a segunda (tópicos com 16+ respostas).</span>
        </div>
      )}

      <div className="cartao pilha">
        <h3>📋 Resumo para a escola</h3>
        <pre className="resumo-txt">{resumo}</pre>
        <button className="btn" style={{ alignSelf: 'flex-start' }} onClick={copiar}>Copiar resumo</button>
        {aviso && <span className="pequeno">{aviso}</span>}
        <span className="mudo mini">Leitura honesta: no piloto não há turma de comparação; a melhora reflete prática com o app e com as aulas ao mesmo tempo.</span>
      </div>
    </div>
  );
}
