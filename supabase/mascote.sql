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
