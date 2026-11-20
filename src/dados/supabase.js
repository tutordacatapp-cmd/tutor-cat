// MODO REAL: contas e tentativas no Supabase. O esquema está em supabase/esquema.sql.
// As contas são criadas pela escola (não há cadastro aberto). Cada login vira um
// e-mail interno: <usuario>.<codigo-da-escola>@contas.tutordacat.app
import { createClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL;
const chave = import.meta.env.VITE_SUPABASE_ANON_KEY;
const sb = url && chave ? createClient(url, chave) : null;

// O Supabase devolve no máximo 1000 linhas por consulta: busca página por página, em ordem de data.
async function todas(montar) {
  const out = [];
  for (let de = 0; ; de += 1000) {
    const { data, error } = await montar().order('criado_em').order('id').range(de, de + 999);
    if (error) throw error;
    out.push(...data);
    if (data.length < 1000) return out;
  }
}

// Fila de respostas ainda não enviadas (por aluno, neste aparelho).
const chaveFila = (id) => 'tutor-fila-' + id;
function lerFila(id) { try { return JSON.parse(localStorage.getItem(chaveFila(id)) || '[]'); } catch { return []; } }
function gravarFila(id, f) { try { localStorage.setItem(chaveFila(id), JSON.stringify(f)); } catch { /* sem armazenamento */ } }
let enviando = Promise.resolve();
function enviarFila(id) {
  const vez = enviando.catch(() => {}).then(async () => {
    const fila = lerFila(id);
    if (!fila.length) return;
    const { error } = await sb.from('tentativas').insert(fila);
    if (error && !error.code) throw new Error('offline'); // falha de rede: mantém na fila
    gravarFila(id, lerFila(id).slice(fila.length)); // enviado (ou recusado pelo banco): tira da fila
    if (error) throw error;
  });
  enviando = vez;
  return vez;
}

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
  async trocarMinhaSenha(senha) {
    const { error } = await sb.auth.updateUser({ password: senha });
    if (error) throw new Error(/different|same/i.test(error.message) ? 'A senha nova precisa ser diferente da atual.' : error.message);
  },
  async redefinirSenhaAluno(alunoId, senha) {
    const { error } = await sb.rpc('prof_redefinir_senha', { p_aluno: alunoId, p_senha: senha });
    if (error) throw new Error(error.message);
  },
  async sair() {
    await sb.auth.signOut();
  },
  async minhasTentativas(alunoId) {
    await enviarFila(alunoId).catch(() => {});
    const data = await todas(() => sb.from('tentativas').select('*').eq('aluno_id', alunoId));
    return [...data, ...lerFila(alunoId)];
  },
  // Guarda primeiro no aparelho e depois envia: sem internet, a resposta não se perde.
  async registrarTentativa(t) {
    gravarFila(t.aluno_id, [...lerFila(t.aluno_id), { ...t, criado_em: new Date().toISOString() }]);
    await enviarFila(t.aluno_id);
  },
  async turmasDoProfessor(perfil) {
    if (!perfil.turmas.length) return [];
    const { data, error } = await sb.from('turmas').select('id, nome, escola_id').in('id', perfil.turmas);
    if (error) throw error;
    return data;
  },
  async alunosDaTurma(turmaId) {
    const { data, error } = await sb.from('perfis').select('id, nome, papel, turma_id, usuario').eq('turma_id', turmaId).eq('papel', 'aluno').order('nome');
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
  // ===== Lembretes (notificações) =====
  async vapidPublica() { const { data } = await sb.rpc('vapid_publica'); return data || null; },
  async tenhoLembrete() { const { data } = await sb.rpc('tenho_lembrete'); return !!data; },
  async salvarInscricao(sub) {
    const { error } = await sb.rpc('salvar_inscricao', { p_endpoint: sub.endpoint, p_p256dh: sub.keys?.p256dh, p_auth: sub.keys?.auth });
    if (error) throw new Error(/function|schema cache/i.test(error.message) ? 'Os lembretes ainda estão sendo preparados. Tente amanhã.' : error.message);
  },
  async removerInscricao(endpoint) { await sb.rpc('remover_inscricao', { p_endpoint: endpoint }); },
  // ===== Termo de autorização dos responsáveis =====
  async termoInfo(token) {
    const { data, error } = await sb.rpc('termo_info', { p_token: token });
    if (error) throw new Error(error.message);
    return data;
  },
  async assinarTermo({ token, responsavel, parentesco, cpf, contato, versao, resumo }) {
    const { error } = await sb.rpc('assinar_termo', { p_token: token, p_responsavel: responsavel, p_parentesco: parentesco, p_cpf: cpf, p_contato: contato, p_versao: versao, p_resumo: !!resumo });
    if (error) throw new Error(error.message);
  },
  async minhaAutorizacao(alunoId) {
    const { data, error } = await sb.from('autorizacoes').select('aluno_id').eq('aluno_id', alunoId).maybeSingle();
    if (error) return true; // tabela ainda não criada: não bloqueia
    return !!data;
  },
  async coordTermos() {
    const { data, error } = await sb.rpc('coord_termos');
    if (error) return [];
    return data;
  },
  async coordPararResumo(alunoId) {
    const { error } = await sb.rpc('coord_parar_resumo', { p_aluno: alunoId });
    if (error) throw new Error(error.message);
  },
  async coordTermoPapel(alunoId, recebido) {
    const { error } = await sb.rpc('coord_termo_papel', { p_aluno: alunoId, p_recebido: recebido });
    if (error) throw new Error(error.message);
  },
  // ===== Avisos de erro em questões =====
  async avisarErro(aviso) {
    const { error } = await sb.from('avisos').insert(aviso);
    if (error) throw new Error(error.message);
  },
  async avisos(turmaId) {
    const { data, error } = await sb.from('avisos').select('*').eq('turma_id', turmaId).order('criado_em', { ascending: false }).limit(100);
    if (error) return [];
    return data;
  },
  async excluirAvisos(turmaId, questaoId) {
    const { error } = await sb.from('avisos').delete().eq('turma_id', turmaId).eq('questao_id', questaoId);
    if (error) throw new Error(error.message);
  },
  // ===== Tarefas e provas =====
  async tarefas(turmaId) {
    if (!turmaId) return [];
    const { data, error } = await sb.from('tarefas').select('*').eq('turma_id', turmaId).order('data');
    if (error) { if (/tarefas|schema cache/i.test(error.message)) return []; throw error; }
    return data;
  },
  async salvarTarefa(t) {
    const linha = { turma_id: t.turma_id, tipo: t.tipo, titulo: t.titulo, materia: t.materia, topicos: t.topicos, meta: t.meta, data: t.data };
    const q = t.id ? sb.from('tarefas').update(linha).eq('id', t.id) : sb.from('tarefas').insert(linha);
    const { data, error } = await q.select().single();
    if (error) throw new Error(error.message);
    return data;
  },
  async excluirTarefa(id) {
    const { error } = await sb.from('tarefas').delete().eq('id', id);
    if (error) throw error;
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
      try { const j = await error.context.json(); if (j?.erro) msg = j.erro + (j.detalhe ? ` [${j.detalhe}]` : ''); } catch { if (/not found|404/i.test(String(error.message))) msg = 'A função de IA ainda não foi instalada no Supabase.'; }
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
    return todas(() => sb.from('tentativas').select('*').eq('turma_id', turmaId));
  },
};
