import sys, json
from playwright.sync_api import sync_playwright
url='file://'+sys.argv[1]; erros=[]
def login(pg,u):
    pg.fill('input >> nth=1',u); pg.fill('input[type=password]','1234'); pg.click('text=Entrar'); pg.wait_for_timeout(600)
    if pg.locator('.bv').count(): pg.click('.bv >> text=Pular'); pg.wait_for_timeout(200)
def pops(pg):
    while pg.locator('.g-pop').count(): pg.locator('.g-pop .btn').last.click(force=True); pg.wait_for_timeout(250)
with sync_playwright() as p:
    b=p.chromium.launch(executable_path='/usr/bin/google-chrome')
    pg=b.new_page(viewport={'width':390,'height':844}); pg.on('pageerror',lambda e:erros.append(str(e)))
    pg.goto(url); pg.evaluate("localStorage.clear()"); pg.reload(); pg.wait_for_timeout(400)
    login(pg,'catarina'); pops(pg)
    # aluno malicioso grava resposta com código + material com HTML perigoso
    pg.evaluate("""() => { const k='tutor-app-demo-v1'; const db=JSON.parse(localStorage.getItem(k));
      const mal='<img src=x onerror="window.__pwn=1">';
      const q=db.materiais[0].questoes[0]; const tid='mat-'+db.materiais[0].id;
      db.tentativas.push({id:'h1',aluno_id:db.sessao,turma_id:db.turmas[0].id,questao_id:tid+'-'+q.id,topico_id:tid,materia:'pt',correta:false,resposta:mal,tentativa_memoria:mal,criado_em:new Date().toISOString()});
      db.materiais[0].questoes[1].enunciado='Pergunta '+mal+' <b>negrito</b>'; db.materiais[0].questoes[1].alternativas[1]=mal;
      localStorage.setItem(k,JSON.stringify(db)); }""")
    pg.reload(); pg.wait_for_timeout(500); pops(pg)
    pg.locator('.mat-aluno').first.click(); pg.wait_for_timeout(400)
    for _ in range(3):
        if pg.locator('text=Não lembro').count(): pg.click('text=Não lembro'); pg.wait_for_timeout(900)
        bt=pg.locator('.cartao > .questao .opcoes button'); bt.nth(0).click(); pg.wait_for_timeout(300)
        if pg.locator('text=🚩 Achei um erro').count() and not pg.evaluate("window.__av"):
            pg.click('text=🚩 Achei um erro'); pg.click('.chip >> nth=0'); pg.evaluate("window.__av=1"); pg.wait_for_timeout(200)
        for alvo in ['Lendo','Próxima','Ver resultado']:
            pass
        break
    print('aluno pwn:', pg.evaluate("window.__pwn||0"))
    pg.goto(url); pg.wait_for_timeout(500); pops(pg); pg.click('button.sair:has-text("Sair")'); pg.wait_for_timeout(300)
    login(pg,'professora'); pg.click('nav.abas >> text=Erros'); pg.wait_for_timeout(200); pg.click('nav.abas >> nth=1 >> text=Português'); pg.wait_for_timeout(400)
    print('avisos no painel:', pg.locator('text=Questões avisadas').count())
    pg.screenshot(path='seg1.png',full_page=True)
    pg.click('nav.abas >> text=Material'); pg.wait_for_timeout(300); pg.locator('.material-item').last.click(); pg.wait_for_timeout(300)
    if pg.locator('text=Ver onde erraram').count(): pg.click('text=Ver onde erraram'); pg.wait_for_timeout(300)
    pg.screenshot(path='seg2.png',full_page=True)
    print('professor pwn:', pg.evaluate("window.__pwn||0"), '| img injetada:', pg.locator('img[src="x"]').count())
    pg.click('button.sair:has-text("Sair")'); login(pg,'coordenacao'); pg.click('text=Painel das turmas'); pg.wait_for_timeout(300)
    pg.click('nav.abas >> nth=1 >> text=Tarefas'); pg.wait_for_timeout(300); print('coord vê tarefas:', pg.locator('.tarefa').count())
    b.close()
print('ERROS:',erros)
