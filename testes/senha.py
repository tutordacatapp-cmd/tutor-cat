import sys
from playwright.sync_api import sync_playwright
url='file://'+sys.argv[1]; out=sys.argv[2]; erros=[]
def entrar(pg,u,s='1234'):
    pg.fill('input >> nth=1',u); pg.fill('input[type=password]',s); pg.click('text=Entrar'); pg.wait_for_timeout(600)
    if pg.locator('.bv').count(): pg.click('.bv >> text=Pular'); pg.wait_for_timeout(200)
def sair(pg): pg.click('button.sair:has-text("Sair")'); pg.wait_for_timeout(300)
with sync_playwright() as p:
    b=p.chromium.launch(executable_path='/usr/bin/google-chrome')
    pg=b.new_page(viewport={'width':390,'height':844}); pg.on('pageerror',lambda e:erros.append(str(e)))
    pg.goto(url); pg.evaluate("localStorage.clear()"); pg.reload(); pg.wait_for_timeout(400)
    # coord define senha escolhida para lucas
    entrar(pg,'coordenacao'); pg.wait_for_timeout(300)
    pg.locator('tr:has-text("Lucas") >> text=🔑 Nova senha').click(); pg.wait_for_timeout(200)
    pg.fill('input[aria-label="Nova senha"]','lucas123'); pg.screenshot(path=out+'/p1.png',full_page=True)
    pg.click('text=Salvar senha'); pg.wait_for_timeout(300); print('coord tabela:', pg.locator('.acessos').inner_text()[:120].replace('\n',' | '))
    sair(pg); entrar(pg,'lucas','lucas123'); print('lucas entrou:', pg.locator('text=Oi, Lucas').count())
    # aluno troca a propria
    while pg.locator('.g-pop').count(): pg.locator('.g-pop .btn').last.click(force=True); pg.wait_for_timeout(250)
    pg.click('button.sair[title="Trocar minha senha"]'); pg.fill('input[type=password] >> nth=0','novasenha'); pg.fill('input[type=password] >> nth=1','novasenha'); pg.click('form >> text=Salvar'); pg.wait_for_timeout(300)
    print('propria:', pg.locator('text=Pronto!').count()); sair(pg); entrar(pg,'lucas','novasenha'); print('lucas nova:', pg.locator('text=Oi, Lucas').count()); sair(pg)
    # professor troca senha da marina
    entrar(pg,'professora'); pg.locator('tr:has-text("Marina")').click(); pg.wait_for_timeout(300)
    pg.click('text=Esqueceu a senha?'); pg.wait_for_timeout(200); v=pg.input_value('input[aria-label="Nova senha"]'); pg.click('text=Salvar senha'); pg.wait_for_timeout(300)
    pg.screenshot(path=out+'/p2.png'); print('prof msg:', pg.locator('text=Senha nova de').count(), v)
    pg.click('text=← Turma'); sair(pg); entrar(pg,'marina',v); print('marina entrou:', pg.locator('text=Oi, Marina').count())
    b.close()
print('ERROS:',erros)
