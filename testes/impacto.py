import sys
from playwright.sync_api import sync_playwright
url='file://'+sys.argv[1]; erros=[]
with sync_playwright() as p:
    b=p.chromium.launch(executable_path='/usr/bin/google-chrome')
    pg=b.new_page(viewport={'width':390,'height':844}); pg.on('pageerror',lambda e:erros.append(str(e)))
    pg.goto(url); pg.evaluate("localStorage.clear()"); pg.reload(); pg.wait_for_timeout(400)
    pg.fill('input >> nth=1','professora'); pg.fill('input[type=password]','1234'); pg.click('text=Entrar'); pg.wait_for_timeout(600)
    if pg.locator('.bv').count(): pg.click('.bv >> text=Pular')
    pg.click('nav.abas >> text=Impacto'); pg.wait_for_timeout(400)
    print('kpis:', pg.locator('.kpi').count(), '| grafico:', pg.locator('svg.grafico').count())
    print(pg.locator('.resumo-txt').inner_text())
    pg.screenshot(path='i1.png', full_page=True)
    b.close()
print('ERROS:',erros)
