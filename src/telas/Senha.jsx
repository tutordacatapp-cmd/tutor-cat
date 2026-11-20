// Troca de senha: a própria (qualquer pessoa) ou a de outra pessoa (coordenação / professor).
import { useState } from 'react';
import { api } from '../dados/api.js';

const BICHOS = ['gato', 'tigre', 'panda', 'coruja', 'lontra', 'raposa', 'tucano', 'arara', 'golfinho', 'pinguim', 'lince', 'falcao'];
export function gerarSenha() {
  const r = crypto.getRandomValues(new Uint32Array(2));
  return `${BICHOS[r[0] % BICHOS.length]}-${1000 + (r[1] % 9000)}`;
}

// Para quem administra: escolhe ou gera a senha nova de outra pessoa.
export function NovaSenha({ pessoa, salvar, aoSalvar, aoCancelar }) {
  const [senha, setSenha] = useState(gerarSenha);
  const [msg, setMsg] = useState('');
  const [ocupado, setOcupado] = useState(false);
  async function ok() {
    const s = senha.trim();
    if (s.length < 6) { setMsg('Use pelo menos 6 caracteres.'); return; }
    setOcupado(true); setMsg('');
    try { await salvar(pessoa.id, s); aoSalvar?.(s); }
    catch (e) { setMsg(/function|schema cache/i.test(e.message) ? 'Essa função ainda está sendo instalada. Tente de novo em alguns minutos.' : e.message); }
    finally { setOcupado(false); }
  }
  return (
    <div className="caixa-senha pilha" style={{ gap: 8 }}>
      <span className="pequeno">Nova senha de <b>{pessoa.nome}</b>:</span>
      <div className="linha" style={{ justifyContent: 'flex-start', flexWrap: 'wrap' }}>
        <input value={senha} onChange={(e) => setSenha(e.target.value)} aria-label="Nova senha" style={{ width: 170 }} autoCapitalize="off" autoCorrect="off" />
        <button className="link pequeno" onClick={() => setSenha(gerarSenha())}>🎲 Sortear outra</button>
      </div>
      {msg && <span className="aviso pequeno">{msg}</span>}
      <div className="linha" style={{ justifyContent: 'flex-start' }}>
        <button className="btn" disabled={ocupado} onClick={ok}>{ocupado ? 'Salvando…' : 'Salvar senha'}</button>
        <button className="btn fantasma" onClick={aoCancelar}>Cancelar</button>
      </div>
    </div>
  );
}

// Para a própria pessoa.
export function MinhaSenha({ aoFechar }) {
  const [a, setA] = useState('');
  const [b, setB] = useState('');
  const [msg, setMsg] = useState('');
  const [feito, setFeito] = useState(false);
  async function ok(e) {
    e.preventDefault();
    if (a.length < 6) return setMsg('Use pelo menos 6 caracteres.');
    if (a !== b) return setMsg('As duas senhas não são iguais.');
    try { await api.trocarMinhaSenha(a); setFeito(true); setMsg(''); }
    catch (er) { setMsg(er.message); }
  }
  return (
    <form className="cartao pilha" onSubmit={ok}>
      <h3>🔑 Trocar minha senha</h3>
      {feito ? <p>Pronto! Use a senha nova da próxima vez que entrar.</p> : (
        <>
          <label className="campo">Senha nova<input type="password" value={a} onChange={(e) => setA(e.target.value)} autoComplete="new-password" /></label>
          <label className="campo">Repita a senha nova<input type="password" value={b} onChange={(e) => setB(e.target.value)} autoComplete="new-password" /></label>
          {msg && <p className="aviso pequeno" style={{ margin: 0 }}>{msg}</p>}
        </>
      )}
      <div className="linha" style={{ justifyContent: 'flex-start' }}>
        {!feito && <button className="btn" type="submit">Salvar</button>}
        <button className="btn fantasma" type="button" onClick={aoFechar}>{feito ? 'Fechar' : 'Cancelar'}</button>
      </div>
    </form>
  );
}
