# HSMP Tickets

Portal React/Vite para emissão de Tickets Dourados, com autenticação e dados no
Firebase, avatares do Minecraft carregados do Minotar e uma API Express para
envio de e-mails.

## Publicação

O workflow `.github/workflows/deploy-pages.yml` compila e publica o site no
GitHub Pages sempre que há um push para `main` (ou execução manual em Actions).
O endereço esperado é:

`https://hayato-takahashi-vtbr.github.io/HSMP_Tickets/`

### 1. Publicar a API

O Pages não executa o servidor Express. Para manter envio de e-mails e avatares,
publique a API separadamente:

1. Crie um Web Service no Render conectado a este repositório e use o Blueprint
   `render.yaml` (ou crie o serviço a partir desse arquivo).
2. Após o deploy, confirme que `https://<serviço>.onrender.com/api/health`
   responde com sucesso.
3. Para envio real de e-mails, configure `SMTP_HOST`, `SMTP_USER` e `SMTP_PASS`
   como variáveis secretas no serviço Render. `SMTP_PORT` (padrão `587`) e
   `SMTP_FROM` são opcionais. Sem SMTP, a API gera a prévia da mensagem para o
   comprovante, mas não envia o e-mail.

O plano gratuito do Render pode suspender o serviço quando estiver ocioso,
causando uma demora na primeira chamada após um período sem uso.

### 2. Configurar o frontend

No GitHub, em **Settings → Secrets and variables → Actions → Variables**, crie
a variável `VITE_API_BASE_URL` com a URL base do serviço Render, sem barra final
nem `/api` (por exemplo, `https://hsmp-tickets-api.onrender.com`). O workflow
passa esse valor ao build para as chamadas da API.

O Blueprint configura `FRONTEND_ORIGIN` com a origem do GitHub Pages do
repositório. Ela precisa corresponder exatamente à origem pública do site.

### 3. Autorizar Firebase

No Firebase Console, adicione `hayato-takahashi-vtbr.github.io` aos domínios
autorizados do Authentication. Confirme também que as regras do Firestore
publicadas no projeto permitem as operações necessárias. A configuração web do
Firebase já está incluída no frontend; não coloque credenciais SMTP ou outras
chaves privadas no código.

### Desenvolvimento local

Instale as dependências com Bun e execute `bun run dev`. Para apontar o
frontend local a uma API remota, defina `VITE_API_BASE_URL` antes de iniciar o
servidor.
