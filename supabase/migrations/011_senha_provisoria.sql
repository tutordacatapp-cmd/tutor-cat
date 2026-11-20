-- Senha provisória: quando a coordenação/professor cria a conta ou troca a senha de alguém,
-- a pessoa precisa escolher uma senha própria no próximo acesso.
alter table perfis add column if not exists trocar_senha boolean not null default false;
alter table perfis alter column trocar_senha set default true;   -- contas novas começam com senha provisória
update perfis set trocar_senha = false where papel = 'coordenacao';

create or replace function marcar_troca_senha() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  begin
    if new.encrypted_password is distinct from old.encrypted_password then
      -- Quem trocou foi outra pessoa (coordenação/professor, via função do app): senha provisória.
      -- Quem trocou foi a própria pessoa (pelo login, sem auth.uid de terceiro): senha definitiva.
      update perfis set trocar_senha = (auth.uid() is not null and auth.uid() <> new.id and papel <> 'coordenacao')
       where id = new.id;
    end if;
  exception when others then null;  -- nunca impedir uma troca de senha
  end;
  return new;
end $$;
revoke execute on function marcar_troca_senha() from public, anon, authenticated;

drop trigger if exists marcar_troca_senha on auth.users;
create trigger marcar_troca_senha after update of encrypted_password on auth.users
  for each row execute function marcar_troca_senha();
