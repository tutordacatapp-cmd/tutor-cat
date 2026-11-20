import sys
from playwright.sync_api import sync_playwright
url='file://'+sys.argv[1]; out=sys.argv[2]; erros=[]
def entrar(pg,u):
    pg.fill('input >> nth=1',u); pg.fill('input[type=password]','1234'); pg.click('text=Entrar'); pg.wait_for_timeout(600)
    if pg.locator('.bv').count(): pg.click('.bv >> text=Pular'); pg.wait_for_timeout(200)
def aluno_conta(pg):
    entrar(pg,'catarina')
    while pg.locator('.g-pop').count(): pg.locator('.g-pop .btn').last.click(force=True); pg.wait_for_timeout(250)
    pg.click('.materia >> nth=1',force=True); pg.click('.passo >> nth=0'); pg.wait_for_timeout(300)
    n=pg.locator('.lembrar').count(); pg.click('text=Sair'); pg.wait_for_timeout(300); return n
with sync_playwright() as p:
    b=p.chromium.launch(executable_path='/usr/bin/google-chrome')
    pg=b.new_page(viewport={'width':390,'height':844}); pg.on('pageerror',lambda e:erros.append(str(e)))
    pg.goto(url); pg.evaluate("localStorage.clear()"); pg.reload(); pg.wait_for_timeout(400)
    print('padrao (sempre):', aluno_conta(pg))
    entrar(pg,'professora'); pg.click('text=Ajustes'); pg.wait_for_timeout(200)
    pg.click('.ajuste:has-text("Nunca")'); pg.wait_for_timeout(300)
    pg.screenshot(path=out+'/aj1.png',full_page=True); print(pg.inner_text('.cartao.pilha p.pequeno:last-child'))
    pg.click('text=Sair'); pg.wait_for_timeout(300)
    print('nunca:', aluno_conta(pg))
    b.close()
print('ERROS:',erros)
