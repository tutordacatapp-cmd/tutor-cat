alter table tentativas add column if not exists contexto text;
alter table tentativas add column if not exists usou_dica boolean;
alter table tentativas add column if not exists lembrou boolean;
alter table tentativas add column if not exists tentativa_memoria text;
