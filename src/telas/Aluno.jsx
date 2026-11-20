import { useEffect, useMemo, useRef, useState } from 'react';
import { api } from '../dados/api.js';
import { MATERIAS, questao } from '../conteudo.js';
import { trilha, montarLicao, montarRevisao, errosPendentes, resumoMateria } from '../progresso.js';
import Licao from './Licao.jsx';
import Gato, { Comemoracao } from './Gato.jsx';
import Resumo from './Resumo.jsx';
import { resumoSemanal } from '../resumo.js';
import { gatoSVG } from '../mascote/arte.js';
import { estatisticas, conquistas, descreverConquista, titulo } from '../mascote/regras.js';
import { missoesDoDia, contadoresDoDia, hojeStr } from '../mascote/missoes.js';
import { topico as topicoPorId, registrarMateriais, idTopicoMaterial } from '../conteudo.js';
import { situacaoTopico, ultimoResultado } from '../progresso.js';

const MASCOTE_PADRAO = { nome: '', pelagem: 'cinza', eq: {}, cenario: 'quarto', vistos: null, missoes: [] };

// Onde o aluno mais erra: tópicos com erros pendentes ou acerto baixo nas últimas tentativas.
function pontosFracos(tentativas) {
  const ult = ultimoResultado(tentativas);
  const pend = {};
  for (const t of ult.values()) if (!t.correta) pend[t.topico_id] = (pend[t.topico_id] || 0) + 1;
  const ids = [...new Set(tentativas.map((t) => t.topico_id))];
  return ids.map((id) => ({ id, ...situacaoTopico(id, tentativas), pend: pend[id] || 0 }))
    .filter((x) => topicoPorId(x.id) && x.total >= 3 && (x.taxa < 0.7 || x.pend >= 2))
    .sort((a, b) => a.taxa - b.taxa || b.pend - a.pend)
    .slice(0, 3);
}

const pct = (x) => (x == null ? '–' : Math.round(x * 100) + '%');
const ROTULO = { novo: 'Novo', praticando: 'Praticando', dominado: 'Dominado ⭐' };

export default function Aluno({ perfil }) {
  const [tentativas, setTentativas] = useState(null);
  const [tela, setTela] = useState({ nome: 'inicio' });
  const [erro, setErro] = useState('');
  const [mascote, setMascote] = useState(null);
  const [fila, setFila] = useState([]);
  const [modoLembrar, setModoLembrar] = useState('sempre');
  const [materiais, setMateriais] = useState([]);
  const salvarTimer = useRef(null);
  const [salvo, setSalvo] = useState('salvo'); // 'salvando' | 'salvo' | 'erro'

  useEffect(() => {
    api.minhasTentativas(perfil.id).then(setTentativas).catch((e) => setErro(e.message));
    api.materiais?.(perfil.turma_id).then((ms) => { const pub = ms.filter((m) => m.status === 'publicado'); registrarMateriais(pub); setMateriais(pub); }).catch(() => {});
    api.modoLembrar?.(perfil.turma_id).then((m) => setModoLembrar(m || 'sempre')).catch(() => {});
    api.lerMascote(perfil.id).then((m) => setMascote({ ...MASCOTE_PADRAO, ...(m || {}) })).catch(() => setMascote({ ...MASCOTE_PADRAO }));
  }, [perfil.id]);

  // Lembrar de memória vale ⭐ dobrada: cada lembrança soma um acerto extra no total do gato.
  const est = useMemo(() => {
    if (!tentativas) return null;
    const e = estatisticas(tentativas);
    return { ...e, total: e.total + (mascote?.lembrou || 0), diasMissao: (mascote?.missoes || []).length };
  }, [tentativas, mascote?.missoes, mascote?.lembrou]);
  const missoes = useMemo(() => (tentativas && mascote ? missoesDoDia(tentativas, mascote) : []), [tentativas, mascote?.dia]);

  // Eventos da lição alimentam as missões do dia.
  function evento(tipo, extra = {}) {
    mudarMascote((m) => {
      const dl = { ...contadoresDoDia(m) };
      if (tipo === 'acerto') { dl.run++; dl.rb = Math.max(dl.rb, dl.run); if (extra.revisao) dl.rev++; }
      if (tipo === 'erro') dl.run = 0;
      if (tipo === 'corrigiu') dl.fix++;
      if (tipo === 'lembrou') return { dia: dl, lembrou: (m.lembrou || 0) + 1 };
      return { dia: dl };
    });
  }

  // Missões completas → dia de missão + comemoração.
  useEffect(() => {
    if (!mascote || !missoes.length) return;
    const d = hojeStr();
    if (missoes.every((x) => x.feita) && !(mascote.missoes || []).includes(d)) {
      mudarMascote({ missoes: [...(mascote.missoes || []), d].slice(-400) }, true);
      setFila((f) => [...f, 'x:' + d]);
    }
  }, [missoes]);

  function mudarMascote(mudanca, imediato) {
    setMascote((m) => {
      const novo = { ...m, ...(typeof mudanca === 'function' ? mudanca(m) : mudanca) };
      clearTimeout(salvarTimer.current);
      setSalvo('salvando');
      salvarTimer.current = setTimeout(
        () => api.salvarMascote(perfil.id, novo).then(() => setSalvo('salvo')).catch(() => setSalvo('erro')),
        imediato ? 0 : 600
      );
      return novo;
    });
  }

  // Conquistas novas viram comemoração. Na primeira vez, o que já existia conta como visto.
  useEffect(() => {
    if (!est || !mascote) return;
    const todas = conquistas(est);
    if (mascote.vistos === null) { mudarMascote({ vistos: todas }, true); return; }
    const novas = todas.filter((k) => !mascote.vistos.includes(k));
    if (novas.length) {
      setFila((f) => [...f, ...novas.filter((k) => !f.includes(k))]);
      const eq = { ...mascote.eq };
      novas.filter((k) => k[0] === 'i').map((k) => descreverConquista(k).item).forEach((it) => { if (!eq[it.slot]) eq[it.slot] = it.id; });
      mudarMascote({ vistos: [...mascote.vistos, ...novas], eq }, true);
    }
  }, [est, mascote?.vistos]);

  const pop = fila.length ? descreverConquista(fila[0]) : null;
  const fecharPop = () => setFila((f) => f.slice(1));
  const vestirPop = () => {
    if (pop.item) mudarMascote({ eq: { ...mascote.eq, [pop.item.slot]: pop.item.id } }, true);
    if (pop.cenario) mudarMascote({ cenario: pop.cenario }, true);
    fecharPop();
  };
  const comemoracao = pop && mascote && <Comemoracao key={fila[0]} conquista={pop} mascote={mascote} aoVestir={vestirPop} aoFechar={fecharPop} />;
  const gatoMini = mascote && est ? gatoSVG({ eq: mascote.eq, pelagem: mascote.pelagem, dormindo: est.dormindo, rotulo: mascote.nome || 'Seu gato' }) : '';

  async function registrar(t) {
    const local = { ...t, aluno_id: perfil.id, turma_id: perfil.turma_id, criado_em: new Date().toISOString() };
    setTentativas((ts) => [...ts, local]);
    try { await api.registrarTentativa({ ...t, aluno_id: perfil.id, turma_id: perfil.turma_id }); }
    catch (e) { setErro('Não consegui salvar a última resposta. Verifique a internet.'); }
  }

  if (erro && !tentativas) return <p className="aviso">{erro}</p>;
  if (!tentativas || !mascote) return <p className="mudo">Carregando…</p>;

  if (tela.nome === 'licao')
    return (
      <>
        <Licao
          titulo={tela.titulo}
          questoes={tela.questoes}
          aoResponder={registrar}
          aoEvento={evento}
          modo={tela.modo || 'licao'}
          lembrar={modoLembrar}
          aoTerminar={() => setTela(tela.voltar)}
          gato={gatoSVG({ eq: mascote.eq, pelagem: mascote.pelagem, rotulo: '' })}
        />
        {comemoracao}
      </>
    );

  if (tela.nome === 'gato')
    return (
      <>
        <Gato est={est} mascote={mascote} mudar={mudarMascote} salvo={salvo} voltar={() => setTela({ nome: 'inicio' })} />
        {comemoracao}
      </>
    );

  if (tela.nome === 'trilha') {
    const m = MATERIAS.find((x) => x.id === tela.materia);
    const itens = trilha(m.id, tentativas);
    const pend = errosPendentes(tentativas, m.id);
    return (
      <div className="pilha" style={{ '--s': m.cor, '--s-soft': m.suave }}>
        <button className="voltar" onClick={() => setTela({ nome: 'inicio' })}>← Matérias</button>
        <h2>{m.nome}</h2>
        {pend > 0 && (
          <button
            className="cartao chamada"
            onClick={() => setTela({ nome: 'licao', modo: 'revisao', titulo: 'Revisão de erros', questoes: montarRevisao(tentativas, m.id).map(questao).filter(Boolean), voltar: tela })}
          >
            <b>🔁 Revisar meus erros</b>
            <span className="mudo">{pend} {pend === 1 ? 'questão' : 'questões'} para rever</span>
          </button>
        )}
        <ol className="trilha">
          {itens.map((t, k) => (
            <li key={t.id}>
              <button
                className={'passo ' + t.estado + (t.proximo ? ' proximo' : '')}
                disabled={!t.aberto}
                onClick={() => setTela({ nome: 'licao', questoes: montarLicao(t.id, tentativas), voltar: tela })}
              >
                <span className="n">{t.estado === 'dominado' ? '★' : k + 1}</span>
                <span className="nome">{t.titulo}{t.proximo && <small className="rec">Próximo recomendado</small>}</span>
                <span className="mudo">{ROTULO[t.estado]}{t.total ? ` · ${pct(t.taxa)}` : ''}</span>
              </button>
            </li>
          ))}
        </ol>
        <p className="mudo pequeno">Um tópico vira ⭐ Dominado quando você acerta 80% das últimas questões (mínimo de 10).</p>
        {comemoracao}
      </div>
    );
  }

  // Início
  const totalPend = errosPendentes(tentativas);
  const fracos = pontosFracos(tentativas);
  return (
    <div className="pilha">
      <button className="cartao g-cartao" onClick={() => setTela({ nome: 'gato' })}>
        <span className="g-cartao-gato" dangerouslySetInnerHTML={{ __html: gatoMini }} />
        <span className="pilha" style={{ gap: 2 }}>
          <b>{mascote.nome || 'Seu gato'}</b>
          <span>👑 {titulo(est).nm} · {est.total} ⭐</span>
          <span className="mudo pequeno">{est.dormindo ? 'Está dormindo… estude para acordá-lo 😴' : 'Toque para ver roupas, cenários e medalhas'}</span>
        </span>
      </button>
      {materiais.length > 0 && (
        <div className="cartao pilha">
          <h3>📚 Material da aula</h3>
          <p className="mudo pequeno" style={{ margin: 0 }}>Questões que a professora preparou sobre o que vocês viram em aula.</p>
          {materiais.slice(0, 10).map((m) => {
            const tid = idTopicoMaterial(m);
            const s = situacaoTopico(tid, tentativas);
            const feitas = new Set(tentativas.filter((t) => t.topico_id === tid).map((t) => t.questao_id)).size;
            const nome = MATERIAS.find((x) => x.id === m.materia)?.nome;
            return (
              <button key={m.id} className="mat-aluno" onClick={() => setTela({ nome: 'licao', titulo: m.titulo, questoes: montarLicao(tid, tentativas), voltar: { nome: 'inicio' } })}>
                <span className="pilha" style={{ gap: 0 }}><b>{m.titulo}</b><span className="mudo pequeno">{nome} · {Math.min(feitas, m.questoes.length)} de {m.questoes.length} feitas{s.total ? ` · ${pct(s.taxa)}` : ''}</span></span>
                <span className="treinar">{feitas ? 'Treinar ▸' : 'Começar ▸'}</span>
              </button>
            );
          })}
        </div>
      )}
      <div className="cartao pilha missoes">
        <div className="linha"><h3>⚔️ Missões de hoje</h3><span className="pilula">{missoes.filter((x) => x.feita).length}/3</span></div>
        {missoes.map((x, k) => (
          <div key={k} className={'missao' + (x.feita ? ' feita' : '')}>
            <span className="m-em">{x.feita ? '✅' : x.em}</span>
            <div className="pilha" style={{ gap: 4 }}><span>{x.t}</span><div className="barra"><i style={{ width: Math.round((100 * x.v) / x.n) + '%' }} /></div></div>
            <b className="pequeno">{x.v}/{x.n}</b>
          </div>
        ))}
        <p className="mudo pequeno" style={{ margin: 0 }}>Fez as 3? Ganha um dia de missão: cenário novo pro gato. ({(mascote.missoes || []).length} até agora)</p>
      </div>
      {fracos.length > 0 && (
        <div className="cartao pilha fracos">
          <h3>🎯 Onde você mais erra</h3>
          <p className="mudo pequeno" style={{ margin: 0 }}>Treinar aqui primeiro é o que mais sobe a sua nota.</p>
          {fracos.map((x) => {
            const tp = topicoPorId(x.id);
            return (
              <button key={x.id} className="fraco" onClick={() => setTela({ nome: 'licao', questoes: montarLicao(x.id, tentativas), voltar: { nome: 'inicio' } })}>
                <span className="pilha" style={{ gap: 0 }}><b>{tp.titulo}</b><span className="mudo pequeno">{tp.materia_nome} · {Math.round(x.taxa * 100)}% de acerto{x.pend ? ` · ${x.pend} erro${x.pend > 1 ? 's' : ''} para corrigir` : ''}</span></span>
                <span className="treinar">Treinar ▸</span>
              </button>
            );
          })}
        </div>
      )}
      {totalPend > 0 && (
        <button
          className="cartao chamada"
          onClick={() => setTela({ nome: 'licao', modo: 'revisao', titulo: 'Revisão de erros', questoes: montarRevisao(tentativas).map(questao).filter(Boolean), voltar: { nome: 'inicio' } })}
        >
          <b>🔁 Revisar erros de todas as matérias</b>
          <span className="mudo">{totalPend} para rever</span>
        </button>
      )}
      <h2>Oi, {perfil.nome.split(' ')[0]}! 👋</h2>
      <p className="mudo">Escolha uma matéria para continuar a sua trilha.</p>
      <div className="materias">
        {MATERIAS.map((m) => {
          const r = resumoMateria(m.id, tentativas);
          return (
            <button key={m.id} className="materia" style={{ '--c': m.cor, '--cs': m.suave }} onClick={() => setTela({ nome: 'trilha', materia: m.id })}>
              <b>{m.nome}</b>
              <span>{r.dominados} de {r.totalTopicos} tópicos dominados</span>
              <span className="mudo">Esta semana: {r.semana} questões · {pct(r.taxa)}</span>
            </button>
          );
        })}
      </div>
      <Resumo texto={resumoSemanal(perfil.nome, tentativas, mascote.nome)} />
      {erro && <p className="aviso">{erro}</p>}
      {comemoracao}
    </div>
  );
}
