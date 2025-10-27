# Phase 4: Local Production Test - Guia Executivo

## 🎯 Objetivo

Testar a configuração de produção **localmente** antes de fazer deploy em um servidor real. Isso garante que:

- ✅ `docker-compose.production.yml` funciona corretamente
- ✅ Variáveis de ambiente estão corretas
- ✅ Health checks passam
- ✅ Container inicia sem erros
- ✅ Aplicação está acessível

---

## 📋 Pré-requisitos

Certifique-se que:

- [x] Docker está instalado e rodando
- [x] Docker Compose está instalado (`docker-compose --version`)
- [x] Imagem Docker está built localmente (`docker images | grep trading-app-frontend`)
- [x] Arquivo `docker-compose.production.yml` existe
- [x] Arquivo `.env.production.example` existe

### Verificar Pré-requisitos

```bash
# Verificar Docker
docker --version
# Output: Docker version 24.0.0, build abc123

# Verificar Docker Compose
docker-compose --version
# Output: Docker Compose version v2.20.0

# Verificar imagem
docker images | grep trading-app-frontend
# Output: trading-app-frontend   latest   21396a26a51f   81.3MB

# Verificar arquivos
ls -la /Users/gladistonporto/Acoes/docker-compose.production.yml
ls -la /Users/gladistonporto/Acoes/.env.production.example
```

---

## 🔧 Passo 1: Preparar Arquivo de Ambiente

### Copiar Template

```bash
# Navegar para o diretório do projeto
cd /Users/gladistonporto/Acoes

# Copiar o template para arquivo de produção
cp .env.production.example .env.production

# Verificar arquivo criado
ls -la .env.production
```

### Editar Variáveis de Ambiente

```bash
# Abrir arquivo em editor de texto
nano .env.production
# ou use seu editor favorito

# Ou edite via comando (macOS/Linux):
cat > .env.production << 'EOF'
# Docker Configuration
DOCKER_USERNAME=seu_username
DOCKER_REGISTRY=docker.io
IMAGE_TAG=1.0.0

# Node Environment
NODE_ENV=production

# API Configuration
REACT_APP_API_URL=http://localhost:8080
REACT_APP_API_TIMEOUT=30000

# Feature Flags
REACT_APP_ENABLE_CHARTS=true
REACT_APP_ENABLE_THEME=true
REACT_APP_ENABLE_NOTIFICATIONS=true
REACT_APP_ENABLE_EXPORT=true

# Analytics (Optional)
REACT_APP_SENTRY_DSN=
REACT_APP_ANALYTICS_ID=

# Security
REACT_APP_CSP_ENABLED=true
REACT_APP_SECURE_COOKIES=true
REACT_APP_RATE_LIMIT=100

# Backend Services (Optional)
BACKEND_API_URL=http://backend:3001
REDIS_URL=redis://redis:6379
DATABASE_URL=

# Notifications (Optional)
SLACK_WEBHOOK_URL=

# SSL/TLS (Optional)
SSL_CERT_PATH=/etc/nginx/certs/cert.pem
SSL_KEY_PATH=/etc/nginx/certs/key.pem

# Performance
NGINX_GZIP_LEVEL=6
CACHE_TTL=3600

# Monitoring (Optional)
PROMETHEUS_ENABLED=false
GRAFANA_ENABLED=false

EOF

# Verificar conteúdo
cat .env.production
```

---

## 🔧 Passo 2: Verificar docker-compose.production.yml

```bash
# Verificar sintaxe do arquivo
docker-compose -f docker-compose.production.yml config

# Output esperado:
# services:
#   frontend:
#     image: docker.io/seu_username/trading-app-frontend:1.0.0
#     ports:
#     - 80:80
#     environment:
#       - NODE_ENV=production
#     ...
```

### Conteúdo Esperado do Arquivo

```yaml
version: '3.8'

services:
  frontend:
    image: docker.io/username/trading-app-frontend:1.0.0
    container_name: trading-app-frontend
    ports:
      - "80:80"
    environment:
      - NODE_ENV=production
    restart: always
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost/health"]
      interval: 30s
      timeout: 5s
      retries: 3
      start_period: 10s
    resources:
      limits:
        cpus: '2'
        memory: 1G
      reservations:
        cpus: '1'
        memory: 512M
    logging:
      driver: json-file
      options:
        max-size: "100m"
        max-file: "10"
    security_opt:
      - no-new-privileges:true
    cap_drop:
      - ALL
```

---

## 🚀 Passo 3: Iniciar os Serviços

### Opção 1: Iniciar em Modo Background (Recomendado)

```bash
# Navegar para o diretório
cd /Users/gladistonporto/Acoes

# Iniciar os serviços
docker-compose -f docker-compose.production.yml up -d

# Output esperado:
# [+] Running 1/1
#  ✔ Container trading-app-frontend  Started
```

### Opção 2: Iniciar em Modo Foreground (Debug)

```bash
# Útil para ver logs em tempo real
docker-compose -f docker-compose.production.yml up

# Press Ctrl+C para parar

# Output esperado:
# [+] Running 1/1
#  ✔ Container trading-app-frontend  Started
# Attaching to trading-app-frontend
# trading-app-frontend  | nginx: master process started
# trading-app-frontend  | 2024-10-26 20:15:30 [info] listening on port 80
```

---

## 🔍 Passo 4: Verificar Status do Container

### Ver Status

```bash
# Listar containers rodando
docker ps

# Output esperado:
# CONTAINER ID   IMAGE                                           PORTS      STATUS
# abc123def456   docker.io/username/trading-app-frontend:1.0.0   0.0.0.0:80->80/tcp   Up 2 minutes (healthy)

# Ver mais detalhes
docker ps -a
```

### Inspecionar Container

```bash
# Ver informações completas
docker inspect trading-app-frontend

# Extrair informações específicas
docker inspect trading-app-frontend | grep -E "(Status|State|Health)" -A 5
```

---

## 🏥 Passo 5: Verificar Health Check

O health check é executado automaticamente a cada 30 segundos.

### Ver Status do Health Check

```bash
# Método 1: Docker ps
docker ps --format "table {{.Names}}\t{{.Status}}"

# Output esperado:
# NAMES                     STATUS
# trading-app-frontend      Up 5 minutes (healthy)

# Método 2: Docker inspect
docker inspect --format='{{json .State.Health}}' trading-app-frontend | python -m json.tool

# Output esperado:
# {
#   "Status": "healthy",
#   "FailingStreak": 0,
#   "Log": [
#     {
#       "Start": "2024-10-26T20:15:50.123456789Z",
#       "End": "2024-10-26T20:15:50.234567890Z",
#       "ExitCode": 0,
#       "Output": "HTTP/1.1 200 OK"
#     }
#   ]
# }

# Método 3: Ver logs do health check
docker logs trading-app-frontend | grep -i health
```

---

## 🌐 Passo 6: Testar Conectividade

### Teste 1: Acessar a Aplicação via HTTP

```bash
# Fazer requisição GET para home
curl http://localhost/

# Output esperado:
# <!DOCTYPE html>
# <html>
# <head>
#   <title>Trading App</title>
#   ...
# </html>

# Alternativa: Usar -I para ver headers
curl -I http://localhost/

# Output esperado:
# HTTP/1.1 200 OK
# Server: nginx/1.24
# Content-Type: text/html; charset=utf-8
# Content-Length: 1234
# Cache-Control: public, max-age=3600
```

### Teste 2: Verificar Health Endpoint

```bash
# Chamar health check endpoint
curl http://localhost/health

# Output esperado:
# {"status":"healthy","timestamp":"2024-10-26T20:16:00Z","uptime":120}

# Ou com verbose
curl -v http://localhost/health

# Output esperado:
# > GET /health HTTP/1.1
# > Host: localhost
# > User-Agent: curl/7.64.1
# >
# < HTTP/1.1 200 OK
# < Content-Type: application/json
# <
# {"status":"healthy"}
```

### Teste 3: Verificar Assets

```bash
# Verificar se CSS está sendo servido
curl -I http://localhost/assets/index.css 2>/dev/null | head -5

# Output esperado:
# HTTP/1.1 200 OK
# Content-Type: text/css
# Cache-Control: public, max-age=31536000

# Verificar se JavaScript está sendo servido
curl -I http://localhost/assets/index.js 2>/dev/null | head -5

# Output esperado:
# HTTP/1.1 200 OK
# Content-Type: text/javascript
```

### Teste 4: Verificar Compression

```bash
# Verificar se gzip está habilitado
curl -H "Accept-Encoding: gzip" -I http://localhost/ | grep -i encoding

# Output esperado:
# Content-Encoding: gzip
```

---

## 📊 Passo 7: Analisar Recursos

### Ver Uso de CPU e Memória

```bash
# Monitorar recursos em tempo real
docker stats trading-app-frontend

# Output esperado:
# CONTAINER ID   NAME                      CPU %     MEM USAGE / LIMIT
# abc123def456   trading-app-frontend      0.5%      45.2 MiB / 1GiB

# Pressione Ctrl+C para parar

# Alternativa: Ver histórico
docker stats --no-stream

# Ver limite de recursos
docker inspect trading-app-frontend | grep -A 10 '"Memory"'
```

### Ver Logs

```bash
# Ver últimas 50 linhas de logs
docker logs --tail 50 trading-app-frontend

# Ver logs com timestamps
docker logs -t trading-app-frontend

# Acompanhar logs em tempo real
docker logs -f trading-app-frontend

# Press Ctrl+C para parar

# Filtrar por padrão
docker logs trading-app-frontend | grep -i error
```

---

## 🛑 Passo 8: Parar os Serviços

### Parar com Preservação (Dados)

```bash
# Parar os serviços (mantém containers)
docker-compose -f docker-compose.production.yml stop

# Output esperado:
# [+] Stopping 1/1
#  ✔ Container trading-app-frontend  Stopped

# Ver containers parados
docker ps -a
```

### Remover Containers

```bash
# Remover containers (limpa dados de container)
docker-compose -f docker-compose.production.yml down

# Output esperado:
# [+] Removing 1/1
#  ✔ Container trading-app-frontend  Removed
#  ✔ Network acoes_default           Removed

# Verificar remoção
docker ps -a
```

### Remover Volumes (Se Necessário)

```bash
# Remover tudo incluindo volumes
docker-compose -f docker-compose.production.yml down -v

# ⚠️ Cuidado: Isso remove dados persistentes
```

---

## 🧪 Passo 9: Testes Automatizados

### Script de Teste Completo

```bash
#!/bin/bash

echo "🧪 INICIANDO TESTES DE PRODUÇÃO..."

# Teste 1: Health Check
echo "1️⃣  Testando Health Check..."
HEALTH=$(curl -s http://localhost/health | grep -o '"status":"healthy"')
if [ -n "$HEALTH" ]; then
    echo "✅ Health Check: PASSOU"
else
    echo "❌ Health Check: FALHOU"
    exit 1
fi

# Teste 2: Home Page
echo "2️⃣  Testando Home Page..."
HOME=$(curl -s -o /dev/null -w "%{http_code}" http://localhost/)
if [ "$HOME" = "200" ]; then
    echo "✅ Home Page: PASSOU"
else
    echo "❌ Home Page: FALHOU (HTTP $HOME)"
    exit 1
fi

# Teste 3: CSS Assets
echo "3️⃣  Testando CSS Assets..."
CSS=$(curl -s -o /dev/null -w "%{http_code}" http://localhost/assets/index.css)
if [ "$CSS" = "200" ]; then
    echo "✅ CSS Assets: PASSOU"
else
    echo "❌ CSS Assets: FALHOU (HTTP $CSS)"
    exit 1
fi

# Teste 4: Gzip Compression
echo "4️⃣  Testando Gzip Compression..."
GZIP=$(curl -s -H "Accept-Encoding: gzip" -I http://localhost/ | grep -i "content-encoding: gzip")
if [ -n "$GZIP" ]; then
    echo "✅ Gzip Compression: PASSOU"
else
    echo "❌ Gzip Compression: FALHOU"
    exit 1
fi

# Teste 5: Response Time
echo "5️⃣  Testando Response Time..."
RESPONSE_TIME=$(curl -s -o /dev/null -w "%{time_total}" http://localhost/)
echo "   Response time: ${RESPONSE_TIME}s"
if (( $(echo "$RESPONSE_TIME < 1" | bc -l) )); then
    echo "✅ Response Time: PASSOU (< 1s)"
else
    echo "⚠️  Response Time: LENTO (> 1s)"
fi

echo ""
echo "🎉 TODOS OS TESTES PASSARAM!"
```

Salvar como `test-production.sh`:

```bash
chmod +x test-production.sh
./test-production.sh
```

---

## ✅ Checklist de Sucesso

- [ ] `.env.production` criado com variáveis corretas
- [ ] `docker-compose.production.yml` valida
- [ ] Container iniciou sem erros
- [ ] Container está em status "healthy"
- [ ] HTTP 200 na home page
- [ ] Health endpoint respondendo
- [ ] Assets (CSS/JS) sendo servidos
- [ ] Gzip compression ativo
- [ ] Response time < 1 segundo
- [ ] Recursos dentro dos limites
- [ ] Logs sem erros

---

## 📊 Resumo de Testes

| Teste | Comando | Status |
|-------|---------|--------|
| Container Status | `docker ps` | ✓ |
| Health Check | `curl /health` | ✓ |
| Home Page | `curl /` | ✓ |
| CSS Assets | `curl /assets/index.css` | ✓ |
| JS Assets | `curl /assets/index.js` | ✓ |
| Gzip | `curl -H "Accept-Encoding: gzip" -I /` | ✓ |
| Response Time | `curl -o /dev/null -w %{time_total} /` | ✓ |
| Memory Usage | `docker stats` | ✓ |
| CPU Usage | `docker stats` | ✓ |

---

## 🎯 Próximo Passo

Depois que os testes locais passarem:
→ **Phase 5: Production Deployment**
   - Deploy em servidor real
   - Configure DNS (se necessário)
   - Setup SSL/TLS

---

## 🚀 Quick Commands

```bash
# Start production containers
docker-compose -f docker-compose.production.yml up -d

# Check status
docker ps
docker inspect trading-app-frontend | grep "State\|Health" -A 10

# Test connectivity
curl http://localhost/
curl http://localhost/health

# View logs
docker logs -f trading-app-frontend

# Stop containers
docker-compose -f docker-compose.production.yml down
```

---

**Status**: Phase 4 - Local Production Test
Generated: 26 de Outubro de 2025
