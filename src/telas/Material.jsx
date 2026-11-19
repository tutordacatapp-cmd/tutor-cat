// "Material da aula": o professor cola o texto ou fotografa o material, a IA cria questões,
// o professor revisa/edita e publica para a turma.
import { useEffect, useState } from 'react';
import { api } from '../dados/api.js';
import { MATERIAS, registrarMateriais, idTopicoMaterial } from '../conteudo.js';

const novoId = () => Math.random().toString(36).slice(2, 8);
const pct = (x) => (x == null ? '–' : Math.round(x * 100) + '%');

// Questão do app  <->  formato de edição (alternativas e "porquês" lado a lado)
const paraEdicao = (q) => {
  const erradas = (q.alternativas || []).slice(1, 4);
  while (erradas.length < 3) erradas.push('');
  return {
    id: q.id || novoId(), enunciado: q.enunciado || '', correta: q.alternativas?.[0] || q.resposta || '', erradas,
    porques: erradas.map((e) => q.tutor?.alternativas?.[e] || ''), explicacao: q.explicacao || '',
    pontos: (q.tutor?.pontos || []).join('\n'), pegadinha: q.tutor?.pegadinha || '',
  };
};
const paraApp = (e) => ({
  id: e.id, tipo: 'mc', enunciado: e.enunciado.trim(), resposta: e.correta.trim(),
  alternativas: [e.correta, ...e.erradas].map((x) => x.trim()), explicacao: e.explicacao.trim(),
  tutor: {
    alternativas: Object.fromEntries(e.erradas.map((x, i) => [x.trim(), (e.porques[i] || '').trim()])),
    pontos: e.pontos.split('\n').map((x) => x.trim()).filter(Boolean), pegadinha: e.pegadinha.trim(),
  },
});
const problema = (e) => {
  if (!e.enunciado.trim()) return 'falta o enunciado';
  const alts = [e.correta, ...e.erradas].map((x) => x.trim().toLowerCase());
  if (alts.some((x) => !x)) return 'falta alternativa';
  if (new Set(alts).size < 4) return 'alternativas repetidas';
  return null;
};

function comprimir(arquivo) {
  return new Promise((ok, falha) => {
    const img = new Image();
    img.onload = () => {
      const k = Math.min(1, 1568 / Math.max(img.width, img.height));
      const c = document.createElement('canvas');
      c.width = Math.round(img.width * k); c.height = Math.round(img.height * k);
      c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
      URL.revokeObjectURL(img.src);
      ok(c.toDataURL('image/jpeg', 0.8));
    };
    img.onerror = () => falha(new Error('Não consegui abrir essa imagem.'));
    img.src = URL.createObjectURL(arquivo);
  });
}

export default function Material({ turmaId, alunos, tentativas, aoMudar }) {
  const [lista, setLista] = useState(null);
  const [tela, setTela] = useState('lista'); // lista | novo | editar
  const [erro, setErro] = useState('');

  const carregar = () => api.materiais(turmaId).then((ms) => { registrarMateriais(ms); setLista(ms); aoMudar?.(); }).catch((e) => setErro(e.message));
  useEffect(() => { setTela('lista'); setLista(null); carregar(); }, [turmaId]);

  if (tela === 'novo') return <Novo turmaId={turmaId} voltar={() => setTela('lista')} aoGerar={(m) => { setTela({ editar: m }); carregar(); }} />;
  if (tela.editar) return <Editor inicial={tela.editar} voltar={() => { setTela('lista'); carregar(); }} />;

  return (
    <div className="pilha">
      <div className="cartao pilha">
        <h3>📚 Material da aula</h3>
        <p className="mudo pequeno" style={{ margin: 0 }}>Cole o texto ou fotografe o material da aula. A IA cria questões no estilo do tutor, você revisa e publica para a turma.</p>
        <button className="btn" onClick={() => setTela('novo')}>+ Novo material</button>
      </div>
      {erro && <p className="aviso">{erro}</p>}
      {!lista ? <p className="mudo">Carregando…</p> : !lista.length ? <p className="mudo pequeno">Nenhum material ainda.</p> : lista.map((m) => {
        const tid = idTopicoMaterial(m);
        const ts = tentativas.filter((t) => t.topico_id === tid);
        const fizeram = new Set(ts.map((t) => t.aluno_id)).size;
        const taxa = ts.length ? ts.filter((t) => t.correta).length / ts.length : null;
        return (
          <button key={m.id} className="cartao material-item" onClick={() => setTela({ editar: m })}>
            <span className="pilha" style={{ gap: 2 }}>
              <b>{m.titulo}</b>
              <span className="mudo pequeno">{MATERIAS.find((x) => x.id === m.materia)?.nome} · {m.questoes.length} questões</span>
              {m.status === 'publicado' && <span className="pequeno">{fizeram} de {alunos.length} alunos praticaram · {pct(taxa)} de acerto</span>}
            </span>
            <span className={'pilula ' + (m.status === 'publicado' ? 'verde' : '')}>{m.status === 'publicado' ? 'Publicado' : 'Rascunho'}</span>
          </button>
        );
      })}
    </div>
  );
}

function Novo({ turmaId, voltar, aoGerar }) {
  const [materia, setMateria] = useState('pt');
  const [qtd, setQtd] = useState(8);
  const [texto, setTexto] = useState('');
  const [fotos, setFotos] = useState([]);
  const [estado, setEstado] = useState('');
  const [erro, setErro] = useState('');

  async function addFotos(ev) {
    const arqs = [...ev.target.files].slice(0, 4 - fotos.length);
    ev.target.value = '';
    try { const novas = await Promise.all(arqs.map(comprimir)); setFotos((f) => [...f, ...novas].slice(0, 4)); }
    catch (e) { setErro(e.message); }
  }

  async function gerar() {
    setErro(''); setEstado('gerando');
    try {
      const r = await api.gerarQuestoes({ turma_id: turmaId, materia, texto, quantidade: qtd, imagens: fotos.map((f) => f.split(',')[1]) });
      const m = await api.salvarMaterial({ turma_id: turmaId, materia, titulo: r.titulo, status: 'rascunho', questoes: r.questoes.map((q) => ({ ...q, id: novoId() })) });
      aoGerar(m);
    } catch (e) { setErro(e.message); setEstado(''); }
  }

  const pronto = texto.trim().length >= 80 || fotos.length > 0;
  return (
    <div className="pilha">
      <button className="voltar" onClick={voltar}>← Materiais</button>
      <h2>Novo material da aula</h2>
      <div className="cartao pilha">
        <label className="campo">Matéria
          <select value={materia} onChange={(e) => setMateria(e.target.value)}>{MATERIAS.map((m) => <option key={m.id} value={m.id}>{m.nome}</option>)}</select>
        </label>
        <label className="campo">Texto da aula
          <textarea rows={8} value={texto} onChange={(e) => setTexto(e.target.value)} placeholder="Cole aqui o resumo, a apostila ou as anotações da aula…" />
        </label>
        <div className="pilha" style={{ gap: 6 }}>
          <span className="pequeno"><b>ou fotos do material</b> (até 4: caderno, livro, lousa)</span>
          <div className="fotos">
            {fotos.map((f, i) => (
              <span key={i} className="foto"><img src={f} alt={'foto ' + (i + 1)} /><button aria-label="remover foto" onClick={() => setFotos((x) => x.filter((_, k) => k !== i))}>×</button></span>
            ))}
            {fotos.length < 4 && <label className="foto add">📷<input type="file" accept="image/*" multiple onChange={addFotos} hidden /></label>}
          </div>
        </div>
        <label className="campo">Quantas questões
          <select value={qtd} onChange={(e) => setQtd(+e.target.value)}>{[5, 8, 10, 12].map((n) => <option key={n} value={n}>{n}</option>)}</select>
        </label>
        {erro && <p className="aviso">{erro}</p>}
        {estado === 'gerando'
          ? <p className="gerando">✨ A IA está lendo o material e criando as questões… pode levar até 1 minuto.</p>
          : <button className="btn" disabled={!pronto} onClick={gerar}>✨ Gerar questões</button>}
        {!pronto && <span className="mudo pequeno">Cole um texto (algumas frases) ou adicione uma foto.</span>}
        <span className="mudo pequeno">Nada chega aos alunos antes de você revisar e publicar.</span>
      </div>
    </div>
  );
}

function Editor({ inicial, voltar }) {
  const [m, setM] = useState(inicial);
  const [qs, setQs] = useState(() => inicial.questoes.map(paraEdicao));
  const [aberta, setAberta] = useState(null);
  const [msg, setMsg] = useState('');
  const [apagar, setApagar] = useState(false);
  const mudarQ = (i, campo, v) => setQs((l) => l.map((q, k) => (k === i ? { ...q, [campo]: v } : q)));
  const mudarArr = (i, campo, j, v) => setQs((l) => l.map((q, k) => (k === i ? { ...q, [campo]: q[campo].map((x, y) => (y === j ? v : x)) } : q)));
  const problemas = qs.map(problema);
  const comProblema = problemas.filter(Boolean).length;

  async function salvar(status) {
    if (status === 'publicado' && comProblema) { setMsg(`Corrija ${comProblema === 1 ? 'a questão marcada' : `as ${comProblema} questões marcadas`} antes de publicar.`); return; }
    if (status === 'publicado' && !qs.length) { setMsg('Deixe pelo menos uma questão.'); return; }
    setMsg('Salvando…');
    try {
      const novo = await api.salvarMaterial({ ...m, status, questoes: qs.map(paraApp) });
      setM(novo); setMsg(status === 'publicado' ? 'Publicado ✓ Os alunos já veem este material.' : 'Salvo ✓');
    } catch (e) { setMsg(e.message); }
  }

  return (
    <div className="pilha">
      <button className="voltar" onClick={voltar}>← Materiais</button>
      <div className="cartao pilha">
        <label className="campo">Título<input value={m.titulo} onChange={(e) => setM({ ...m, titulo: e.target.value })} /></label>
        <span className="mudo pequeno">{MATERIAS.find((x) => x.id === m.materia)?.nome} · {qs.length} questões · {m.status === 'publicado' ? '🟢 Publicado' : '📝 Rascunho'}</span>
        <span className="pequeno">Revise cada questão: a IA pode errar. Toque numa questão para editar.</span>
      </div>

      {qs.map((q, i) => (
        <div key={q.id} className={'cartao pilha questao-ed' + (problemas[i] ? ' problema' : '')}>
          <button className="ed-topo" onClick={() => setAberta(aberta === i ? null : i)}>
            <b>{i + 1}.</b>
            <span className="pilha" style={{ gap: 2 }}>
              <span dangerouslySetInnerHTML={{ __html: q.enunciado || '<i>(sem enunciado)</i>' }} />
              <span className="pequeno">✅ {q.correta}{problemas[i] && <b className="erro-ed"> · ⚠️ {problemas[i]}</b>}</span>
            </span>
            <span className="mudo">{aberta === i ? '▴' : '✎'}</span>
          </button>
          {aberta === i && (
            <div className="pilha">
              <label className="campo">Enunciado<textarea rows={3} value={q.enunciado} onChange={(e) => mudarQ(i, 'enunciado', e.target.value)} /></label>
              <label className="campo">✅ Alternativa correta<input value={q.correta} onChange={(e) => mudarQ(i, 'correta', e.target.value)} /></label>
              {q.erradas.map((x, j) => (
                <div key={j} className="errada-ed">
                  <label className="campo">❌ Errada {j + 1}<input value={x} onChange={(e) => mudarArr(i, 'erradas', j, e.target.value)} /></label>
                  <input className="pequeno" placeholder="Por que está errada (aparece no modo tutor)" value={q.porques[j]} onChange={(e) => mudarArr(i, 'porques', j, e.target.value)} />
                </div>
              ))}
              <label className="campo">Explicação<textarea rows={2} value={q.explicacao} onChange={(e) => mudarQ(i, 'explicacao', e.target.value)} /></label>
              <label className="campo">🎯 O que cai na prova (um por linha)<textarea rows={2} value={q.pontos} onChange={(e) => mudarQ(i, 'pontos', e.target.value)} /></label>
              <label className="campo">⚠️ Pegadinha<input value={q.pegadinha} onChange={(e) => mudarQ(i, 'pegadinha', e.target.value)} /></label>
              <button className="link perigo" onClick={() => { setQs((l) => l.filter((_, k) => k !== i)); setAberta(null); }}>🗑 Remover esta questão</button>
            </div>
          )}
        </div>
      ))}

      <div className="cartao pilha">
        {msg && <p className="pequeno" style={{ margin: 0 }}>{msg}</p>}
        <button className="btn" onClick={() => salvar('publicado')}>{m.status === 'publicado' ? 'Salvar alterações' : '📢 Publicar para a turma'}</button>
        <button className="btn fantasma" onClick={() => salvar('rascunho')}>{m.status === 'publicado' ? 'Tirar do ar (voltar a rascunho)' : 'Salvar rascunho'}</button>
        {!apagar
          ? <button className="link perigo" onClick={() => setApagar(true)}>Excluir material</button>
          : <span className="linha"><span className="pequeno">Excluir de vez?</span>
              <button className="link perigo" onClick={async () => { await api.excluirMaterial(m.id); voltar(); }}>Sim, excluir</button>
              <button className="link" onClick={() => setApagar(false)}>Cancelar</button></span>}
      </div>
    </div>
  );
}
