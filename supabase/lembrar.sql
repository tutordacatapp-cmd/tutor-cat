alter table turmas add column if not exists lembrar text not null default 'sempre' check (lembrar in ('sempre', 'as_vezes', 'nunca'));
create or replace function prof_modo_lembrar(p_turma uuid, p_modo text) returns void
language plpgsql security definer set search_path = public as $$
begin
  if p_modo not in ('sempre', 'as_vezes', 'nunca') then raise exception 'Modo inválido'; end if;
  if not (professor_da_turma(p_turma) or (sou_coordenacao() and exists (select 1 from turmas where id = p_turma and escola_id = minha_escola()))) then
    raise exception 'Sem permissão para esta turma';
  end if;
  update turmas set lembrar = p_modo where id = p_turma;
end;
$$;
revoke execute on function prof_modo_lembrar(uuid, text) from public, anon;
grant execute on function prof_modo_lembrar(uuid, text) to authenticated;
