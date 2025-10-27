# Phase 6: SSL/TLS Configuration - Guia Executivo

## 🎯 Objetivo

Configurar HTTPS com certificado Let's Encrypt válido, auto-renovação automática e redirecionar HTTP → HTTPS.

---

## 📋 Pré-requisitos

- [x] Phase 5 completado (aplicação em produção)
- [x] DNS apontando para o servidor (IMPORTANTE!)
- [x] Porta 80 e 443 acessíveis de fora
- [x] Domínio próprio (ex: seu_dominio.com)
- [x] SSH access ao servidor

---

## 🔧 Passo 1: Preparar Nginx para HTTPS

### Atualizar Nginx Configuration

```bash
# No servidor
ssh -i ~/.ssh/deploy_key deploy@seu_servidor_prod

# Editar arquivo nginx
sudo nano /etc/nginx/conf.d/default.conf
```

Substituir conteúdo por:

```nginx
# HTTP - Redirecionar para HTTPS
server {
    listen 80;
    server_name seu_dominio.com www.seu_dominio.com;
    
    # Let's Encrypt validation
    location /.well-known/acme-challenge/ {
        root /var/www/certbot;
    }
    
    # Redirect tudo para HTTPS
    location / {
        return 301 https://$server_name$request_uri;
    }
}

# HTTPS - Produção
server {
    listen 443 ssl http2;
    server_name seu_dominio.com www.seu_dominio.com;
    
    # SSL Certificates
    ssl_certificate /etc/letsencrypt/live/seu_dominio.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/seu_dominio.com/privkey.pem;
    
    # SSL Configuration
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    ssl_prefer_server_ciphers on;
    ssl_session_cache shared:SSL:10m;
    ssl_session_timeout 10m;
    
    # Security Headers
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    
    # Gzip compression
    gzip on;
    gzip_types text/plain text/css text/javascript application/json application/javascript;
    gzip_min_length 1000;
    gzip_level 6;
    
    # React Router support
    location / {
        root /usr/share/nginx/html;
        index index.html index.htm;
        try_files $uri $uri/ /index.html;
    }
    
    # Cache stático
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
        root /usr/share/nginx/html;
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
    
    # Health check endpoint
    location /health {
        access_log off;
        return 200 '{"status":"healthy"}';
        add_header Content-Type application/json;
    }
}
```

### Criar Diretórios para Certbot

```bash
# No servidor
sudo mkdir -p /var/www/certbot
sudo chmod -R 755 /var/www/certbot

# Recarregar Nginx
sudo nginx -t  # Testar configuração
sudo systemctl reload nginx
```

---

## 🔐 Passo 2: Instalar Certbot

### Instalar Certbot via Snap (Ubuntu/Debian)

```bash
# No servidor
sudo apt update
sudo apt install -y certbot python3-certbot-nginx

# Verificar instalação
certbot --version
```

### Obter Certificado Let's Encrypt

```bash
# No servidor
sudo certbot certonly --webroot \
  -w /var/www/certbot \
  -d seu_dominio.com \
  -d www.seu_dominio.com \
  --non-interactive \
  --agree-tos \
  --email seu_email@gmail.com

# Output esperado:
# Successfully received certificate.
# Certificate is saved at: /etc/letsencrypt/live/seu_dominio.com/fullchain.pem
# Key is saved at: /etc/letsencrypt/live/seu_dominio.com/privkey.pem
```

### Verificar Certificado

```bash
# No servidor
sudo certbot certificates

# Output esperado:
# - Domains: seu_dominio.com, www.seu_dominio.com
# - Expiry Date: 2026-01-26
# - Certificate Path: /etc/letsencrypt/live/seu_dominio.com/fullchain.pem
```

---

## 🔄 Passo 3: Configurar Auto-Renovação

### Ativar Auto-Renovação (systemd)

```bash
# No servidor
# Verificar se serviço existe
sudo systemctl list-timers | grep certbot

# Se não existir, criar
sudo systemctl enable certbot.timer
sudo systemctl start certbot.timer

# Verificar status
sudo systemctl status certbot.timer
```

### Testar Renovação

```bash
# No servidor
# Simular renovação (dry-run)
sudo certbot renew --dry-run

# Output esperado:
# Cert not yet due for renewal

# Ou se já testou antes:
# Congratulations, all renewals succeeded
```

### Configurar Renovação Manual (Alternativa)

```bash
# Adicionar ao crontab
sudo crontab -e

# Adicionar linha (verifica diariamente às 2h da manhã)
0 2 * * * /usr/bin/certbot renew --quiet && /usr/sbin/systemctl reload nginx
```

---

## 🌐 Passo 4: Configurar Redirecionamento HTTPS

### Docker Compose com Nginx SSL

Atualizar `docker-compose.production.yml`:

```yaml
version: '3.8'

services:
  frontend:
    image: seu_username/trading-app-frontend:1.0.0
    ports:
      - "80:80"
      - "443:443"
    environment:
      - NODE_ENV=production
      - REACT_APP_API_URL=https://seu_dominio.com
    volumes:
      - ./default.conf:/etc/nginx/conf.d/default.conf:ro
      - /etc/letsencrypt:/etc/letsencrypt:ro
      - /var/www/certbot:/var/www/certbot:ro
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost/health"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 40s
    restart: unless-stopped
    resources:
      limits:
        cpus: '2'
        memory: 1G
      reservations:
        cpus: '1'
        memory: 512M
```

### Atualizar Variáveis de Ambiente

```bash
# No servidor, editar .env.production
ssh -i ~/.ssh/deploy_key deploy@seu_servidor_prod

cat >> ~/trading-app/docker/.env.production << 'EOF'

# HTTPS Configuration
REACT_APP_API_URL=https://seu_dominio.com
REACT_APP_SECURE_COOKIES=true
NGINX_SSL_ENABLED=true
NGINX_REDIRECT_HTTP_TO_HTTPS=true
EOF

exit
```

---

## ✅ Passo 5: Testar HTTPS

### Testar Acesso HTTPS

```bash
# Testar HTTP (deve redirecionar)
curl -I http://seu_dominio.com/

# Output esperado:
# HTTP/1.1 301 Moved Permanently
# Location: https://seu_dominio.com/

# Testar HTTPS (deve retornar 200)
curl -I https://seu_dominio.com/

# Output esperado:
# HTTP/1.1 200 OK
# Strict-Transport-Security: max-age=31536000
# X-Frame-Options: SAMEORIGIN
```

### Verificar Certificado no Browser

```bash
# No seu computador
1. Abrir https://seu_dominio.com no browser
2. Clicar no ícone de cadeado
3. Ver "Certificate is valid"
4. Domínios listados corretamente
```

### Testar Segurança SSL

```bash
# Usar SSL Labs (online)
# Acesse: https://www.ssllabs.com/ssltest/analyze.html?d=seu_dominio.com

# Ou via CLI
echo | openssl s_client -servername seu_dominio.com -connect seu_dominio.com:443 2>/dev/null | openssl x509 -noout -dates

# Output esperado:
# notBefore=Oct 26 12:34:56 2025 GMT
# notAfter=Jan 24 12:34:56 2026 GMT
```

---

## 🔍 Passo 6: Monitorar Renovação

### Ver Próxima Renovação

```bash
# No servidor
sudo certbot certificates

# Procure por "Expiry Date"
# Ex: Expiry Date: 2026-01-24
```

### Ver Histórico de Renovações

```bash
# No servidor
sudo tail -50 /var/log/letsencrypt/letsencrypt.log

# Output esperado:
# INFO:certbot.renewal:Renewing certificate
# SUCCESS: All renewals succeeded
```

### Receber Avisos de Expiração

Let's Encrypt envia avisos por email 30, 14 e 7 dias antes de expirar.

Emails vão para: `seu_email@gmail.com` (registrado no certbot)

---

## 🚀 Passo 7: Deploy com HTTPS

### Executar Deploy Atualizado

```bash
# Na sua máquina local
./deploy.sh production 1.0.0

# Verificar se tudo rodou OK
curl -I https://seu_dominio.com/
```

### Verificar Logs Nginx SSL

```bash
# No servidor
docker exec trading-app-frontend nginx -t

# Ver logs SSL
docker logs trading-app-frontend | grep ssl

# Ou
sudo tail -20 /var/log/nginx/error.log
```

---

## ⚠️ Troubleshooting

### Erro: "Could not authenticate you with ACME server"

```bash
# Causa: DNS ainda não apontando para servidor
# Solução:
1. Verificar DNS foi propagado
   nslookup seu_dominio.com
   # Deve retornar IP do seu servidor

2. Verificar porta 80 acessível
   nmap -p 80 seu_dominio.com
   # Deve mostrar port 80/tcp open

3. Tentar novamente
   sudo certbot certonly --webroot -w /var/www/certbot -d seu_dominio.com
```

### Erro: "Timeout during connect"

```bash
# Causa: Firewall bloqueando porta 80 ou 443
# Solução:
# Verificar firewall rules
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw enable
```

### Erro: "Certificate verification failed"

```bash
# Causa: Certificado não reconhecido por navegador
# Solução:
1. Aguardar Let's Encrypt propagação (até 10 min)
2. Limpar cache navegador (Ctrl+Shift+Delete)
3. Tentar de novo
```

### Renovação não aconteceu

```bash
# Verificar status
sudo systemctl status certbot.timer

# Se desativado
sudo systemctl start certbot.timer
sudo systemctl enable certbot.timer

# Forçar renovação imediata
sudo certbot renew --force-renewal
```

---

## 🔐 Melhores Práticas

### 1. Certificado com Wildcard

```bash
# Para subdomínios também (*.seu_dominio.com)
sudo certbot certonly --webroot \
  -w /var/www/certbot \
  -d seu_dominio.com \
  -d www.seu_dominio.com \
  -d api.seu_dominio.com \
  -d *.seu_dominio.com
```

### 2. HSTS (Força HTTPS sempre)

```nginx
# Já configurado no arquivo de configuração
add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
```

### 3. Perfect Forward Secrecy

```nginx
# Já configurado
ssl_protocols TLSv1.2 TLSv1.3;
ssl_ciphers HIGH:!aNULL:!MD5;
ssl_prefer_server_ciphers on;
```

---

## ✅ Checklist de Conclusão

- [ ] DNS apontando para servidor
- [ ] Porta 80 e 443 acessíveis
- [ ] Nginx configuration atualizada
- [ ] Certbot instalado
- [ ] Certificado Let's Encrypt obtido
- [ ] Auto-renovação configurada
- [ ] HTTPS funcionando
- [ ] HTTP redireciona para HTTPS
- [ ] SSL Labs test: A ou A+
- [ ] Renovação testada (dry-run)
- [ ] Logs sem erros

---

## 🎯 Próximo Passo

Depois de HTTPS configurado:
→ **Phase 7: Monitoring Setup**
   - Setup Prometheus
   - Setup Grafana
   - Configure dashboards

---

## 📚 Referências

```bash
# Let's Encrypt
https://letsencrypt.org/

# Certbot documentação
https://certbot.eff.org/

# SSL Labs
https://www.ssllabs.com/ssltest/

# Mozilla SSL Configuration Generator
https://ssl-config.mozilla.org/
```

---

**Status**: Phase 6 - SSL/TLS Configuration
Generated: 26 de Outubro de 2025
Estimated Time: 15-20 minutes
