drop policy if exists "criar materiais" on materiais;
drop policy if exists "editar materiais" on materiais;
drop policy if exists "apagar materiais" on materiais;
drop policy if exists "criar tarefas" on tarefas;
drop policy if exists "editar tarefas" on tarefas;
drop policy if exists "apagar tarefas" on tarefas;
create or replace function gere_turma(t uuid) returns boolean
language sql security definer stable set search_path = public as $$
  select professor_da_turma(t) or (sou_coordenacao() and exists (select 1 from turmas x where x.id = t and x.escola_id = minha_escola()));
$$;
revoke execute on function gere_turma(uuid) from public, anon;
grant execute on function gere_turma(uuid) to authenticated;
create policy "criar materiais" on materiais for insert with check (gere_turma(turma_id) and autor = auth.uid());
create policy "editar materiais" on materiais for update using (gere_turma(turma_id)) with check (gere_turma(turma_id));
create policy "apagar materiais" on materiais for delete using (gere_turma(turma_id));
create policy "criar tarefas" on tarefas for insert with check (gere_turma(turma_id));
create policy "editar tarefas" on tarefas for update using (gere_turma(turma_id)) with check (gere_turma(turma_id));
create policy "apagar tarefas" on tarefas for delete using (gere_turma(turma_id));

alter table tentativas drop constraint if exists tentativas_tamanho;
alter table tentativas add constraint tentativas_tamanho check (length(coalesce(resposta, '')) <= 300 and length(coalesce(tentativa_memoria, '')) <= 120 and length(questao_id) <= 120 and length(topico_id) <= 80) not valid;

create table if not exists avisos (
  id bigserial primary key,
  aluno_id uuid not null references perfis(id) on delete cascade default auth.uid(),
  turma_id uuid references turmas(id) on delete cascade,
  questao_id text not null check (length(questao_id) <= 120),
  motivo text not null check (length(motivo) <= 200),
  criado_em timestamptz not null default now()
);
alter table avisos enable row level security;
drop policy if exists "criar aviso" on avisos;
drop policy if exists "ver avisos" on avisos;
drop policy if exists "apagar avisos" on avisos;
create policy "criar aviso" on avisos for insert with check (aluno_id = auth.uid() and turma_id is not distinct from minha_turma());
create policy "ver avisos" on avisos for select using (turma_id is not null and gere_turma(turma_id));
create policy "apagar avisos" on avisos for delete using (turma_id is not null and gere_turma(turma_id));
grant select, insert, delete on avisos to authenticated;
grant usage on sequence avisos_id_seq to authenticated;

create or replace function copiar_diagnosticos(p_turma uuid) returns void
language sql security definer set search_path = public as $$
  insert into materiais (turma_id, autor, materia, titulo, status, questoes, publicado_em)
  select p_turma, null, m.materia, m.titulo, 'publicado', m.questoes, now()
  from materiais m join turmas t on t.id = m.turma_id join escolas e on e.id = t.escola_id
  where e.codigo = 'PILOTO' and t.nome = '6º ano A' and m.titulo like 'Diagnóstico de largada:%' and m.turma_id <> p_turma
    and not exists (select 1 from materiais x where x.turma_id = p_turma and x.titulo = m.titulo);
$$;
revoke execute on function copiar_diagnosticos(uuid) from public, anon, authenticated;
create or replace function turma_nova_diagnosticos() returns trigger
language plpgsql security definer set search_path = public as $$
begin perform copiar_diagnosticos(new.id); return new; end $$;
drop trigger if exists turma_nova on turmas;
create trigger turma_nova after insert on turmas for each row execute function turma_nova_diagnosticos();
select copiar_diagnosticos(t.id) from turmas t;
