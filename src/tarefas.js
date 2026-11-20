// Tarefas e provas marcadas pelo professor: progresso, contagem regressiva e lição combinada.
import { montarLicao } from './progresso.js';
import { questao } from './conteudo.js';

const TAMANHO = 10;
export const hojeStr = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };
export function diasAte(data) {
  const [a, m, d] = data.split('-').map(Number);
  const alvo = new Date(a, m - 1, d); const h = new Date(); h.setHours(0, 0, 0, 0);
  return Math.round((alvo - h) / 864e5);
}
export function quando(data, tipo) {
  const n = diasAte(data);
  if (tipo === 'prova') return n === 0 ? 'é hoje!' : n === 1 ? 'é amanhã' : n > 1 ? `em ${n} dias` : 'já passou';
  return n === 0 ? 'até hoje' : n === 1 ? 'até amanhã' : n > 1 ? `faltam ${n} dias` : 'prazo vencido';
}
export const dataBR = (data) => data.split('-').reverse().slice(0, 2).join('/');

// Progresso de um aluno: questões feitas nos tópicos desde que a tarefa foi criada.
export function progresso(tarefa, tentativas) {
  const desde = tarefa.criado_em || '1970';
  const ts = tentativas.filter((t) => tarefa.topicos.includes(t.topico_id) && (t.criado_em || '') >= desde && t.contexto !== 'parecida');
  const alvo = tarefa.meta * tarefa.topicos.length;
  const acertos = ts.filter((t) => t.correta).length;
  return { feitas: ts.length, alvo, pronto: ts.length >= alvo, taxa: ts.length ? acertos / ts.length : null, frac: Math.min(1, ts.length / alvo) };
}

// Acerto recente (14 dias) nos tópicos da prova, para o professor e o aluno verem a preparação.
export function preparo(tarefa, tentativas) {
  const limite = new Date(Date.now() - 14 * 864e5).toISOString();
  const ts = tentativas.filter((t) => tarefa.topicos.includes(t.topico_id) && (t.criado_em || '') >= limite);
  return { feitas: ts.length, taxa: ts.length ? ts.filter((t) => t.correta).length / ts.length : null };
}

// Mistura os tópicos numa lição só, priorizando o que o aluno errou (montarLicao já faz isso por tópico).
export function licaoCombinada(topicos, tentativas) {
  const filas = topicos.map((t) => montarLicao(t, tentativas));
  const out = [];
  for (let i = 0; out.length < TAMANHO && filas.some((f) => i < f.length); i++)
    for (const f of filas) if (f[i] && out.length < TAMANHO && !out.includes(f[i])) out.push(f[i]);
  return out.filter((q) => questao(q.id));
}

// O que aparece para o aluno: provas futuras e tarefas não concluídas (até 2 dias depois do prazo).
export function paraFazer(tarefas, tentativas) {
  return tarefas
    .filter((t) => (t.tipo === 'prova' ? diasAte(t.data) >= 0 : diasAte(t.data) >= -2 && !progresso(t, tentativas).pronto))
    .sort((a, b) => (a.data < b.data ? -1 : 1));
}
