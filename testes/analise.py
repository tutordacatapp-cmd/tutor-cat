import sys
from playwright.sync_api import sync_playwright
url='file://'+sys.argv[1]; out=sys.argv[2]; erros=[]
def entrar(pg,u):
    pg.fill('input >> nth=1',u); pg.fill('input[type=password]','1234'); pg.click('text=Entrar'); pg.wait_for_timeout(600)
    if pg.locator('.bv').count(): pg.click('.bv >> text=Pular'); pg.wait_for_timeout(200)
def pops(pg):
    while pg.locator('.g-pop').count(): pg.locator('.g-pop .btn').last.click(force=True); pg.wait_for_timeout(250)
with sync_playwright() as p:
    b=p.chromium.launch(executable_path='/usr/bin/google-chrome')
    pg=b.new_page(viewport={'width':390,'height':844}); pg.on('pageerror',lambda e:erros.append(str(e)))
    pg.goto(url); pg.evaluate("localStorage.clear()"); pg.reload(); pg.wait_for_timeout(400)
    for aluno in ['catarina','lucas']:
        entrar(pg,aluno); pops(pg)
        pg.locator('.mat-aluno:has-text("pontuação")').click(); pg.wait_for_timeout(300)
        if pg.locator('.lembrar input').count():
            pg.fill('.lembrar input','exclamação'); pg.keyboard.press('Enter'); pg.wait_for_timeout(900)
        btns=pg.locator('.cartao > .questao .opcoes button')
        alvo=[k for k in range(btns.count()) if 'exclamação' in btns.nth(k).inner_text() or 'vírgula' in btns.nth(k).inner_text() and k>0]
        btns.nth(alvo[0] if alvo else 1).click(); pg.wait_for_timeout(300)
        pg.goto(url); pg.wait_for_timeout(500); pops(pg)
        pg.click('button.sair:has-text("Sair")'); pg.wait_for_timeout(300)
    entrar(pg,'professora'); pg.click('nav.abas >> text=Erros'); pg.wait_for_timeout(200)
    pg.click('nav.abas >> nth=1 >> text=Português'); pg.wait_for_timeout(300)
    pg.screenshot(path=out+'/a1.png',full_page=True)
    pg.click('nav.abas >> text=Material'); pg.wait_for_timeout(300)
    pg.locator('.material-item:has-text("pontuação")').click(); pg.wait_for_timeout(300)
    pg.click('text=Ver onde erraram'); pg.wait_for_timeout(200)
    pg.screenshot(path=out+'/a2.png',full_page=True)
    b.close()
print('ERROS:',erros)
