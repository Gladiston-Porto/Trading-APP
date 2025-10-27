# Phase 5: Production Deployment - Guia Executivo

## 🎯 Objetivo

Fazer deploy da aplicação em um servidor de produção usando o script `deploy.sh` automatizado, com verificações de saúde, notificações e capacidade de rollback.

---

## 📋 Pré-requisitos

Antes de fazer deploy em produção:

- [x] Phase 1 completado (imagem no Docker Hub)
- [x] Phase 2 completado (GitHub secrets configurados)
- [x] Phase 3 completado (CI/CD pipeline rodou com sucesso)
- [x] Phase 4 completado (testes locais passaram)
- [x] Servidor de produção preparado (com Docker e Docker Compose)
- [x] SSH access configurado
- [x] Firewall rules configuradas (portas 80, 443 abertas)
- [x] DNS apontando para servidor prod (opcional)

---

## 🔧 Passo 1: Preparar Servidor de Produção

### Verificar Conectividade SSH

```bash
# Testar SSH no servidor
ssh -i ~/.ssh/deploy_key deploy@seu_servidor_prod

# Output esperado:
# Welcome to Ubuntu 20.04 LTS
# Last login: ...
```

### Instalar Dependências no Servidor

```bash
# Conectar ao servidor
ssh -i ~/.ssh/deploy_key deploy@seu_servidor_prod

# Instalar Docker (se não tiver)
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# Instalar Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/download/v2.20.0/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

# Verificar instalação
docker --version
docker-compose --version

# Sair do servidor
exit
```

### Criar Diretório de Deploy

```bash
# No servidor de produção
ssh -i ~/.ssh/deploy_key deploy@seu_servidor_prod

# Criar estrutura
mkdir -p ~/trading-app/docker
mkdir -p ~/trading-app/backups
mkdir -p ~/trading-app/logs

# Definir permissões
chmod 755 ~/trading-app
chmod 755 ~/trading-app/docker

exit
```

---

## 🚀 Passo 2: Preparar Arquivo de Configuração

### Copiar docker-compose.production.yml

```bash
# Na sua máquina local
scp -i ~/.ssh/deploy_key docker-compose.production.yml \
  deploy@seu_servidor_prod:~/trading-app/docker/

# Verificar
ssh -i ~/.ssh/deploy_key deploy@seu_servidor_prod \
  "ls -lh ~/trading-app/docker/"
```

### Criar .env.production no Servidor

```bash
# Na sua máquina local
ssh -i ~/.ssh/deploy_key deploy@seu_servidor_prod << 'EOF'

cat > ~/trading-app/docker/.env.production << 'ENVFILE'
# Docker Configuration
DOCKER_USERNAME=seu_username
DOCKER_REGISTRY=docker.io
IMAGE_TAG=1.0.0

# Node Environment
NODE_ENV=production

# API Configuration
REACT_APP_API_URL=https://seu_dominio.com:8080
REACT_APP_API_TIMEOUT=30000

# Feature Flags
REACT_APP_ENABLE_CHARTS=true
REACT_APP_ENABLE_THEME=true
REACT_APP_ENABLE_NOTIFICATIONS=true
REACT_APP_ENABLE_EXPORT=true

# Security
REACT_APP_CSP_ENABLED=true
REACT_APP_SECURE_COOKIES=true
REACT_APP_RATE_LIMIT=100

# Performance
NGINX_GZIP_LEVEL=6
CACHE_TTL=3600

# Monitoring
PROMETHEUS_ENABLED=false
GRAFANA_ENABLED=false
ENVFILE

chmod 600 ~/trading-app/docker/.env.production
EOF
```

---

## 📥 Passo 3: Deploy Usando deploy.sh

### Executar Deploy

```bash
# No seu computador local
./deploy.sh production 1.0.0

# Output esperado:
# ✓ Prerequisites check
# ✓ Docker login
# ✓ Pull image from registry
# ✓ Backup current deployment
# ✓ Stop services
# ✓ Start services
# ✓ Health checks passing
# ✓ Smoke tests passed
# ✓ Deployment successful
```

### Opções de Deploy

```bash
# Deploy normal
./deploy.sh production 1.0.0

# Fazer rollback (reverter para versão anterior)
./deploy.sh production --rollback

# Teste seco (simula sem fazer deploy real)
./deploy.sh production 1.0.0 --dry-run

# Com logs detalhados
./deploy.sh production 1.0.0 --verbose

# Todas as opções
./deploy.sh --help
```

---

## 🏥 Passo 4: Verificações de Saúde

### Verificar Status do Container

```bash
# No servidor
ssh -i ~/.ssh/deploy_key deploy@seu_servidor_prod

# Ver containers rodando
docker ps

# Output esperado:
# CONTAINER ID   IMAGE                STATUS         PORTS
# abc123def456   seu_username/...     Up 2 minutes   0.0.0.0:80->80/tcp

# Ver logs
docker logs trading-app-frontend

# Ver health status
docker inspect trading-app-frontend | grep -A 10 Health

# Sair
exit
```

### Testar Conectividade HTTP

```bash
# Testar health endpoint
curl http://seu_servidor_prod/health

# Output esperado:
# {"status":"healthy","uptime":120}

# Testar home page
curl -I http://seu_servidor_prod/

# Output esperado:
# HTTP/1.1 200 OK
# Content-Type: text/html
# Cache-Control: public, max-age=3600
```

---

## 🔄 Passo 5: Procedimentos de Rollback

### Rollback Automático (Falha no Deploy)

Se algo der errado durante o deploy, o script `deploy.sh` faz rollback automático:

```bash
# O script verifica:
1. Health checks passam?
2. Smoke tests passam?
3. Aplicação está acessível?

# Se algum falhar → Rollback automático
# Restaura versão anterior de backup
```

### Rollback Manual

```bash
# Se precisar fazer rollback manualmente
./deploy.sh production --rollback

# Isso vai:
1. Parar serviços atuais
2. Restaurar de backup anterior
3. Iniciar serviços restaurados
4. Verificar health checks
```

### Listar Backups

```bash
# No servidor
ssh -i ~/.ssh/deploy_key deploy@seu_servidor_prod

ls -lh ~/trading-app/backups/

# Output esperado:
# backup_20251026_143022/
# backup_20251026_142515/
# backup_20251026_142001/

exit
```

---

## 📊 Passo 6: Monitoramento Pós-Deploy

### Monitorar Logs em Tempo Real

```bash
# No servidor
ssh -i ~/.ssh/deploy_key deploy@seu_servidor_prod

# Ver logs do container
docker logs -f trading-app-frontend

# Pressione Ctrl+C para sair
```

### Verificar Métricas

```bash
# Ver uso de recursos
docker stats trading-app-frontend

# Output esperado:
# CONTAINER       CPU %    MEM USAGE / LIMIT
# trading-app...  0.5%     45 MiB / 1 GiB

# Pressione Ctrl+C para sair
```

### Testar Funcionalidades

```bash
# Teste endpoints principais
curl http://seu_servidor_prod/
curl http://seu_servidor_prod/health
curl http://seu_servidor_prod/api/status

# Verificar CSS
curl -I http://seu_servidor_prod/assets/index.css

# Verificar JS
curl -I http://seu_servidor_prod/assets/index.js
```

---

## 🔔 Passo 7: Notificações

### Configurar Slack Webhook

Se você tem um webhook do Slack, o deploy.sh envia notificações:

```bash
# Adicionar webhook nos secrets do GitHub
# Deploy.sh puxa automaticamente

# Ou defina localmente:
export SLACK_WEBHOOK="https://hooks.slack.com/services/YOUR/WEBHOOK/URL"

./deploy.sh production 1.0.0
```

### Tipos de Notificações

```
✅ Deploy started
📦 Image pulled
🚀 Services started
✓ Health checks passed
🎉 Deployment successful

ou

❌ Deploy failed
🔄 Rollback initiated
✓ Rollback successful
```

---

## ✅ Checklist de Conclusão

- [ ] SSH access testado
- [ ] Docker/Docker Compose instalados no servidor
- [ ] Diretórios criados
- [ ] docker-compose.production.yml copiado
- [ ] .env.production criado
- [ ] Deploy executado com sucesso
- [ ] Health checks passando
- [ ] Aplicação acessível via HTTP
- [ ] Logs sem erros
- [ ] Rollback testado (opcional)
- [ ] Slack notificações recebidas

---

## ⚠️ Troubleshooting

### Erro: "SSH connection refused"
```bash
# Causa: SSH key errada ou servidor não acessível
# Solução:
ssh -i ~/.ssh/deploy_key -v deploy@seu_servidor_prod

# Verificar IP/hostname está correto
ping seu_servidor_prod
```

### Erro: "Docker pull rate limit exceeded"
```bash
# Causa: Muitos pulls do Docker Hub (limite)
# Solução:
# 1. Esperar 6 horas
# 2. Usar Docker Pro account
# 3. Usar registry privado
```

### Erro: "Health check failed"
```bash
# Causa: Container não respondendo em /health
# Solução:
docker logs trading-app-frontend
# Verificar logs para erro específico
```

### Container não inicia
```bash
# Causa: Porta em uso, memória insuficiente, etc
# Solução:
docker ps -a
docker inspect trading-app-frontend
docker logs trading-app-frontend
```

---

## 🎯 Próximo Passo

Depois que o deploy estiver OK:
→ **Phase 6: SSL/TLS Configuration**
   - Setup Let's Encrypt
   - Nginx SSL configuration
   - Auto-renewal

---

## 📚 Referências

```bash
# Deploy script ajuda
./deploy.sh --help

# Docker referência
docker --help
docker-compose --help

# SSH troubleshooting
ssh -v connect_string
```

---

**Status**: Phase 5 - Production Deployment
Generated: 26 de Outubro de 2025
Estimated Time: 15-20 minutes
