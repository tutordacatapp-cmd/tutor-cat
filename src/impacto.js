// Indicadores de impacto do app a partir das tentativas (para professor, coordenação e venda).
import { nomeTopico } from './progresso.js';

const LIM_TEMPO = 3 * 60 * 1000; // ignora respostas paradas por mais de 3 min (aluno saiu)
const taxa = (ts) => (ts.length ? ts.filter((t) => t.correta).length / ts.length : null);
const ordenar = (ts) => [...ts].sort((a, b) => (a.criado_em < b.criado_em ? -1 : 1));
const semanaDe = (iso) => { const d = new Date(iso); d.setHours(0, 0, 0, 0); d.setDate(d.getDate() - ((d.getDay() + 6) % 7)); return d.toISOString().slice(0, 10); };

// Erros corrigidos: questões que o aluno errou e, numa tentativa posterior, acertou.
function errosCorrigidos(ts) {
  const st = new Map();
  for (const t of ts) {
    const s = st.get(t.questao_id) || { errou: false, corrigiu: false };
    if (!t.correta) s.errou = true; else if (s.errou) s.corrigiu = true;
    st.set(t.questao_id, s);
  }
  const erradas = [...st.values()].filter((s) => s.errou);
  return { erradas: erradas.length, corrigidas: erradas.filter((s) => s.corrigiu).length };
}

export function impacto(tentativas, alunos) {
  const ts = ordenar(tentativas.filter((t) => t.contexto !== 'parecida'));
  const todas = ordenar(tentativas);
  const tempoMin = Math.round(todas.reduce((s, t) => s + Math.min(t.tempo_ms || 0, LIM_TEMPO), 0) / 60000);
  const agora = Date.now(), semana = 7 * 864e5;
  const ativosSemana = new Set(todas.filter((t) => agora - new Date(t.criado_em) < semana).map((t) => t.aluno_id)).size;

  const porAluno = alunos.map((a) => {
    const meus = ts.filter((t) => t.aluno_id === a.id);
    const n = meus.length, k = Math.min(20, Math.floor(n / 2));
    const antes = k >= 10 ? taxa(meus.slice(0, k)) : null, depois = k >= 10 ? taxa(meus.slice(-k)) : null;
    const ec = errosCorrigidos(todas.filter((t) => t.aluno_id === a.id));
    const minutos = Math.round(todas.filter((t) => t.aluno_id === a.id).reduce((s, t) => s + Math.min(t.tempo_ms || 0, LIM_TEMPO), 0) / 60000);
    const dias = new Set(todas.filter((t) => t.aluno_id === a.id).map((t) => t.criado_em.slice(0, 10))).size;
    return { a, n, antes, depois, ganho: antes != null ? depois - antes : null, ...ec, minutos, dias };
  });
  const comparaveis = porAluno.filter((x) => x.ganho != null);
  const media = (xs) => (xs.length ? xs.reduce((s, x) => s + x, 0) / xs.length : null);

  const semanas = new Map();
  for (const t of todas) {
    const w = semanaDe(t.criado_em); const x = semanas.get(w) || { semana: w, n: 0, ok: 0, alunos: new Set() };
    x.n++; if (t.correta && t.contexto !== 'parecida') x.ok++; x.alunos.add(t.aluno_id); semanas.set(w, x);
  }
  const evolucao = [...semanas.values()].sort((a, b) => (a.semana < b.semana ? -1 : 1)).slice(-8).map((x) => {
    const base = todas.filter((t) => semanaDe(t.criado_em) === x.semana && t.contexto !== 'parecida');
    return { semana: x.semana, n: x.n, alunos: x.alunos.size, taxa: taxa(base) };
  });

  const porTopico = new Map();
  for (const t of ts) { const l = porTopico.get(t.topico_id) || []; l.push(t); porTopico.set(t.topico_id, l); }
  const topicos = [...porTopico.entries()].filter(([, l]) => l.length >= 16).map(([id, l]) => {
    const h = Math.floor(l.length / 2);
    return { id, nome: nomeTopico(id), n: l.length, antes: taxa(l.slice(0, h)), depois: taxa(l.slice(h)) };
  }).map((x) => ({ ...x, ganho: x.depois - x.antes })).sort((a, b) => b.ganho - a.ganho);

  const ec = errosCorrigidos(todas);
  return {
    alunos: alunos.length, ativos: new Set(todas.map((t) => t.aluno_id)).size, ativosSemana,
    respostas: todas.length, tempoMin, ...ec,
    antes: media(comparaveis.map((x) => x.antes)), depois: media(comparaveis.map((x) => x.depois)), nComparaveis: comparaveis.length,
    melhoraram: comparaveis.filter((x) => x.ganho > 0.05).length,
    porAluno: porAluno.sort((a, b) => (b.ganho ?? -9) - (a.ganho ?? -9)), evolucao, topicos,
  };
}
