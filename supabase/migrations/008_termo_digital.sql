create table if not exists convites_termo (
  aluno_id uuid primary key references perfis(id) on delete cascade,
  token text not null unique default replace(gen_random_uuid()::text, '-', '')
);
alter table convites_termo enable row level security;
create table if not exists autorizacoes (
  aluno_id uuid primary key references perfis(id) on delete cascade,
  forma text not null check (forma in ('digital', 'papel')),
  responsavel text,
  parentesco text,
  cpf text,
  contato text,
  versao_termo text,
  aceito_em timestamptz not null default now(),
  registrado_por uuid
);
alter table autorizacoes enable row level security;
drop policy if exists "ver autorizacoes" on autorizacoes;
create policy "ver autorizacoes" on autorizacoes for select using (
  aluno_id = auth.uid()
  or exists (select 1 from perfis p where p.id = aluno_id and (professor_da_turma(p.turma_id) or (sou_coordenacao() and p.escola_id = minha_escola())))
);
grant select on autorizacoes to authenticated;

insert into convites_termo (aluno_id) select id from perfis where papel = 'aluno' on conflict do nothing;
create or replace function convite_para_aluno_novo() returns trigger language plpgsql security definer set search_path = public as $$
begin if new.papel = 'aluno' then insert into convites_termo (aluno_id) values (new.id) on conflict do nothing; end if; return new; end $$;
drop trigger if exists convite_termo on perfis;
create trigger convite_termo after insert on perfis for each row execute function convite_para_aluno_novo();

create or replace function cpf_valido(c text) returns boolean language plpgsql immutable as $$
declare d text := regexp_replace(coalesce(c, ''), '\D', '', 'g'); s int; r int; i int;
begin
  if length(d) <> 11 or d ~ '^(\d)\1{10}$' then return false; end if;
  s := 0; for i in 1..9 loop s := s + substr(d, i, 1)::int * (11 - i); end loop;
  r := (s * 10) % 11; if r = 10 then r := 0; end if; if r <> substr(d, 10, 1)::int then return false; end if;
  s := 0; for i in 1..10 loop s := s + substr(d, i, 1)::int * (12 - i); end loop;
  r := (s * 10) % 11; if r = 10 then r := 0; end if; return r = substr(d, 11, 1)::int;
end $$;

-- Página pública do termo: só mostra o primeiro nome e a escola de quem tem o link.
create or replace function termo_info(p_token text) returns json language sql security definer stable set search_path = public as $$
  select json_build_object('aluno', split_part(p.nome, ' ', 1), 'escola', e.nome, 'autorizado', exists (select 1 from autorizacoes a where a.aluno_id = p.id))
  from convites_termo c join perfis p on p.id = c.aluno_id join escolas e on e.id = p.escola_id
  where c.token = p_token and length(p_token) >= 20;
$$;
create or replace function assinar_termo(p_token text, p_responsavel text, p_parentesco text, p_cpf text, p_contato text, p_versao text) returns void
language plpgsql security definer set search_path = public as $$
declare v_aluno uuid;
begin
  select aluno_id into v_aluno from convites_termo where token = p_token and length(p_token) >= 20;
  if v_aluno is null then raise exception 'Link inválido. Peça um novo link à escola.'; end if;
  if length(trim(coalesce(p_responsavel, ''))) < 5 or position(' ' in trim(p_responsavel)) = 0 then raise exception 'Escreva o nome completo do responsável.'; end if;
  if length(trim(coalesce(p_parentesco, ''))) < 2 then raise exception 'Informe o parentesco.'; end if;
  if not cpf_valido(p_cpf) then raise exception 'CPF inválido. Confira os números.'; end if;
  insert into autorizacoes (aluno_id, forma, responsavel, parentesco, cpf, contato, versao_termo, aceito_em)
  values (v_aluno, 'digital', left(trim(p_responsavel), 120), left(trim(p_parentesco), 40), regexp_replace(p_cpf, '\D', '', 'g'), left(trim(coalesce(p_contato, '')), 120), left(p_versao, 20), now())
  on conflict (aluno_id) do update set forma = 'digital', responsavel = excluded.responsavel, parentesco = excluded.parentesco,
    cpf = excluded.cpf, contato = excluded.contato, versao_termo = excluded.versao_termo, aceito_em = now(), registrado_por = null;
end $$;
revoke execute on function termo_info(text), assinar_termo(text, text, text, text, text, text) from public;
grant execute on function termo_info(text), assinar_termo(text, text, text, text, text, text) to anon, authenticated;

-- Coordenação: links das famílias, situação de cada aluno e registro do termo em papel.
create or replace function coord_termos() returns table (aluno_id uuid, token text, forma text, responsavel text, aceito_em timestamptz)
language sql security definer stable set search_path = public as $$
  select p.id, c.token, a.forma, a.responsavel, a.aceito_em
  from perfis p join convites_termo c on c.aluno_id = p.id left join autorizacoes a on a.aluno_id = p.id
  where sou_coordenacao() and p.escola_id = minha_escola() and p.papel = 'aluno';
$$;
create or replace function coord_termo_papel(p_aluno uuid, p_recebido boolean) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not sou_coordenacao() or not exists (select 1 from perfis where id = p_aluno and escola_id = minha_escola() and papel = 'aluno') then
    raise exception 'Sem permissão.'; end if;
  if p_recebido then
    insert into autorizacoes (aluno_id, forma, aceito_em, registrado_por) values (p_aluno, 'papel', now(), auth.uid())
    on conflict (aluno_id) do nothing;
  else
    delete from autorizacoes where aluno_id = p_aluno;
  end if;
end $$;
revoke execute on function coord_termos(), coord_termo_papel(uuid, boolean) from public, anon;
grant execute on function coord_termos(), coord_termo_papel(uuid, boolean) to authenticated;

-- Contas que já existiam antes desta mudança (piloto) ficam liberadas, registradas como papel.
insert into autorizacoes (aluno_id, forma, versao_termo) select id, 'papel', 'anterior' from perfis where papel = 'aluno' on conflict do nothing;
