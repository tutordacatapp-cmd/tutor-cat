import { build } from '/home/claude/app/node_modules/esbuild/lib/main.js';
await build({ entryPoints: ['/home/claude/app/src/dados/supabase.js'], bundle: true, format: 'esm', outfile: '/tmp/sb.mjs', logLevel: 'error',
  define: { 'import.meta.env.VITE_SUPABASE_URL': '"http://x"', 'import.meta.env.VITE_SUPABASE_ANON_KEY': '"k"' },
  alias: { '@supabase/supabase-js': '/home/claude/teste/unit/mock.js' } });
const mem = {}; globalThis.localStorage = { getItem: (k) => mem[k] ?? null, setItem: (k, v) => { mem[k] = v; } };
const { supabase: api } = await import('/tmp/sb.mjs');
const estado = globalThis.__estado;
const ok = (c, m) => { console.log((c ? 'ok  ' : 'FALHOU ') + m); if (!c) process.exitCode = 1; };
let ts = await api.minhasTentativas('a1');
ok(ts.length === 2500, 'paginação traz as 2500 linhas (' + ts.length + ')');
estado.online = false;
let erro = null; try { await api.registrarTentativa({ aluno_id: 'a1', questao_id: 'q1', correta: true }); } catch (e) { erro = e.message; }
ok(erro === 'offline', 'sem rede: avisa offline');
try { await api.registrarTentativa({ aluno_id: 'a1', questao_id: 'q2', correta: false }); } catch {}
ok(JSON.parse(mem['tutor-fila-a1']).length === 2, 'sem rede: 2 respostas na fila');
ts = await api.minhasTentativas('a1'); ok(ts.length === 2502, 'offline: fila aparece no progresso');
estado.online = true;
await api.registrarTentativa({ aluno_id: 'a1', questao_id: 'q3', correta: true });
ok(estado.inseridas.length === 3 && JSON.parse(mem['tutor-fila-a1']).length === 0, 'rede voltou: 3 enviadas, fila vazia');
await Promise.all([1, 2, 3, 4].map((i) => api.registrarTentativa({ aluno_id: 'a1', questao_id: 'p' + i, correta: true })));
ok(estado.inseridas.length === 7, 'envios simultâneos sem duplicar (' + estado.inseridas.length + ')');
