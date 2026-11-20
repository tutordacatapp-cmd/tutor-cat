import json,re
P='/home/claude/app/src/dados/tutor.json'
t=json.load(open(P))
strip=lambda h:re.sub('<[^>]+>','',str(h))
R=[(1000,'M'),(900,'CM'),(500,'D'),(400,'CD'),(100,'C'),(90,'XC'),(50,'L'),(40,'XL'),(10,'X'),(9,'IX'),(5,'V'),(4,'IV'),(1,'I')]
def rom(n):
    s=''
    for v,c in R:
        while n>=v: s+=c; n-=v
    return s
def arab(s):
    v={'I':1,'V':5,'X':10,'L':50,'C':100,'D':500,'M':1000}; tot=0
    for i,c in enumerate(s):
        if i+1<len(s) and v[c]<v[s[i+1]]: tot-=v[c]
        else: tot+=v[c]
    return tot
sec=lambda a:(a+99)//100
novos={}
def put(q,alts,pontos,peg): novos[q['id']]={'alternativas':alts,'pontos':pontos,'pegadinha':peg}
for q in json.load(open('/home/claude/app/src/dados/questoes-hi.json')):
    if q['topico']!='h-tempo' or q['tipo']!='mc': continue
    e=strip(q['enunciado']); c=q['resposta']; erradas=[a for a in q['alternativas'] if a!=c]; alts={}
    if e.startswith('Qual data é mais antiga'):
        X=int(c.split()[0])
        for w in erradas:
            if w.startswith('As duas'): alts[w]='São anos diferentes: entre eles há '+str(X-int([a for a in erradas if a!=w][0].split()[0]))+' anos.'
            else: Y=int(w.split()[0]); alts[w]=f'{Y} a.C. está mais perto do nascimento de Cristo, então aconteceu depois de {X} a.C.'
        put(q,alts,['Antes de Cristo, a contagem é para trás: quanto MAIOR o número, MAIS antigo.','Depois de Cristo é o contrário: número maior = mais recente.'],'Na reta do tempo, 1000 a.C. fica mais longe de nós do que 100 a.C., mesmo o número sendo "maior".')
    elif e.startswith('O século') and 'vai de' in e:
        k=arab(e.split()[2]); a0=(k-1)*100+1
        for w in erradas:
            i,f=[int(x) for x in w.split(' a ')]
            if i==(k-1)*100: alts[w]=f'Começa um ano cedo demais: o ano {i} ainda é o último do século {rom(k-1)}.'
            elif i==k*100: alts[w]=f'O ano {i} é o último do século {rom(k)}; o intervalo {w} mistura o fim de um século com o seguinte.'
            elif i==k*100+1: alts[w]=f'Esse é o século {rom(k+1)}, o seguinte.'
            else: alts[w]=f'Esse intervalo não corresponde ao século {rom(k)}.'
        put(q,alts,[f'Século {rom(k)} = {k}º século: vai de {a0} a {k*100}.','Todo século começa no ano 1 e termina no ano "redondo" (00).'],'O ano 1900 ainda é século XIX; o século XX começa em 1901.')
    elif 'pertence a qual século' in e:
        ac='a.C.' in e; N=int(re.search(r'ano (\d+)',e).group(1)); k=sec(N); fim00=N%100==0
        for w in erradas:
            if ac and 'd.C.' in w: alts[w]='O número do século está certo, mas o ano é antes de Cristo: o século também é a.C.'; continue
            kw=arab(w.split()[0])
            if fim00 and kw==k+1: alts[w]=f'Erro clássico: ano terminado em 00 não ganha +1. {N}{" a.C." if ac else ""} é o último ano do século {rom(k)}.'
            elif (not fim00) and kw==N//100: alts[w]=f'Faltou somar 1 depois de cortar os dois últimos algarismos ({N//100} + 1 = {k}).'
            elif kw==k+1 or kw==k-1: alts[w]=f'Século {rom(kw)} vai de {(kw-1)*100+1} a {kw*100}{" a.C." if ac else ""}; {N} está fora desse intervalo.'
            else: alts[w]=f'Esse é o século {kw}, bem longe: o século {rom(kw)} vai de {(kw-1)*100+1} a {kw*100}{" a.C." if ac else ""}.'
        pt=['Corte os dois últimos algarismos e some 1 (1789 → 17 + 1 = século XVIII).','Terminou em 00? Não soma: 1500 → século XV.']
        if ac: pt.append('Antes de Cristo vale a mesma conta, só que o século também é a.C.')
        put(q,alts,pt,'Ano terminado em 00 é o último do século, não o primeiro do seguinte.')
def km(d):
    return f'{d//100000:,} km'.replace(',','.') if d>=100000 else f'{d//100:,} m'.replace(',','.')
for q in json.load(open('/home/claude/app/src/dados/questoes-ge.json')):
    if q['topico']!='g-esc' or q['tipo']!='mc': continue
    e=strip(q['enunciado']); c=q['resposta']; alts={}
    for w in q['alternativas']:
        if w==c: continue
        D=int(w.split(':')[1].strip().replace('.',''))
        if 'detalhes?' in e: alts[w]=f'Em {w}, 1 cm no mapa vale {km(D)} na realidade: cabe uma área enorme, com pouco detalhe.'
        else: alts[w]=f'Em {w}, 1 cm no mapa vale só {km(D)}: mostra uma área pequena, cheia de detalhes.'
    put(q,alts,['Número pequeno depois do 1 : = escala grande = área pequena com muitos detalhes (planta de bairro).','Número grande = escala pequena = área grande com poucos detalhes (mapa do Brasil).'],'"Escala grande" não é "mapa de área grande": é o contrário. Escala grande mostra pouco espaço com muito detalhe.')
t.update(novos); json.dump(t,open(P,'w'),ensure_ascii=False,indent=0)
print('novos',len(novos))
