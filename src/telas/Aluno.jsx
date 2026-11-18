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

const MASCOTE_PADRAO = { nome: '', pelagem: 'cinza', eq: {}, cenario: 'quarto', vistos: null };

const pct = (x) => (x == null ? '–' : Math.round(x * 100) + '%');
const ROTULO = { novo: 'Novo', praticando: 'Praticando', dominado: 'Dominado ⭐' };

export default function Aluno({ perfil }) {
  const [tentativas, setTentativas] = useState(null);
  const [tela, setTela] = useState({ nome: 'inicio' });
  const [erro, setErro] = useState('');
  const [mascote, setMascote] = useState(null);
  const [fila, setFila] = useState([]);
  const salvarTimer = useRef(null);
  const [salvo, setSalvo] = useState('salvo'); // 'salvando' | 'salvo' | 'erro'

  useEffect(() => {
    api.minhasTentativas(perfil.id).then(setTentativas).catch((e) => setErro(e.message));
    api.lerMascote(perfil.id).then((m) => setMascote({ ...MASCOTE_PADRAO, ...(m || {}) })).catch(() => setMascote({ ...MASCOTE_PADRAO }));
  }, [perfil.id]);

  const est = useMemo(() => (tentativas ? estatisticas(tentativas) : null), [tentativas]);

  function mudarMascote(mudanca, imediato) {
    setMascote((m) => {
      const novo = { ...m, ...mudanca };
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
            onClick={() => setTela({ nome: 'licao', titulo: 'Revisão de erros', questoes: montarRevisao(tentativas, m.id).map(questao), voltar: tela })}
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
      {totalPend > 0 && (
        <button
          className="cartao chamada"
          onClick={() => setTela({ nome: 'licao', titulo: 'Revisão de erros', questoes: montarRevisao(tentativas).map(questao), voltar: { nome: 'inicio' } })}
        >
          <b>🔁 Revisar erros de todas as matérias</b>
          <span className="mudo">{totalPend} para rever</span>
        </button>
      )}
      <Resumo texto={resumoSemanal(perfil.nome, tentativas, mascote.nome)} />
      {erro && <p className="aviso">{erro}</p>}
      {comemoracao}
    </div>
  );
}
