# Envia emails.json pelo Gmail do projeto (senha de app). Não imprime endereços nem conteúdo no log.
import json, os, smtplib, ssl, sys, time
from email.message import EmailMessage
usuario, senha = os.environ.get('GMAIL_USUARIO', ''), os.environ.get('GMAIL_SENHA_APP', '').replace(' ', '')
emails = json.load(open(sys.argv[1] if len(sys.argv) > 1 else 'emails.json'))
if not usuario or not senha:
    print('Faltam os segredos GMAIL_USUARIO e GMAIL_SENHA_APP: nada enviado.'); sys.exit(0)
ok = falhas = 0
with smtplib.SMTP_SSL('smtp.gmail.com', 465, context=ssl.create_default_context()) as s:
    s.login(usuario, senha)
    for e in emails:
        m = EmailMessage(); m['From'] = f'Tutor da Cat <{usuario}>'; m['To'] = e['para']; m['Subject'] = e['assunto']; m['Reply-To'] = usuario
        m.set_content(e['texto'])
        try: s.send_message(m); ok += 1
        except Exception as x: falhas += 1; print('falha num envio:', type(x).__name__)
        time.sleep(1)
print(f'enviados: {ok} · falhas: {falhas}')
