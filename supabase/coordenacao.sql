alter table perfis add column if not exists usuario text;
update perfis p set usuario = split_part(u.email, '.' || lower(e.codigo) || '@', 1)
  from auth.users u, escolas e where u.id = p.id and e.id = p.escola_id and p.usuario is null;
create or replace function sou_coordenacao() returns boolean
language sql security definer stable set search_path = public as $$
  select exists (select 1 from perfis where id = auth.uid() and papel = 'coordenacao');
$$;
drop policy if exists "coord ve turmas" on turmas;
drop policy if exists "coord ve perfis" on perfis;
drop policy if exists "coord ve vinculos" on turma_professores;
drop policy if exists "coord ve tentativas" on tentativas;
create policy "coord ve turmas" on turmas for select using (sou_coordenacao() and escola_id = minha_escola());
create policy "coord ve perfis" on perfis for select using (sou_coordenacao() and escola_id = minha_escola());
create policy "coord ve vinculos" on turma_professores for select
  using (sou_coordenacao() and exists (select 1 from turmas t where t.id = turma_id and t.escola_id = minha_escola()));
create policy "coord ve tentativas" on tentativas for select
  using (sou_coordenacao() and exists (select 1 from turmas t where t.id = turma_id and t.escola_id = minha_escola()));
create or replace function coord_criar_turma(p_nome text) returns uuid
language plpgsql security definer set search_path = public as $$
declare v_id uuid;
begin
  if not sou_coordenacao() then raise exception 'Só a coordenação pode criar turmas.'; end if;
  if length(trim(p_nome)) < 2 then raise exception 'Dê um nome para a turma.'; end if;
  if exists (select 1 from turmas where escola_id = minha_escola() and nome = trim(p_nome)) then
    raise exception 'Já existe uma turma com esse nome.';
  end if;
  insert into turmas (escola_id, nome) values (minha_escola(), trim(p_nome)) returning id into v_id;
  return v_id;
end $$;
create or replace function coord_redefinir_senha(p_pessoa uuid, p_senha text) returns void
language plpgsql security definer set search_path = public, extensions, auth as $$
begin
  if not sou_coordenacao() then raise exception 'Só a coordenação pode redefinir senhas.'; end if;
  if length(p_senha) < 6 then raise exception 'A senha precisa ter pelo menos 6 caracteres.'; end if;
  if not exists (select 1 from perfis where id = p_pessoa and escola_id = minha_escola() and papel in ('aluno', 'professor')) then
    raise exception 'Pessoa não encontrada nesta escola.';
  end if;
  update auth.users set encrypted_password = crypt(p_senha, gen_salt('bf')), updated_at = now() where id = p_pessoa;
end $$;
create or replace function coord_vincular_professor(p_professor uuid, p_turma uuid, p_ligar boolean default true) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not sou_coordenacao() then raise exception 'Só a coordenação pode vincular professores.'; end if;
  if not exists (select 1 from perfis where id = p_professor and escola_id = minha_escola() and papel = 'professor') then
    raise exception 'Professor não encontrado nesta escola.';
  end if;
  if not exists (select 1 from turmas where id = p_turma and escola_id = minha_escola()) then raise exception 'Turma não encontrada.'; end if;
  if p_ligar then
    insert into turma_professores values (p_turma, p_professor) on conflict do nothing;
  else
    delete from turma_professores where turma_id = p_turma and professor_id = p_professor;
  end if;
end $$;
create or replace function coord_mudar_turma(p_aluno uuid, p_turma uuid) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not sou_coordenacao() then raise exception 'Só a coordenação pode mudar alunos de turma.'; end if;
  if not exists (select 1 from turmas where id = p_turma and escola_id = minha_escola()) then raise exception 'Turma não encontrada.'; end if;
  update perfis set turma_id = p_turma where id = p_aluno and escola_id = minha_escola() and papel = 'aluno';
  if not found then raise exception 'Aluno não encontrado nesta escola.'; end if;
end $$;
create or replace function coord_criar_conta(p_usuario text, p_senha text, p_nome text, p_papel text, p_turma uuid default null)
returns uuid language plpgsql security definer set search_path = public, extensions, auth as $$
declare v_codigo text; v_turma_nome text; v_id uuid; v_usuario text := lower(trim(p_usuario));
begin
  if not sou_coordenacao() then raise exception 'Só a coordenação pode criar contas.'; end if;
  if p_papel not in ('aluno', 'professor') then raise exception 'Tipo de conta inválido.'; end if;
  if v_usuario !~ '^[a-z0-9._-]{3,30}$' then raise exception 'Usuário inválido: use de 3 a 30 letras sem acento, números, ponto ou hífen.'; end if;
  if length(p_senha) < 6 then raise exception 'A senha precisa ter pelo menos 6 caracteres.'; end if;
  if length(trim(p_nome)) < 2 then raise exception 'Informe o nome.'; end if;
  select codigo into v_codigo from escolas where id = minha_escola();
  if p_turma is not null then
    select nome into v_turma_nome from turmas where id = p_turma and escola_id = minha_escola();
    if v_turma_nome is null then raise exception 'Turma não encontrada.'; end if;
  end if;
  if p_papel = 'aluno' and v_turma_nome is null then raise exception 'Escolha a turma do aluno.'; end if;
  if exists (select 1 from auth.users where email = v_usuario || '.' || lower(v_codigo) || '@contas.tutordacat.app') then
    raise exception 'O usuário % já existe.', v_usuario;
  end if;
  v_id := criar_conta(v_usuario, v_codigo, p_senha, trim(p_nome), p_papel, v_turma_nome);
  update perfis set usuario = v_usuario where id = v_id;
  return v_id;
end $$;
revoke execute on function coord_criar_turma, coord_criar_conta, coord_redefinir_senha, coord_vincular_professor, coord_mudar_turma from public, anon;
grant execute on function sou_coordenacao(), coord_criar_turma(text), coord_criar_conta(text, text, text, text, uuid),
  coord_redefinir_senha(uuid, text), coord_vincular_professor(uuid, uuid, boolean), coord_mudar_turma(uuid, uuid) to authenticated;
