// Supabase de mentira: 2500 tentativas, rede que pode cair.
export const estado = globalThis.__estado = { online: true, linhas: Array.from({ length: 2500 }, (_, i) => ({ id: 'x' + String(i).padStart(5, '0'), aluno_id: 'a1', criado_em: '2026-01-01T00:00:' + String(i).padStart(5, '0') })), inseridas: [], consultas: 0 };
export function createClient() {
  return { from() {
    const q = { _r: null,
      select() { return q; }, eq() { return q; }, order() { return q; },
      range(a, b) { estado.consultas++; return Promise.resolve({ data: estado.linhas.slice(a, b + 1), error: null }); },
      insert(rows) { if (!estado.online) return Promise.resolve({ error: { message: 'TypeError: Failed to fetch' } }); estado.inseridas.push(...[].concat(rows)); return Promise.resolve({ error: null }); },
    }; return q; } };
}
