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
    .select('id, nome, papel, turma_id, escola:escolas(id, codigo, nome)')
    .eq('id', userId)
    .single();
  if (error) throw error;
  let turmas = [];
  if (p.papel === 'professor') {
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
  async lerMascote(alunoId) {
    const { data, error } = await sb.from('mascotes').select('dados').eq('aluno_id', alunoId).maybeSingle();
    if (error) throw error;
    return data?.dados ?? null;
  },
  async salvarMascote(alunoId, dados) {
    const { error } = await sb.from('mascotes').upsert({ aluno_id: alunoId, dados, atualizado_em: new Date().toISOString() });
    if (error) throw error;
  },
  async tentativasDaTurma(turmaId) {
    const { data, error } = await sb.from('tentativas').select('*').eq('turma_id', turmaId);
    if (error) throw error;
    return data;
  },
};
