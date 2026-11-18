import { useState } from 'react';
import { api } from '../dados/api.js';

export default function Login({ aoEntrar }) {
  const [codigo, setCodigo] = useState(api.modo === 'demo' ? 'PILOTO' : '');
  const [usuario, setUsuario] = useState('');
  const [senha, setSenha] = useState('');
  const [erro, setErro] = useState('');
  const [enviando, setEnviando] = useState(false);

  async function entrar(e) {
    e.preventDefault();
    setErro('');
    setEnviando(true);
    try { aoEntrar(await api.entrar(codigo, usuario, senha)); }
    catch (err) { setErro(err.message); }
    finally { setEnviando(false); }
  }

  return (
    <div className="login">
      <h1>Tutor da Cat</h1>
      <p className="mudo">Estudar do jeito certo, um passo de cada vez.</p>
      <form className="cartao pilha" onSubmit={entrar}>
        <label>Código da escola<input value={codigo} onChange={(e) => setCodigo(e.target.value)} autoCapitalize="characters" required /></label>
        <label>Usuário<input value={usuario} onChange={(e) => setUsuario(e.target.value)} autoCapitalize="none" autoComplete="username" required /></label>
        <label>Senha<input type="password" value={senha} onChange={(e) => setSenha(e.target.value)} autoComplete="current-password" required /></label>
        {erro && <p className="aviso">{erro}</p>}
        <button className="btn" disabled={enviando}>{enviando ? 'Entrando…' : 'Entrar'}</button>
        <p className="mudo pequeno">A conta é criada pela escola. Esqueceu a senha? Fale com o seu professor.</p>
      </form>
      {api.modo === 'demo' && (
        <div className="cartao demo pequeno">
          <b>Modo demonstração</b> (os dados ficam só neste aparelho)<br />
          Escola: <code>PILOTO</code> · senha de todos: <code>1234</code><br />
          Aluna: <code>catarina</code> · Professora: <code>professora</code><br />
          Outros alunos: <code>lucas</code>, <code>marina</code>, <code>pedro</code>
        </div>
      )}
    </div>
  );
}
