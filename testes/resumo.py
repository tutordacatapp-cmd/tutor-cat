import sys
from playwright.sync_api import sync_playwright
url='file://'+sys.argv[1]; out=sys.argv[2]; erros=[]
with sync_playwright() as p:
    b=p.chromium.launch(executable_path='/usr/bin/google-chrome')
    pg=b.new_page(viewport={'width':390,'height':844})
    pg.on('pageerror',lambda e:erros.append(str(e)))
    pg.goto(url); pg.evaluate("localStorage.clear()"); pg.reload(); pg.wait_for_timeout(400)
    pg.fill('input >> nth=1','marina'); pg.fill('input[type=password]','1234'); pg.click('text=Entrar'); pg.wait_for_timeout(600)
    if pg.locator('.bv').count(): pg.click('.bv >> text=Pular'); pg.wait_for_timeout(200)
    while pg.locator('.g-pop').count(): pg.locator('.g-pop .btn').last.click(force=True); pg.wait_for_timeout(300)
    pg.click('text=Resumo da semana',force=True); pg.wait_for_timeout(200)
    print(pg.inner_text('.resumo-texto')); print('href', pg.get_attribute('a.btn','href')[:60])
    pg.locator('.resumo-texto').screenshot(path=out+'/r1.png')
    pg.click('text=Sair'); pg.fill('input >> nth=1','professora'); pg.fill('input[type=password]','1234'); pg.click('text=Entrar'); pg.wait_for_timeout(600)
    if pg.locator('.bv').count(): pg.click('.bv >> text=Pular'); pg.wait_for_timeout(200)
    pg.click('tr:has-text("Pedro")'); pg.click('text=Resumo da semana'); pg.wait_for_timeout(200)
    print('---'); print(pg.inner_text('.resumo-texto'))
    b.close()
print('ERROS:',erros)
