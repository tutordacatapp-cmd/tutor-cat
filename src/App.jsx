import { useEffect, useState } from 'react';
import { api } from './dados/api.js';
import Login from './telas/Login.jsx';
import Aluno from './telas/Aluno.jsx';
import Professor from './telas/Professor.jsx';
import Coordenacao from './telas/Coordenacao.jsx';
import { MinhaSenha } from './telas/Senha.jsx';
import Boasvindas, { jaViu } from './telas/Boasvindas.jsx';

export default function App() {
  const [perfil, setPerfil] = useState(undefined); // undefined = carregando
  const [senhaAberta, setSenhaAberta] = useState(false);
  const [bv, setBv] = useState(null); // null = decidir pelo histórico

  useEffect(() => {
    api.sessaoAtual().then(setPerfil).catch(() => setPerfil(null));
  }, []);

  async function sair() {
    await api.sair();
    setPerfil(null);
  }

  if (perfil === undefined) return <div className="moldura"><p className="mudo">Carregando…</p></div>;
  if (!perfil) return <div className="moldura"><Login aoEntrar={(p) => { setBv(null); setPerfil(p); }} /></div>;

  return (
    <div className="moldura">
      <header className="topo">
        <span className="marca">Tutor da Cat</span>
        <span className="quem">
          {perfil.papel === 'coordenacao' ? perfil.escola?.nome || 'Coordenação' : perfil.nome} · {{ professor: 'Professor(a)', coordenacao: 'Coordenação', aluno: 'Aluno(a)' }[perfil.papel]}
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
