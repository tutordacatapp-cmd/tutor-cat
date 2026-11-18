import { useState } from 'react';

// Mostra o resumo e oferece WhatsApp e Copiar.
export default function Resumo({ texto, titulo = '📨 Resumo da semana para a família' }) {
  const [aberto, setAberto] = useState(false);
  const [aviso, setAviso] = useState('');
  async function copiar() {
    try { await navigator.clipboard.writeText(texto); setAviso('Copiado! É só colar no WhatsApp ou no e-mail.'); }
    catch { setAviso('Não consegui copiar. Segure o dedo no texto para selecionar.'); }
  }
  if (!aberto) return <button className="cartao chamada" onClick={() => setAberto(true)}><b>{titulo}</b><span className="mudo">Gera um texto pronto para mandar pelo WhatsApp</span></button>;
  return (
    <div className="cartao pilha">
      <div className="linha"><h3>{titulo}</h3><button className="link" onClick={() => setAberto(false)}>Fechar</button></div>
      <pre className="resumo-texto">{texto}</pre>
      <div className="linha" style={{ justifyContent: 'flex-start' }}>
        <a className="btn" href={'https://wa.me/?text=' + encodeURIComponent(texto)} target="_blank" rel="noopener noreferrer">Enviar pelo WhatsApp</a>
        <button className="btn fantasma" onClick={copiar}>Copiar</button>
      </div>
      {aviso && <p className="mudo pequeno">{aviso}</p>}
    </div>
  );
}
