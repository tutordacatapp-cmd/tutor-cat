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
    const amostra = ['mt', 'pt', 'en', 'ci', 'hi', 'ge'].flatMap((m) =>
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

function materialExemplo() {
  return [{
    id: 'mat-exemplo', turma_id: TURMA.id, materia: 'pt', titulo: 'Sinais de pontuação', status: 'publicado',
    criado_em: '2026-11-17T12:00:00Z', publicado_em: '2026-11-17T12:00:00Z',
    questoes: [
      { id: 'a1', tipo: 'mc', enunciado: 'Qual sinal indica uma <b>pergunta</b>?', resposta: 'ponto de interrogação', alternativas: ['ponto de interrogação', 'ponto de exclamação', 'vírgula', 'dois-pontos'], explicacao: 'Pergunta pede resposta → ponto de interrogação (?).', tutor: { alternativas: { 'ponto de exclamação': 'Exclamação mostra emoção (susto, alegria), não pergunta.', 'vírgula': 'Vírgula marca uma pausa curta dentro da frase.', 'dois-pontos': 'Dois-pontos anunciam uma fala, lista ou explicação.' }, pontos: ['Interrogação (?) = pergunta direta.', 'Exclamação (!) = emoção.'], pegadinha: 'Frase com emoção E pergunta pode usar ?! juntos.' } },
      { id: 'a2', tipo: 'mc', enunciado: 'Em uma <b>lista</b> de itens ("comprei pão, leite e ovos"), qual sinal separa os itens?', resposta: 'vírgula', alternativas: ['vírgula', 'ponto final', 'travessão', 'reticências'], explicacao: 'Itens de uma enumeração são separados por vírgula.', tutor: { alternativas: { 'ponto final': 'Ponto final encerra a frase inteira.', 'travessão': 'Travessão marca fala de personagem.', 'reticências': 'Reticências indicam pensamento interrompido ou suspense.' }, pontos: ['Enumeração → vírgula entre os itens.', 'Antes do "e" final, normalmente não vai vírgula.'], pegadinha: 'Não se coloca vírgula antes do "e" no último item da lista.' } },
      { id: 'a3', tipo: 'mc', enunciado: 'Qual sinal costuma indicar a <b>fala de um personagem</b> num diálogo?', resposta: 'travessão', alternativas: ['travessão', 'vírgula', 'ponto e vírgula', 'parênteses'], explicacao: 'No diálogo, o travessão (—) abre a fala do personagem.', tutor: { alternativas: { 'vírgula': 'Vírgula separa partes da frase, não abre falas.', 'ponto e vírgula': 'Ponto e vírgula separa partes longas de uma frase.', 'parênteses': 'Parênteses guardam uma informação extra.' }, pontos: ['Travessão = fala do personagem.', 'Dois-pontos geralmente vêm antes da fala.'], pegadinha: 'Travessão (—) é maior que o hífen (-) das palavras compostas.' } },
    ],
  }];
}

// Simulação para o modo demo: monta questões de completar a partir do texto colado.
function simularIA(texto, n) {
  const frases = (texto.match(/[^.!?\n]+[.!?]?/g) || []).map((f) => f.trim()).filter((f) => f.split(/\s+/).length >= 6);
  const palavras = [...new Set((texto.match(/[A-Za-zÀ-ú]{6,}/g) || []).map((p) => p.toLowerCase()))];
  const qs = [];
  for (const f of frases) {
    if (qs.length >= n) break;
    const alvo = (f.match(/[A-Za-zÀ-ú]{6,}/g) || []).sort((a, b) => b.length - a.length)[0];
    if (!alvo) continue;
    const outras = palavras.filter((p) => p !== alvo.toLowerCase()).sort(() => Math.random() - 0.5).slice(0, 3);
    if (outras.length < 3) continue;
    qs.push({ id: 's' + qs.length, tipo: 'mc', enunciado: 'Complete: "' + f.replace(alvo, '_____') + '"', resposta: alvo.toLowerCase(),
      alternativas: [alvo.toLowerCase(), ...outras], explicacao: 'No material: "' + f + '"',
      tutor: { alternativas: Object.fromEntries(outras.map((o) => [o, 'Não é a palavra que o material usa aqui.'])), pontos: ['(Demonstração: no app de verdade, a IA cria questões no estilo do tutor, com o porquê de cada alternativa.)'], pegadinha: '' } });
  }
  if (!qs.length) throw new Error('No demo, cole um texto com algumas frases completas para simular as questões.');
  return { titulo: (frases[0] || 'Material da aula').split(/\s+/).slice(0, 5).join(' '), questoes: qs };
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
  async modoLembrar(turmaId) {
    return ler().turmas.find((t) => t.id === turmaId)?.lembrar || 'sempre';
  },
  async definirModoLembrar(turmaId, modo) {
    const db = ler(); const t = db.turmas.find((x) => x.id === turmaId);
    if (!t) throw new Error('Turma não encontrada.');
    t.lembrar = modo; gravar(db);
  },
  // ===== Material da aula (no demo, a "IA" é simulada) =====
  async materiais(turmaId) {
    const db = ler(); if (!db.materiais) db.materiais = materialExemplo();
    return db.materiais.filter((m) => m.turma_id === turmaId).sort((a, b) => (a.criado_em < b.criado_em ? 1 : -1));
  },
  async salvarMaterial(m) {
    const db = ler(); if (!db.materiais) db.materiais = materialExemplo();
    const agora = new Date().toISOString();
    let x = m.id && db.materiais.find((y) => y.id === m.id);
    if (x) Object.assign(x, m, { publicado_em: m.status === 'publicado' ? x.publicado_em || agora : null });
    else { x = { ...m, id: 'mat' + Date.now().toString(36), status: m.status || 'rascunho', criado_em: agora, publicado_em: m.status === 'publicado' ? agora : null }; db.materiais.push(x); }
    gravar(db); return x;
  },
  async excluirMaterial(id) {
    const db = ler(); db.materiais = (db.materiais || []).filter((m) => m.id !== id); gravar(db);
  },
  async gerarQuestoes({ texto = '', quantidade = 8 }) {
    await new Promise((r) => setTimeout(r, 1200));
    return simularIA(texto, quantidade);
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
