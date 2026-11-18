// MODO DEMO: tudo fica salvo só neste aparelho (localStorage).
// Serve para testar o app antes de existir o projeto no Supabase.
import { QUESTOES } from '../conteudo.js';

const CHAVE = 'tutor-app-demo-v1';
const ESCOLA = { id: 'esc-1', codigo: 'PILOTO', nome: 'Escola Piloto' };
const TURMA = { id: 'tur-6a', nome: '6º ano A', escola_id: ESCOLA.id };

function semente() {
  const usuarios = [
    { id: 'u-coord', usuario: 'coordenacao', senha: '1234', nome: 'Coordenação', papel: 'coordenacao' },
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
  return { usuarios, turmas: [TURMA], tentativas, sessao: null };
}

function ler() {
  try {
    const v = JSON.parse(localStorage.getItem(CHAVE));
    if (v && v.usuarios && v.turmas) return v;
  } catch (e) {}
  const s = semente();
  gravar(s);
  return s;
}
function gravar(db) {
  try { localStorage.setItem(CHAVE, JSON.stringify(db)); } catch (e) {}
}
const perfilPublico = (u, db) => ({
  id: u.id, nome: u.nome, papel: u.papel, turma_id: u.turma_id ?? null, usuario: u.usuario,
  turmas: u.papel === 'coordenacao' ? (db || ler()).turmas.map((t) => t.id) : u.turmas ?? [], escola: ESCOLA,
});
const exigirCoord = (db) => {
  const u = db.usuarios.find((x) => x.id === db.sessao);
  if (!u || u.papel !== 'coordenacao') throw new Error('Só a coordenação pode fazer isso.');
};

export const demo = {
  modo: 'demo',
  async sessaoAtual() {
    const db = ler();
    const u = db.usuarios.find((x) => x.id === db.sessao);
    return u ? perfilPublico(u, db) : null;
  },
  async entrar(codigoEscola, usuario, senha) {
    const db = ler();
    if (codigoEscola.trim().toUpperCase() !== ESCOLA.codigo) throw new Error('Código da escola não encontrado.');
    const u = db.usuarios.find((x) => x.usuario === usuario.trim().toLowerCase() && x.senha === senha);
    if (!u) throw new Error('Usuário ou senha incorretos.');
    db.sessao = u.id;
    gravar(db);
    return perfilPublico(u, db);
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
    const db = ler();
    const ids = perfil.papel === 'coordenacao' ? db.turmas.map((t) => t.id) : db.usuarios.find((u) => u.id === perfil.id)?.turmas || [];
    return db.turmas.filter((t) => ids.includes(t.id));
  },
  // ===== Coordenação =====
  async turmasDaEscola() {
    return ler().turmas.slice().sort((a, b) => a.nome.localeCompare(b.nome));
  },
  async pessoasDaEscola() {
    return ler().usuarios.filter((u) => u.papel !== 'coordenacao').map((u) => ({ id: u.id, nome: u.nome, papel: u.papel, turma_id: u.turma_id ?? null, usuario: u.usuario, turmas: u.turmas || [] }))
      .sort((a, b) => a.nome.localeCompare(b.nome));
  },
  async criarTurma(nome) {
    const db = ler(); exigirCoord(db);
    if (nome.trim().length < 2) throw new Error('Dê um nome para a turma.');
    if (db.turmas.some((t) => t.nome === nome.trim())) throw new Error('Já existe uma turma com esse nome.');
    const t = { id: 'tur-' + Date.now(), nome: nome.trim(), escola_id: ESCOLA.id };
    db.turmas.push(t); gravar(db); return t.id;
  },
  async criarConta({ usuario, senha, nome, papel, turma }) {
    const db = ler(); exigirCoord(db);
    usuario = usuario.trim().toLowerCase();
    if (!/^[a-z0-9._-]{3,30}$/.test(usuario)) throw new Error('Usuário inválido: use de 3 a 30 letras sem acento, números, ponto ou hífen.');
    if (senha.length < 6) throw new Error('A senha precisa ter pelo menos 6 caracteres.');
    if (papel === 'aluno' && !turma) throw new Error('Escolha a turma do aluno.');
    if (db.usuarios.some((u) => u.usuario === usuario)) throw new Error(`O usuário ${usuario} já existe.`);
    const u = { id: 'u-' + Date.now() + Math.random().toString(36).slice(2, 5), usuario, senha, nome: nome.trim(), papel,
      ...(papel === 'aluno' ? { turma_id: turma } : { turmas: turma ? [turma] : [] }) };
    db.usuarios.push(u); gravar(db); return u.id;
  },
  async redefinirSenha(id, senha) {
    const db = ler(); exigirCoord(db);
    if (senha.length < 6) throw new Error('A senha precisa ter pelo menos 6 caracteres.');
    const u = db.usuarios.find((x) => x.id === id && x.papel !== 'coordenacao');
    if (!u) throw new Error('Pessoa não encontrada nesta escola.');
    u.senha = senha; gravar(db);
  },
  async vincularProfessor(profId, turmaId, ligar) {
    const db = ler(); exigirCoord(db);
    const u = db.usuarios.find((x) => x.id === profId && x.papel === 'professor');
    u.turmas = ligar ? [...new Set([...(u.turmas || []), turmaId])] : (u.turmas || []).filter((t) => t !== turmaId);
    gravar(db);
  },
  async excluirPessoa(id) {
    const db = ler(); exigirCoord(db);
    const u = db.usuarios.find((x) => x.id === id && x.papel !== 'coordenacao');
    if (!u) throw new Error('Pessoa não encontrada nesta escola.');
    db.usuarios = db.usuarios.filter((x) => x.id !== id);
    db.tentativas = db.tentativas.filter((t) => t.aluno_id !== id);
    if (db.mascotes) delete db.mascotes[id];
    gravar(db);
  },
  async mudarTurma(alunoId, turmaId) {
    const db = ler(); exigirCoord(db);
    const u = db.usuarios.find((x) => x.id === alunoId && x.papel === 'aluno');
    u.turma_id = turmaId; gravar(db);
  },
  async alunosDaTurma(turmaId) {
    const db = ler();
    return db.usuarios.filter((u) => u.papel === 'aluno' && u.turma_id === turmaId).map((u) => perfilPublico(u, db));
  },
  async tentativasDaTurma(turmaId) {
    return ler().tentativas.filter((t) => t.turma_id === turmaId);
  },
  async lerMascote(alunoId) {
    return (ler().mascotes || {})[alunoId] || null;
  },
  async salvarMascote(alunoId, dados) {
    const db = ler();
    db.mascotes = { ...(db.mascotes || {}), [alunoId]: dados };
    gravar(db);
  },
  async reiniciarDemo() {
    localStorage.removeItem(CHAVE);
  },
};
