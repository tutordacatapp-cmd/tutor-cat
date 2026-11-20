import json,re
from fractions import Fraction as F
strip=lambda h:re.sub('<[^>]+>','',h).replace('&lt;','<').replace('&gt;','>')
P='/home/claude/app/src/dados/tutor.json'
t=json.load(open(P)); qs=json.load(open('/home/claude/app/src/dados/questoes-mt.json'))
def num(s): s=s.strip().replace('.','').replace(',','.'); return float(s)
def br(x):
    s=('%.6f'%x).rstrip('0').rstrip('.'); i,_,d=s.partition('.'); i=f"{int(i):,}".replace(',','.'); return i+(','+d if d else '')
def fr(s): a,b=s.split('/'); return F(int(a),int(b))
POLI={3:'triângulo',4:'quadrilátero',5:'pentágono',6:'hexágono',7:'heptágono',8:'octógono',9:'eneágono',10:'decágono',12:'dodecágono'}
ANG={'agudo':'Agudo mede menos de 90°.','reto':'Reto mede exatamente 90°.','obtuso':'Obtuso fica entre 90° e 180°.','raso':'Raso mede exatamente 180° (meia-volta).','nulo':'Nulo mede 0°.','completo':'Completo mede 360°.'}
def pq_div(n,k):
    d=str(n)
    if k==2: return f"{br(n)} termina em {d[-1]}, que é ímpar."
    if k==5: return f"{br(n)} termina em {d[-1]}, e não em 0 ou 5."
    if k==10: return f"{br(n)} não termina em 0."
    if k==4: return f"Os dois últimos algarismos formam {int(d[-2:])}, que não é divisível por 4."
    s=sum(map(int,d)); expr=' + '.join(d)
    if k in(3,9): return f"{expr} = {s}, que não é múltiplo de {k}."
    if k==6:
        if n%2: return f"{br(n)} é ímpar, então já não é divisível por 2 (e precisa ser por 2 e por 3)."
        return f"É par, mas {expr} = {s}, que não é múltiplo de 3."
    return f"{br(n)} ÷ {k} não dá exato."
novos={}
for q in qs:
    if q['tipo']!='mc' or q['id'] in t: continue
    e=strip(q['enunciado']); x=strip(q['explicacao']); C=strip(q['resposta']); alts={}; pontos=[]; peg=None
    wrong=[a for a in q['alternativas'] if a!=q['resposta']]
    try:
        if 'é divisível por' in e:
            k=int(re.search(r'por (\d+)',e).group(1))
            for a in wrong: alts[a]=pq_div(int(strip(a).replace('.','')),k)
            pontos=['Por 2: termina em par. Por 3: soma dos algarismos múltipla de 3. Por 5: termina em 0 ou 5. Por 6: por 2 e por 3. Por 9: soma múltipla de 9. Por 10: termina em 0.']
            peg='Para 6, não basta ser par: precisa passar também no teste do 3.'
        elif 'é primo' in e:
            for a in wrong:
                n=int(strip(a).replace('.',''))
                if n<2: alts[a]='1 não é primo: tem um divisor só.'
                else:
                    d=next(i for i in range(2,n+1) if n%i==0); alts[a]=f"{br(n)} = {d} × {br(n//d)}: tem mais divisores além de 1 e dele mesmo."
            pontos=['Primo tem exatamente dois divisores: 1 e ele mesmo.','Primos até 30: 2, 3, 5, 7, 11, 13, 17, 19, 23, 29.']
            peg='O 2 é o único primo par, e o 1 não é primo.'
        elif e.startswith('Qual fração é maior'):
            fs=[strip(a) for a in q['alternativas'] if '/' in strip(a)]
            L=1
            for f in fs: L=L*fr(f).denominator//__import__('math').gcd(L,fr(f).denominator)
            v={f:fr(f)*L for f in fs}
            for a in wrong:
                s=strip(a)
                if s=='São iguais': alts[a]='Com o mesmo denominador ('+str(L)+'), os numeradores ficam diferentes: '+' e '.join(f"{f} = {v[f]}/{L}" for f in fs)+'.'
                else: alts[a]=f"Com denominador {L}: {s} = {v[s]}/{L}, menor que {C} = {v[C]}/{L}."
            pontos=['Para comparar frações, deixe todas com o mesmo denominador e compare os numeradores.']
            peg='Denominador maior não quer dizer fração maior: 1/8 é menor que 1/2.'
        elif 'lados se chama' in e:
            for a in wrong:
                n=[k for k,vv in POLI.items() if vv==strip(a)]
                alts[a]=f"{strip(a).capitalize()} tem {n[0]} lados." if n else 'Não é o nome certo.'
            pontos=['Triângulo 3, quadrilátero 4, pentágono 5, hexágono 6, heptágono 7, octógono 8, eneágono 9, decágono 10.']
            peg='Hepta = 7 e hexa = 6 são parecidos: hexa é o \"hexacampeão\" (6).'
        elif e.startswith('Um ângulo de'):
            for a in wrong: alts[a]=ANG.get(strip(a),'Não é a classificação certa.')
            pontos=['Agudo < 90°, reto = 90°, obtuso entre 90° e 180°, raso = 180°.']
            peg='Ângulo de exatamente 90° é reto, não agudo nem obtuso.'
        elif 'forma decimal' in e:
            for a in wrong: alts[a]=f"{strip(a)} corresponde a {br(num(strip(a))*100)}%."
            pontos=['Porcentagem para decimal: divida por 100 (a vírgula anda 2 casas para a esquerda).']
            peg='3% é 0,03, não 0,3 (que é 30%).'
        elif e.startswith('O que é maior'):
            for a in wrong:
                s=strip(a)
                if s=='São iguais': alts[a]='Faça as duas contas: os resultados são diferentes.'
                else: alts[a]=f"Fazendo as contas, os dois dão o mesmo resultado: {x.split('.')[0]}." if C=='São iguais' else f"{s} é menor. {x.split('.')[0]}."
            pontos=['a% de b = b% de a: as duas contas são a × b ÷ 100.']
            peg='Trocar a porcentagem pelo número não muda o resultado: 8% de 50 = 50% de 8.'
        elif 'Qual fração é igual a' in e and '%' in e:
            for a in wrong: alts[a]=f"{strip(a)} = {br(float(fr(strip(a))*100))}%."
            pontos=['Para virar porcentagem, transforme a fração em denominador 100 (ou divida e multiplique por 100).','50% = 1/2, 25% = 1/4, 20% = 1/5, 10% = 1/10.']
            peg='1/25 não é 25%: é 4%.'
        elif 'Qual fração é igual a' in e:
            for a in wrong: alts[a]=f"{strip(a)} = {br(float(fr(strip(a))))}."
            pontos=['Para transformar fração em decimal, divida o numerador pelo denominador.','Decimal para fração: 0,25 = 25/100 = 1/4.']
            peg='0,5 é 1/2, não 1/5 (que é 0,2).'
        elif e.startswith('Como se lê'):
            for a in wrong:
                s=strip(a)
                if 'inteiros' in s and s.split(' inteiros')[0]!=C.split(' inteiros')[0]: alts[a]='Trocou a parte inteira com a parte decimal.'
                else:
                    casa=[c for c in ('décimos','centésimos','milésimos') if c in s]
                    alts[a]=f"Leria como {casa[0] if casa else 'outra casa'}, mas a última casa do número é a dos {[c for c in ('décimos','centésimos','milésimos') if c in C][0]}."
            pontos=['1 casa depois da vírgula = décimos, 2 = centésimos, 3 = milésimos.','Lê-se a parte inteira, depois o número depois da vírgula com o nome da última casa.']
            peg='7,05 é \"cinco centésimos\", não \"cinco décimos\": o zero conta como casa.'
        elif 'ordem crescente' in e:
            for a in wrong:
                ns=[n.strip() for n in strip(a).split('<')]
                for i in range(len(ns)-1):
                    if num(ns[i])>num(ns[i+1]): alts[a]=f"Coloca {ns[i]} antes de {ns[i+1]}, mas {ns[i]} é maior. Iguale as casas para comparar."; break
                else: alts[a]='A ordem não está do menor para o maior.'
            pontos=['Para comparar decimais, iguale as casas com zeros: 0,7 = 0,700 e 0,326 = 0,326.']
            peg='Mais algarismos não quer dizer número maior: 0,326 é menor que 0,38.'
        elif e.startswith('Qual número é maior'):
            for a in wrong:
                s=strip(a)
                alts[a]='Igualando as casas, os números ficam diferentes.' if s=='São iguais' else f"{s} é menor que {C}: iguale as casas para ver."
            pontos=['Iguale as casas decimais com zeros e compare como números inteiros.']
            peg='0,7 é maior que 0,16: 0,70 > 0,16.'
        elif e.startswith('Quanto é') and '×' in e:
            for a in wrong: alts[a]=f"Errou o número de casas decimais: o resultado tem tantas casas quanto a soma das casas dos fatores. A resposta é {C}."
            pontos=['Multiplique sem vírgula e depois conte as casas decimais dos dois fatores.']
            peg='Multiplicar dois números menores que 1 dá um número ainda menor.'
        else: continue
    except Exception as ex:
        print('erro',q['id'],ex); continue
    novos[q['id']]={'alternativas':alts,'pontos':pontos,'pegadinha':peg}
t.update(novos); json.dump(t,open(P,'w'),ensure_ascii=False,indent=1)
falt={}
for q in qs:
    if q['tipo']=='mc' and q['id'] not in t: falt[q['topico']]=falt.get(q['topico'],0)+1
print('novos',len(novos),'faltam',falt)
import random
for k in random.sample(list(novos),5): print(k,json.dumps(novos[k]['alternativas'],ensure_ascii=False)[:260])
