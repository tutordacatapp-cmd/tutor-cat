import json,re
strip=lambda h:re.sub('<[^>]+>','',h)
P='/home/claude/app/src/dados/tutor.json'
t=json.load(open(P)); qs=json.load(open('/home/claude/app/src/dados/questoes-pt.json'))
POS={'oxítona':'última','paroxítona':'penúltima','proparoxítona':'antepenúltima'}
NS={'monossílaba':1,'dissílaba':2,'trissílaba':3,'polissílaba':4}
TEMPOS=['presente','pretérito perfeito','pretérito imperfeito','futuro do presente']
REGRAS_TON=['Oxítona: sílaba forte na última (ca-FÉ). Paroxítona: na penúltima (ME-sa). Proparoxítona: na antepenúltima (LÂM-pa-da).','Toda proparoxítona leva acento.']
novos={}
for q in qs:
    if q['tipo']!='mc' or q['id'] in t or q['topico'] not in ('p-ton','p-sil','p-verb'): continue
    e=strip(q['enunciado']); x=strip(q['explicacao']); alts={}
    if e.startswith('Quanto à sílaba tônica'):
        palavra=e.split('palavra ')[1].split(' é')[0]; quebra=x.split(':')[0]
        for a in q['alternativas']:
            if a!=q['resposta']: alts[a]=f"{a.capitalize()} teria a sílaba forte na {POS[a]}. Em {palavra}, a forte é a {POS[q['resposta']]}: {quebra}."
        novos[q['id']]={'alternativas':alts,'pontos':REGRAS_TON[:1]+['Para achar a sílaba forte, fale a palavra devagar e chame alguém: a sílaba do \"grito\" é a tônica.'],'pegadinha':'O acento gráfico ajuda, mas não é obrigatório: carro e papel não têm acento e também têm sílaba tônica.'}
    elif 'separação' in e:
        for a in q['alternativas']:
            if a!=q['resposta']: alts[a]=f"Essa divisão quebra a regra. {x}"
        novos[q['id']]={'alternativas':alts,'pontos':['Separam-se: rr, ss, sc, sç, xc e vogais de hiato (pi-a-no, sa-ú-de).','Não se separam: ditongos (pai-xão), dígrafos ch, lh, nh, qu, gu (ca-rro está errado; car-ro está certo).'],'pegadinha':'Na separação silábica, rr e ss se separam, mas ch, lh e nh nunca.'}
    elif e.startswith('Quantas sílabas'):
        palavra=e.split('tem ')[1].rstrip('?'); quebra=x.split('→')[0].strip()
        n=NS[q['resposta']]
        for a in q['alternativas']:
            if a!=q['resposta']: alts[a]=f"{a.capitalize()} teria {NS[a]}{'+' if NS[a]==4 else ''} sílaba{'s' if NS[a]>1 else ''}. Separando: {quebra}."
        novos[q['id']]={'alternativas':alts,'pontos':['Monossílaba: 1 sílaba. Dissílaba: 2. Trissílaba: 3. Polissílaba: 4 ou mais.','Em cada sílaba há sempre uma vogal.'],'pegadinha':'Conte as vogais que você pronuncia separadas: ditongo (ai, ei, ou) fica numa sílaba só.'}
    elif 'conjugação?' in e:
        verbo=e.split('verbo ')[1].split(' ')[0]; term={'1ª':'-ar','2ª':'-er','3ª':'-ir'}
        for a in q['alternativas']:
            if a!=q['resposta']: k=a[:2]; alts[a]=f"A {k} conjugação reúne verbos terminados em {term[k]}. \"{verbo}\" termina em {term[q['resposta'][:2]]}."
        novos[q['id']]={'alternativas':alts,'pontos':['1ª conjugação: -ar (cantar). 2ª: -er (vender). 3ª: -ir (partir).'],'pegadinha':'\"Pôr\" e seus derivados (compor, propor) são da 2ª conjugação: vêm do antigo \"poer\".'}
    elif 'qual tempo?' in e:
        m=re.search(r'Compare: (.+?)\.?$',x); formas=[f.strip() for f in m.group(1).split('/')] if m else []
        for a in q['alternativas']:
            if a!=q['resposta']:
                i=TEMPOS.index(a) if a in TEMPOS else -1
                alts[a]=f"No {a}, a forma seria \"{formas[i]}\"." if 0<=i<len(formas) else f"Não é {a}."
        novos[q['id']]={'alternativas':alts,'pontos':['Presente: agora. Pretérito perfeito: passado concluído. Pretérito imperfeito: passado repetido ou contínuo. Futuro do presente: o que vai acontecer.','Pistas: -ava/-ia (imperfeito); -rei, -rá, -remos, -rão (futuro).'],'pegadinha':'Na 1ª pessoa do plural, presente e perfeito são iguais nos verbos regulares (nós cantamos): o contexto decide.'}
    elif 'acento' in e or 'acentuada' in e:
        for a in q['alternativas']:
            if a!=q['resposta']: alts[a]=f"\"{strip(a)}\" não segue a regra. {x}"
        novos[q['id']]={'alternativas':alts,'pontos':REGRAS_TON+['Oxítonas com acento: terminadas em a, e, o, em, ens (sofá, café, avó, também). Paroxítonas com acento: terminadas em i, is, us, l, r, x, ão, um, ps (táxi, lápis, útil).'],'pegadinha':'Oxítonas em i e u não levam acento (caju, saci), mas paroxítonas em i levam (táxi).'}
t.update(novos); json.dump(t,open(P,'w'),ensure_ascii=False,indent=1)
falt=[(q['id']) for q in qs if q['tipo']=='mc' and q['id'] not in t]
print('novos',len(novos),'total',len(t),'faltam PT',falt[:10],len(falt))
for k in list(novos)[:1]+[i for i in novos if i.startswith('p-verb')][1:2]+[i for i in novos if i.startswith('p-sil')][:1]: print(k, json.dumps(novos[k]['alternativas'],ensure_ascii=False)[:300])
