// Página pública de autorização dos responsáveis: aberta pelo link individual que a escola envia.
import { useEffect, useState } from 'react';
import { api } from '../dados/api.js';
import { TERMO, VERSAO_TERMO } from '../termo.js';

const mascaraCpf = (v) => v.replace(/\D/g, '').slice(0, 11).replace(/(\d{3})(\d)/, '$1.$2').replace(/(\d{3})(\d)/, '$1.$2').replace(/(\d{3})(\d{1,2})$/, '$1-$2');

export default function Termo({ token }) {
  const [info, setInfo] = useState(undefined);
  const [f, setF] = useState({ responsavel: '', parentesco: '', cpf: '', contato: '', li: false, resumo: false });
  const [msg, setMsg] = useState('');
  const [feito, setFeito] = useState(null);
  const [enviando, setEnviando] = useState(false);
  useEffect(() => { api.termoInfo(token).then(setInfo).catch(() => setInfo(null)); }, [token]);

  async function assinar(e) {
    e.preventDefault(); setMsg('');
    if (!f.li) return setMsg('Marque que leu e autoriza.');
    setEnviando(true);
    try {
      await api.assinarTermo({ token, ...f, versao: VERSAO_TERMO });
      setFeito(new Date());
    } catch (er) { setMsg(er.message); } finally { setEnviando(false); }
  }

  if (info === undefined) return <p className="mudo">Carregando…</p>;
  if (!info) return <div className="cartao pilha"><h2>Link inválido</h2><p>Este link de autorização não existe ou foi digitado incompleto. Peça um novo à escola.</p></div>;
  if (feito) return (
    <div className="cartao pilha">
      <h2>✅ Autorização registrada</h2>
      <p><b>{f.responsavel}</b> ({f.parentesco}) autorizou <b>{info.aluno}</b> a participar do piloto do Tutor da Cat em {feito.toLocaleDateString('pt-BR')} às {feito.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}.</p>
      {f.resumo && <p className="pequeno">📨 O resumo semanal vai para {f.contato}, aos domingos.</p>}
      <p className="mudo pequeno">CPF ***.{f.cpf.replace(/\D/g, '').slice(3, 6)}.***-** · versão do termo {VERSAO_TERMO}. Se quiser, tire um print desta tela como comprovante. Já pode fechar a página.</p>
    </div>
  );

  return (
    <div className="pilha">
      <div className="cartao pilha">
        <h2>Autorização dos responsáveis</h2>
        <p style={{ margin: 0 }}>Para <b>{info.aluno}</b> usar o app de estudos <b>Tutor da Cat</b> no piloto da <b>{info.escola}</b>.</p>
        {info.autorizado && <p className="pequeno" style={{ margin: 0 }}>ℹ️ Já existe uma autorização para {info.aluno}. Assinar de novo apenas atualiza os dados.</p>}
        <p className="mudo pequeno" style={{ margin: 0 }}>Leva 2 minutos. Leia o resumo abaixo e assine no fim da página.</p>
      </div>
      <div className="cartao pilha termo-texto">
        {TERMO.map(([t, p]) => <div key={t}><b>{t}</b><p>{p}</p></div>)}
      </div>
      <form className="cartao pilha" onSubmit={assinar}>
        <h3>✍️ Assinatura</h3>
        <label className="campo">Nome completo do responsável<input value={f.responsavel} onChange={(e) => setF({ ...f, responsavel: e.target.value })} autoComplete="name" required /></label>
        <label className="campo">Parentesco
          <select value={f.parentesco} onChange={(e) => setF({ ...f, parentesco: e.target.value })} required>
            <option value="">Escolha…</option>
            {['mãe', 'pai', 'avó', 'avô', 'outro responsável legal'].map((x) => <option key={x}>{x}</option>)}
          </select>
        </label>
        <label className="campo">CPF do responsável<input value={f.cpf} onChange={(e) => setF({ ...f, cpf: mascaraCpf(e.target.value) })} inputMode="numeric" placeholder="000.000.000-00" required /></label>
        <label className="campo">Telefone ou e-mail para contato (opcional)<input value={f.contato} onChange={(e) => setF({ ...f, contato: e.target.value })} /></label>
        <label className="check" style={{ alignItems: 'flex-start' }}>
          <input type="checkbox" checked={f.resumo} onChange={(e) => setF({ ...f, resumo: e.target.checked })} />
          <span>📨 Quero receber por e-mail um resumo semanal do estudo de {info.aluno} (opcional; escreva o e-mail acima).</span>
        </label>
        <label className="check" style={{ alignItems: 'flex-start' }}>
          <input type="checkbox" checked={f.li} onChange={(e) => setF({ ...f, li: e.target.checked })} />
          <span>Sou responsável legal por {info.aluno}, li o termo acima e <b>autorizo</b> a participação no piloto e o uso dos dados descritos, para os fins descritos.</span>
        </label>
        {msg && <p className="aviso" style={{ margin: 0 }}>{msg}</p>}
        <button className="btn" disabled={enviando}>{enviando ? 'Registrando…' : '✍️ Assinar autorização'}</button>
        <span className="mudo mini">O CPF serve só para identificar quem assinou e fica visível apenas para a coordenação da escola.</span>
      </form>
    </div>
  );
}

export function linkTermo(token) {
  return `${location.origin}${location.pathname}#termo=${token}`;
}
