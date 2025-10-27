# Phase 3: CI/CD Pipeline Test - Guia Executivo

## 🚀 O que é o CI/CD Pipeline?

CI/CD significa **Continuous Integration / Continuous Deployment**. O GitHub Actions automatiza:

1. **Build**: Compilar a aplicação
2. **Test**: Rodar testes automatizados
3. **Security**: Escanear vulnerabilidades
4. **Docker**: Construir e fazer push da imagem
5. **Deploy**: Fazer deploy para produção

---

## 📊 Pipeline Configuration

Seu pipeline está configurado no arquivo `.github/workflows/ci-cd.yml` com **5 jobs principais**:

### **Job 1: Build & Test** (3 min)
```yaml
build-and-test:
  runs-on: ubuntu-latest
  steps:
    - Clonar código
    - Setup Node.js 18
    - npm install
    - ESLint (linter)
    - TypeScript type-check
    - npm run test
    - npm run build
```

### **Job 2: Docker Build & Push** (5 min)
```yaml
docker-build-and-push:
  needs: build-and-test
  runs-on: ubuntu-latest
  steps:
    - Login Docker Hub
    - Setup Buildx
    - Build image
    - Push to registry
    - Update Docker Hub description
```

### **Job 3: Security Scan** (2 min)
```yaml
security-scan:
  needs: build-and-test
  runs-on: ubuntu-latest
  steps:
    - Run Trivy scan
    - Upload results to GitHub Security tab
```

### **Job 4: Deploy Production** (5 min)
```yaml
deploy-production:
  needs: [docker-build-and-push, security-scan]
  runs-on: ubuntu-latest
  if: github.ref == 'refs/heads/main'
  steps:
    - SSH deploy
    - Health check
    - Smoke tests
    - Slack notification
```

### **Job 5: Deploy Staging** (5 min)
```yaml
deploy-staging:
  needs: [docker-build-and-push, security-scan]
  runs-on: ubuntu-latest
  if: github.ref == 'refs/heads/develop'
  steps:
    - SSH deploy to staging
    - Health check
    - Slack notification
```

**Tempo Total Estimado**: ~20 minutos para conclusão completa

---

## ⚙️ Pré-requisitos Para Teste

Antes de testar o pipeline, certifique-se que:

- [x] Código frontend está buildando localmente (`npm run build`)
- [x] Testes estão passando (`npm run test`)
- [x] Dockerfile existe e está correto
- [x] Todos os 6 secrets foram adicionados no GitHub
- [x] Repositório está no GitHub com acesso público/privado
- [x] Branch `main` protegido (opcional mas recomendado)

---

## 🧪 Passo 1: Testar Localmente Primeiro (Recomendado)

Antes de disparar o pipeline no GitHub, teste localmente:

### Build e Test Local

```bash
cd /Users/gladistonporto/Acoes

# Instalar dependências
npm install

# Verificar lint
npm run lint

# Type-check (TypeScript)
npm run type-check

# Rodar testes
npm run test

# Build
npm run build

# Resultado esperado:
# ✓ All tests passed
# ✓ No TypeScript errors
# ✓ No ESLint warnings
# ✓ Build succeeded
```

### Docker Build Local

```bash
# Build da imagem Docker
docker build -t trading-app-frontend:test .

# Resultado esperado:
# Successfully tagged trading-app-frontend:test

# Testar container
docker run -d -p 8080:80 --name test-app trading-app-frontend:test
curl http://localhost:8080
docker stop test-app
docker rm test-app
```

---

## 🔄 Passo 2: Disparar o Pipeline via Git Push

O pipeline é acionado automaticamente quando você faz **push** para o repositório.

### Opção 1: Fazer Push de um Commit Existente

```bash
# Navegar para o repositório
cd /Users/gladistonporto/Acoes

# Verificar status do git
git status

# Se houver mudanças não commitadas, faça um commit
git add .
git commit -m "chore: trigger CI/CD pipeline test [skip ci-optional]"

# Fazer push para main
git push origin main

# Resultado no terminal:
# Counting objects: 3, done.
# Delta compression using up to 8 threads.
# Compressing objects: 100% (2/2), done.
# Writing objects: 100% (3/3), 287 bytes | 287.00 KiB/s, done.
# To github.com:seu_usuario/trading-app.git
#    abc1234..def5678  main -> main
```

### Opção 2: Usar Git Tag para Versão Específica

```bash
# Criar tag com versão
git tag -a v1.0.0 -m "Release version 1.0.0"

# Fazer push da tag
git push origin v1.0.0

# Resultado: Pipeline dispara com tag específica
```

### Opção 3: Disparar Manualmente via GitHub CLI

```bash
# Usando GitHub CLI (precisa estar logado)
gh workflow run ci-cd.yml --ref main

# Resultado:
# ✓ Workflow 'CI/CD Pipeline' queued on branch 'main' (ID: 1234567890)
```

---

## 📍 Passo 3: Monitorar o Pipeline

### Via GitHub Web UI (Recomendado)

1. Acesse seu repositório: `https://github.com/seu_usuario/seu_repositorio`
2. Clique na aba **Actions**
3. Procure a workflow que foi disparada (título do commit)
4. Clique para abrir os detalhes

### Estrutura da Página

```
Actions
├─ Workflow Runs
│  └─ [COMMIT] CI/CD Pipeline
│     ├─ ✓ build-and-test (3 min)
│     ├─ ✓ docker-build-and-push (5 min)
│     ├─ ✓ security-scan (2 min)
│     ├─ ✓ deploy-production (5 min)
│     └─ ✓ deploy-staging (opcional)
│
├─ Jobs
│  ├─ Build & Test
│  │  ├─ Checkout code
│  │  ├─ Setup Node.js 18
│  │  ├─ Install dependencies
│  │  ├─ Lint
│  │  ├─ Type check
│  │  ├─ Run tests
│  │  └─ Build
│  │
│  ├─ Docker Build & Push
│  │  ├─ Login Docker Hub
│  │  ├─ Build and push
│  │  └─ Update README
│  │
│  └─ ...
```

### Status Esperado

```
✓ build-and-test                 COMPLETED in 3m 12s
✓ docker-build-and-push          COMPLETED in 5m 45s
✓ security-scan                  COMPLETED in 2m 18s
✓ deploy-production              COMPLETED in 5m 31s
  deploy-staging                 SKIPPED (não está em develop)

Status: All jobs completed successfully
```

---

## 🔍 Passo 4: Analisar Logs

### Build & Test Logs

```
Step: Run ESLint
Output: No errors

Step: Run TypeScript type-check
Output: No errors

Step: Run tests
Output: ✓ 30 tests passed

Step: Build application
Output: ✓ Build succeeded
Size: 47 KB (gzip)
```

### Docker Build & Push Logs

```
Step: Login to Docker Hub
Output: Login Succeeded

Step: Build and push image
Output:
  #1 building with "default" instance using docker "latest"
  #2 [internal] load .dockerignore
  #3 [builder 1/4] FROM node:18-alpine
  #4 [builder 2/4] WORKDIR /app
  #5 [builder 3/4] COPY package*.json ./
  #6 [builder 4/4] RUN npm install
  #7 [stage-1 1/5] FROM nginx:alpine
  ...
  Successfully pushed to docker.io/seu_usuario/trading-app-frontend:1.0.0
```

### Security Scan Logs

```
Step: Run Trivy security scan
Output:
  OS Packages:     0 vulnerabilities
  Node Packages:   0 vulnerabilities
  Dockerfile:      0 issues
  Total:           0 vulnerabilities found
```

---

## ⚠️ Troubleshooting: Erros Comuns

### Erro 1: "docker-build failed: login failed"
```
Causa: DOCKER_TOKEN ou DOCKER_USERNAME inválido
Solução:
  1. Verifique os secrets no GitHub
  2. Regenere o token no Docker Hub
  3. Atualize o secret DOCKER_TOKEN
```

### Erro 2: "build-and-test failed: npm install error"
```
Causa: Dependências incompatíveis ou package-lock.json desatualizado
Solução:
  1. Local: rm -rf node_modules package-lock.json
  2. Local: npm install
  3. Commit e push
```

### Erro 3: "deploy-production failed: SSH connection timeout"
```
Causa: DEPLOY_HOST, DEPLOY_USER ou DEPLOY_KEY inválido
Solução:
  1. Verifique os secrets DEPLOY_HOST, DEPLOY_USER, DEPLOY_KEY
  2. Teste SSH localmente: ssh -i ~/.ssh/deploy_key deploy@host
  3. Atualize os secrets se necessário
```

### Erro 4: "security-scan: Trivy failed"
```
Causa: Vulnerabilidade detectada na imagem Docker
Solução:
  1. Verifique o relatório de segurança
  2. Atualize pacotes vulneráveis
  3. Rebuild e retry
```

### Erro 5: "deploy-staging skipped"
```
Causa: Expected - só dispara em branch 'develop'
Solução: Nenhuma - é comportamento esperado
```

---

## ✅ Checklist de Sucesso

- [ ] Pipeline foi disparado (commit foi feito)
- [ ] Build & Test completou com sucesso
- [ ] Docker Build & Push completou com sucesso
- [ ] Security Scan completou com sucesso
- [ ] Imagem foi publicada no Docker Hub
- [ ] Logs não mostram erros
- [ ] Tempo total < 25 minutos
- [ ] Slack recebeu notificação (se configurado)

---

## 📊 Métricas Esperadas

| Métrica | Esperado | Seu Resultado |
|---------|----------|---------------|
| Build Time | 2-3 min | _____ |
| Test Count | 30 tests | _____ |
| Test Pass Rate | 100% | _____ |
| Lint Errors | 0 | _____ |
| TypeScript Errors | 0 | _____ |
| Image Size | ~81 MB | _____ |
| Docker Push Time | 2-3 min | _____ |
| Vulnerabilities | 0 | _____ |
| Total Pipeline Time | 18-25 min | _____ |

---

## 🔗 URLs Úteis

```
GitHub Actions Runs:
https://github.com/seu_usuario/seu_repositorio/actions

Workflow File:
https://github.com/seu_usuario/seu_repositorio/blob/main/.github/workflows/ci-cd.yml

Docker Hub Image:
https://hub.docker.com/r/seu_username/trading-app-frontend

Security Report:
https://github.com/seu_usuario/seu_repositorio/security/code-scanning
```

---

## 🎯 Próximo Passo

Depois que o pipeline rodar com sucesso:
→ **Phase 4: Local Production Test**
   - Teste docker-compose.production.yml
   - Verifique health checks
   - Simule container startup

---

## 🚀 Quick Commands

```bash
# Disparar pipeline com commit
git add . && git commit -m "trigger ci-cd" && git push origin main

# Disparar com GitHub CLI
gh workflow run ci-cd.yml --ref main

# Monitorar via CLI
gh run list --workflow ci-cd.yml

# Ver logs de um job
gh run view <run-id> --job <job-name>
```

---

**Status**: Phase 3 - CI/CD Pipeline Test
Generated: 26 de Outubro de 2025
