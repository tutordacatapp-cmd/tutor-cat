// Cartão para o aluno ligar os lembretes de estudo (notificação no celular quando passa 2 dias sem estudar).
import { useEffect, useState } from 'react';
import { api } from '../dados/api.js';

const suporta = () => typeof window !== 'undefined' && 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
const ehIOS = () => /iphone|ipad|ipod/i.test(navigator.userAgent);
const instalado = () => matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;
function chave(b64) {
  const p = '='.repeat((4 - (b64.length % 4)) % 4); const s = atob((b64 + p).replace(/-/g, '+').replace(/_/g, '/'));
  return Uint8Array.from(s, (c) => c.charCodeAt(0));
}

export default function Lembretes() {
  const [estado, setEstado] = useState('carregando'); // carregando | sem-suporte | ios-instalar | bloqueado | desligado | ligado
  const [msg, setMsg] = useState('');
  const [ocupado, setOcupado] = useState(false);

  useEffect(() => {
    if (api.modo === 'demo') return setEstado('demo');
    if (!suporta()) return setEstado(ehIOS() && !instalado() ? 'ios-instalar' : 'sem-suporte');
    if (Notification.permission === 'denied') return setEstado('bloqueado');
    (async () => {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      const noBanco = sub ? await api.tenhoLembrete().catch(() => false) : false;
      if (sub && !noBanco) await api.salvarInscricao(sub.toJSON()).catch(() => {});
      setEstado(sub ? 'ligado' : 'desligado');
    })().catch(() => setEstado('desligado'));
  }, []);

  async function ligar() {
    setOcupado(true); setMsg('');
    try {
      const perm = await Notification.requestPermission();
      if (perm !== 'granted') { setEstado(perm === 'denied' ? 'bloqueado' : 'desligado'); return; }
      const publica = await api.vapidPublica();
      if (!publica) throw new Error('Os lembretes ainda estão sendo preparados. Tente amanhã.');
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: chave(publica) });
      await api.salvarInscricao(sub.toJSON());
      setEstado('ligado');
    } catch (e) { setMsg(e.message || 'Não consegui ligar os lembretes.'); } finally { setOcupado(false); }
  }
  async function desligar() {
    setOcupado(true);
    try {
      const reg = await navigator.serviceWorker.ready; const sub = await reg.pushManager.getSubscription();
      if (sub) { await api.removerInscricao(sub.endpoint).catch(() => {}); await sub.unsubscribe(); }
      setEstado('desligado');
    } finally { setOcupado(false); }
  }

  if (['carregando', 'sem-suporte', 'demo'].includes(estado)) return null;
  return (
    <div className="cartao pilha lembretes">
      {estado === 'ligado' && <span className="pequeno">🔔 Lembretes ligados: se você ficar 2 dias sem estudar, seu gato te chama. <button className="link pequeno" disabled={ocupado} onClick={desligar}>Desligar</button></span>}
      {estado === 'desligado' && (
        <>
          <span className="pequeno"><b>🔔 Quer um lembrete?</b> Se você ficar 2 dias sem estudar, seu gato manda um aviso no celular (no máximo 1 a cada 2 dias, às 18h).</span>
          <button className="btn" style={{ alignSelf: 'flex-start' }} disabled={ocupado} onClick={ligar}>Ligar lembretes</button>
        </>
      )}
      {estado === 'bloqueado' && <span className="pequeno mudo">🔕 As notificações do app estão bloqueadas neste celular. Para receber lembretes, libere em Configurações → Notificações.</span>}
      {estado === 'ios-instalar' && <span className="pequeno mudo">🔔 No iPhone, os lembretes só funcionam com o app instalado: toque em Compartilhar → <b>Adicionar à Tela de Início</b> e abra por lá.</span>}
      {msg && <span className="aviso pequeno">{msg}</span>}
    </div>
  );
}
