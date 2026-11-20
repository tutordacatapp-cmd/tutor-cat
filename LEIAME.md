# Tutor da Cat: app (Etapa 1, a base)

Primeira versão do app para escolas: login, turmas, progresso de cada aluno e painel do professor.
Matemática, Português e Inglês do 6º ano (1.506 questões, todas com explicação).

## O que já funciona

**Aluno**
- Entra com código da escola, usuário e senha
- Escolhe a matéria e vê a trilha de tópicos, com o "próximo recomendado" destacado
- Lição de 10 questões: primeiro as que errou, depois as inéditas, por último algumas já acertadas
- Depois de um erro, precisa esperar 4 segundos lendo a explicação antes de seguir (contra chute)
- Botão "Revisar meus erros", por matéria ou geral
- Tópico vira ⭐ Dominado com 80% de acerto nas últimas questões (mínimo de 10)

**Professor**
- Alunos da turma: questões e acerto por matéria nos últimos 7 dias, em vermelho, amarelo ou verde
- Tópicos: acerto da turma em cada tópico
- Erros comuns: as questões que a turma mais erra
- Toque num aluno para ver tópico por tópico

## Como rodar

```
npm install
npm run dev          # abre no navegador do computador
npm run build:demo   # gera dist-demo/index.html (um arquivo só, para testar no celular)
npm run build        # gera dist/ para hospedar na Vercel
```

Sem configurar nada, o app roda em **modo demo**: os dados ficam só no aparelho e já existem uma turma
e alunos de exemplo (escola `PILOTO`, senha `1234`, usuários `catarina`, `professora`, `lucas`, `marina`, `pedro`).

## Ligar ao Supabase (modo real)

1. Criar o projeto em supabase.com e rodar `supabase/esquema.sql` no SQL Editor.
2. Copiar `.env.exemplo` para `.env.local` e preencher a URL e a chave anon do projeto.
3. Criar as contas como explicado no fim do `esquema.sql` (quem cria as contas é a escola, não há cadastro aberto).

As regras de acesso foram testadas num Postgres local:
- O aluno só lê e grava as próprias respostas e não consegue gravar no nome de outro aluno.
- O professor só vê as turmas dele.
- Um professor sem turma não vê nada.

## Estrutura

```
src/conteudo.js        tópicos, questões e correção das respostas
src/progresso.js       regras de lição, revisão, domínio e trilha
src/dados/api.js       escolhe entre modo demo e Supabase
src/dados/demo.js      modo demo (localStorage)
src/dados/supabase.js  modo real
src/telas/             Login, Aluno, Licao, Professor
src/dados/*.json       banco de questões (exportado do tutor original)
supabase/esquema.sql   tabelas e regras de acesso
```

## Ainda não tem (próximas etapas)

- Mascote, itens e medalhas
- Relatório semanal por e-mail para os pais
- Tela da coordenação para criar contas
- Ícone e instalação como app (PWA)
- Visual final, que vem dos desenhos da Catarina
