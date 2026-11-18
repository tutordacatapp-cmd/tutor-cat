-- Tutor da Cat: criação de contas pela escola (rodar depois do esquema.sql)

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

-- Só quem administra o banco pode criar contas (o app não pode).
revoke execute on function criar_conta from public, anon, authenticated;

-- Escola e turma do piloto
insert into escolas (codigo, nome) values ('PILOTO', 'Escola Piloto');
insert into turmas (escola_id, nome) select id, '6º ano A' from escolas where codigo = 'PILOTO';
