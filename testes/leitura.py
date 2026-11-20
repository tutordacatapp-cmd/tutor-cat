import sys
from playwright.sync_api import sync_playwright
url='file://'+sys.argv[1]; erros=[]
with sync_playwright() as p:
    b=p.chromium.launch(executable_path='/usr/bin/google-chrome')
    pg=b.new_page(viewport={'width':390,'height':844}); pg.on('pageerror',lambda e:erros.append(str(e)))
    pg.goto(url); pg.evaluate("localStorage.clear()"); pg.reload(); pg.wait_for_timeout(400)
    pg.click('button[aria-label="Ajustes de leitura"]'); pg.click('.seg button[title="Maior"]'); pg.click('.seg >> text=Dislexia'); pg.wait_for_timeout(500)
    pg.screenshot(path='l1.png')
    pg.click('.leitura-painel >> text=Fechar')
    pg.fill('input >> nth=1','catarina'); pg.fill('input[type=password]','1234'); pg.click('text=Entrar'); pg.wait_for_timeout(700)
    if pg.locator('.bv').count(): pg.click('.bv >> text=Pular')
    while pg.locator('.g-pop').count(): pg.locator('.g-pop .btn').last.click(force=True); pg.wait_for_timeout(250)
    print('fonte:', pg.evaluate("getComputedStyle(document.body).fontFamily")[:30], '| zoom:', pg.evaluate("getComputedStyle(document.querySelector('.moldura')).zoom"))
    pg.reload(); pg.wait_for_timeout(500); print('persistiu:', pg.evaluate("document.documentElement.dataset.tamanho"))
    pg.locator('.materia').nth(0).click(); pg.locator('.passo').nth(0).click(); pg.wait_for_timeout(400)
    pg.screenshot(path='l2.png')
    b.close()
print('ERROS:',erros)
