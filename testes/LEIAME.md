# Testes

- `*.py`: testes de tela (Playwright + Chrome) sobre o build de demonstração: `npm run build:demo && python3 testes/novos.py dist-demo/index.html /tmp`.
- `unit/t.mjs`: paginação e fila offline do Supabase, com um Supabase de mentira (os caminhos dentro do arquivo apontam para a máquina onde foi escrito; ajuste antes de rodar).
- `ferramentas/`: scripts que geraram o modo tutor e os diagnósticos.
