// Resumo semanal em texto, para mandar à família por e-mail.
import { MATERIAS, topico } from './conteudo.js';
import { estatisticas, titulo } from './mascote/regras.js';

const SEMANA = 7 * 864e5;
const pct = (x) => Math.round(x * 100) + '%';

export function resumoSemanal(nome, tentativas, gatoNome) {
  const agora = Date.now();
  const semana = tentativas.filter((t) => agora - new Date(t.criado_em).getTime() < SEMANA);
  const anterior = tentativas.filter((t) => { const d = agora - new Date(t.criado_em).getTime(); return d >= SEMANA && d < 2 * SEMANA; });
  const taxa = (ts) => (ts.length ? ts.filter((t) => t.correta).length / ts.length : null);
  const dias = Math.min(7, new Set(semana.map((t) => new Date(t.criado_em).toDateString())).size);
  const primeiro = nome.split(' ')[0];

  const linhas = [`📚 Tutor da Cat — semana de ${primeiro}`, ''];
  if (!semana.length) {
    linhas.push(`${primeiro} não estudou no app nos últimos 7 dias.`, 'Que tal 15 minutos hoje? Cada lição tem só 10 questões. 🙂');
    return linhas.join('\n');
  }
  const t = taxa(semana), ta = taxa(anterior);
  linhas.push(`✏️ ${semana.length} questões em ${dias} ${dias === 1 ? 'dia' : 'dias'} · ${pct(t)} de acerto` +
    (ta != null ? ` (semana anterior: ${pct(ta)} ${t > ta + 0.02 ? '📈' : t < ta - 0.02 ? '📉' : '➡️'})` : ''));
  linhas.push('');
  for (const m of MATERIAS) {
    const ts = semana.filter((x) => x.materia === m.id);
    if (ts.length) linhas.push(`• ${m.nome}: ${ts.length} questões, ${pct(taxa(ts))}`);
  }

  // por tópico, só com volume mínimo para não tirar conclusão de 1 ou 2 questões
  const porTopico = {};
  for (const x of semana) (porTopico[x.topico_id] ||= []).push(x);
  const tops = Object.entries(porTopico).filter(([, ts]) => ts.length >= 5).map(([id, ts]) => ({ id, taxa: taxa(ts), n: ts.length }));
  const fortes = tops.filter((x) => x.taxa >= 0.8).sort((a, b) => b.taxa - a.taxa).slice(0, 2);
  const fracos = tops.filter((x) => x.taxa < 0.6).sort((a, b) => a.taxa - b.taxa).slice(0, 2);
  const nome_ = (id) => topico(id)?.titulo || id;
  if (fortes.length) linhas.push('', '💪 Mandou bem em: ' + fortes.map((x) => `${nome_(x.id)} (${pct(x.taxa)})`).join(', '));
  if (fracos.length) linhas.push('', '🎯 Vale reforçar: ' + fracos.map((x) => `${nome_(x.id)} (${pct(x.taxa)})`).join(', '));

  const est = estatisticas(tentativas);
  const tt = titulo(est);
  linhas.push('', `🐱 ${gatoNome || 'O gato'} está no título "${tt.nm}" (${est.total} acertos no total)` +
    (est.melhorSeq >= 5 ? ` · melhor sequência: ${est.melhorSeq} acertos seguidos` : '') + '.');
  linhas.push('', 'Enviado pelo app Tutor da Cat');
  return linhas.join('\n');
}
