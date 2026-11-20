import { Component } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.jsx';
import './estilo.css';

// Se algo quebrar, mostra uma mensagem em vez de tela branca.
class Protecao extends Component {
  state = { erro: null };
  static getDerivedStateFromError(erro) { return { erro }; }
  render() {
    if (!this.state.erro) return this.props.children;
    return (
      <div className="moldura"><div className="cartao pilha">
        <h2>Ops, algo deu errado 🙀</h2>
        <p>Seu progresso está salvo. Toque abaixo para abrir o app de novo.</p>
        <button className="btn" onClick={() => location.reload()}>Recarregar</button>
        <p className="mudo pequeno">Se continuar, avise o professor: {String(this.state.erro?.message || this.state.erro).slice(0, 120)}</p>
      </div></div>
    );
  }
}

createRoot(document.getElementById('root')).render(<Protecao><App /></Protecao>);

// Registra o service worker (só no app hospedado, não no demo dentro do Claude).
if ('serviceWorker' in navigator && import.meta.env.MODE !== 'demo') {
  navigator.serviceWorker.register('./sw.js').catch(() => {});
}
