import { useEffect, useState } from 'react';
import { api } from '../dados/api.js';
import Professor from './Professor.jsx';

// ===== geração de usuário e senha =====
const semAcento = (s) => s.normalize('NFD').replace(/[̀-ͯ]/g, '');
export function sugerirUsuario(nome, existentes) {
  const partes = semAcento(nome).toLowerCase().replace(/[^a-z\s]/g, '').split(/\s+/).filter(Boolean);
  if (!partes.length) return '';
  let base = partes.length > 1 ? `${partes[0]}.${partes[partes.length - 1]}` : partes[0];
  if (base.length < 3) base = base.padEnd(3, '0');
  base = base.slice(0, 26);
  let u = base, n = 2;
  while (existentes.has(u)) u = `${base}${n++}`;
  return u;
}
const BICHOS = ['gato', 'lobo', 'urso', 'leao', 'tigre', 'panda', 'coruja', 'raposa', 'sapo', 'peixe', 'pato', 'arara', 'onca', 'tatu', 'boto'];
export function gerarSenha() {
  const r = crypto.getRandomValues(new Uint32Array(2));
  return `${BICHOS[r[0] % BICHOS.length]}-${1000 + (r[1] % 9000)}`;
}

async function copiar(texto, avisar) {
  try { await navigator.clipboard.writeText(texto); avisar('Copiado! Cole no WhatsApp, e-mail ou num documento para imprimir.'); }
  catch { avisar('Não consegui copiar. Selecione a tabela e copie manualmente.'); }
}

function TabelaAcessos({ codigo, linhas, aoFechar }) {
  const [aviso, setAviso] = useState('');
  const texto = `Tutor da Cat · código da escola: ${codigo}\n` + linhas.map((l) => `${l.nome} — usuário: ${l.usuario} — senha: ${l.senha}${l.erro ? ' (ERRO: ' + l.erro + ')' : ''}`).join('\n');
  return (
    <div className="cartao pilha acessos">
      <h3>🔑 Acessos criados</h3>
      <p className="aviso-ok pequeno">Guarde ou envie agora: <b>as senhas não aparecem de novo</b>. Se alguém esquecer, é só gerar outra.</p>
      <div className="rolavel">
        <table className="tabela">
          <thead><tr><th>Nome</th><th>Usuário</th><th>Senha</th></tr></thead>
          <tbody>
            {linhas.map((l, k) => (
              <tr key={k}>
                <td>{l.nome}</td>
                <td>{l.erro ? <span className="pilula vermelho">{l.erro}</span> : <code>{l.usuario}</code>}</td>
                <td>{!l.erro && <code>{l.senha}</code>}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="mudo pequeno">Código da escola para o login: <code>{codigo}</code></p>
      <div className="linha">
        <button className="btn" onClick={() => copiar(texto, setAviso)}>Copiar lista</button>
        <button className="btn fantasma" onClick={aoFechar}>Fechar</button>
      </div>
      {aviso && <p className="mudo pequeno">{aviso}</p>}
    </div>
  );
}

export default function Coordenacao({ perfil }) {
  const [aba, setAba] = useState('pessoas');
  const [turmas, setTurmas] = useState(null);
  const [pessoas, setPessoas] = useState([]);
  const [erro, setErro] = useState('');
  const [acessos, setAcessos] = useState(null);
  const [ocupado, setOcupado] = useState(false);
  // formulários
  const [novaTurma, setNovaTurma] = useState('');
  const [nomes, setNomes] = useState('');
  const [papel, setPapel] = useState('aluno');
  const [turmaSel, setTurmaSel] = useState('');
  const [filtro, setFiltro] = useState('');
  const [apagar, setApagar] = useState(null);

  async function recarregar() {
    try {
      const [t, p] = await Promise.all([api.turmasDaEscola(), api.pessoasDaEscola()]);
      setTurmas(t); setPessoas(p);
      if (!turmaSel && t[0]) setTurmaSel(t[0].id);
    } catch (e) { setErro(e.message); }
  }
  useEffect(() => { recarregar(); }, []);

  async function acao(fn) {
    setErro(''); setOcupado(true);
    try { await fn(); } catch (e) { setErro(e.message); } finally { setOcupado(false); }
  }

  const criarTurma = () => acao(async () => {
    await api.criarTurma(novaTurma);
    setNovaTurma('');
    await recarregar();
  });

  const criarContas = () => acao(async () => {
    const lista = nomes.split('\n').map((s) => s.trim()).filter(Boolean);
    if (!lista.length) throw new Error('Escreva pelo menos um nome.');
    if (papel === 'aluno' && !turmaSel) throw new Error('Escolha a turma.');
    const usados = new Set(pessoas.map((p) => p.usuario).filter(Boolean));
    const linhas = [];
    for (const nome of lista) {
      let usuario = sugerirUsuario(nome, usados);
      const senha = gerarSenha();
      let feito = false, ultimoErro = '';
      for (let tentativa = 0; tentativa < 3 && !feito; tentativa++) {
        try {
          await api.criarConta({ usuario, senha, nome, papel, turma: turmaSel || null });
          feito = true;
        } catch (e) {
          ultimoErro = e.message;
          if (/já existe/.test(e.message)) { usados.add(usuario); usuario = sugerirUsuario(nome, usados); } else break;
        }
      }
      usados.add(usuario);
      linhas.push(feito ? { nome, usuario, senha } : { nome, usuario, senha: '', erro: ultimoErro });
    }
    setAcessos(linhas);
    setNomes('');
    await recarregar();
  });

  const novaSenha = (p) => acao(async () => {
    const senha = gerarSenha();
    await api.redefinirSenha(p.id, senha);
    setAcessos([{ nome: p.nome, usuario: p.usuario || '(veja com o suporte)', senha }]);
  });

  const alternarVinculo = (prof, turmaId) => acao(async () => {
    await api.vincularProfessor(prof.id, turmaId, !prof.turmas.includes(turmaId));
    await recarregar();
  });

  const excluir = (p) => acao(async () => {
    await api.excluirPessoa(p.id);
    setApagar(null);
    await recarregar();
  });

  const mudarTurma = (aluno, turmaId) => acao(async () => {
    await api.mudarTurma(aluno.id, turmaId);
    await recarregar();
  });

  if (!turmas) return <p className="mudo">Carregando…</p>;
  const codigo = perfil.escola?.codigo || '';
  const visiveis = pessoas.filter((p) => !filtro || p.turma_id === filtro || p.turmas.includes(filtro));
  const alunos = pessoas.filter((p) => p.papel === 'aluno').length;
  const professores = pessoas.filter((p) => p.papel === 'professor').length;

  return (
    <div className="pilha">
      <h2>Coordenação</h2>
      <p className="mudo">{perfil.escola?.nome} · código <code>{codigo}</code> · {turmas.length} {turmas.length === 1 ? 'turma' : 'turmas'} · {alunos} {alunos === 1 ? 'aluno' : 'alunos'} · {professores} {professores === 1 ? 'professor' : 'professores'}</p>

      <nav className="abas">
        {[['pessoas', 'Pessoas'], ['turmas', 'Turmas'], ['painel', 'Painel das turmas']].map(([id, nome]) => (
          <button key={id} aria-selected={aba === id} onClick={() => { setAba(id); setErro(''); }}>{nome}</button>
        ))}
      </nav>

      {erro && <p className="aviso">{erro}</p>}
      {acessos && <TabelaAcessos codigo={codigo} linhas={acessos} aoFechar={() => setAcessos(null)} />}

      {aba === 'turmas' && (
        <>
          <div className="cartao pilha">
            <h3>Nova turma</h3>
            <div className="resposta">
              <input value={novaTurma} onChange={(e) => setNovaTurma(e.target.value)} placeholder="ex.: 6º ano B" />
              <button className="btn" disabled={ocupado || novaTurma.trim().length < 2} onClick={criarTurma}>Criar</button>
            </div>
          </div>
          <div className="cartao">
            <table className="tabela">
              <thead><tr><th>Turma</th><th className="num">Alunos</th><th>Professores</th></tr></thead>
              <tbody>
                {turmas.map((t) => (
                  <tr key={t.id}>
                    <td><b>{t.nome}</b></td>
                    <td className="num">{pessoas.filter((p) => p.turma_id === t.id).length}</td>
                    <td className="pequeno">{pessoas.filter((p) => p.turmas.includes(t.id)).map((p) => p.nome).join(', ') || <span className="mudo">nenhum</span>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {aba === 'pessoas' && (
        <>
          <div className="cartao pilha">
            <h3>Cadastrar</h3>
            <div className="linha" style={{ justifyContent: 'flex-start' }}>
              <select value={papel} onChange={(e) => setPapel(e.target.value)}>
                <option value="aluno">Alunos</option>
                <option value="professor">Professores</option>
              </select>
              <select value={turmaSel} onChange={(e) => setTurmaSel(e.target.value)}>
                {papel === 'professor' && <option value="">Sem turma por enquanto</option>}
                {turmas.map((t) => <option key={t.id} value={t.id}>{t.nome}</option>)}
              </select>
            </div>
            <label className="pequeno mudo" htmlFor="nomes">Um nome por linha (pode colar a lista de chamada):</label>
            <textarea id="nomes" rows={5} value={nomes} onChange={(e) => setNomes(e.target.value)} placeholder={'Ana Clara Souza\nBruno Lima\nCecília Martins'} />
            <button className="btn" disabled={ocupado || !nomes.trim()} onClick={criarContas}>
              {ocupado ? 'Criando…' : `Criar ${nomes.split('\n').filter((s) => s.trim()).length || ''} conta(s)`}
            </button>
            <p className="mudo pequeno">O app cria o usuário (ex.: ana.souza) e uma senha fácil (ex.: tigre-4821) para cada pessoa.</p>
          </div>

          <div className="linha">
            <h3>Pessoas</h3>
            <select value={filtro} onChange={(e) => setFiltro(e.target.value)}>
              <option value="">Todas as turmas</option>
              {turmas.map((t) => <option key={t.id} value={t.id}>{t.nome}</option>)}
            </select>
          </div>
          <div className="cartao rolavel">
            <table className="tabela">
              <thead><tr><th>Nome</th><th>Usuário</th><th>Turma</th></tr></thead>
              <tbody>
                {visiveis.map((p) => (
                  <tr key={p.id}>
                    <td><b>{p.nome}</b><br /><span className="mudo pequeno">{p.papel === 'aluno' ? 'Aluno(a)' : 'Professor(a)'}</span><br /><button className="link pequeno" disabled={ocupado} onClick={() => novaSenha(p)}>🔑 Nova senha</button>
                      {' · '}<button className="link pequeno perigo" disabled={ocupado} onClick={() => setApagar(p)}>🗑️ Excluir</button>
                      {apagar?.id === p.id && (
                        <div className="confirma">
                          <p className="pequeno">Excluir <b>{p.nome}</b>? {p.papel === 'aluno' ? 'Todo o progresso e o gato dele(a) serão apagados.' : 'Ele(a) perde o acesso às turmas.'} Não dá para desfazer.</p>
                          <div className="linha" style={{ justifyContent: 'flex-start' }}>
                            <button className="btn perigo" disabled={ocupado} onClick={() => excluir(p)}>Excluir</button>
                            <button className="btn fantasma" onClick={() => setApagar(null)}>Cancelar</button>
                          </div>
                        </div>
                      )}</td>
                    <td><code>{p.usuario || '—'}</code></td>
                    <td>
                      {p.papel === 'aluno' ? (
                        <select value={p.turma_id || ''} disabled={ocupado} onChange={(e) => mudarTurma(p, e.target.value)}>
                          {turmas.map((t) => <option key={t.id} value={t.id}>{t.nome}</option>)}
                        </select>
                      ) : (
                        <div className="chips-turma">
                          {turmas.map((t) => (
                            <button key={t.id} className={'chip' + (p.turmas.includes(t.id) ? ' on' : '')} disabled={ocupado} onClick={() => alternarVinculo(p, t.id)}>
                              {p.turmas.includes(t.id) ? '✓ ' : ''}{t.nome}
                            </button>
                          ))}
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
                {!visiveis.length && <tr><td colSpan={3} className="mudo">Ninguém cadastrado ainda.</td></tr>}
              </tbody>
            </table>
          </div>
        </>
      )}

      {aba === 'painel' && <Professor perfil={{ ...perfil, turmas: turmas.map((t) => t.id) }} />}
    </div>
  );
}
