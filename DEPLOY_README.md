# 🚀 Deploy Automation - Trading App

> **Status:** ✅ CONFIGURADO E PRONTO PARA DEPLOY

## 📊 Fluxo de Deploy

```
Push para Main/Develop
      ↓
Build & Test (npm lint, test, build)
      ↓
Docker Build & Push (build image, push Docker Hub)
      ↓
Security Scan (Trivy scanner)
      ↓
Deploy to Production (SSH → Docker pull → restart)
      ↓
Deploy to Staging (SSH → Docker pull → restart)
      ↓
Health Checks & Notifications
```

## 🔐 Secrets Necessários

| Secret | Valor | Descrição |
|--------|-------|-----------|
| `DOCKER_USERNAME` | `gladistonporto` | Docker Hub username |
| `DOCKER_PASSWORD` | `dckr_pat_*****` | Docker Hub token |
| `DEPLOY_HOST` | `localhost` ou IP | Servidor deploy |
| `DEPLOY_USER` | `deploy` | User SSH |
| `DEPLOY_KEY` | Base64 encoded | SSH private key |
| `DEPLOY_PORT` | `22` | SSH port |
| `SLACK_WEBHOOK_URL` | URL | Notificações (opcional) |

## 📋 Arquivos Criados

```
📦 Deploy Infrastructure
├── .github/workflows/ci-cd.yml           ← Pipeline CI/CD completo
├── docker-compose.test.yml               ← Ambiente test local
├── scripts/
│   ├── deploy.sh                         ← Deploy script automático
│   └── setup-github-secrets.sh           ← Setup interativo dos secrets
├── DEPLOY_SETUP_GUIDE.md                 ← Guia passo-a-passo
├── DEPLOY_KEY_BASE64.txt                 ← SSH key em Base64
└── DEPLOY_SECRETS_GUIDE.md               ← Referência de secrets
```

## 🎯 Quick Start

### 1️⃣ Gerar SSH Keys (✅ Já feito)

```bash
ssh-keygen -t ed25519 -f ~/.ssh/trading-app-deploy -N ""
```

### 2️⃣ Configurar Secrets no GitHub

**Opção A: Via GitHub UI**
- Acesse: https://github.com/Gladiston-Porto/Trading-APP/settings/secrets/actions
- Adicione os 5 secrets manualmente

**Opção B: Via Script (Recomendado)**
```bash
./scripts/setup-github-secrets.sh
```

### 3️⃣ Testar Localmente

```bash
# Inicie containers de teste
docker-compose -f docker-compose.test.yml up -d

# Verifique endpoints
curl http://localhost:3001/  # Production
curl http://localhost:3002/  # Staging

# Teste deploy script (simulado)
ENVIRONMENT=production ./scripts/deploy.sh
```

### 4️⃣ Trigger Pipeline

```bash
git add . && git commit -m "feat: test deploy" && git push origin main
```

Monitore em: https://github.com/Gladiston-Porto/Trading-APP/actions

## 📊 Pipeline Jobs

### ✅ Build & Test
- `npm install` - Instala dependências
- `npm run lint` - Executa ESLint (0 erros, 64 warnings OK)
- `npm run type-check` - TypeScript strict mode
- `npm run test:run` - 30 testes unitários
- `npm run build` - Build production

**Status:** ✅ PASSING

### ✅ Docker Build & Push
- Buildx multi-stage build
- Push para Docker Hub com tags:
  - `latest` (default branch)
  - `main` (branch main)
  - `develop` (branch develop)

**Status:** ✅ PASSING

### ✅ Security Scan
- Trivy vulnerability scanner
- SARIF format upload
- CodeQL integration v3

**Status:** ✅ PASSING

### 🚀 Deploy to Production
- Trigg: `push to main`
- SSH pull image
- Docker container restart
- Health checks (port 3001)
- Slack notifications

**Status:** ⚠️ CONFIGURED (aguarda secrets)

### 🚀 Deploy to Staging
- Trigg: `push to develop`
- SSH pull image
- Docker container restart
- Health checks (port 3002)

**Status:** ⚠️ CONFIGURED (aguarda branch develop + secrets)

## 🔑 SSH Key Setup

A chave privada está em Base64 em `DEPLOY_KEY_BASE64.txt`

Para adicionar ao GitHub:
```bash
# Copiar para clipboard
cat DEPLOY_KEY_BASE64.txt | pbcopy

# Ou view
cat DEPLOY_KEY_BASE64.txt
```

Depois adicione nos Secrets do GitHub com nome: `DEPLOY_KEY`

## 🐛 Troubleshooting

### Deploy jobs falhando com "continue-on-error: true"

Isso é **ESPERADO** enquanto os secrets não estão configurados!

Quando adicionar os secrets, os deploys vão passar.

### SSH connection refused

Verifique:
- [ ] `DEPLOY_HOST` está correto
- [ ] `DEPLOY_USER` existe no servidor
- [ ] `DEPLOY_KEY` é chave privada válida (Base64)
- [ ] Porta 22 aberta

### Docker image não encontrada

Verifique:
- [ ] Docker Hub login funcionando
- [ ] `DOCKER_USERNAME` e `DOCKER_PASSWORD` corretos
- [ ] Imagem foi pushed para registry

### Container não saudável após deploy

Verifique logs:
```bash
# No servidor
docker logs trading-app-production
```

## 📈 Monitoramento

### GitHub Actions
https://github.com/Gladiston-Porto/Trading-APP/actions

### Docker Containers (Local)
```bash
docker ps -a
docker logs trading-app-production
docker logs trading-app-staging
```

### Health Endpoints
- Production: http://localhost:3001/
- Staging: http://localhost:3002/

## 🎓 Próximos Passos

1. ✅ Configurar SSH Keys
2. ⏳ Adicionar 5 Secrets no GitHub
3. ⏳ Fazer push para triggerar deploy
4. ⏳ Monitorar pipeline
5. ⏳ Confirmar deploys automáticos

## 📚 Referências

- [CI/CD Workflow](.github/workflows/ci-cd.yml)
- [Deploy Guide](DEPLOY_SETUP_GUIDE.md)
- [Secrets Guide](DEPLOY_SECRETS_GUIDE.md)
- [Deploy Script](scripts/deploy.sh)
- [Setup Secrets CLI](scripts/setup-github-secrets.sh)

---

**Status:** 🟢 PRONTO PARA DEPLOY

Quando os secrets estiverem configurados, os 5 jobs vão passar e aplicação vai estar deployada automaticamente! 🚀
