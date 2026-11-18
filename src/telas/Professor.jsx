import { useEffect, useMemo, useState } from 'react';
import { api } from '../dados/api.js';
import { MATERIAS, questao, topicosDa, respostaEmTexto } from '../conteudo.js';
import { situacaoTopico, nomeTopico } from '../progresso.js';

const pct = (x) => (x == null ? '–' : Math.round(x * 100) + '%');
const cor = (x) => (x == null ? '' : x >= 0.8 ? 'verde' : x >= 0.6 ? 'amarelo' : 'vermelho');
const SEMANA = 7 * 864e5;

function taxa(ts) {
  return ts.length ? ts.filter((t) => t.correta).length / ts.length : null;
}

export default function Professor({ perfil }) {
  const [turmas, setTurmas] = useState(null);
  const [turmaId, setTurmaId] = useState(null);
  const [alunos, setAlunos] = useState([]);
  const [tentativas, setTentativas] = useState([]);
  const [aba, setAba] = useState('alunos');
  const [materia, setMateria] = useState('mt');
  const [alunoAberto, setAlunoAberto] = useState(null);

  useEffect(() => {
    api.turmasDoProfessor(perfil).then((ts) => { setTurmas(ts); if (ts[0]) setTurmaId(ts[0].id); });
  }, [perfil]);

  useEffect(() => {
    if (!turmaId) return;
    Promise.all([api.alunosDaTurma(turmaId), api.tentativasDaTurma(turmaId)]).then(([a, t]) => { setAlunos(a); setTentativas(t); });
  }, [turmaId]);

  const linhas = useMemo(() => alunos.map((a) => {
    const ts = tentativas.filter((t) => t.aluno_id === a.id);
    const semana = ts.filter((t) => Date.now() - new Date(t.criado_em).getTime() < SEMANA);
    const ultima = ts.reduce((m, t) => (t.criado_em > m ? t.criado_em : m), '');
    const porMateria = Object.fromEntries(MATERIAS.map((m) => [m.id, taxa(semana.filter((t) => t.materia === m.id))]));
    return { ...a, semana: semana.length, porMateria, ultima };
  }), [alunos, tentativas]);

  const errosComuns = useMemo(() => {
    const m = new Map();
    for (const t of tentativas) {
      if (t.materia !== materia) continue;
      const x = m.get(t.questao_id) || { total: 0, erros: 0 };
      x.total++; if (!t.correta) x.erros++;
      m.set(t.questao_id, x);
    }
    return [...m.entries()]
      .filter(([, x]) => x.total >= 2 && x.erros > 0)
      .sort((a, b) => b[1].erros / b[1].total - a[1].erros / a[1].total || b[1].total - a[1].total)
      .slice(0, 8)
      .map(([id, x]) => ({ q: questao(id), ...x }))
      .filter((x) => x.q);
  }, [tentativas, materia]);

  if (!turmas) return <p className="mudo">Carregando…</p>;
  if (!turmas.length) return <p className="aviso">Nenhuma turma vinculada a você. Fale com a coordenação.</p>;

  if (alunoAberto) {
    const ts = tentativas.filter((t) => t.aluno_id === alunoAberto.id);
    return (
      <div className="pilha">
        <button className="voltar" onClick={() => setAlunoAberto(null)}>← Turma</button>
        <h2>{alunoAberto.nome}</h2>
        {MATERIAS.map((m) => (
          <div className="cartao" key={m.id}>
            <h3 style={{ color: m.cor }}>{m.nome}</h3>
            <table className="tabela">
              <tbody>
                {topicosDa(m.id).map((tp) => {
                  const s = situacaoTopico(tp.id, ts);
                  return (
                    <tr key={tp.id}>
                      <td>{tp.titulo}</td>
                      <td className="num mudo">{s.total} q.</td>
                      <td className="num"><span className={'pilula ' + cor(s.taxa)}>{pct(s.taxa)}</span></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ))}
      </div>
    );
  }

  const tsMateria = tentativas.filter((t) => t.materia === materia);
  return (
    <div className="pilha">
      <div className="linha">
        <h2>Painel da turma</h2>
        {turmas.length > 1 && (
          <select value={turmaId} onChange={(e) => setTurmaId(e.target.value)}>
            {turmas.map((t) => <option key={t.id} value={t.id}>{t.nome}</option>)}
          </select>
        )}
      </div>
      <p className="mudo">{turmas.find((t) => t.id === turmaId)?.nome} · {alunos.length} {alunos.length === 1 ? 'aluno' : 'alunos'}</p>

      <nav className="abas">
        {[['alunos', 'Alunos'], ['topicos', 'Tópicos'], ['erros', 'Erros comuns']].map(([id, nome]) => (
          <button key={id} aria-selected={aba === id} onClick={() => setAba(id)}>{nome}</button>
        ))}
      </nav>

      {aba === 'alunos' && (
        <div className="cartao rolavel">
          <table className="tabela">
            <thead>
              <tr><th>Aluno</th><th className="num">Questões</th>{MATERIAS.map((m) => <th key={m.id} className="num" title={m.nome}>{m.nome.slice(0, 3)}.</th>)}</tr>
            </thead>
            <tbody>
              {linhas.map((a) => (
                <tr key={a.id} className="clicavel" onClick={() => setAlunoAberto(a)}>
                  <td><b>{a.nome}</b><br /><span className="mudo pequeno">{a.ultima ? 'usou em ' + new Date(a.ultima).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }) : 'ainda não usou'}</span></td>
                  <td className="num">{a.semana}</td>
                  {MATERIAS.map((m) => <td key={m.id} className="num"><span className={'pilula ' + cor(a.porMateria[m.id])}>{pct(a.porMateria[m.id])}</span></td>)}
                </tr>
              ))}
            </tbody>
          </table>
          <p className="mudo pequeno">Questões e acerto dos últimos 7 dias. Vermelho: abaixo de 60% · amarelo: 60–79% · verde: 80% ou mais. Toque num aluno para ver os tópicos.</p>
        </div>
      )}

      {aba !== 'alunos' && (
        <nav className="abas">
          {MATERIAS.map((m) => <button key={m.id} aria-selected={materia === m.id} onClick={() => setMateria(m.id)}>{m.nome}</button>)}
        </nav>
      )}

      {aba === 'topicos' && (
        <div className="cartao">
          <table className="tabela">
            <thead><tr><th>Tópico</th><th className="num">Alunos</th><th className="num">Acerto da turma</th></tr></thead>
            <tbody>
              {topicosDa(materia).map((tp) => {
                const ts = tsMateria.filter((t) => t.topico_id === tp.id);
                const n = new Set(ts.map((t) => t.aluno_id)).size;
                return (
                  <tr key={tp.id}>
                    <td>{tp.titulo}</td>
                    <td className="num">{n}</td>
                    <td className="num"><span className={'pilula ' + cor(taxa(ts))}>{pct(taxa(ts))}</span></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {aba === 'erros' && (
        <div className="pilha">
          {errosComuns.length === 0 && <p className="mudo">Ainda não há erros repetidos nesta matéria.</p>}
          {errosComuns.map(({ q, total, erros }) => (
            <div className="cartao erro-comum" key={q.id}>
              <div className="linha"><span className="etiqueta">{nomeTopico(q.topico)}</span><span className="pilula vermelho">{erros} de {total} erraram</span></div>
              <div className="enunciado-p" dangerouslySetInnerHTML={{ __html: q.enunciado }} />
              <p className="mudo pequeno">Resposta certa: <span dangerouslySetInnerHTML={{ __html: respostaEmTexto(q) }} /></p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
