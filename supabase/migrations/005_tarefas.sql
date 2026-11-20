create table if not exists tarefas (
  id uuid primary key default gen_random_uuid(),
  turma_id uuid not null references turmas(id) on delete cascade,
  autor uuid references perfis(id) on delete set null default auth.uid(),
  tipo text not null default 'tarefa' check (tipo in ('tarefa', 'prova')),
  titulo text not null,
  materia text not null check (materia in ('mt', 'pt', 'en', 'ci', 'hi', 'ge')),
  topicos text[] not null default '{}',
  meta int not null default 10,
  data date not null,
  criado_em timestamptz not null default now()
);
create index if not exists tarefas_turma on tarefas (turma_id, data);
alter table tarefas enable row level security;
drop policy if exists "ver tarefas" on tarefas;
drop policy if exists "criar tarefas" on tarefas;
drop policy if exists "editar tarefas" on tarefas;
drop policy if exists "apagar tarefas" on tarefas;
create policy "ver tarefas" on tarefas for select using (
  professor_da_turma(turma_id) or turma_id = minha_turma()
  or (sou_coordenacao() and exists (select 1 from turmas t where t.id = turma_id and t.escola_id = minha_escola()))
);
create policy "criar tarefas" on tarefas for insert with check (professor_da_turma(turma_id));
create policy "editar tarefas" on tarefas for update using (professor_da_turma(turma_id)) with check (professor_da_turma(turma_id));
create policy "apagar tarefas" on tarefas for delete using (professor_da_turma(turma_id));
grant select, insert, update, delete on tarefas to authenticated;
