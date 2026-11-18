// Conteúdo do app: tópicos e questões (exportados do Tutor da Cat original).
// No MVP o conteúdo vem junto com o app; o banco de dados guarda só contas e tentativas.
import topicosTodos from './dados/topicos.json';
import qMt from './dados/questoes-mt.json';
import qPt from './dados/questoes-pt.json';
import qEn from './dados/questoes-en.json';

export const MATERIAS = [
  { id: 'mt', nome: 'Matemática', cor: 'var(--mt)', suave: 'var(--mt-soft)' },
  { id: 'pt', nome: 'Português', cor: 'var(--pt)', suave: 'var(--pt-soft)' },
  { id: 'en', nome: 'Inglês', cor: 'var(--en)', suave: 'var(--en-soft)' },
];

export const TOPICOS = topicosTodos.filter((t) => t.mvp);
export const QUESTOES = [...qMt, ...qPt, ...qEn];

const porId = new Map(QUESTOES.map((q) => [q.id, q]));
export const questao = (id) => porId.get(id);
export const topico = (id) => TOPICOS.find((t) => t.id === id);
export const topicosDa = (materia) => TOPICOS.filter((t) => t.materia === materia);
export const questoesDo = (topicoId) => QUESTOES.filter((q) => q.topico === topicoId);

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
