═══════════════════════════════════════════════════════════════════════════════
                    📋 DEPLOY SETUP - GUIA COMPLETO
═══════════════════════════════════════════════════════════════════════════════

🎯 OBJETIVO: Configurar 5 Secrets no GitHub para fazer Deploy Automático

═══════════════════════════════════════════════════════════════════════════════
                           ⚙️  PASSO 1: SSH KEYS
═══════════════════════════════════════════════════════════════════════════════

As SSH keys já foram geradas em:
  - Private: ~/.ssh/trading-app-deploy
  - Public:  ~/.ssh/trading-app-deploy.pub

✅ Verificar se estão lá:
$ ls -la ~/.ssh/trading-app-deploy*

═══════════════════════════════════════════════════════════════════════════════
                   ⚙️  PASSO 2: CONVERTER KEY PARA BASE64
═══════════════════════════════════════════════════════════════════════════════

O GitHub vai armazenar a chave CODIFICADA em Base64.

✅ Gere Base64:
$ cat ~/.ssh/trading-app-deploy | base64 > /tmp/deploy_key_b64.txt

✅ Veja o resultado (será uma linha longa):
$ cat /tmp/deploy_key_b64.txt


Ou copie direto:
$ pbcopy < /tmp/deploy_key_b64.txt

Agora você TEM a chave em Base64. Vai usar no Secret "DEPLOY_KEY".

═══════════════════════════════════════════════════════════════════════════════
                   ⚙️  PASSO 3: CONFIGURAR SECRETS NO GITHUB
═══════════════════════════════════════════════════════════════════════════════

Acesse: https://github.com/Gladiston-Porto/Trading-APP/settings/secrets/actions

Clique em "New repository secret" e adicione CADA UM:

───────────────────────────────────────────────────────────────────────────────
SECRET #1: DOCKER_USERNAME
───────────────────────────────────────────────────────────────────────────────
Name: DOCKER_USERNAME
Value: gladistonporto

(Seu username no Docker Hub)


───────────────────────────────────────────────────────────────────────────────
SECRET #2: DOCKER_PASSWORD  
───────────────────────────────────────────────────────────────────────────────
Name: DOCKER_PASSWORD
Value: [SEU DOCKER HUB TOKEN/PASSWORD]

(O token que você gerou do Docker Hub - MANTÉM SEGURO!)
(Não compartilhe publicamente!)


───────────────────────────────────────────────────────────────────────────────
SECRET #3: DEPLOY_HOST
───────────────────────────────────────────────────────────────────────────────
Name: DEPLOY_HOST
Value: localhost

(Para ambiente local. Se for servidor remoto: seu-servidor.com)


───────────────────────────────────────────────────────────────────────────────
SECRET #4: DEPLOY_USER
───────────────────────────────────────────────────────────────────────────────
Name: DEPLOY_USER
Value: deploy

(Usuário SSH do servidor. Para teste local: seu-usuario-mac ou deploy)


───────────────────────────────────────────────────────────────────────────────
SECRET #5: DEPLOY_KEY
───────────────────────────────────────────────────────────────────────────────
Name: DEPLOY_KEY
Value: [COLA TUDO DO /tmp/deploy_key_b64.txt]

⚠️  IMPORTANTE:
  - Copie TODA A CHAVE Base64
  - Deve começar com: LS0tLS1CRUdJTi...
  - Deve terminar com: K0VYLS0tLS0=
  - NÃO quebra de linha, é UMA LINHA SÓ!


───────────────────────────────────────────────────────────────────────────────
OPCIONAL - SECRET #6: SLACK_WEBHOOK_URL (opcional, pode pular)
───────────────────────────────────────────────────────────────────────────────
Name: SLACK_WEBHOOK_URL
Value: https://hooks.slack.com/services/YOUR/WEBHOOK/URL

(Se não tiver Slack configurado, deixe vazio ou coloque um dummy)


═══════════════════════════════════════════════════════════════════════════════
                    ⚙️  PASSO 4: PREPARAR AMBIENTE LOCAL
═══════════════════════════════════════════════════════════════════════════════

Para testar deploy localmente, você precisa:

1️⃣  Docker rodando:
$ docker ps
(Se não ver CONTAINER ID, inicie Docker)


2️⃣  Arquivo docker-compose.test.yml está pronto:
$ cat docker-compose.test.yml | head -20

(Vai criar containers em porta 3001 e 3002)


3️⃣  Deploy script pronto:
$ ls -la scripts/deploy.sh
$ chmod +x scripts/deploy.sh


═══════════════════════════════════════════════════════════════════════════════
                    ⚙️  PASSO 5: TESTAR DEPLOY LOCALMENTE
═══════════════════════════════════════════════════════════════════════════════

Antes de ativar o GitHub Actions, teste localmente:

1️⃣  Inicie os containers de teste:
$ docker-compose -f docker-compose.test.yml up -d

Resultado esperado:
  ✅ trading-app-production rodando em :3001
  ✅ trading-app-staging rodando em :3002


2️⃣  Verifique health:
$ curl http://localhost:3001/
$ curl http://localhost:3002/

(Devem responder com HTML da aplicação)


3️⃣  Teste o deploy script (simulado):
$ ENVIRONMENT=production scripts/deploy.sh

(Vai simular um deploy)


═══════════════════════════════════════════════════════════════════════════════
                    🚀 PASSO 6: ATIVAR GITHUB ACTIONS
═══════════════════════════════════════════════════════════════════════════════

Depois que os secrets estão configurados:

1️⃣  Faça um push para triggerar o workflow:
$ git add . && git commit -m "test: trigger deploy workflow" && git push origin main


2️⃣  Monitore no GitHub Actions:
https://github.com/Gladiston-Porto/Trading-APP/actions

(Aguarde ~5-10 minutos)


3️⃣  Verifique o resultado:
  ✅ Build & Test → deve PASSAR
  ✅ Docker Build & Push → deve PASSAR
  ✅ Security Scan → deve PASSAR
  ✅ Deploy to Production → deve PASSAR (com continue-on-error)
  ⚠️  Deploy to Staging → será skipped (precisa push em develop)


═══════════════════════════════════════════════════════════════════════════════
                    📋 TROUBLESHOOTING
═══════════════════════════════════════════════════════════════════════════════

❌ Erro: "SSH key permission denied"
→ Verifique se a chave está em Base64 correto
→ Verifique se ~/.ssh/trading-app-deploy tem permissão 600
→ Confirme user/host nos secrets

❌ Erro: "docker: not found"
→ Inicie Docker Desktop
→ Execute: docker ps (deve funcionar)

❌ Erro: "Cannot connect to Docker daemon"
→ Docker não está rodando
→ Inicie: open -a Docker

❌ Deploy jobs com "continue-on-error: true"
→ Isso é ESPERADO para desenvolvimento
→ Quando secrets estão incompletos, job continua mesmo assim
→ Próximas fases vão ativar deploys completos


═══════════════════════════════════════════════════════════════════════════════
                    ✅ CHECKLIST FINAL
═══════════════════════════════════════════════════════════════════════════════

[ ] SSH keys geradas (~/.ssh/trading-app-deploy*)
[ ] Private key convertida para Base64
[ ] 5 Secrets adicionados no GitHub:
    [ ] DOCKER_USERNAME
    [ ] DOCKER_PASSWORD
    [ ] DEPLOY_HOST
    [ ] DEPLOY_USER
    [ ] DEPLOY_KEY
[ ] Docker compose test pronto
[ ] Deploy script executável
[ ] Containers testados localmente
[ ] GitHub Actions secrets funcionando

═══════════════════════════════════════════════════════════════════════════════

Quando tudo estiver pronto, escreva: "Deploy pronto!"

═══════════════════════════════════════════════════════════════════════════════
