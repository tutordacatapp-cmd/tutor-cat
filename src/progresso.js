// Regras de progresso: o que entra em cada lição, domínio de tópico, desbloqueio da trilha.
import { questoesDo, topicosDa, topico } from './conteudo.js';

export const TAMANHO_LICAO = 10;
export const META_DOMINIO = 0.8; // 80% de acerto
export const MIN_TENTATIVAS = 10;

const embaralhar = (a) => {
  a = a.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
};

// Último resultado de cada questão: Map(questaoId -> {correta, quando})
export function ultimoResultado(tentativas) {
  const m = new Map();
  for (const t of tentativas) {
    const atual = m.get(t.questao_id);
    if (!atual || t.criado_em > atual.criado_em) m.set(t.questao_id, t);
  }
  return m;
}

// Lição: primeiro as que errou, depois inéditas, e por último algumas já acertadas.
export function montarLicao(topicoId, tentativas) {
  const ult = ultimoResultado(tentativas);
  const todas = questoesDo(topicoId);
  const erradas = embaralhar(todas.filter((q) => ult.has(q.id) && !ult.get(q.id).correta));
  const ineditas = embaralhar(todas.filter((q) => !ult.has(q.id)));
  const acertadas = embaralhar(todas.filter((q) => ult.has(q.id) && ult.get(q.id).correta));
  const licao = [...erradas.slice(0, 4)];
  for (const fonte of [ineditas, erradas.slice(4), acertadas]) {
    for (const q of fonte) {
      if (licao.length >= TAMANHO_LICAO) break;
      if (!licao.includes(q)) licao.push(q);
    }
  }
  return embaralhar(licao);
}

// Revisão geral: questões cujo último resultado foi erro, de qualquer tópico da matéria (ou todas).
export function montarRevisao(tentativas, materia) {
  const ult = ultimoResultado(tentativas);
  const ids = [...ult.values()]
    .filter((t) => !t.correta && (!materia || t.materia === materia))
    .map((t) => t.questao_id);
  return embaralhar(ids).slice(0, TAMANHO_LICAO);
}

export function errosPendentes(tentativas, materia) {
  return [...ultimoResultado(tentativas).values()].filter(
    (t) => !t.correta && (!materia || t.materia === materia)
  ).length;
}

// Situação de um tópico a partir das últimas 20 tentativas.
export function situacaoTopico(topicoId, tentativas) {
  const doTopico = tentativas
    .filter((t) => t.topico_id === topicoId)
    .sort((a, b) => (a.criado_em < b.criado_em ? 1 : -1));
  const recentes = doTopico.slice(0, 20);
  const acertos = recentes.filter((t) => t.correta).length;
  const taxa = recentes.length ? acertos / recentes.length : null;
  let estado = 'novo';
  if (doTopico.length) estado = 'praticando';
  if (doTopico.length >= MIN_TENTATIVAS && taxa >= META_DOMINIO) estado = 'dominado';
  return { total: doTopico.length, taxa, estado };
}

// Trilha: todos os tópicos ficam abertos, porque a escola segue a própria ordem de aulas.
// O app destaca o "próximo recomendado": o primeiro tópico ainda não dominado.
export function trilha(materia, tentativas) {
  const lista = topicosDa(materia).map((t) => ({ ...t, ...situacaoTopico(t.id, tentativas), aberto: true }));
  const prox = lista.find((t) => t.estado !== 'dominado');
  if (prox) prox.proximo = true;
  return lista;
}

export function resumoMateria(materia, tentativas) {
  const ts = tentativas.filter((t) => t.materia === materia);
  const semana = ts.filter((t) => Date.now() - new Date(t.criado_em).getTime() < 7 * 864e5);
  const taxa = semana.length ? semana.filter((t) => t.correta).length / semana.length : null;
  const dominados = topicosDa(materia).filter((t) => situacaoTopico(t.id, ts).estado === 'dominado').length;
  return { semana: semana.length, taxa, dominados, totalTopicos: topicosDa(materia).length };
}

export const nomeTopico = (id) => topico(id)?.titulo ?? id;

// Como a turma respondeu cada questão: acertos, a alternativa errada mais marcada,
// o que escreveram ao tentar lembrar e o tempo típico. Base para o professor ver o "porquê" do erro.
export function analisarQuestoes(tentativas, filtro = () => true) {
  const m = new Map();
  for (const t of tentativas) {
    if (!filtro(t) || t.contexto === 'parecida') continue;
    let x = m.get(t.questao_id);
    if (!x) m.set(t.questao_id, (x = { total: 0, acertos: 0, alunos: new Set(), errados: {}, memoria: [], tempos: [], lembrou: 0 }));
    x.total++; x.alunos.add(t.aluno_id);
    if (t.correta) x.acertos++; else if (t.resposta) x.errados[t.resposta] = (x.errados[t.resposta] || 0) + 1;
    if (t.lembrou) x.lembrou++;
    if (t.tentativa_memoria) x.memoria.push(t.tentativa_memoria);
    if (t.tempo_ms) x.tempos.push(t.tempo_ms);
  }
  for (const x of m.values()) {
    x.taxa = x.total ? x.acertos / x.total : null;
    x.maisMarcada = Object.entries(x.errados).sort((a, b) => b[1] - a[1])[0] || null;
    x.tempoMediano = x.tempos.length ? x.tempos.sort((a, b) => a - b)[Math.floor(x.tempos.length / 2)] : null;
    x.nAlunos = x.alunos.size;
  }
  return m;
}
