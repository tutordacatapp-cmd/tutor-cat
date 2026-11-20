import sys
from playwright.sync_api import sync_playwright
url='file://'+sys.argv[1]; erros=[]
def login(pg,u):
    pg.fill('input >> nth=1',u); pg.fill('input[type=password]','1234'); pg.click('text=Entrar'); pg.wait_for_timeout(600)
    if pg.locator('.bv').count(): pg.click('.bv >> text=Pular'); pg.wait_for_timeout(200)
with sync_playwright() as p:
    b=p.chromium.launch(executable_path='/usr/bin/google-chrome')
    ctx=b.new_context(viewport={'width':390,'height':844}); ctx.grant_permissions(['clipboard-read','clipboard-write'])
    pg=ctx.new_page(); pg.on('pageerror',lambda e:erros.append(str(e)))
    pg.goto(url); pg.evaluate("localStorage.clear()"); pg.reload(); pg.wait_for_timeout(400)
    login(pg,'pedro'); print('pedro bloqueado:', pg.locator('text=Quase lá').count()); pg.screenshot(path='t1.png')
    pg.click('button.sair:has-text("Sair")'); login(pg,'coordenacao'); pg.wait_for_timeout(300)
    print('resumo:', pg.locator('text=alunos autorizados').inner_text())
    pg.screenshot(path='t2.png', full_page=True)
    pg.click('text=Copiar mensagem com os links'); pg.wait_for_timeout(200)
    txt=pg.evaluate("navigator.clipboard.readText()"); print('msg:', txt.splitlines()[-1][:90])
    link=txt.splitlines()[-1].split(': ',1)[1]
    tok=link.split('#termo=')[1]
    pg.click('button.sair:has-text("Sair")'); pg.wait_for_timeout(200)
    pg.goto(url+'#termo='+tok); pg.wait_for_timeout(500); pg.screenshot(path='t3.png', full_page=True)
    pg.fill('.campo input >> nth=0','Joana Lima'); pg.select_option('.campo select','mãe'); pg.fill('.campo input >> nth=1','11111111111')
    pg.check('form input[type=checkbox] >> nth=1'); pg.click('text=Assinar autorização'); pg.wait_for_timeout(300); print('cpf ruim:', pg.locator('.aviso').inner_text())
    pg.fill('.campo input >> nth=1','52998224725'); print('mascara:', pg.input_value('.campo input >> nth=1'))
    pg.fill('.campo input >> nth=2','joana@exemplo.com'); pg.check('form input[type=checkbox] >> nth=0')
    pg.click('text=Assinar autorização'); pg.wait_for_timeout(300); pg.screenshot(path='t4.png')
    print('registrado:', pg.locator('text=Autorização registrada').count())
    pg.goto(url+'#termo=xyz'); pg.reload(); pg.wait_for_timeout(400); print('link ruim:', pg.locator('text=Link inválido').count())
    pg.goto(url); pg.reload(); pg.wait_for_timeout(500)
    if pg.locator('button.sair:has-text("Sair")').count(): pg.click('button.sair:has-text("Sair")')
    login(pg,'pedro'); print('pedro liberado:', pg.locator('text=Quase lá').count()==0)
    pg.click('button.sair:has-text("Sair")'); login(pg,'coordenacao'); print('resumo depois:', pg.locator('text=alunos autorizados').inner_text()); print('mostra resumo:', pg.locator('text=recebe resumo').count())
    b.close()
print('ERROS:',erros)
