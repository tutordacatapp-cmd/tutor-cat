// Monta o resumo semanal de cada aluno cuja família pediu e-mail. Lê dados.json, escreve emails.json.
// Usa o mesmo texto do botão "Resumo da semana" do app.
import { readFileSync, writeFileSync } from 'node:fs';
import { resumoSemanal } from '../src/resumo.js';

const { alunos } = JSON.parse(readFileSync(process.argv[2] || 'dados.json', 'utf8'));
const emails = [];
for (const a of alunos || []) {
  const texto = resumoSemanal(a.nome, a.tentativas || [], a.gato || null).replace(/\*/g, '');
  emails.push({
    para: a.email,
    assunto: `Tutor da Cat — semana de ${a.nome.split(' ')[0]}`,
    texto: `Olá, ${a.responsavel.split(' ')[0]}!\n\n${texto}\n\n—\nVocê recebe este resumo porque pediu ao autorizar o app. Para parar, responda este e-mail com a palavra PARAR.`,
  });
}
writeFileSync(process.argv[3] || 'emails.json', JSON.stringify(emails));
console.log(`${emails.length} resumo(s) montado(s).`);
