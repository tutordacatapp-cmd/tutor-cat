# Backup do banco

Toda semana (domingo de madrugada) o robô "Backup semanal do banco" exporta todas as tabelas
e as contas, **criptografa** com a senha guardada no segredo `BACKUP_SENHA` e guarda por 90 dias
em Actions → Backup semanal do banco → (execução) → Artifacts.

Sem a senha o arquivo é ilegível. **Guarde a senha fora do GitHub** (gerenciador de senhas, papel).
Se perder a senha, os backups antigos não podem ser abertos.

Rodar na hora: Actions → Backup semanal do banco → Run workflow.

## Abrir um backup (computador com terminal)

    unzip tutor-cat-backup-AAAA-MM-DD.zip
    openssl enc -d -aes-256-cbc -pbkdf2 -iter 300000 -in tutor-cat-backup-AAAA-MM-DD.tgz.enc | tar xzf -

Sai uma pasta com um arquivo JSON por tabela (tentativas.json, perfis.json, auth_users.json…).
Para restaurar no Supabase, peça ajuda: a ordem é escolas → turmas → auth_users/identities → perfis →
turma_professores → demais tabelas.
