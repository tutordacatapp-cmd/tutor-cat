import { useEffect, useState } from 'react';
import { api } from './dados/api.js';
import Login from './telas/Login.jsx';
import Aluno from './telas/Aluno.jsx';
import Professor from './telas/Professor.jsx';
import Coordenacao from './telas/Coordenacao.jsx';
import { MinhaSenha } from './telas/Senha.jsx';
import Boasvindas, { jaViu } from './telas/Boasvindas.jsx';
import Termo from './telas/Termo.jsx';
import { BotaoLeitura } from './leitura.jsx';

export default function App() {
  const [perfil, setPerfil] = useState(undefined); // undefined = carregando
  const [senhaAberta, setSenhaAberta] = useState(false);
  const [bv, setBv] = useState(null); // null = decidir pelo histórico

  const [, setHash] = useState(location.hash);
  useEffect(() => { const f = () => setHash(location.hash); addEventListener('hashchange', f); return () => removeEventListener('hashchange', f); }, []);
  useEffect(() => {
    api.sessaoAtual().then(setPerfil).catch(() => setPerfil(null));
  }, []);

  async function sair() {
    await api.sair();
    setPerfil(null);
  }

  const tokenTermo = (location.hash.match(/^#termo=([A-Za-z0-9-]+)/) || [])[1];
  if (tokenTermo) return <div className="moldura"><header className="topo"><span className="marca">Tutor da Cat</span><BotaoLeitura /></header><Termo token={tokenTermo} /></div>;
  if (perfil === undefined) return <div className="moldura"><p className="mudo">Carregando…</p></div>;
  if (!perfil) return <div className="moldura"><Login aoEntrar={(p) => { setBv(null); setPerfil(p); }} /></div>;

  return (
    <div className="moldura">
      <header className="topo">
        <span className="marca">Tutor da Cat</span>
        <span className="quem">
          {perfil.papel === 'coordenacao' ? perfil.escola?.nome || 'Coordenação' : perfil.nome} · {{ professor: 'Professor(a)', coordenacao: 'Coordenação', aluno: 'Aluno(a)' }[perfil.papel]}
          <BotaoLeitura />
          <button className="sair" onClick={() => setSenhaAberta(!senhaAberta)} title="Trocar minha senha">🔑</button>
          <button className="sair" onClick={sair}>Sair</button>
        </span>
      </header>
      {(bv ?? !jaViu(perfil.id)) && <Boasvindas perfil={perfil} aoFechar={() => setBv(false)} />}
      {senhaAberta && <MinhaSenha aoFechar={() => setSenhaAberta(false)} />}
      {perfil.papel === 'coordenacao' ? <Coordenacao perfil={perfil} /> : perfil.papel === 'professor' ? <Professor perfil={perfil} /> : <Aluno perfil={perfil} />}
      <footer className="rodape pequeno mudo"><button className="link" onClick={() => setBv(true)}>Como funciona?</button> · versão {__VERSAO__}</footer>
      {api.modo === 'demo' && (
        <footer className="rodape pequeno mudo">
          Modo demonstração ·{' '}
          <button className="link" onClick={async () => { await api.reiniciarDemo(); location.reload(); }}>recomeçar do zero</button>
        </footer>
      )}
    </div>
  );
}
