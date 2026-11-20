import json,re
P='/home/claude/app/src/dados/tutor.json'; t=json.load(open(P)); qs=json.load(open('/home/claude/app/src/dados/questoes-en.json'))
PRO={'I':'I = eu, sujeito.','me':'Me = me/mim, objeto (\"help me\").','my':'My = meu/minha, vem antes de um substantivo.','mine':'Mine = o meu, fica sozinho, sem substantivo depois.',
'you':'You = você, sujeito ou objeto.','your':'Your = seu/sua, vem antes de um substantivo.','yours':'Yours = o seu, fica sozinho.','you\'re':'You\'re = you are (você é/está).',
'He':'He = ele, sujeito (menino).','His':'His = dele, antes do substantivo.','Him':'Him = ele, objeto (\"I see him\").','She':'She = ela, sujeito (menina).','Her':'Her = dela (antes do substantivo) ou ela como objeto.','Hers':'Hers = o dela, fica sozinho.',
'It':'It = ele/ela para coisa ou animal, sujeito.','it':'It = coisa ou animal, sujeito ou objeto; não indica posse.','Its':'Its = dele/dela para coisa ou animal.','it\'s':'It\'s = it is (ele é/está). Não indica posse.','his':'His = dele, para pessoa (menino).',
'We':'We = nós, sujeito.','Us':'Us = nos/nós como objeto (\"help us\").','Our':'Our = nosso/nossa, antes do substantivo.',
'They':'They = eles/elas, sujeito.','Them':'Them = eles/elas como objeto (\"I see them\").','Their':'Their = deles/delas, antes do substantivo.','them':'Them = eles como objeto, não indica posse.','they':'They = eles, sujeito; não indica posse.','there':'There = lá. Soa igual a their, mas não é pronome.'}
PREP={'at':'At: horas e momentos exatos (at 7, at noon, at night).','on':'On: dias e datas (on Monday, on May 5th, on my birthday).','in':'In: meses, anos, estações e partes do dia (in July, in 2026, in the morning).'}
novos={}
for q in qs:
    if q['tipo']!='mc' or q['id'] in t: continue
    e=q['enunciado']; C=q['resposta']; wrong=[a for a in q['alternativas'] if a!=C]; alts={}
    if q['topico']=='e-pro':
        for a in wrong: alts[a]=PRO.get(a,PRO.get(a.capitalize(),'Não combina com a frase.'))
        novos[q['id']]={'alternativas':alts,'pontos':['Sujeito: I, you, he, she, it, we, they.','Possessivo antes do substantivo: my, your, his, her, its, our, their.','Possessivo sozinho: mine, yours, his, hers, ours, theirs.'],'pegadinha':'Its (possessivo) × it\'s (it is) e their (deles) × there (lá) caem muito.'}
    elif q['topico']=='e-there':
        plural=True; neg=C=="There aren't"; perg=C=='Are there'
        D={'There are':'Afirmativa. Com \"any\" a frase é pergunta ou negativa.','There is':'Singular e afirmativo; o substantivo está no plural.','Is there':'Pergunta no singular; o substantivo está no plural.','There isn\'t':'Negativa no singular; o substantivo está no plural.','Are there':'Pergunta: a frase não termina com \"?\".' ,'There aren\'t':'Negativa: a frase é uma pergunta.'}
        for a in wrong: alts[a]=D.get(a,'Não combina.')
        novos[q['id']]={'alternativas':alts,'pontos':['There is (singular) / There are (plural).','Pergunta: inverte (Is there? / Are there?). Negativa: isn\'t / aren\'t.','Any aparece em perguntas e negativas.'],'pegadinha':'Olhe o fim da frase: com \"?\" é pergunta; sem, com any, é negativa.'}
    elif q['topico']=='e-can':
        D={'does':'Does é auxiliar do simple present; a pergunta foi feita com can.','is':'Is é verbo to be; a pergunta foi feita com can.','cans':'Can não ganha -s, nem com he/she/it.','doesn\'t':'Doesn\'t é do simple present; a pergunta usa can.','don\'t':'Don\'t é do simple present; a pergunta usa can.','am not':'Am not é do verbo to be; a pergunta usa can.','can':'Na vida real, isso não é possível: use can\'t.','can\'t':'Na vida real, isso é possível: use can.',
           'She cans draw very well.':'Can não ganha -s.','She can draws very well.':'Depois de can, o verbo fica sem -s.','She can to draw very well.':'Depois de can não vem \"to\".'}
        for a in wrong: alts[a]=D.get(a,'Não combina.')
        novos[q['id']]={'alternativas':alts,'pontos':['Can = conseguir/poder. Igual para todas as pessoas, sem -s.','Depois de can, o verbo vem puro: can swim, can draw.','Resposta curta repete can: Yes, I can. / No, I can\'t.'],'pegadinha':'\"She can draws\" e \"she cans\" são os erros mais comuns.'}
    elif q['topico']=='e-prep':
        for a in wrong: alts[a]=PREP[a]
        novos[q['id']]={'alternativas':alts,'pontos':['AT: horas (at 3 o\'clock, at noon, at night).','ON: dias e datas (on Monday, on my birthday).','IN: meses, anos, estações, partes do dia (in May, in 2026, in the summer, in the morning).'],'pegadinha':'In the morning, mas at night: night é exceção fixa.'}
t.update(novos); json.dump(t,open(P,'w'),ensure_ascii=False,indent=1)
print('novos EN',len(novos),'restam EN',[q['id'] for q in qs if q['tipo']=='mc' and q['id'] not in t])
for k in ['e-pro-006','e-there-007','e-can-005','e-prep-006']: print(k,json.dumps(t[k]['alternativas'],ensure_ascii=False))
