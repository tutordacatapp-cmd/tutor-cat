// MODO REAL: contas e tentativas no Supabase. O esquema está em supabase/esquema.sql.
// As contas são criadas pela escola (não há cadastro aberto). Cada login vira um
// e-mail interno: <usuario>.<codigo-da-escola>@contas.tutordacat.app
import { createClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL;
const chave = import.meta.env.VITE_SUPABASE_ANON_KEY;
const sb = url && chave ? createClient(url, chave) : null;

export const emailInterno = (usuario, codigo) =>
  `${usuario.trim().toLowerCase()}.${codigo.trim().toLowerCase()}@contas.tutordacat.app`;

async function carregarPerfil(userId) {
  const { data: p, error } = await sb
    .from('perfis')
    .select('id, nome, papel, turma_id, usuario, escola:escolas(id, codigo, nome)')
    .eq('id', userId)
    .single();
  if (error) throw error;
  let turmas = [];
  if (p.papel === 'coordenacao') {
    const { data } = await sb.from('turmas').select('id');
    turmas = (data || []).map((x) => x.id);
  } else if (p.papel === 'professor') {
    const { data } = await sb.from('turma_professores').select('turma_id').eq('professor_id', userId);
    turmas = (data || []).map((x) => x.turma_id);
  }
  return { ...p, turmas };
}

export const supabase = sb && {
  modo: 'supabase',
  async sessaoAtual() {
    const { data } = await sb.auth.getSession();
    return data.session ? carregarPerfil(data.session.user.id) : null;
  },
  async entrar(codigoEscola, usuario, senha) {
    const { data, error } = await sb.auth.signInWithPassword({ email: emailInterno(usuario, codigoEscola), password: senha });
    if (error) throw new Error('Código da escola, usuário ou senha incorretos.');
    return carregarPerfil(data.user.id);
  },
  async sair() {
    await sb.auth.signOut();
  },
  async minhasTentativas(alunoId) {
    const { data, error } = await sb.from('tentativas').select('*').eq('aluno_id', alunoId);
    if (error) throw error;
    return data;
  },
  async registrarTentativa(t) {
    const { data, error } = await sb.from('tentativas').insert(t).select().single();
    if (error) throw error;
    return data;
  },
  async turmasDoProfessor(perfil) {
    if (!perfil.turmas.length) return [];
    const { data, error } = await sb.from('turmas').select('id, nome, escola_id').in('id', perfil.turmas);
    if (error) throw error;
    return data;
  },
  async alunosDaTurma(turmaId) {
    const { data, error } = await sb.from('perfis').select('id, nome, papel, turma_id').eq('turma_id', turmaId).eq('papel', 'aluno').order('nome');
    if (error) throw error;
    return data;
  },
  async modoLembrar(turmaId) {
    if (!turmaId) return 'sempre';
    const { data, error } = await sb.from('turmas').select('lembrar').eq('id', turmaId).maybeSingle();
    if (error) return 'sempre'; // coluna ainda não criada: comportamento padrão
    return data?.lembrar || 'sempre';
  },
  async definirModoLembrar(turmaId, modo) {
    const { error } = await sb.rpc('prof_modo_lembrar', { p_turma: turmaId, p_modo: modo });
    if (error) throw new Error(/function|schema cache/i.test(error.message) ? 'Falta rodar o SQL do "lembrar" no Supabase.' : error.message);
  },
  // ===== Material da aula =====
  async materiais(turmaId) {
    if (!turmaId) return [];
    const { data, error } = await sb.from('materiais').select('*').eq('turma_id', turmaId).order('criado_em', { ascending: false });
    if (error) { if (/materiais|schema cache/i.test(error.message)) return []; throw error; }
    return data;
  },
  async salvarMaterial(m) {
    const linha = { turma_id: m.turma_id, materia: m.materia, titulo: m.titulo, questoes: m.questoes, status: m.status || 'rascunho',
      publicado_em: m.status === 'publicado' ? m.publicado_em || new Date().toISOString() : null };
    const q = m.id ? sb.from('materiais').update(linha).eq('id', m.id) : sb.from('materiais').insert(linha);
    const { data, error } = await q.select().single();
    if (error) throw new Error(/materiais|schema cache/i.test(error.message) ? 'Falta rodar o SQL do "Material da aula" no Supabase.' : error.message);
    return data;
  },
  async excluirMaterial(id) {
    const { error } = await sb.from('materiais').delete().eq('id', id);
    if (error) throw error;
  },
  async gerarQuestoes(pedido) {
    const { data, error } = await sb.functions.invoke('gerar-questoes', { body: pedido });
    if (error) {
      let msg = 'Não consegui falar com a IA agora. Tente de novo.';
      try { const j = await error.context.json(); if (j?.erro) msg = j.erro; } catch { if (/not found|404/i.test(String(error.message))) msg = 'A função de IA ainda não foi instalada no Supabase.'; }
      throw new Error(msg);
    }
    return data;
  },
  async lerMascote(alunoId) {
    const { data, error } = await sb.from('mascotes').select('dados').eq('aluno_id', alunoId).maybeSingle();
    if (error) throw error;
    return data?.dados ?? null;
  },
  async salvarMascote(alunoId, dados) {
    const { error } = await sb.from('mascotes').upsert({ aluno_id: alunoId, dados, atualizado_em: new Date().toISOString() });
    if (error) throw error;
  },
  // ===== Coordenação =====
  async turmasDaEscola() {
    const { data, error } = await sb.from('turmas').select('id, nome').order('nome');
    if (error) throw error;
    return data;
  },
  async pessoasDaEscola() {
    const [{ data: ps, error }, { data: vs }] = await Promise.all([
      sb.from('perfis').select('id, nome, papel, turma_id, usuario').in('papel', ['aluno', 'professor']).order('nome'),
      sb.from('turma_professores').select('turma_id, professor_id'),
    ]);
    if (error) throw error;
    return ps.map((p) => ({ ...p, turmas: (vs || []).filter((v) => v.professor_id === p.id).map((v) => v.turma_id) }));
  },
  async criarTurma(nome) {
    const { data, error } = await sb.rpc('coord_criar_turma', { p_nome: nome });
    if (error) throw new Error(error.message);
    return data;
  },
  async criarConta({ usuario, senha, nome, papel, turma }) {
    const { data, error } = await sb.rpc('coord_criar_conta', { p_usuario: usuario, p_senha: senha, p_nome: nome, p_papel: papel, p_turma: turma || null });
    if (error) throw new Error(error.message);
    return data;
  },
  async redefinirSenha(pessoaId, senha) {
    const { error } = await sb.rpc('coord_redefinir_senha', { p_pessoa: pessoaId, p_senha: senha });
    if (error) throw new Error(error.message);
  },
  async vincularProfessor(professorId, turmaId, ligar) {
    const { error } = await sb.rpc('coord_vincular_professor', { p_professor: professorId, p_turma: turmaId, p_ligar: ligar });
    if (error) throw new Error(error.message);
  },
  async excluirPessoa(id) {
    const { error } = await sb.rpc('coord_excluir_pessoa', { p_pessoa: id });
    if (error) throw new Error(error.message);
  },
  async mudarTurma(alunoId, turmaId) {
    const { error } = await sb.rpc('coord_mudar_turma', { p_aluno: alunoId, p_turma: turmaId });
    if (error) throw new Error(error.message);
  },
  async tentativasDaTurma(turmaId) {
    const { data, error } = await sb.from('tentativas').select('*').eq('turma_id', turmaId);
    if (error) throw error;
    return data;
  },
};
