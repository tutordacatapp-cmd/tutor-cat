create or replace function usar_geracao(p_limite int default 20) returns int
language plpgsql security definer set search_path = public as $$
declare n int;
begin
  if auth.uid() is null then raise exception 'Entre de novo no app.'; end if;
  perform pg_advisory_xact_lock(hashtext(auth.uid()::text));
  select count(*) into n from geracoes where professor = auth.uid() and criado_em > now() - interval '24 hours';
  if n >= p_limite then return -1; end if;
  insert into geracoes (professor) values (auth.uid());
  return n + 1;
end $$;
revoke execute on function usar_geracao(int) from public, anon;
grant execute on function usar_geracao(int) to authenticated;
