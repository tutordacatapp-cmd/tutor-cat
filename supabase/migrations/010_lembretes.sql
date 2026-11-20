create table if not exists config_privada (chave text primary key, valor text not null);
alter table config_privada enable row level security;
revoke all on config_privada from anon, authenticated;

create table if not exists push_inscricoes (
  endpoint text primary key check (length(endpoint) <= 600),
  aluno_id uuid not null references perfis(id) on delete cascade,
  p256dh text not null check (length(p256dh) <= 200),
  auth text not null check (length(auth) <= 100),
  criado_em timestamptz not null default now(),
  ultimo_aviso timestamptz
);
create index if not exists push_aluno on push_inscricoes (aluno_id);
alter table push_inscricoes enable row level security;
revoke all on push_inscricoes from anon, authenticated;

create or replace function vapid_publica() returns text language sql security definer stable set search_path = public as $$
  select valor from config_privada where chave = 'vapid_publica';
$$;
create or replace function salvar_inscricao(p_endpoint text, p_p256dh text, p_auth text) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not exists (select 1 from perfis where id = auth.uid() and papel = 'aluno') then raise exception 'Só alunos recebem lembretes.'; end if;
  if p_endpoint !~ '^https://' then raise exception 'Inscrição inválida.'; end if;
  insert into push_inscricoes (endpoint, aluno_id, p256dh, auth) values (p_endpoint, auth.uid(), p_p256dh, p_auth)
  on conflict (endpoint) do update set aluno_id = auth.uid(), p256dh = excluded.p256dh, auth = excluded.auth;
end $$;
create or replace function remover_inscricao(p_endpoint text) returns void
language sql security definer set search_path = public as $$
  delete from push_inscricoes where endpoint = p_endpoint and aluno_id = auth.uid();
$$;
create or replace function tenho_lembrete() returns boolean language sql security definer stable set search_path = public as $$
  select exists (select 1 from push_inscricoes where aluno_id = auth.uid());
$$;
revoke execute on function vapid_publica(), salvar_inscricao(text, text, text), remover_inscricao(text), tenho_lembrete() from public, anon;
grant execute on function vapid_publica(), salvar_inscricao(text, text, text), remover_inscricao(text), tenho_lembrete() to authenticated;
