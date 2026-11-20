// Conteúdo do app: tópicos e questões (exportados do Tutor da Cat original).
// No MVP o conteúdo vem junto com o app; o banco de dados guarda só contas e tentativas.
import topicosTodos from './dados/topicos.json';
import qMt from './dados/questoes-mt.json';
import qPt from './dados/questoes-pt.json';
import qEn from './dados/questoes-en.json';
import qCi from './dados/questoes-ci.json';
import qHi from './dados/questoes-hi.json';
import qGe from './dados/questoes-ge.json';
import tutor from './dados/tutor.json';

export const MATERIAS = [
  { id: 'mt', nome: 'Matemática', cor: 'var(--mt)', suave: 'var(--mt-soft)' },
  { id: 'pt', nome: 'Português', cor: 'var(--pt)', suave: 'var(--pt-soft)' },
  { id: 'en', nome: 'Inglês', cor: 'var(--en)', suave: 'var(--en-soft)' },
  { id: 'ci', nome: 'Ciências', cor: 'var(--ci)', suave: 'var(--ci-soft)' },
  { id: 'hi', nome: 'História', cor: 'var(--hi)', suave: 'var(--hi-soft)' },
  { id: 'ge', nome: 'Geografia', cor: 'var(--ge)', suave: 'var(--ge-soft)' },
];

export const TOPICOS = topicosTodos.filter((t) => t.mvp);
// Modo tutor (estilo Mehlman): explicação de cada alternativa, pontos-chave e pegadinha, quando já escritos.
export const QUESTOES = [...qMt, ...qPt, ...qEn, ...qCi, ...qHi, ...qGe].map((q) => (tutor[q.id] ? { ...q, tutor: tutor[q.id] } : q));

const porId = new Map(QUESTOES.map((q) => [q.id, q]));
export const questao = (id) => porId.get(id);

// "Material da aula": questões criadas pelo professor (com IA) e publicadas para a turma.
// Ficam num registro à parte; não entram na trilha fixa, mas funcionam em lições, revisão e painel.
const extrasTopicos = new Map();
const extrasQuestoes = new Map(); // topicoId -> [questões]
export const idTopicoMaterial = (m) => 'mat-' + m.id;
export function registrarMateriais(lista) {
  for (const m of lista || []) {
    const tid = idTopicoMaterial(m);
    const nome = MATERIAS.find((x) => x.id === m.materia)?.nome || '';
    extrasTopicos.set(tid, { id: tid, materia: m.materia, materia_nome: nome, titulo: m.titulo, material: true, explicacao_html: '' });
    const qs = (m.questoes || []).map((q, i) => ({ ...q, id: `${tid}-${q.id || i + 1}`, topico: tid, materia: m.materia, tipo: q.tipo || 'mc' }));
    extrasQuestoes.set(tid, qs);
    qs.forEach((q) => porId.set(q.id, q));
  }
}
export const topico = (id) => TOPICOS.find((t) => t.id === id) || extrasTopicos.get(id);
export const topicosDa = (materia) => TOPICOS.filter((t) => t.materia === materia);
export const questoesDo = (topicoId) => extrasQuestoes.get(topicoId) || QUESTOES.filter((q) => q.topico === topicoId);

// ===== Correção (mesma lógica do tutor original) =====
const mdc = (a, b) => (b ? mdc(b, a % b) : Math.abs(a));
const normT = (s) =>
  String(s).toLowerCase().replace(/[’`´]/g, "'").replace(/\s+/g, ' ').trim().replace(/[.!?]$/, '');

function lerNumero(s) {
  s = String(s).replace(/\s|r\$|cm²|cm|%/gi, '');
  if (!s) return NaN;
  if (s.includes(',')) s = s.replace(/\./g, '').replace(',', '.');
  else if (/^\d{1,3}(\.\d{3})+$/.test(s)) s = s.replace(/\./g, '');
  return Number(s);
}
function lerFracao(s) {
  s = String(s).replace(/\s/g, '');
  let m = s.match(/^(-?\d+)\/(\d+)$/);
  if (m && +m[2]) return [+m[1], +m[2]];
  if (/^-?\d+$/.test(s)) return [+s, 1];
  return null;
}

// Devolve { ok, invalida?, aviso? }
export function corrigir(q, valor) {
  if (q.tipo === 'mc') return { ok: valor === q.resposta };
  if (q.tipo === 'num') {
    const x = lerNumero(valor);
    return { ok: Math.abs(x - q.resposta) < 1e-6, invalida: isNaN(x) };
  }
  if (q.tipo === 'frac') {
    const f = lerFracao(valor);
    if (!f) return { ok: false, invalida: true };
    const igual = f[0] * q.resposta[1] === f[1] * q.resposta[0];
    const simplificada = mdc(f[0], f[1]) === 1;
    if (igual && !simplificada && q.exige_simplificar)
      return { ok: false, aviso: 'Valor certo, mas ainda dá para simplificar!' };
    if (igual && !simplificada) return { ok: true, aviso: 'Certo! Só faltou simplificar.' };
    return { ok: igual };
  }
  const n = normT(valor);
  return { ok: [q.resposta, ...(q.respostas_aceitas || [])].some((a) => normT(a) === n) };
}

export function respostaEmTexto(q) {
  if (q.tipo === 'frac') return q.resposta[1] === 1 ? String(q.resposta[0]) : `${q.resposta[0]}/${q.resposta[1]}`;
  if (q.tipo === 'num') return Number(q.resposta).toLocaleString('pt-BR', { maximumFractionDigits: 4 });
  return q.resposta;
}

// ===== Questão "parecida" (mesmo tópico, mesmo modelo de enunciado com outros dados) =====
const semTags = (h) => String(h).replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
const modelo = (h) => semTags(h).toLowerCase().replace(/\d+([.,]\d+)*/g, '#');
const fichas = (h) => new Set(modelo(h).split(/[^a-zà-ú#]+/).filter((w) => w.length > 2));
const jaccard = (a, b) => { let i = 0; a.forEach((x) => { if (b.has(x)) i++; }); return i / ((a.size + b.size - i) || 1); };

export function parecida(q, evitar = []) {
  const base = modelo(q.enunciado), fb = fichas(q.enunciado);
  const cand = questoesDo(q.topico).filter((c) => c.id !== q.id && !evitar.includes(c.id) && semTags(c.enunciado) !== semTags(q.enunciado));
  if (!cand.length) return null;
  const pont = cand.map((c) => ({ c, s: modelo(c.enunciado) === base ? 2 : jaccard(fb, fichas(c.enunciado)) }));
  const melhor = Math.max(...pont.map((p) => p.s));
  const top = pont.filter((p) => p.s >= melhor - 0.05);
  return top[Math.floor(Math.random() * top.length)].c;
}

// Dicas em dois passos: a ideia central do tópico e o primeiro passo da explicação (sem entregar a resposta).
export function dicas(q) {
  const t = topico(q.topico);
  const frases = (h) => (semTags(h).match(/.+?(?:[.!?](?=\s|$)|$)/g) || []).map((x) => x.trim()).filter(Boolean);
  const out = [];
  if (t) { let o = ''; for (const f of frases(t.explicacao_html)) { if ((o + ' ' + f).length > 260 && o) break; o += (o ? ' ' : '') + f; } if (o) out.push(o); }
  const resp = semTags(respostaEmTexto(q)).toLowerCase();
  const passo = frases(q.explicacao || '').find((f) => !(resp.length > 1 && f.toLowerCase().includes(resp)));
  if (passo && !out.includes(passo)) out.push(passo);
  return out;
}

export const tempoLeitura = (q) => Math.max(1200, Math.min(5000, semTags(q.enunciado).length * 35 + (q.alternativas || []).map(semTags).join('').length * 12));
export const tempoExplicacao = (q) => Math.max(3000, Math.min(10000, semTags(q.explicacao || '').length * 40));
