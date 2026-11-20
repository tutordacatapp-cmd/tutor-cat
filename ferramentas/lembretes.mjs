// Envia lembretes de estudo (notificação no celular) para alunos que ficaram 2+ dias sem estudar.
// Roda no GitHub Actions. Usa a Management API do Supabase (TOKEN) e não imprime dados pessoais.
import * as webpush from 'web-push';

const { TOKEN, API } = process.env;
if (!TOKEN || !API) { console.log('Faltam TOKEN/API.'); process.exit(0); }
const q = (s) => `'${String(s).replace(/'/g, "''")}'`;
async function sql(query) {
  const r = await fetch(API, { method: 'POST', headers: { Authorization: `Bearer ${TOKEN}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ query }) });
  const t = await r.text();
  if (!r.ok) throw new Error(`SQL ${r.status}: ${t.slice(0, 300)}`);
  return JSON.parse(t || '[]');
}

// Chaves VAPID: criadas uma única vez e guardadas numa tabela que o app não consegue ler (só a pública sai, por função).
const tem = await sql(`select to_regclass('public.config_privada') is not null as ok`);
if (!tem[0]?.ok) { console.log('Banco ainda sem a migração 010.'); process.exit(0); }
let cfg = Object.fromEntries((await sql(`select chave, valor from config_privada where chave in ('vapid_publica','vapid_privada')`)).map((l) => [l.chave, l.valor]));
if (!cfg.vapid_publica || !cfg.vapid_privada) {
  const k = webpush.generateVAPIDKeys();
  await sql(`insert into config_privada (chave, valor) values ('vapid_publica', ${q(k.publicKey)}), ('vapid_privada', ${q(k.privateKey)}) on conflict (chave) do nothing`);
  cfg = Object.fromEntries((await sql(`select chave, valor from config_privada where chave in ('vapid_publica','vapid_privada')`)).map((l) => [l.chave, l.valor]));
  console.log('Chaves dos lembretes criadas.');
}
webpush.setVapidDetails('mailto:tutordacat.app@gmail.com', cfg.vapid_publica, cfg.vapid_privada);

const linhas = await sql(`
  select i.endpoint, i.p256dh, i.auth,
         (select m.dados->>'nome' from mascotes m where m.aluno_id = i.aluno_id) as gato,
         (select extract(epoch from now() - max(t.criado_em)) / 86400 from tentativas t where t.aluno_id = i.aluno_id) as dias
    from push_inscricoes i
   where exists (select 1 from autorizacoes a where a.aluno_id = i.aluno_id)
     and (i.ultimo_aviso is null or i.ultimo_aviso < now() - interval '47 hours')`);

const frases = [
  'Que tal 10 minutinhos hoje? Ele guardou uma missão pra você.',
  'Uma lição rapidinha e ele volta a ficar feliz.',
  'As revisões estão te esperando. Bora?',
];
let enviados = 0, removidos = 0, pulados = 0;
for (const l of linhas) {
  const dias = l.dias == null ? null : Number(l.dias);
  if (dias != null && (dias < 2 || dias > 21)) { pulados++; continue; }
  const gato = (l.gato || '').trim() || 'Seu gato';
  const corpo = dias == null ? 'Ele ainda está esperando a primeira lição com você!' : frases[Math.floor(Math.random() * frases.length)];
  try {
    await webpush.sendNotification({ endpoint: l.endpoint, keys: { p256dh: l.p256dh, auth: l.auth } },
      JSON.stringify({ titulo: `🐱 ${gato} está com saudade`, corpo }), { TTL: 6 * 3600, urgency: 'normal' });
    await sql(`update push_inscricoes set ultimo_aviso = now() where endpoint = ${q(l.endpoint)}`);
    enviados++;
  } catch (e) {
    if (e.statusCode === 404 || e.statusCode === 410) { await sql(`delete from push_inscricoes where endpoint = ${q(l.endpoint)}`); removidos++; }
    else console.log('falha num envio:', e.statusCode || e.message);
  }
}
console.log(`inscritos elegíveis: ${linhas.length} · enviados: ${enviados} · em dia/pulados: ${pulados} · inscrições vencidas removidas: ${removidos}`);
