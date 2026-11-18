-- Tutor da Cat: esquema do banco (Supabase / Postgres)
-- Rodar uma vez no SQL Editor do projeto Supabase.
-- No MVP, o conteúdo (tópicos e questões) vem junto com o app.
-- O banco guarda só escolas, turmas, perfis e tentativas.

create table escolas (
  id uuid primary key default gen_random_uuid(),
  codigo text unique not null,          -- ex.: PILOTO (usado no login)
  nome text not null,
  criado_em timestamptz default now()
);

create table turmas (
  id uuid primary key default gen_random_uuid(),
  escola_id uuid not null references escolas(id) on delete cascade,
  nome text not null,                    -- ex.: 6º ano A
  ano_letivo int not null default 2027
);

-- Um perfil para cada conta do Supabase Auth.
-- Dados mínimos de propósito: nada de foto, telefone ou localização do aluno.
create table perfis (
  id uuid primary key references auth.users(id) on delete cascade,
  escola_id uuid not null references escolas(id) on delete cascade,
  nome text not null,                    -- nome ou apelido
  papel text not null check (papel in ('aluno', 'professor', 'coordenacao')),
  turma_id uuid references turmas(id) on delete set null  -- só para alunos
);

create table turma_professores (
  turma_id uuid references turmas(id) on delete cascade,
  professor_id uuid references perfis(id) on delete cascade,
  primary key (turma_id, professor_id)
);

create table tentativas (
  id uuid primary key default gen_random_uuid(),
  aluno_id uuid not null references perfis(id) on delete cascade,
  turma_id uuid references turmas(id) on delete set null,
  questao_id text not null,              -- ex.: m-num-012 (do banco de questões)
  topico_id text not null,               -- ex.: m-num
  materia text not null check (materia in ('mt', 'pt', 'en', 'ci', 'hi', 'ge')),
  correta boolean not null,
  resposta text,
  tempo_ms int,
  criado_em timestamptz not null default now()
);
create index on tentativas (aluno_id, criado_em);
create index on tentativas (turma_id, criado_em);

-- ===== Regras de acesso (RLS) =====
alter table escolas enable row level security;
alter table turmas enable row level security;
alter table perfis enable row level security;
alter table turma_professores enable row level security;
alter table tentativas enable row level security;

-- Funções auxiliares (security definer evita recursão nas regras).
create or replace function professor_da_turma(t uuid) returns boolean
language sql security definer stable set search_path = public as $$
  select exists (select 1 from turma_professores where turma_id = t and professor_id = auth.uid());
$$;
create or replace function minha_turma() returns uuid
language sql security definer stable set search_path = public as $$
  select turma_id from perfis where id = auth.uid();
$$;
create or replace function minha_escola() returns uuid
language sql security definer stable set search_path = public as $$
  select escola_id from perfis where id = auth.uid();
$$;

-- Escola: cada um vê só a sua.
create policy "ver minha escola" on escolas for select using (id = minha_escola());

-- Turmas: o aluno vê a dele; o professor vê as que leciona.
create policy "ver turma" on turmas for select
  using (id = minha_turma() or professor_da_turma(id));

-- Perfis: cada um vê o próprio; o professor vê os alunos das turmas dele.
create policy "ver perfil" on perfis for select
  using (id = auth.uid() or (turma_id is not null and professor_da_turma(turma_id)));

-- Vínculos professor-turma: o professor vê os seus.
create policy "ver vinculos" on turma_professores for select using (professor_id = auth.uid());

-- Tentativas: o aluno grava e lê só as suas; o professor lê as das turmas dele.
create policy "gravar minha tentativa" on tentativas for insert
  with check (aluno_id = auth.uid() and turma_id is not distinct from minha_turma());
create policy "ler tentativas" on tentativas for select
  using (aluno_id = auth.uid() or (turma_id is not null and professor_da_turma(turma_id)));
-- Ninguém edita ou apaga tentativas pelo app (sem policies de update/delete).

-- ===== Como criar as contas do piloto =====
-- 1. Authentication > Users > Add user, com e-mail no formato
--    <usuario>.<codigo-da-escola>@contas.tutordacat.app (ex.: catarina.piloto@contas.tutordacat.app)
--    e uma senha. "Auto confirm user" ligado.
-- 2. Depois, ligar a conta ao perfil:
--    insert into escolas (codigo, nome) values ('PILOTO', 'Escola Piloto');
--    insert into turmas (escola_id, nome) select id, '6º ano A' from escolas where codigo = 'PILOTO';
--    insert into perfis (id, escola_id, nome, papel, turma_id)
--      select u.id, e.id, 'Catarina', 'aluno', t.id
--      from auth.users u, escolas e, turmas t
--      where u.email = 'catarina.piloto@contas.tutordacat.app' and e.codigo = 'PILOTO' and t.nome = '6º ano A';
--    (professor: papel 'professor', turma_id null, e um insert em turma_professores)
