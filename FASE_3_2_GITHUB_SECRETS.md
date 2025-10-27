# Phase 2: GitHub Secrets Setup - Guia Executivo

## 🔐 O que são GitHub Secrets?

GitHub Secrets são variáveis criptografadas armazenadas nos settings do seu repositório. São usadas pelo GitHub Actions para acessar credenciais sem expô-las no código.

---

## 📋 Secrets Necessários

Para executar o CI/CD pipeline completo, você precisa configurar **6 secrets**:

| Secret | Descrição | Exemplo | Tipo |
|--------|-----------|---------|------|
| `DOCKER_USERNAME` | Seu username do Docker Hub | `gladpros` | Obrigatório |
| `DOCKER_TOKEN` | Token de acesso do Docker Hub | `dckr_pat_...` | Obrigatório |
| `DEPLOY_HOST` | IP/hostname do servidor prod | `192.168.1.10` | Obrigatório |
| `DEPLOY_USER` | Usuário SSH do servidor prod | `deploy` | Obrigatório |
| `DEPLOY_KEY` | Chave SSH privada (base64) | `LS0tLS1CRUd...` | Obrigatório |
| `SLACK_WEBHOOK` | URL webhook do Slack (opcional) | `https://hooks.slack.com/...` | Opcional |

---

## 🔑 Passo 1: Gerar Personal Access Token do Docker Hub

### Via Docker Hub UI (Recomendado)

1. Acesse: https://hub.docker.com/settings/security
2. Clique em **"New Access Token"**
3. Preencha:
   - **Access Token Description**: "GitHub Actions CI/CD"
   - **Permissions**: Selecione "Read, Write, Delete" (ou customize)
4. Clique em **"Generate"**
5. **Copie o token** (aparece uma única vez!)
6. Guarde em local seguro

### Salvar o Token

```bash
# Salvar temporariamente para usar nos próximos passos
export DOCKER_TOKEN="dckr_pat_XXXXXXXXXXXXX"
export DOCKER_USERNAME="seu_username"

# Verificar
echo $DOCKER_TOKEN
echo $DOCKER_USERNAME
```

---

## 🔑 Passo 2: Preparar Chave SSH para Deploy (Opcional - Se usar SSH)

Se seu servidor prod usa SSH para deploy:

### Gerar nova chave SSH (se não tiver)

```bash
# Gerar chave SSH (pressione Enter para aceitar defaults)
ssh-keygen -t ed25519 -f ~/.ssh/deploy_key -N ""

# Resultado:
# - ~/.ssh/deploy_key (chave privada)
# - ~/.ssh/deploy_key.pub (chave pública)
```

### Converter para Base64 (para GitHub Secret)

```bash
# Codificar chave privada em base64
cat ~/.ssh/deploy_key | base64

# Copie o output inteiro (será bem longo)
# Exemplo:
# LS0tLS1CRUdJTiBPUEVOU1NIIFBSSVZBVEUgS0VZLS0tLS0K
# ... (muito mais linhas)
# LS0tLS1FTkQgT1BFTlNTSCBQUklWQVRFIEtFWS0tLS0tCg==

# Salvar para usar depois
export DEPLOY_KEY_BASE64=$(cat ~/.ssh/deploy_key | base64)
```

### Adicionar Chave Pública ao Servidor

```bash
# No seu servidor prod:
cat ~/.ssh/deploy_key.pub >> ~/.ssh/authorized_keys
chmod 600 ~/.ssh/authorized_keys
```

---

## 🔑 Passo 3: Preparar Informações do Servidor

```bash
# Descobrir informações do servidor:

# IP/Hostname
export DEPLOY_HOST="192.168.1.10"  # ou seu.dominio.com
export DEPLOY_USER="deploy"         # usuário SSH

# Verificar conectividade
ssh -i ~/.ssh/deploy_key $DEPLOY_USER@$DEPLOY_HOST "echo 'SSH OK'"
```

---

## 🔐 Passo 4: Adicionar Secrets no GitHub

### Via GitHub UI (Recomendado)

1. Acesse seu repositório no GitHub
2. Vá para **Settings** → **Secrets and variables** → **Actions**
3. Clique em **"New repository secret"**

### Adicionar cada secret:

#### Secret 1: DOCKER_USERNAME

- **Name**: `DOCKER_USERNAME`
- **Value**: `seu_username_docker_hub`
- Clique **"Add secret"**

#### Secret 2: DOCKER_TOKEN

- **Name**: `DOCKER_TOKEN`
- **Value**: Cole o Personal Access Token (do Docker Hub)
- Clique **"Add secret"**

#### Secret 3: DEPLOY_HOST

- **Name**: `DEPLOY_HOST`
- **Value**: IP ou domínio do servidor production
- Clique **"Add secret"**

#### Secret 4: DEPLOY_USER

- **Name**: `DEPLOY_USER`
- **Value**: Usuário SSH (ex: `deploy`, `root`, etc)
- Clique **"Add secret"**

#### Secret 5: DEPLOY_KEY

- **Name**: `DEPLOY_KEY`
- **Value**: A chave SSH privada em base64 (do Passo 2)
- Clique **"Add secret"**

#### Secret 6: SLACK_WEBHOOK (Opcional)

- **Name**: `SLACK_WEBHOOK`
- **Value**: URL webhook do Slack (se quiser notificações)
- Clique **"Add secret"**

---

## 🤖 Alternativa: Via GitHub CLI

Se preferir usar a CLI do GitHub:

```bash
# Instalar GitHub CLI (se não tiver)
# macOS: brew install gh
# Linux: curl -fsSL https://cli.github.com/packages/githubcli-archive-keyring.gpg | sudo dd of=/usr/share/keyrings/githubcli-archive-keyring.gpg
# Windows: choco install gh

# Login
gh auth login

# Adicionar secrets
gh secret set DOCKER_USERNAME --body "seu_username"
gh secret set DOCKER_TOKEN --body "seu_token"
gh secret set DEPLOY_HOST --body "seu_host"
gh secret set DEPLOY_USER --body "seu_user"
gh secret set DEPLOY_KEY --body "sua_chave_base64"
gh secret set SLACK_WEBHOOK --body "seu_webhook_url"

# Listar secrets
gh secret list
```

---

## ✅ Verificar Secrets Adicionados

1. Acesse: **Settings** → **Secrets and variables** → **Actions**
2. Você deve ver **6 secrets** listados:
   - ✓ DOCKER_USERNAME
   - ✓ DOCKER_TOKEN
   - ✓ DEPLOY_HOST
   - ✓ DEPLOY_USER
   - ✓ DEPLOY_KEY
   - ✓ SLACK_WEBHOOK (opcional)

### Verificar via CLI

```bash
gh secret list --repo seu_usuario/seu_repositorio
```

---

## 🔍 Secrets no GitHub Actions

O arquivo `.github/workflows/ci-cd.yml` acessa os secrets assim:

```yaml
env:
  DOCKER_USERNAME: ${{ secrets.DOCKER_USERNAME }}
  DOCKER_TOKEN: ${{ secrets.DOCKER_TOKEN }}

jobs:
  docker-build:
    runs-on: ubuntu-latest
    steps:
      - name: Login to Docker Hub
        run: |
          echo "${{ secrets.DOCKER_TOKEN }}" | docker login -u "${{ secrets.DOCKER_USERNAME }}" --password-stdin

      - name: Deploy Production
        env:
          DEPLOY_HOST: ${{ secrets.DEPLOY_HOST }}
          DEPLOY_USER: ${{ secrets.DEPLOY_USER }}
          DEPLOY_KEY: ${{ secrets.DEPLOY_KEY }}
        run: |
          # Script de deployment usa as variáveis de ambiente
```

---

## ⚠️ Segurança: Boas Práticas

### ✅ O que fazer:

- ✓ Use Personal Access Tokens em vez de senhas
- ✓ Limite as permissões dos tokens (read-only quando possível)
- ✓ Rotacione tokens periodicamente
- ✓ Use SSH keys com passphrase (quando possível)
- ✓ Revogue tokens antigos
- ✓ Monitore acessos no audit log

### ❌ O que NÃO fazer:

- ✗ Não commite secrets no repositório
- ✗ Não use senhas (use tokens)
- ✗ Não compartilhe chaves privadas
- ✗ Não coloque secrets em variáveis de ambiente locais compartilhadas
- ✗ Não exponha secrets em logs

---

## 🔄 Regenerar Secrets

Se precisar regenerar um secret (ex: token comprometido):

1. No Docker Hub: Revogue o token antigo
2. Gere um novo token
3. No GitHub: Edite o secret com o novo valor
4. Clique **"Update secret"**

```bash
# Via CLI
gh secret set DOCKER_TOKEN --body "novo_token"
```

---

## 📋 Checklist de Conclusão

- [ ] Personal Access Token criado no Docker Hub
- [ ] DOCKER_USERNAME adicionado como secret
- [ ] DOCKER_TOKEN adicionado como secret
- [ ] DEPLOY_HOST adicionado como secret
- [ ] DEPLOY_USER adicionado como secret
- [ ] DEPLOY_KEY adicionado como secret (base64)
- [ ] SLACK_WEBHOOK adicionado (opcional)
- [ ] Todos os 6 secrets visíveis em Settings → Secrets
- [ ] Valores dos secrets não aparecem em logs
- [ ] Secrets estarão disponíveis no GitHub Actions

---

## 📊 Resumo Visual

```
GitHub Repository
  └─ Settings
      └─ Secrets and variables
          └─ Actions
              ├─ DOCKER_USERNAME      ✓ docker_hub_user
              ├─ DOCKER_TOKEN         ✓ dckr_pat_...
              ├─ DEPLOY_HOST          ✓ prod.server.com
              ├─ DEPLOY_USER          ✓ deploy
              ├─ DEPLOY_KEY           ✓ base64_encoded_ssh_key
              └─ SLACK_WEBHOOK        ✓ https://hooks.slack.com/...
```

---

## 🎯 Próximo Passo

Depois de configurar todos os secrets:
→ **Phase 3: CI/CD Pipeline Test**
   - Faça push de um commit
   - Monitore o GitHub Actions workflow
   - Verifique todos os 5 jobs

---

## 📚 Referências

- Docker Hub Tokens: https://docs.docker.com/docker-hub/access-tokens/
- GitHub Secrets: https://docs.github.com/en/actions/security-guides/encrypted-secrets
- GitHub CLI: https://cli.github.com/
- SSH Keys: https://docs.github.com/en/authentication/connecting-to-github-with-ssh

---

**Status**: Phase 2 - GitHub Secrets Setup
Generated: 26 de Outubro de 2025
