// Missões do dia (vindas do Tutor da Cat original). Mudam todo dia, iguais para quem estudar no mesmo dia.
import { MATERIAS } from '../conteudo.js';

export const hojeStr = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};
const semente = (s) => { let h = 0; for (const c of s) h = (h * 31 + c.charCodeAt(0)) >>> 0; return h; };

// Contadores do dia guardados junto com o gato: corrigidos (acertou a parecida), revisões acertadas, sequência.
export function contadoresDoDia(mascote) {
  const d = hojeStr();
  return mascote.dia && mascote.dia.d === d ? mascote.dia : { d, fix: 0, rev: 0, run: 0, rb: 0 };
}

export function missoesDoDia(tentativas, mascote) {
  const d = hojeStr(), h = semente(d), dl = contadoresDoDia(mascote);
  const hoje = tentativas.filter((t) => {
    const x = new Date(t.criado_em);
    return `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, '0')}-${String(x.getDate()).padStart(2, '0')}` === d;
  });
  const acertos = hoje.filter((t) => t.correta).length;
  const m = MATERIAS[h % MATERIAS.length];
  const a = h % 2 ? { t: 'Acerte 15 questões', v: acertos, n: 15, em: '🎯' } : { t: 'Responda 25 questões', v: hoje.length, n: 25, em: '🎯' };
  const b = { t: `Acerte 6 em ${m.nome}`, v: hoje.filter((t) => t.correta && t.materia === m.id).length, n: 6, em: '📚', materia: m.id };
  const c = [
    { t: 'Corrija 2 erros (acerte a parecida)', v: dl.fix, n: 2, em: '🧠' },
    { t: 'Acerte 3 revisões de erro', v: dl.rev, n: 3, em: '🔁' },
    { t: 'Faça 6 acertos seguidos', v: dl.rb, n: 6, em: '🔥' },
  ][(h >> 3) % 3];
  return [a, b, c].map((x) => ({ ...x, v: Math.min(x.v, x.n), feita: x.v >= x.n }));
}
