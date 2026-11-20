import sys
from playwright.sync_api import sync_playwright
url='file://'+sys.argv[1]; out=sys.argv[2]; erros=[]
def entrar(pg,u):
    pg.fill('input >> nth=1',u); pg.fill('input[type=password]','1234'); pg.click('text=Entrar'); pg.wait_for_timeout(600)
    if pg.locator('.bv').count(): pg.click('.bv >> text=Pular'); pg.wait_for_timeout(200)
with sync_playwright() as p:
    b=p.chromium.launch(executable_path='/usr/bin/google-chrome')
    pg=b.new_page(viewport={'width':390,'height':844}); pg.on('pageerror',lambda e:erros.append(str(e)))
    pg.goto(url); pg.evaluate("localStorage.clear()"); pg.reload(); pg.wait_for_timeout(400)
    entrar(pg,'catarina')
    while pg.locator('.g-pop').count(): pg.locator('.g-pop .btn').last.click(force=True); pg.wait_for_timeout(250)
    pg.locator('.materias').screenshot(path=out+'/s1-materias.png')
    for nome in ['Ciências','História','Geografia']:
        pg.click(f'.materia:has-text("{nome}")'); pg.wait_for_timeout(300)
        print(nome,'topicos:',pg.locator('.passo').count())
        pg.click('.passo >> nth=0'); pg.wait_for_timeout(300)
        if pg.locator('text=Não lembro').count(): pg.click('text=Não lembro'); pg.wait_for_timeout(900)
        bt=pg.locator('.cartao > .questao .opcoes button')
        if bt.count(): bt.nth(1).click()
        else: pg.locator('.cartao input').first.fill('999'); pg.keyboard.press('Enter')
        pg.wait_for_timeout(400)
        pg.screenshot(path=out+f'/s-{nome[:2]}.png',full_page=True)
        pg.goto(url); pg.wait_for_timeout(600)
        while pg.locator('.g-pop').count(): pg.locator('.g-pop .btn').last.click(force=True); pg.wait_for_timeout(250)
    pg.click('text=Sair'); entrar(pg,'professora'); pg.wait_for_timeout(300)
    pg.screenshot(path=out+'/s-prof.png',full_page=True)
    b.close()
print('ERROS:',erros)
