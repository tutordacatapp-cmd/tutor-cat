// Regras do mascote: tudo é calculado a partir das tentativas do aluno.
// O que fica salvo à parte é só a personalização (nome, cor, roupas, cenário) e o que já foi comemorado.
import { MATERIAS, TOPICOS } from '../conteudo.js';
import { situacaoTopico } from '../progresso.js';

// Roupas: 4 por matéria, liberadas com 10, 40, 100 e 200 acertos naquela matéria.
export const ITENS = [
  { id: 'mt1', m: 'mt', slot: 'hand', em: '🪄', nm: 'Varinha de estrela', need: 10 },
  { id: 'mt2', m: 'mt', slot: 'head', em: '🧙', nm: 'Chapéu de mago', need: 40 },
  { id: 'mt3', m: 'mt', slot: 'back', em: '🌌', nm: 'Capa estrelada', need: 100 },
  { id: 'mt4', m: 'mt', slot: 'float', em: '🔮', nm: 'Orbe de cristal', need: 200 },
  { id: 'pt1', m: 'pt', slot: 'hand', em: '🪶', nm: 'Pena de escrever', need: 10 },
  { id: 'pt2', m: 'pt', slot: 'float', em: '📜', nm: 'Pergaminho', need: 40 },
  { id: 'pt3', m: 'pt', slot: 'head', em: '🎨', nm: 'Boina de poeta', need: 100 },
  { id: 'pt4', m: 'pt', slot: 'eyes', em: '👓', nm: 'Óculos de leitura', need: 200 },
  { id: 'en1', m: 'en', slot: 'neck', em: '🧣', nm: 'Cachecol de Londres', need: 10 },
  { id: 'en2', m: 'en', slot: 'hand', em: '☂️', nm: 'Guarda-chuva', need: 40 },
  { id: 'en3', m: 'en', slot: 'head', em: '🎩', nm: 'Cartola britânica', need: 100 },
  { id: 'en4', m: 'en', slot: 'float', em: '🫖', nm: 'Chá das cinco', need: 200 },
];
export const PERSONAGEM = { mt: 'Mago', pt: 'Escriba', en: 'Viajante' };

// Títulos pelo total de acertos.
export const TITULOS = [[0, 'Aprendiz'], [80, 'Escudeira'], [200, 'Aventureira'], [400, 'Cavaleira'], [700, 'Guardiã do Saber'], [1100, 'Arquimaga'], [1700, 'Lenda do Reino']];

// Cenários pelos dias com as 3 missões completas (como no tutor original).
export const DIAS_CENARIO = { quarto: 0, floresta: 2, biblioteca: 5, castelo: 10, ceu: 20 };

const dia = (iso) => {
  const d = new Date(iso);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};
const hoje = () => dia(new Date().toISOString());

// Estatísticas que alimentam roupas, títulos, cenários e medalhas.
export function estatisticas(tentativas) {
  const ts = tentativas.slice().sort((a, b) => (a.criado_em < b.criado_em ? -1 : 1));
  const acertos = Object.fromEntries(MATERIAS.map((m) => [m.id, 0]));
  let seq = 0, melhorSeq = 0, corrigidos = 0;
  const errou = new Set(), corrigida = new Set(), porDia = {};
  for (const t of ts) {
    const d = dia(t.criado_em);
    porDia[d] = (porDia[d] || 0) + 1;
    if (t.correta) {
      acertos[t.materia] = (acertos[t.materia] || 0) + 1;
      seq++; melhorSeq = Math.max(melhorSeq, seq);
      if (errou.has(t.questao_id) && !corrigida.has(t.questao_id)) { corrigida.add(t.questao_id); corrigidos++; }
    } else {
      seq = 0; errou.add(t.questao_id);
    }
  }
  const dias = Object.keys(porDia).sort();
  let diasSeguidos = 0, c = 0, ant = null;
  for (const k of dias) {
    const d = new Date(k + 'T12:00');
    c = ant && (d - ant) / 864e5 < 1.5 ? c + 1 : 1;
    diasSeguidos = Math.max(diasSeguidos, c);
    ant = d;
  }
  const ultimo = dias[dias.length - 1];
  const semEstudar = ultimo ? Math.round((new Date(hoje() + 'T12:00') - new Date(ultimo + 'T12:00')) / 864e5) : 0;
  const dominados = TOPICOS.filter((tp) => situacaoTopico(tp.id, tentativas).estado === 'dominado').length;
  const total = Object.values(acertos).reduce((a, b) => a + b, 0);
  return {
    acertos, total, melhorSeq, seqAtual: seq, corrigidos, diasSeguidos,
    diasEstudo: dias.length, maxNoDia: Math.max(0, ...Object.values(porDia)),
    dominados, dormindo: !!ultimo && semEstudar >= 2,
  };
}

export const MEDALHAS = [
  { id: 'd3', em: '🔥', nm: 'Chama acesa', ds: 'Estudar 3 dias seguidos', v: (e) => e.diasSeguidos, n: 3 },
  { id: 'd7', em: '🔥', nm: 'Fogueira', ds: 'Estudar 7 dias seguidos', v: (e) => e.diasSeguidos, n: 7 },
  { id: 'd15', em: '🌋', nm: 'Vulcão', ds: 'Estudar 15 dias seguidos', v: (e) => e.diasSeguidos, n: 15 },
  { id: 'r10', em: '🎯', nm: 'Mira certeira', ds: '10 acertos seguidos', v: (e) => e.melhorSeq, n: 10 },
  { id: 'r25', em: '🏹', nm: 'Flecha de ouro', ds: '25 acertos seguidos', v: (e) => e.melhorSeq, n: 25 },
  { id: 'f10', em: '🧠', nm: 'Entendi de verdade', ds: 'Acertar 10 questões que você tinha errado', v: (e) => e.corrigidos, n: 10 },
  { id: 'f40', em: '🕵️', nm: 'Caçadora de erros', ds: 'Acertar 40 questões que você tinha errado', v: (e) => e.corrigidos, n: 40 },
  { id: 'm5', em: '⭐', nm: 'Domínio', ds: 'Dominar 5 tópicos da trilha', v: (e) => e.dominados, n: 5 },
  { id: 'm15', em: '🌟', nm: 'Mestra da trilha', ds: 'Dominar 15 tópicos da trilha', v: (e) => e.dominados, n: 15 },
  { id: 'all', em: '🌈', nm: 'Polímata', ds: '10 acertos em cada matéria', v: (e) => Math.min(...MATERIAS.map((m) => e.acertos[m.id] || 0)), n: 10 },
  { id: 'mar', em: '🏃', nm: 'Maratona', ds: '100 questões num dia', v: (e) => e.maxNoDia, n: 100 },
  { id: 'mis1', em: '📜', nm: 'Primeira missão', ds: 'Completar as 3 missões de um dia', v: (e) => e.diasMissao || 0, n: 1 },
  { id: 'mis7', em: '🗡️', nm: 'Heroína', ds: 'Completar as missões em 7 dias', v: (e) => e.diasMissao || 0, n: 7 },
];

export function titulo(e) {
  let i = 0;
  TITULOS.forEach((x, j) => { if (e.total >= x[0]) i = j; });
  return { i, nm: TITULOS[i][1], de: TITULOS[i][0], prox: TITULOS[i + 1] || null };
}

// Lista de conquistas já alcançadas, como chaves: 'i:mt1', 't:2', 'm:d3', 'c:floresta'
export function conquistas(e) {
  const k = [];
  ITENS.forEach((it) => { if ((e.acertos[it.m] || 0) >= it.need) k.push('i:' + it.id); });
  TITULOS.forEach((x, i) => { if (i > 0 && e.total >= x[0]) k.push('t:' + i); });
  MEDALHAS.forEach((m) => { if (m.v(e) >= m.n) k.push('m:' + m.id); });
  Object.entries(DIAS_CENARIO).forEach(([id, n]) => { if (n > 0 && (e.diasMissao || 0) >= n) k.push('c:' + id); });
  return k;
}

export function descreverConquista(k) {
  const [tipo, id] = [k[0], k.slice(2)];
  if (tipo === 'i') { const it = ITENS.find((x) => x.id === id); return { em: it.em, t: 'Roupa nova: ' + it.nm + '!', d: `${it.need} acertos em ${MATERIAS.find((m) => m.id === it.m).nome}.`, item: it }; }
  if (tipo === 't') { const x = TITULOS[+id]; return { em: '👑', t: 'Novo título: ' + x[1] + '!', d: `Você chegou a ${x[0]} acertos.` }; }
  if (tipo === 'm') { const m = MEDALHAS.find((x) => x.id === id); return { em: m.em, t: 'Medalha: ' + m.nm + '!', d: m.ds + '.' }; }
  if (tipo === 'x') return { em: '⚔️', t: 'Missões de hoje completas!', d: 'Você fez as 3 missões do dia. Mais um dia de missão para o seu gato!' };
  return { em: '🏞️', t: 'Cenário novo!', d: `${DIAS_CENARIO[id]} dias de missão completos.`, cenario: id };
}

export const FRASES_ACERTO = ['Isso!', 'Mandou bem!', 'Miau! ✨', 'Arrasou!', 'Boa!'];
export const FRASES_ERRO = ['Quase!', 'Bora entender?', 'Acontece!', 'Vamos juntos!'];
