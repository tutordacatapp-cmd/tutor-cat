import sys
from playwright.sync_api import sync_playwright
url='file://'+sys.argv[1]; out=sys.argv[2]; erros=[]
def entrar(pg,u,s='1234'):
    pg.fill('input >> nth=1',u); pg.fill('input[type=password]',s); pg.click('text=Entrar'); pg.wait_for_timeout(600)
    if pg.locator('.bv').count(): pg.click('.bv >> text=Pular'); pg.wait_for_timeout(200)
def sair(pg): pg.click('button.sair:has-text("Sair")'); pg.wait_for_timeout(300)
def criar(pg,s):
    pg.fill('.primeira-senha input >> nth=0',s); pg.fill('.primeira-senha input >> nth=1',s); pg.click('text=Salvar e continuar'); pg.wait_for_timeout(500)
    if pg.locator('.bv').count(): pg.click('.bv >> text=Pular'); pg.wait_for_timeout(200)
with sync_playwright() as p:
    b=p.chromium.launch(executable_path='/usr/bin/google-chrome')
    pg=b.new_page(viewport={'width':390,'height':844}); pg.on('pageerror',lambda e:erros.append(str(e)))
    pg.goto(url); pg.evaluate("localStorage.clear()"); pg.reload(); pg.wait_for_timeout(400)
    entrar(pg,'lucas'); assert not pg.locator('.primeira-senha').count(), 'conta antiga não deveria pedir'; sair(pg)
    entrar(pg,'coordenacao'); pg.locator('tr:has-text("Lucas") >> text=🔑 Nova senha').click(); pg.wait_for_timeout(200)
    pg.fill('input[aria-label="Nova senha"]','lucas123'); pg.click('text=Salvar senha'); pg.wait_for_timeout(300)
    assert 'provisória' in pg.content(); pg.screenshot(path=out+'/prov1.png', full_page=True); sair(pg)
    entrar(pg,'lucas','lucas123'); assert pg.locator('.primeira-senha').count(), 'não pediu'
    pg.screenshot(path=out+'/prov2.png')
    pg.fill('.primeira-senha input >> nth=0','abc'); pg.fill('.primeira-senha input >> nth=1','abc'); pg.click('text=Salvar e continuar'); pg.wait_for_timeout(200)
    assert pg.locator('text=pelo menos 6').count()
    pg.fill('.primeira-senha input >> nth=0','lucas123'); pg.fill('.primeira-senha input >> nth=1','lucas123'); pg.click('text=Salvar e continuar'); pg.wait_for_timeout(200)
    assert pg.locator('text=diferente').count(), 'aceitou a mesma'
    criar(pg,'minhasenha'); assert pg.locator('text=Oi, Lucas').count(), 'não entrou'
    sair(pg); entrar(pg,'lucas','minhasenha'); assert pg.locator('text=Oi, Lucas').count() and not pg.locator('.primeira-senha').count(); sair(pg)
    # professor troca a da marina -> provisória
    entrar(pg,'professora'); pg.locator('tr:has-text("Marina")').click(); pg.wait_for_timeout(300)
    pg.click('text=Esqueceu a senha?'); v=pg.input_value('input[aria-label="Nova senha"]'); pg.click('text=Salvar senha'); pg.wait_for_timeout(300)
    assert pg.locator('text=provisória').count(); pg.click('text=← Turma'); sair(pg)
    entrar(pg,'marina',v); assert pg.locator('.primeira-senha').count(); pg.click('.primeira-senha >> text=Sair'); pg.wait_for_timeout(300)
    assert pg.locator('text=Entrar').count(), 'sair não voltou ao login'
    # conta nova criada pela coordenação
    b.close()
print('ERROS:',erros); assert not erros
