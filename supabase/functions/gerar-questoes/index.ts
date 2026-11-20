// Edge Function "gerar-questoes": o professor manda o material da aula (texto e/ou fotos)
// e o Claude devolve questões de múltipla escolha no estilo do Tutor da Cat (modo tutor Mehlman).
// A chave da Anthropic fica só no secret ANTHROPIC_API_KEY do Supabase.
import { createClient } from 'jsr:@supabase/supabase-js@2';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};
const LIMITE_DIA = 20;
// Tenta em ordem; se a conta não tiver um modelo (erro 404), passa para o próximo.
const MODELOS = ['claude-sonnet-5-5', 'claude-sonnet-4-5', 'claude-sonnet-4-5-20250929', 'claude-haiku-4-5'];
const MATERIAS: Record<string, string> = { mt: 'Matemática', pt: 'Português', en: 'Inglês', ci: 'Ciências', hi: 'História', ge: 'Geografia' };

const resposta = (status: number, corpo: unknown) =>
  new Response(JSON.stringify(corpo), { status, headers: { ...CORS, 'Content-Type': 'application/json' } });

const FERRAMENTA = {
  name: 'entregar_questoes',
  description: 'Entrega o título do material e as questões prontas para revisão do professor.',
  input_schema: {
    type: 'object',
    properties: {
      titulo: { type: 'string', description: 'Título curto do conteúdo da aula (até 50 caracteres).' },
      questoes: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            enunciado: { type: 'string', description: 'Pergunta autossuficiente. Pode usar <b>negrito</b> no termo-chave.' },
            correta: { type: 'string', description: 'Alternativa correta, curta.' },
            erradas: { type: 'array', items: { type: 'string' }, minItems: 3, maxItems: 3, description: 'Três alternativas erradas baseadas em erros comuns de alunos.' },
            explicacao: { type: 'string', description: 'Explicação curta e leve (1–2 frases) de por que a correta está certa.' },
            por_que_erradas: { type: 'array', items: { type: 'string' }, minItems: 3, maxItems: 3, description: 'Uma frase para cada errada, na mesma ordem, dizendo por que não serve.' },
            pontos: { type: 'array', items: { type: 'string' }, minItems: 1, maxItems: 3, description: 'O que cai na prova sobre este assunto.' },
            pegadinha: { type: 'string', description: 'A confusão mais comum (opcional, pode ser vazio).' },
          },
          required: ['enunciado', 'correta', 'erradas', 'explicacao', 'por_que_erradas', 'pontos'],
        },
      },
    },
    required: ['titulo', 'questoes'],
  },
};

function instrucoes(materia: string, turma: string, n: number) {
  return `Você cria questões de estudo para alunos de ${turma} (ensino fundamental II, 11 a 14 anos), matéria ${MATERIAS[materia] || materia}, a partir do material de aula enviado pelo professor.

Regras:
- Crie exatamente ${n} questões de múltipla escolha com 4 alternativas (1 correta, 3 erradas).
- Use SOMENTE o conteúdo do material. Não invente fatos que não estejam nele. Se o material for curto, varie o ângulo (definição, exemplo, aplicação, comparação), sem repetir a mesma pergunta.
- Estilo Mehlman: foque no que mais cai na prova e no que os alunos mais confundem. As alternativas erradas devem ser erros plausíveis de aluno, não absurdos.
- Cada enunciado precisa fazer sentido sozinho, sem "segundo o texto" ou "na imagem".
- Linguagem simples, direta e amigável, adequada à idade. Nada de conteúdo impróprio para crianças.
- Alternativas curtas (de preferência até 6 palavras), sem "todas as anteriores" ou "nenhuma das anteriores".
- Ordene das mais fáceis para as mais difíceis.
- Escreva em português do Brasil${materia === 'en' ? ' (as frases em inglês podem aparecer no enunciado e nas alternativas)' : ''}.
Entregue usando a ferramenta entregar_questoes.`;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });
  if (req.method !== 'POST') return resposta(405, { erro: 'Use POST.' });

  const url = Deno.env.get('SUPABASE_URL')!;
  const anon = Deno.env.get('SUPABASE_ANON_KEY')!;
  const servico = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const chaveIA = Deno.env.get('ANTHROPIC_API_KEY');
  if (!chaveIA) return resposta(500, { erro: 'Falta o secret ANTHROPIC_API_KEY no Supabase.' });

  // Quem está pedindo? (usa o login do próprio professor)
  const comoUsuario = createClient(url, anon, { global: { headers: { Authorization: req.headers.get('Authorization') ?? '' } } });
  const { data: u } = await comoUsuario.auth.getUser();
  if (!u?.user) return resposta(401, { erro: 'Entre de novo no app.' });

  let corpo: { turma_id?: string; materia?: string; texto?: string; imagens?: string[]; quantidade?: number };
  try { corpo = await req.json(); } catch { return resposta(400, { erro: 'Pedido inválido.' }); }
  const { turma_id, materia = 'pt' } = corpo;
  const texto = String(corpo.texto || '').slice(0, 20000);
  const imagens = (corpo.imagens || []).slice(0, 4);
  const n = Math.min(12, Math.max(3, Number(corpo.quantidade) || 8));
  if (!turma_id) return resposta(400, { erro: 'Escolha a turma.' });
  if (!MATERIAS[materia]) return resposta(400, { erro: 'Matéria inválida.' });
  if (texto.trim().length < 80 && !imagens.length) return resposta(400, { erro: 'Mande um texto maior ou fotos do material.' });

  const { data: podeGerir } = await comoUsuario.rpc('gere_turma', { t: turma_id });
  if (!podeGerir) return resposta(403, { erro: 'Só o professor da turma ou a coordenação pode gerar questões.' });
  const { data: turma } = await comoUsuario.from('turmas').select('nome').eq('id', turma_id).maybeSingle();

  // Limite diário por professor (protege o saldo da conta).
  const admin = createClient(url, servico);
  const desde = new Date(Date.now() - 864e5).toISOString();
  const { count } = await admin.from('geracoes').select('id', { count: 'exact', head: true }).eq('professor', u.user.id).gte('criado_em', desde);
  if ((count ?? 0) >= LIMITE_DIA) return resposta(429, { erro: `Limite de ${LIMITE_DIA} gerações por dia atingido. Tente amanhã.` });

  const conteudo: unknown[] = imagens.map((b64) => ({
    type: 'image',
    source: { type: 'base64', media_type: b64.startsWith('/9j') ? 'image/jpeg' : 'image/png', data: b64 },
  }));
  conteudo.push({ type: 'text', text: (texto ? `Material da aula:\n\n${texto}\n\n` : 'O material da aula está nas fotos acima.\n\n') + `Crie ${n} questões.` });

  let r!: Response;
  for (const modelo of MODELOS) {
    r = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'x-api-key': chaveIA.trim(), 'anthropic-version': '2023-06-01', 'content-type': 'application/json' },
      body: JSON.stringify({
        model: modelo,
        max_tokens: 8000,
        system: instrucoes(materia, turma?.nome || '6º ano', n),
        tools: [FERRAMENTA],
        tool_choice: { type: 'tool', name: 'entregar_questoes' },
        messages: [{ role: 'user', content: conteudo }],
      }),
    });
    if (r.status !== 404) break;
  }
  if (!r.ok) {
    const detalhe = await r.text();
    console.error('Anthropic', r.status, detalhe.slice(0, 500));
    const msg = r.status === 400 && /credit/i.test(detalhe) ? 'Acabaram os créditos da IA. Avise a coordenação.' : 'A IA não respondeu agora. Tente de novo em instantes.';
    let tipo = '';
    try { const j = JSON.parse(detalhe); tipo = `${j?.error?.type || ''}: ${String(j?.error?.message || '').slice(0, 160)}`; } catch { tipo = detalhe.slice(0, 160); }
    return resposta(502, { erro: msg, detalhe: `IA ${r.status} · ${tipo}` });
  }
  const dados = await r.json();
  await admin.from('geracoes').insert({ professor: u.user.id, tokens_in: dados.usage?.input_tokens, tokens_out: dados.usage?.output_tokens });

  const saida = dados.content?.find((c: { type: string }) => c.type === 'tool_use')?.input;
  if (!saida?.questoes?.length) return resposta(502, { erro: 'A IA não conseguiu montar as questões. Tente com outro trecho.' });

  // Converte para o formato do app: primeira alternativa = correta; modo tutor com o porquê de cada errada.
  const questoes = saida.questoes
    .filter((q: any) => q.enunciado && q.correta && q.erradas?.length === 3)
    .map((q: any) => ({
      tipo: 'mc',
      enunciado: q.enunciado,
      resposta: q.correta,
      alternativas: [q.correta, ...q.erradas],
      explicacao: q.explicacao,
      tutor: {
        alternativas: Object.fromEntries(q.erradas.map((e: string, i: number) => [e, q.por_que_erradas?.[i] || ''])),
        pontos: q.pontos || [],
        pegadinha: q.pegadinha || '',
      },
    }));
  return resposta(200, { titulo: String(saida.titulo || 'Material da aula').slice(0, 60), questoes });
});
