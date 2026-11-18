import { useEffect, useState } from 'react';
import { api } from '../dados/api.js';
import { MATERIAS, questao } from '../conteudo.js';
import { trilha, montarLicao, montarRevisao, errosPendentes, resumoMateria } from '../progresso.js';
import Licao from './Licao.jsx';

const pct = (x) => (x == null ? '–' : Math.round(x * 100) + '%');
const ROTULO = { novo: 'Novo', praticando: 'Praticando', dominado: 'Dominado ⭐' };

export default function Aluno({ perfil }) {
  const [tentativas, setTentativas] = useState(null);
  const [tela, setTela] = useState({ nome: 'inicio' });
  const [erro, setErro] = useState('');

  useEffect(() => {
    api.minhasTentativas(perfil.id).then(setTentativas).catch((e) => setErro(e.message));
  }, [perfil.id]);

  async function registrar(t) {
    const local = { ...t, aluno_id: perfil.id, turma_id: perfil.turma_id, criado_em: new Date().toISOString() };
    setTentativas((ts) => [...ts, local]);
    try { await api.registrarTentativa({ ...t, aluno_id: perfil.id, turma_id: perfil.turma_id }); }
    catch (e) { setErro('Não consegui salvar a última resposta. Verifique a internet.'); }
  }

  if (erro && !tentativas) return <p className="aviso">{erro}</p>;
  if (!tentativas) return <p className="mudo">Carregando…</p>;

  if (tela.nome === 'licao')
    return (
      <Licao
        titulo={tela.titulo}
        questoes={tela.questoes}
        aoResponder={registrar}
        aoTerminar={() => setTela(tela.voltar)}
      />
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
      </div>
    );
  }

  // Início
  const totalPend = errosPendentes(tentativas);
  return (
    <div className="pilha">
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
      {erro && <p className="aviso">{erro}</p>}
    </div>
  );
}
