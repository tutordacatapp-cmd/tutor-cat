// Primeiro acesso: 3 telas curtas, diferentes para aluno, professor e coordenação.
import { useState } from 'react';
import { gatoSVG } from '../mascote/arte.js';

const chave = (id) => 'tutor-bv-' + id;
export function jaViu(id) { try { return localStorage.getItem(chave(id)) === '1'; } catch { return true; } }
function marcar(id) { try { localStorage.setItem(chave(id), '1'); } catch { /* sem armazenamento: mostra de novo, sem problema */ } }

const TELAS = {
  aluno: [
    { em: 'gato', t: 'Este é o seu gato', p: ['Cada acerto vale ⭐. Com as estrelas, ele ganha roupas, cenários, medalhas e títulos.', 'Fique dias sem estudar e ele dorme 😴. Missões do dia rendem cenários novos.'] },
    { em: '🧠', t: 'Tente lembrar primeiro', p: ['Em muitas questões você escreve a resposta ANTES de ver as alternativas.', 'Acertou de memória? ⭐ dobrada. Não lembra? Toque em "Não lembro" e escolha.'] },
    { em: '🔍', t: 'Errar faz parte', p: ['Quando errar, o modo tutor explica por que a certa é certa e por que as outras não servem.', 'Depois vem uma questão parecida, para provar que entendeu. Use 🔊 para ouvir e ✏️ para rascunhar.', 'Comece pelo 📌 Para fazer ou pelo 📚 Material da aula, no topo.'] },
  ],
  professor: [
    { em: '📊', t: 'Painel da turma', p: ['Alunos: quanto cada um praticou e o acerto por matéria na semana.', 'Erros: onde a turma mais erra, a alternativa errada mais marcada e a confusão provável.'] },
    { em: '📌', t: 'Tarefas e provas', p: ['Marque tópicos e um prazo, ou a data da prova.', 'Os alunos veem no topo do app, com contagem regressiva e uma lição que puxa primeiro os erros de cada um.'] },
    { em: '📚', t: 'Material da aula', p: ['Cole o texto ou fotografe o material: a IA cria questões no estilo do tutor. Você revisa e publica.', 'Os diagnósticos de largada das 6 matérias já estão lá: peça para a turma fazer no primeiro dia.'] },
  ],
  coordenacao: [
    { em: '👥', t: 'Pessoas e turmas', p: ['Cadastre alunos e professores colando a lista de nomes. O app cria usuário e senha.', 'Use "Copiar lista" para mandar os acessos.'] },
    { em: '🔑', t: 'Senhas', p: ['Alguém esqueceu? Em Pessoas, toque em 🔑 Nova senha: digite uma ou sorteie.', 'Professores também trocam a senha dos alunos deles.'] },
    { em: '📊', t: 'Painel das turmas', p: ['Veja o mesmo painel dos professores: acerto, erros comuns, tarefas e materiais de cada turma.'] },
  ],
};

export default function Boasvindas({ perfil, aoFechar }) {
  const telas = TELAS[perfil.papel] || TELAS.aluno;
  const [i, setI] = useState(0);
  const fechar = () => { marcar(perfil.id); aoFechar(); };
  const t = telas[i];
  return (
    <div className="bv-fundo" role="dialog" aria-modal="true" aria-label="Boas-vindas">
      <div className="cartao bv">
        <div className="bv-em">{t.em === 'gato' ? <span dangerouslySetInnerHTML={{ __html: gatoSVG({ vivo: true, rotulo: 'Seu gato' }) }} /> : t.em}</div>
        <h2>{i === 0 ? `Oi, ${perfil.nome.split(' ')[0]}! ` : ''}{t.t}</h2>
        {t.p.map((x, k) => <p key={k}>{x}</p>)}
        <div className="bv-pontos">{telas.map((_, k) => <i key={k} className={k === i ? 'on' : ''} />)}</div>
        <div className="linha">
          <button className="link pequeno" onClick={fechar}>Pular</button>
          <span style={{ display: 'flex', gap: 8 }}>
            {i > 0 && <button className="btn fantasma" onClick={() => setI(i - 1)}>Voltar</button>}
            <button className="btn" onClick={() => (i + 1 < telas.length ? setI(i + 1) : fechar())}>{i + 1 < telas.length ? 'Próximo' : 'Começar'}</button>
          </span>
        </div>
      </div>
    </div>
  );
}
