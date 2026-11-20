create or replace function prof_redefinir_senha(p_aluno uuid, p_senha text) returns void
language plpgsql security definer set search_path = public, extensions, auth as $$
declare v_turma uuid;
begin
  if length(coalesce(p_senha, '')) < 6 then raise exception 'A senha precisa ter pelo menos 6 caracteres.'; end if;
  select turma_id into v_turma from perfis where id = p_aluno and papel = 'aluno';
  if v_turma is null or not professor_da_turma(v_turma) then raise exception 'Você só pode trocar a senha de alunos das suas turmas.'; end if;
  update auth.users set encrypted_password = crypt(p_senha, gen_salt('bf')), updated_at = now() where id = p_aluno;
end $$;
revoke execute on function prof_redefinir_senha(uuid, text) from public, anon;
grant execute on function prof_redefinir_senha(uuid, text) to authenticated;
