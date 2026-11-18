// MODO DEMO: tudo fica salvo só neste aparelho (localStorage).
// Serve para testar o app antes de existir o projeto no Supabase.
import { QUESTOES } from '../conteudo.js';

const CHAVE = 'tutor-app-demo-v1';
const ESCOLA = { id: 'esc-1', codigo: 'PILOTO', nome: 'Escola Piloto' };
const TURMA = { id: 'tur-6a', nome: '6º ano A', escola_id: ESCOLA.id };

function semente() {
  const usuarios = [
    { id: 'u-prof', usuario: 'professora', senha: '1234', nome: 'Professora Ana', papel: 'professor', turmas: [TURMA.id] },
    { id: 'u-cat', usuario: 'catarina', senha: '1234', nome: 'Catarina', papel: 'aluno', turma_id: TURMA.id },
    { id: 'u-a1', usuario: 'lucas', senha: '1234', nome: 'Lucas', papel: 'aluno', turma_id: TURMA.id },
    { id: 'u-a2', usuario: 'marina', senha: '1234', nome: 'Marina', papel: 'aluno', turma_id: TURMA.id },
    { id: 'u-a3', usuario: 'pedro', senha: '1234', nome: 'Pedro', papel: 'aluno', turma_id: TURMA.id },
  ];
  // Tentativas de exemplo para a tela do professor não começar vazia.
  const tentativas = [];
  const perfis = { 'u-a1': 0.85, 'u-a2': 0.6, 'u-a3': 0.4 };
  let n = 0;
  for (const [aluno, chance] of Object.entries(perfis)) {
    const k = Object.keys(perfis).indexOf(aluno);
    const amostra = ['mt', 'pt', 'en'].flatMap((m) =>
      QUESTOES.filter((q) => q.materia === m).filter((_, i) => i % 9 === k).slice(0, 30));
    for (const q of amostra) {
      tentativas.push({
        id: 'seed-' + n++,
        aluno_id: aluno,
        turma_id: TURMA.id,
        questao_id: q.id,
        topico_id: q.topico,
        materia: q.materia,
        correta: Math.random() < chance,
        resposta: '',
        tempo_ms: 15000,
        criado_em: new Date(Date.now() - Math.random() * 12 * 864e5).toISOString(),
      });
    }
  }
  return { usuarios, tentativas, sessao: null };
}

function ler() {
  try {
    const v = JSON.parse(localStorage.getItem(CHAVE));
    if (v && v.usuarios) return v;
  } catch (e) {}
  const s = semente();
  gravar(s);
  return s;
}
function gravar(db) {
  try { localStorage.setItem(CHAVE, JSON.stringify(db)); } catch (e) {}
}
const perfilPublico = (u) => ({
  id: u.id, nome: u.nome, papel: u.papel, turma_id: u.turma_id ?? null,
  turmas: u.turmas ?? [], escola: ESCOLA,
});

export const demo = {
  modo: 'demo',
  async sessaoAtual() {
    const db = ler();
    const u = db.usuarios.find((x) => x.id === db.sessao);
    return u ? perfilPublico(u) : null;
  },
  async entrar(codigoEscola, usuario, senha) {
    const db = ler();
    if (codigoEscola.trim().toUpperCase() !== ESCOLA.codigo) throw new Error('Código da escola não encontrado.');
    const u = db.usuarios.find((x) => x.usuario === usuario.trim().toLowerCase() && x.senha === senha);
    if (!u) throw new Error('Usuário ou senha incorretos.');
    db.sessao = u.id;
    gravar(db);
    return perfilPublico(u);
  },
  async sair() {
    const db = ler();
    db.sessao = null;
    gravar(db);
  },
  async minhasTentativas(alunoId) {
    return ler().tentativas.filter((t) => t.aluno_id === alunoId);
  },
  async registrarTentativa(t) {
    const db = ler();
    const nova = { ...t, id: 't-' + Date.now() + '-' + Math.random().toString(36).slice(2, 6), criado_em: new Date().toISOString() };
    db.tentativas.push(nova);
    gravar(db);
    return nova;
  },
  async turmasDoProfessor(perfil) {
    return perfil.turmas.map((id) => (id === TURMA.id ? TURMA : null)).filter(Boolean);
  },
  async alunosDaTurma(turmaId) {
    return ler().usuarios.filter((u) => u.papel === 'aluno' && u.turma_id === turmaId).map(perfilPublico);
  },
  async tentativasDaTurma(turmaId) {
    return ler().tentativas.filter((t) => t.turma_id === turmaId);
  },
  async reiniciarDemo() {
    localStorage.removeItem(CHAVE);
  },
};
