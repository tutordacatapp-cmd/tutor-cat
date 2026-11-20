import sys,json,re
from playwright.sync_api import sync_playwright
url='file://'+sys.argv[1]; out=sys.argv[2]; erros=[]
qs={q['id']:q for m in ['pt'] for q in json.load(open(f'/home/claude/app/src/dados/questoes-{m}.json'))}
with sync_playwright() as p:
    b=p.chromium.launch(executable_path='/usr/bin/google-chrome')
    pg=b.new_page(viewport={'width':390,'height':844})
    pg.on('pageerror',lambda e:erros.append(str(e)))
    pg.goto(url); pg.evaluate("localStorage.clear()"); pg.reload(); pg.wait_for_timeout(400)
    pg.fill('input >> nth=1','catarina'); pg.fill('input[type=password]','1234'); pg.click('text=Entrar'); pg.wait_for_timeout(600)
    if pg.locator('.bv').count(): pg.click('.bv >> text=Pular'); pg.wait_for_timeout(200)
    while pg.locator('.g-pop').count(): pg.locator('.g-pop .btn').last.click(force=True); pg.wait_for_timeout(250)
    pg.click('.materia >> nth=1',force=True); pg.click('.passo >> nth=0'); pg.wait_for_timeout(300)
    vistos=0
    for k in range(6):
        if pg.locator('.lembrar').count():
            vistos+=1
            enun=pg.inner_text('.cartao > .questao .enunciado')
            q=[x for x in qs.values() if re.sub('<[^>]+>','',x['enunciado']).strip()==enun.strip()]
            resp=re.sub('<[^>]+>','',q[0]['resposta']) if q else 'xyz'
            if vistos==1:
                pg.screenshot(path=out+'/l1.png'); pg.fill('.lembrar input', resp.upper().replace('Ã','A')); pg.click('.lembrar .btn'); pg.wait_for_timeout(300)
                pg.screenshot(path=out+'/l2-acertou.png',full_page=True); print('memoria ok:', pg.locator('.lembrou').count())
            else:
                pg.fill('.lembrar input','chute'); pg.click('.lembrar .btn'); pg.wait_for_timeout(300)
                pg.screenshot(path=out+'/l3-revelou.png'); print('revelou alternativas:', pg.locator('.opcoes button').count())
                pg.wait_for_function("()=>[...document.querySelectorAll('.cartao > .questao .opcoes button')].every(b=>!b.disabled)",timeout=8000)
                pg.locator('.cartao > .questao .opcoes button').nth(0).click(); pg.wait_for_timeout(200)
                break
        else:
            pg.click('text=✏️ Rascunho'); pg.wait_for_timeout(100)
            c=pg.locator('.rascunho canvas').bounding_box(); pg.mouse.move(c['x']+20,c['y']+30); pg.mouse.down(); pg.mouse.move(c['x']+150,c['y']+120,steps=8); pg.mouse.up()
            pg.screenshot(path=out+'/l4-rascunho.png'); break
        if pg.locator('.btn.proxima').count(): pg.locator('.btn.proxima').click(); pg.wait_for_timeout(200)
    print('lembrar vistos',vistos)
    b.close()
print('ERROS:',erros)
