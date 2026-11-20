import json,sys,importlib.util
P='/home/claude/app/src/dados/tutor.json'; t=json.load(open(P))
m=sys.argv[1]; spec=importlib.util.spec_from_file_location('x',f'/home/claude/tut/{sys.argv[2]}.py'); x=importlib.util.module_from_spec(spec); spec.loader.exec_module(x)
qs={q['id']:q for q in json.load(open(f'/home/claude/app/src/dados/questoes-{m}.json'))}
n=0
for k,(ws,pts,peg) in x.E.items():
    q=qs[k]; er=[a for a in q['alternativas'] if a!=q['resposta']]
    assert len(er)==len(ws),(k,er,ws)
    t[k]={'alternativas':dict(zip(er,ws)),'pontos':pts,'pegadinha':peg}; n+=1
json.dump(t,open(P,'w'),ensure_ascii=False,indent=0)
falt=[k for k,q in qs.items() if q['tipo']=='mc' and k not in t]
print('ok',n,'faltando',len(falt),falt[:5])
