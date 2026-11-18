import { createRoot } from 'react-dom/client';
import App from './App.jsx';
import './estilo.css';

createRoot(document.getElementById('root')).render(<App />);

// Registra o service worker (só no app hospedado, não no demo dentro do Claude).
if ('serviceWorker' in navigator && import.meta.env.MODE !== 'demo') {
  navigator.serviceWorker.register('./sw.js').catch(() => {});
}
