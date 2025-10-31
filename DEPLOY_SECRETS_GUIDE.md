═══════════════════════════════════════════════════════════════════════════════
                        🔐 GITHUB SECRETS PARA DEPLOY
═══════════════════════════════════════════════════════════════════════════════

Você precisa adicionar esses 5 secrets em: https://github.com/Gladiston-Porto/Trading-APP/settings/secrets/actions

───────────────────────────────────────────────────────────────────────────────
1️⃣  DEPLOY_HOST
───────────────────────────────────────────────────────────────────────────────
Descrição: Hostname/IP do servidor de produção
Valor: localhost

Ou se tiver servidor remoto:
Valor: seu-servidor.com


───────────────────────────────────────────────────────────────────────────────
2️⃣  DEPLOY_PORT
───────────────────────────────────────────────────────────────────────────────
Descrição: Porta SSH para conectar
Valor: 22


───────────────────────────────────────────────────────────────────────────────
3️⃣  DEPLOY_USER
───────────────────────────────────────────────────────────────────────────────
Descrição: Usuário SSH para deploy
Valor: deploy

(Ou root/ubuntu/ec2-user dependendo do servidor)


───────────────────────────────────────────────────────────────────────────────
4️⃣  DEPLOY_KEY
───────────────────────────────────────────────────────────────────────────────
Descrição: Private SSH key (em Base64)
Valor: [Copie TODO o conteúdo abaixo]

⚠️  COPIE TUDO (começa com LS0t e termina com K0E=)
⚠️  Uma linha única, sem quebras!

[COLA A CHAVE BASE64 AQUI - veja arquivo gerado]


───────────────────────────────────────────────────────────────────────────────
5️⃣  SLACK_WEBHOOK_URL
───────────────────────────────────────────────────────────────────────────────
Descrição: Webhook para notificações Slack (opcional)
Valor: https://hooks.slack.com/services/YOUR/WEBHOOK/URL

Se não tiver Slack, pode usar valor dummy:
Valor: https://hooks.slack.com/services/dummy/webhook/url


═══════════════════════════════════════════════════════════════════════════════
                            ✅ PASSO A PASSO
═══════════════════════════════════════════════════════════════════════════════

1. Abra: https://github.com/Gladiston-Porto/Trading-APP/settings/secrets/actions

2. Clique em "New repository secret"

3. Adicione cada um dos 5 secrets acima

4. Guarde a SSH private key em local seguro

5. Retorne aqui e confirme: "Secrets configurados!"


═══════════════════════════════════════════════════════════════════════════════
                       📍 SSH PUBLIC KEY (para servidor)
═══════════════════════════════════════════════════════════════════════════════

Se for usar servidor remoto, adicione essa chave pública em ~/.ssh/authorized_keys:

[Veja arquivo: ~/.ssh/trading-app-deploy.pub]

Comando para adicionar:
cat ~/.ssh/trading-app-deploy.pub >> ~/.ssh/authorized_keys


═══════════════════════════════════════════════════════════════════════════════
