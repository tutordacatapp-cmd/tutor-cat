alter table autorizacoes add column if not exists quer_resumo boolean not null default false;
drop function if exists assinar_termo(text, text, text, text, text, text);
create or replace function assinar_termo(p_token text, p_responsavel text, p_parentesco text, p_cpf text, p_contato text, p_versao text, p_resumo boolean default false) returns void
language plpgsql security definer set search_path = public as $$
declare v_aluno uuid;
begin
  select aluno_id into v_aluno from convites_termo where token = p_token and length(p_token) >= 20;
  if v_aluno is null then raise exception 'Link inválido. Peça um novo link à escola.'; end if;
  if length(trim(coalesce(p_responsavel, ''))) < 5 or position(' ' in trim(p_responsavel)) = 0 then raise exception 'Escreva o nome completo do responsável.'; end if;
  if length(trim(coalesce(p_parentesco, ''))) < 2 then raise exception 'Informe o parentesco.'; end if;
  if not cpf_valido(p_cpf) then raise exception 'CPF inválido. Confira os números.'; end if;
  if p_resumo and coalesce(p_contato, '') !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' then raise exception 'Para receber o resumo, escreva um e-mail válido no contato.'; end if;
  insert into autorizacoes (aluno_id, forma, responsavel, parentesco, cpf, contato, versao_termo, aceito_em, quer_resumo)
  values (v_aluno, 'digital', left(trim(p_responsavel), 120), left(trim(p_parentesco), 40), regexp_replace(p_cpf, '\D', '', 'g'), left(trim(coalesce(p_contato, '')), 120), left(p_versao, 20), now(), coalesce(p_resumo, false))
  on conflict (aluno_id) do update set forma = 'digital', responsavel = excluded.responsavel, parentesco = excluded.parentesco,
    cpf = excluded.cpf, contato = excluded.contato, versao_termo = excluded.versao_termo, aceito_em = now(), registrado_por = null, quer_resumo = excluded.quer_resumo;
end $$;
revoke execute on function assinar_termo(text, text, text, text, text, text, boolean) from public;
grant execute on function assinar_termo(text, text, text, text, text, text, boolean) to anon, authenticated;
drop function if exists coord_termos();
create function coord_termos() returns table (aluno_id uuid, token text, forma text, responsavel text, aceito_em timestamptz, quer_resumo boolean)
language sql security definer stable set search_path = public as $$
  select p.id, c.token, a.forma, a.responsavel, a.aceito_em, coalesce(a.quer_resumo, false)
  from perfis p join convites_termo c on c.aluno_id = p.id left join autorizacoes a on a.aluno_id = p.id
  where sou_coordenacao() and p.escola_id = minha_escola() and p.papel = 'aluno';
$$;
create or replace function coord_parar_resumo(p_aluno uuid) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not sou_coordenacao() or not exists (select 1 from perfis where id = p_aluno and escola_id = minha_escola()) then raise exception 'Sem permissão.'; end if;
  update autorizacoes set quer_resumo = false where aluno_id = p_aluno;
end $$;
revoke execute on function coord_termos(), coord_parar_resumo(uuid) from public, anon;
grant execute on function coord_termos(), coord_parar_resumo(uuid) to authenticated;
