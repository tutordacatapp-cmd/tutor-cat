// Aba do professor: marcar tarefas (tópicos + prazo) e provas (data + tópicos) e acompanhar a turma.
import { useEffect, useState } from 'react';
import { api } from '../dados/api.js';
import { MATERIAS, topicosDa, topico, registrarMateriais, idTopicoMaterial } from '../conteudo.js';
import { progresso, preparo, quando, dataBR, hojeStr } from '../tarefas.js';

const pct = (x) => (x == null ? '–' : Math.round(x * 100) + '%');
const cor = (x) => (x == null ? '' : x >= 0.8 ? 'verde' : x >= 0.6 ? 'amarelo' : 'vermelho');
const emDias = (n) => { const d = new Date(); d.setDate(d.getDate() + n); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };

export default function Tarefas({ turmaId, alunos, tentativas }) {
  const [lista, setLista] = useState(null);
  const [materiais, setMateriais] = useState([]);
  const [novo, setNovo] = useState(null);
  const [aberta, setAberta] = useState(null);
  const [erro, setErro] = useState('');

  const carregar = () => api.tarefas(turmaId).then(setLista).catch((e) => setErro(e.message));
  useEffect(() => {
    setLista(null); setNovo(null); carregar();
    api.materiais(turmaId).then((ms) => { const pub = ms.filter((m) => m.status === 'publicado'); registrarMateriais(pub); setMateriais(pub); }).catch(() => {});
  }, [turmaId]);

  if (novo) return <Form inicial={novo} materiais={materiais} aoSalvar={() => { setNovo(null); carregar(); }} aoCancelar={() => setNovo(null)} />;

  return (
    <div className="pilha">
      <div className="cartao pilha">
        <h3>📌 Tarefas e provas</h3>
        <p className="mudo pequeno" style={{ margin: 0 }}>Os alunos veem no topo do app, com prazo e uma lição que mistura os tópicos e puxa primeiro o que cada um errou.</p>
        <div className="linha" style={{ justifyContent: 'flex-start', flexWrap: 'wrap' }}>
          <button className="btn" onClick={() => setNovo({ tipo: 'tarefa', turma_id: turmaId, materia: 'mt', topicos: [], meta: 10, data: emDias(7), titulo: '' })}>+ Tarefa</button>
          <button className="btn fantasma" onClick={() => setNovo({ tipo: 'prova', turma_id: turmaId, materia: 'mt', topicos: [], meta: 10, data: emDias(7), titulo: '' })}>+ Prova</button>
        </div>
      </div>
      {erro && <p className="aviso">{erro}</p>}
      {!lista ? <p className="mudo">Carregando…</p> : !lista.length ? <p className="mudo pequeno">Nenhuma tarefa ou prova marcada.</p> : lista.map((t) => {
        const ehProva = t.tipo === 'prova';
        const st = alunos.map((a) => {
          const ts = tentativas.filter((x) => x.aluno_id === a.id);
          return { a, p: progresso(t, ts), r: preparo(t, ts) };
        });
        const prontos = st.filter((x) => x.p.pronto).length;
        const passou = t.data < hojeStr();
        return (
          <div key={t.id} className={'cartao pilha tarefa' + (passou ? ' passada' : '')}>
            <button className="ed-topo" onClick={() => setAberta(aberta === t.id ? null : t.id)}>
              <span>{ehProva ? '📅' : '📌'}</span>
              <span className="pilha" style={{ gap: 2 }}>
                <b>{t.titulo}</b>
                <span className="mudo pequeno">{MATERIAS.find((m) => m.id === t.materia)?.nome} · {ehProva ? 'prova' : 'prazo'} {dataBR(t.data)} ({quando(t.data, t.tipo)})</span>
                <span className="pequeno">{ehProva ? `Preparo da turma: ${pct(media(st.map((x) => x.r.taxa)))} de acerto nos tópicos (14 dias)` : `${prontos} de ${alunos.length} concluíram`}</span>
              </span>
              <span className="mudo">{aberta === t.id ? '▴' : '▾'}</span>
            </button>
            {aberta === t.id && (
              <>
                <span className="mudo pequeno">Tópicos: {t.topicos.map((id) => topico(id)?.titulo || id).join(' · ')}{!ehProva && ` · meta: ${t.meta} questões por tópico`}</span>
                <table className="tabela compacta">
                  <thead><tr><th>Aluno</th><th className="num">{ehProva ? 'Questões' : 'Feitas'}</th><th className="num">Acerto</th></tr></thead>
                  <tbody>
                    {st.map(({ a, p, r }) => (
                      <tr key={a.id}>
                        <td>{a.nome.split(' ')[0]}{!ehProva && p.pronto && ' ✅'}</td>
                        <td className="num">{ehProva ? r.feitas : `${Math.min(p.feitas, p.alvo)}/${p.alvo}`}</td>
                        <td className="num"><span className={'pilula ' + cor(ehProva ? r.taxa : p.taxa)}>{pct(ehProva ? r.taxa : p.taxa)}</span></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <div className="linha" style={{ justifyContent: 'flex-start' }}>
                  <button className="link pequeno" onClick={() => setNovo(t)}>✎ Editar</button>
                  <button className="link pequeno perigo" onClick={async () => { if (confirmar(t)) { await api.excluirTarefa(t.id); carregar(); } }}>🗑 Excluir</button>
                </div>
              </>
            )}
          </div>
        );
      })}
    </div>
  );
}

const media = (xs) => { const v = xs.filter((x) => x != null); return v.length ? v.reduce((a, b) => a + b, 0) / v.length : null; };
const confirmar = (t) => (typeof window !== 'undefined' && window.confirm ? window.confirm(`Excluir "${t.titulo}"?`) : true);

function Form({ inicial, materiais, aoSalvar, aoCancelar }) {
  const [t, setT] = useState(inicial);
  const [msg, setMsg] = useState('');
  const ehProva = t.tipo === 'prova';
  const opcoes = [
    ...materiais.filter((m) => m.materia === t.materia).map((m) => ({ id: idTopicoMaterial(m), titulo: '📚 ' + m.titulo })),
    ...topicosDa(t.materia).map((x) => ({ id: x.id, titulo: x.titulo })),
  ];
  const alternar = (id) => setT({ ...t, topicos: t.topicos.includes(id) ? t.topicos.filter((x) => x !== id) : [...t.topicos, id] });
  async function salvar() {
    if (!t.topicos.length) return setMsg('Escolha pelo menos um tópico.');
    if (!t.data) return setMsg('Escolha a data.');
    const titulo = t.titulo.trim() || (ehProva ? `Prova de ${MATERIAS.find((m) => m.id === t.materia).nome}` : `Tarefa de ${MATERIAS.find((m) => m.id === t.materia).nome}`);
    setMsg('Salvando…');
    try { await api.salvarTarefa({ ...t, titulo }); aoSalvar(); }
    catch (e) { setMsg(/tarefas|schema cache/i.test(e.message) ? 'O banco ainda está sendo atualizado. Tente em alguns minutos.' : e.message); }
  }
  return (
    <div className="pilha">
      <button className="voltar" onClick={aoCancelar}>← Tarefas</button>
      <h2>{t.id ? 'Editar' : 'Nova'} {ehProva ? 'prova' : 'tarefa'}</h2>
      <div className="cartao pilha">
        {!t.id && (
          <div className="opcoes-ajuste" style={{ gridTemplateColumns: '1fr 1fr' }}>
            {[['tarefa', '📌 Tarefa', 'praticar até um prazo'], ['prova', '📅 Prova', 'contagem regressiva + revisão']].map(([id, nome, desc]) => (
              <button key={id} className={'ajuste' + (t.tipo === id ? ' ativo' : '')} onClick={() => setT({ ...t, tipo: id })}><b>{nome}</b><span className="pequeno mudo">{desc}</span></button>
            ))}
          </div>
        )}
        <label className="campo">Matéria
          <select value={t.materia} onChange={(e) => setT({ ...t, materia: e.target.value, topicos: [] })}>{MATERIAS.map((m) => <option key={m.id} value={m.id}>{m.nome}</option>)}</select>
        </label>
        <label className="campo">Título (opcional)<input value={t.titulo} placeholder={ehProva ? 'Ex.: P2 de Matemática' : 'Ex.: Frações para sexta'} onChange={(e) => setT({ ...t, titulo: e.target.value })} /></label>
        <label className="campo">{ehProva ? 'Data da prova' : 'Prazo'}<input type="date" value={t.data} min={hojeStr()} onChange={(e) => setT({ ...t, data: e.target.value })} /></label>
        {!ehProva && (
          <label className="campo">Questões por tópico
            <select value={t.meta} onChange={(e) => setT({ ...t, meta: +e.target.value })}>{[5, 10, 15, 20].map((n) => <option key={n} value={n}>{n}</option>)}</select>
          </label>
        )}
        <div className="pilha" style={{ gap: 4 }}>
          <b className="pequeno">Tópicos ({t.topicos.length})</b>
          <div className="lista-check">
            {opcoes.map((o) => (
              <label key={o.id} className={'check' + (t.topicos.includes(o.id) ? ' on' : '')}>
                <input type="checkbox" checked={t.topicos.includes(o.id)} onChange={() => alternar(o.id)} /> {o.titulo}
              </label>
            ))}
          </div>
        </div>
        {msg && <p className="pequeno" style={{ margin: 0 }}>{msg}</p>}
        <button className="btn" onClick={salvar}>Salvar e mostrar aos alunos</button>
      </div>
    </div>
  );
}
