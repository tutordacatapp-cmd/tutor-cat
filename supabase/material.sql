create table if not exists materiais (
  id uuid primary key default gen_random_uuid(),
  turma_id uuid not null references turmas(id) on delete cascade,
  autor uuid references perfis(id) on delete set null default auth.uid(),
  materia text not null check (materia in ('mt', 'pt', 'en', 'ci', 'hi', 'ge')),
  titulo text not null,
  status text not null default 'rascunho' check (status in ('rascunho', 'publicado')),
  questoes jsonb not null default '[]',
  criado_em timestamptz not null default now(),
  publicado_em timestamptz
);
create index if not exists materiais_turma on materiais (turma_id, criado_em);
alter table materiais enable row level security;
drop policy if exists "ver materiais" on materiais;
drop policy if exists "criar materiais" on materiais;
drop policy if exists "editar materiais" on materiais;
drop policy if exists "apagar materiais" on materiais;
create policy "ver materiais" on materiais for select using (
  professor_da_turma(turma_id)
  or (turma_id = minha_turma() and status = 'publicado')
  or (sou_coordenacao() and exists (select 1 from turmas t where t.id = turma_id and t.escola_id = minha_escola()))
);
create policy "criar materiais" on materiais for insert with check (professor_da_turma(turma_id) and autor = auth.uid());
create policy "editar materiais" on materiais for update using (professor_da_turma(turma_id)) with check (professor_da_turma(turma_id));
create policy "apagar materiais" on materiais for delete using (professor_da_turma(turma_id));
grant select, insert, update, delete on materiais to authenticated;
create table if not exists geracoes (
  id bigserial primary key,
  professor uuid not null,
  criado_em timestamptz not null default now(),
  tokens_in int,
  tokens_out int
);
alter table geracoes enable row level security;
