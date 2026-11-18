drop table if exists tentativas, turma_professores, perfis, turmas, escolas cascade;
drop function if exists criar_conta, professor_da_turma, minha_turma, minha_escola cascade;
create table escolas (
  id uuid primary key default gen_random_uuid(),
  codigo text unique not null,
  nome text not null,
  criado_em timestamptz default now()
);
create table turmas (
  id uuid primary key default gen_random_uuid(),
  escola_id uuid not null references escolas(id) on delete cascade,
  nome text not null,
  ano_letivo int not null default 2027
);
create table perfis (
  id uuid primary key references auth.users(id) on delete cascade,
  escola_id uuid not null references escolas(id) on delete cascade,
  nome text not null,
  papel text not null check (papel in ('aluno', 'professor', 'coordenacao')),
  turma_id uuid references turmas(id) on delete set null
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
  questao_id text not null,
  topico_id text not null,
  materia text not null check (materia in ('mt', 'pt', 'en', 'ci', 'hi', 'ge')),
  correta boolean not null,
  resposta text,
  tempo_ms int,
  criado_em timestamptz not null default now()
);
create index on tentativas (aluno_id, criado_em);
create index on tentativas (turma_id, criado_em);
alter table escolas enable row level security;
alter table turmas enable row level security;
alter table perfis enable row level security;
alter table turma_professores enable row level security;
alter table tentativas enable row level security;
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
create policy "ver minha escola" on escolas for select using (id = minha_escola());
create policy "ver turma" on turmas for select
  using (id = minha_turma() or professor_da_turma(id));
create policy "ver perfil" on perfis for select
  using (id = auth.uid() or (turma_id is not null and professor_da_turma(turma_id)));
create policy "ver vinculos" on turma_professores for select using (professor_id = auth.uid());
create policy "gravar minha tentativa" on tentativas for insert
  with check (aluno_id = auth.uid() and turma_id is not distinct from minha_turma());
create policy "ler tentativas" on tentativas for select
  using (aluno_id = auth.uid() or (turma_id is not null and professor_da_turma(turma_id)));
create or replace function criar_conta(
  p_usuario text, p_codigo text, p_senha text, p_nome text, p_papel text, p_turma text default null
) returns uuid
language plpgsql security definer set search_path = public, extensions, auth as $$
declare
  v_id uuid := gen_random_uuid();
  v_email text := lower(trim(p_usuario)) || '.' || lower(trim(p_codigo)) || '@contas.tutordacat.app';
  v_escola uuid;
  v_turma uuid;
begin
  select id into v_escola from escolas where codigo = upper(trim(p_codigo));
  if v_escola is null then raise exception 'Escola % não existe', p_codigo; end if;
  if p_turma is not null then
    select id into v_turma from turmas where escola_id = v_escola and nome = p_turma;
    if v_turma is null then raise exception 'Turma % não existe', p_turma; end if;
  end if;
  insert into auth.users (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
    raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
    confirmation_token, recovery_token, email_change_token_new, email_change)
  values ('00000000-0000-0000-0000-000000000000', v_id, 'authenticated', 'authenticated', v_email,
    crypt(p_senha, gen_salt('bf')), now(),
    '{"provider":"email","providers":["email"]}', '{}', now(), now(), '', '', '', '');
  insert into auth.identities (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
  values (gen_random_uuid(), v_id, v_id::text,
    jsonb_build_object('sub', v_id::text, 'email', v_email, 'email_verified', true),
    'email', now(), now(), now());
  insert into perfis (id, escola_id, nome, papel, turma_id)
  values (v_id, v_escola, p_nome, p_papel, case when p_papel = 'aluno' then v_turma end);
  if p_papel = 'professor' and v_turma is not null then
    insert into turma_professores values (v_turma, v_id);
  end if;
  return v_id;
end $$;
revoke execute on function criar_conta from public, anon, authenticated;
insert into escolas (codigo, nome) values ('PILOTO', 'Escola Piloto');
insert into turmas (escola_id, nome) select id, '6º ano A' from escolas where codigo = 'PILOTO';
select criar_conta('catarina', 'PILOTO', 'TROQUE-A-SENHA', 'Catarina', 'aluno', '6º ano A');
select criar_conta('gustavo', 'PILOTO', 'TROQUE-A-SENHA', 'Gustavo', 'professor', '6º ano A');
grant usage on schema public to authenticated;
grant select on escolas, turmas, perfis, turma_professores to authenticated;
grant select, insert on tentativas to authenticated;
grant execute on function professor_da_turma(uuid), minha_turma(), minha_escola() to authenticated;
create table if not exists mascotes (
  aluno_id uuid primary key references perfis(id) on delete cascade,
  dados jsonb not null default '{}',
  atualizado_em timestamptz not null default now()
);
alter table mascotes enable row level security;
drop policy if exists "ver meu mascote" on mascotes;
drop policy if exists "criar meu mascote" on mascotes;
drop policy if exists "mudar meu mascote" on mascotes;
create policy "ver meu mascote" on mascotes for select using (aluno_id = auth.uid());
create policy "criar meu mascote" on mascotes for insert with check (aluno_id = auth.uid());
create policy "mudar meu mascote" on mascotes for update using (aluno_id = auth.uid()) with check (aluno_id = auth.uid());
grant select, insert, update on mascotes to authenticated;
