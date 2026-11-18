create or replace function coord_excluir_pessoa(p_pessoa uuid) returns void
language plpgsql security definer set search_path = public, auth as $$
begin
  if not sou_coordenacao() then raise exception 'Só a coordenação pode excluir contas.'; end if;
  if not exists (select 1 from perfis where id = p_pessoa and escola_id = minha_escola() and papel in ('aluno', 'professor')) then
    raise exception 'Pessoa não encontrada nesta escola.';
  end if;
  delete from auth.identities where user_id = p_pessoa;
  delete from auth.users where id = p_pessoa;
end $$;
revoke execute on function coord_excluir_pessoa from public, anon;
grant execute on function coord_excluir_pessoa(uuid) to authenticated;
