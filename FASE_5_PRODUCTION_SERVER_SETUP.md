═══════════════════════════════════════════════════════════════════════════════
                       📋 PHASE 5: PRODUCTION SERVER SETUP
                              Guia Completo
═══════════════════════════════════════════════════════════════════════════════

Este guia descreve como configurar um servidor de produção real para a aplicação
Trading APP com Docker, Nginx, SSL/TLS, Monitoring, e Backup automático.


═══════════════════════════════════════════════════════════════════════════════
                    1️⃣  REQUISITOS DO SERVIDOR
═══════════════════════════════════════════════════════════════════════════════

Mínimo Recomendado:
┌─────────────────────────────────────────────────────────┐
│ CPU:              2 vCPU (mínimo)                       │
│ RAM:              2-4 GB                                │
│ Storage:          20-30 GB (SSD recomendado)            │
│ Bandwida:         1 Mbps (mínimo)                       │
│ Uptime SLA:       99.5%+                                │
│ Firewall:         Sim                                   │
│ Backup:           Automático (diário)                   │
└─────────────────────────────────────────────────────────┘

Provedores Recomendados:
  • AWS EC2 (t3.small ou similar)
  • DigitalOcean (Droplet 2GB)
  • Linode (Nanode 1GB+)
  • Google Cloud (e2-medium)
  • Azure (B1s ou B2s)
  • Vultr (2GB Cloud Compute)

Sistema Operacional:
  • Ubuntu 22.04 LTS (recomendado)
  • Ubuntu 20.04 LTS
  • Debian 12
  • CentOS 8+


═══════════════════════════════════════════════════════════════════════════════
                    2️⃣  INSTALAÇÃO INICIAL DO SERVIDOR
═══════════════════════════════════════════════════════════════════════════════

PASSO 1: Conectar ao Servidor
──────────────────────────────

$ ssh root@seu-servidor.com

OU com chave SSH:

$ ssh -i ~/.ssh/trading-app-deploy ubuntu@seu-servidor.com


PASSO 2: Atualizar Sistema
───────────────────────────

$ sudo apt update
$ sudo apt upgrade -y
$ sudo apt install -y curl wget git ca-certificates gnupg lsb-release


PASSO 3: Instalar Docker
────────────────────────

$ curl -fsSL https://get.docker.com -o get-docker.sh
$ sudo sh get-docker.sh
$ sudo usermod -aG docker $USER
$ newgrp docker

Verificar:
$ docker --version
$ docker run hello-world


PASSO 4: Instalar Docker Compose
─────────────────────────────────

$ sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
$ sudo chmod +x /usr/local/bin/docker-compose
$ docker-compose --version


PASSO 5: Configurar Firewall
─────────────────────────────

$ sudo ufw enable
$ sudo ufw allow 22/tcp
$ sudo ufw allow 80/tcp
$ sudo ufw allow 443/tcp
$ sudo ufw status

OU com iptables:

$ sudo iptables -A INPUT -p tcp --dport 22 -j ACCEPT
$ sudo iptables -A INPUT -p tcp --dport 80 -j ACCEPT
$ sudo iptables -A INPUT -p tcp --dport 443 -j ACCEPT
$ sudo iptables -P INPUT DROP


PASSO 6: Configurar SSH para Deploy
────────────────────────────────────

$ sudo mkdir -p /home/deploy/.ssh
$ sudo chmod 700 /home/deploy/.ssh

Adicionar sua public key:
$ sudo nano /home/deploy/.ssh/authorized_keys
(Cole seu ~/.ssh/trading-app-deploy.pub)

$ sudo chmod 600 /home/deploy/.ssh/authorized_keys
$ sudo chown -R deploy:deploy /home/deploy/.ssh

Testar:
$ ssh -i ~/.ssh/trading-app-deploy deploy@seu-servidor.com


PASSO 7: Criar Diretórios de Aplicação
───────────────────────────────────────

$ sudo mkdir -p /app/trading-app
$ sudo mkdir -p /app/trading-app/data
$ sudo mkdir -p /app/trading-app/logs
$ sudo mkdir -p /app/trading-app/backups

$ sudo chown -R deploy:deploy /app/trading-app
$ sudo chmod 755 /app/trading-app


═══════════════════════════════════════════════════════════════════════════════
                    3️⃣  DEPLOYMENT INICIAL
═══════════════════════════════════════════════════════════════════════════════

PASSO 1: Clone do Repositório
──────────────────────────────

$ cd /app/trading-app
$ git clone https://github.com/Gladiston-Porto/Trading-APP.git .

OU via SSH (mais seguro):

$ git clone git@github.com:Gladiston-Porto/Trading-APP.git .


PASSO 2: Criar docker-compose.production.yml
──────────────────────────────────────────────

Copiar do repositório:
$ cp docker-compose.production.yml /app/trading-app/

OU criar manualmente (veja arquivo no repo)


PASSO 3: Configurar Environment Variables
──────────────────────────────────────────

$ cat > /app/trading-app/.env.production << 'EOF'
NODE_ENV=production
APP_NAME=Trading-APP
APP_PORT=3001
DOCKER_REGISTRY=docker.io
DOCKER_USERNAME=gladistonporto
DOCKER_IMAGE=trading-app-frontend
IMAGE_TAG=latest
NGINX_WORKERS=auto
BACKUP_ENABLED=true
BACKUP_INTERVAL=0 3 * * *  # 3 AM daily
LOG_LEVEL=info
EOF

$ chmod 600 /app/trading-app/.env.production


PASSO 4: Fazer Login no Docker Hub
───────────────────────────────────

$ docker login -u gladistonporto
(Enter personal access token when prompted)


PASSO 5: Puxar & Iniciar Containers
────────────────────────────────────

$ cd /app/trading-app
$ docker-compose -f docker-compose.production.yml pull
$ docker-compose -f docker-compose.production.yml up -d

Verificar:
$ docker ps
$ docker-compose logs -f


═══════════════════════════════════════════════════════════════════════════════
                    4️⃣  NGINX REVERSE PROXY SETUP
═══════════════════════════════════════════════════════════════════════════════

PASSO 1: Instalar Nginx
───────────────────────

$ sudo apt install -y nginx


PASSO 2: Criar Configuração
────────────────────────────

$ sudo nano /etc/nginx/sites-available/trading-app

Cole:

server {
    listen 80;
    listen [::]:80;
    server_name seu-dominio.com www.seu-dominio.com;

    # Redirecionar HTTP para HTTPS (depois de configurar SSL)
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name seu-dominio.com www.seu-dominio.com;

    # SSL Certificates (configure com Let's Encrypt - Phase 6)
    # ssl_certificate /etc/letsencrypt/live/seu-dominio.com/fullchain.pem;
    # ssl_certificate_key /etc/letsencrypt/live/seu-dominio.com/privkey.pem;

    # SSL Configuration
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    ssl_prefer_server_ciphers on;

    # Security Headers
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-Frame-Options "DENY" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;

    # Logging
    access_log /var/log/nginx/trading-app-access.log;
    error_log /var/log/nginx/trading-app-error.log;

    # Gzip Compression
    gzip on;
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml;
    gzip_vary on;
    gzip_min_length 1024;

    # Proxy Settings
    location / {
        proxy_pass http://localhost:3001;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        
        # Timeouts
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;

        # Buffering
        proxy_buffering on;
        proxy_buffer_size 4k;
        proxy_buffers 8 4k;
        proxy_busy_buffers_size 8k;
    }

    # Health Check Endpoint
    location /health {
        proxy_pass http://localhost:3001;
        access_log off;
    }

    # Static Assets (optional caching)
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
        proxy_pass http://localhost:3001;
        proxy_cache_valid 200 365d;
        expires 365d;
        add_header Cache-Control "public, immutable";
    }
}


PASSO 3: Ativar o Site
──────────────────────

$ sudo ln -s /etc/nginx/sites-available/trading-app /etc/nginx/sites-enabled/
$ sudo rm -f /etc/nginx/sites-enabled/default

Testar Sintaxe:
$ sudo nginx -t

Recarregar:
$ sudo systemctl restart nginx


═══════════════════════════════════════════════════════════════════════════════
                    5️⃣  HEALTH CHECK & MONITORING
═══════════════════════════════════════════════════════════════════════════════

PASSO 1: Criar Health Check Script
───────────────────────────────────

$ cat > /app/trading-app/health-check.sh << 'EOF'
#!/bin/bash

set -e

HEALTH_URL="http://localhost:3001"
TIMEOUT=5
MAX_RETRIES=3
RETRY_DELAY=2

check_health() {
    local retry=0
    
    while [ $retry -lt $MAX_RETRIES ]; do
        if curl -sf --max-time $TIMEOUT "$HEALTH_URL" > /dev/null 2>&1; then
            echo "✅ Application is healthy"
            return 0
        fi
        
        retry=$((retry + 1))
        echo "⚠️  Health check attempt $retry/$MAX_RETRIES failed"
        
        if [ $retry -lt $MAX_RETRIES ]; then
            sleep $RETRY_DELAY
        fi
    done
    
    echo "❌ Application is UNHEALTHY"
    return 1
}

check_health
EOF

$ chmod +x /app/trading-app/health-check.sh


PASSO 2: Criar Cron Job para Health Checks
────────────────────────────────────────────

$ (crontab -l 2>/dev/null; echo "*/5 * * * * /app/trading-app/health-check.sh >> /app/trading-app/logs/health-check.log 2>&1") | crontab -

(Verifica saúde a cada 5 minutos)


PASSO 3: Monitorar com systemd
───────────────────────────────

$ sudo cat > /etc/systemd/system/trading-app.service << 'EOF'
[Unit]
Description=Trading APP Docker Container
After=docker.service
Requires=docker.service

[Service]
Type=oneshot
WorkingDirectory=/app/trading-app
ExecStart=/usr/bin/docker-compose -f docker-compose.production.yml up -d
ExecStop=/usr/bin/docker-compose -f docker-compose.production.yml down
RemainAfterExit=yes
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
EOF

$ sudo systemctl daemon-reload
$ sudo systemctl enable trading-app
$ sudo systemctl status trading-app


═══════════════════════════════════════════════════════════════════════════════
                    6️⃣  LOGGING & LOG ROTATION
═══════════════════════════════════════════════════════════════════════════════

PASSO 1: Configure Log Rotation
────────────────────────────────

$ sudo cat > /etc/logrotate.d/trading-app << 'EOF'
/var/log/nginx/trading-app*.log {
    daily
    missingok
    rotate 14
    compress
    delaycompress
    notifempty
    create 0640 www-data www-data
    sharedscripts
    postrotate
        if [ -f /var/run/nginx.pid ]; then
            kill -USR1 `cat /var/run/nginx.pid`
        fi
    endscript
}

/app/trading-app/logs/*.log {
    daily
    missingok
    rotate 7
    compress
    delaycompress
    notifempty
    create 0640 deploy deploy
}
EOF

Testar:
$ sudo logrotate -d /etc/logrotate.d/trading-app


═══════════════════════════════════════════════════════════════════════════════
                    7️⃣  BACKUP STRATEGY
═══════════════════════════════════════════════════════════════════════════════

PASSO 1: Criar Script de Backup
────────────────────────────────

$ cat > /app/trading-app/backup.sh << 'EOF'
#!/bin/bash

BACKUP_DIR="/app/trading-app/backups"
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="$BACKUP_DIR/trading-app-backup-$DATE.tar.gz"
RETENTION_DAYS=30

# Create backup
echo "Creating backup: $BACKUP_FILE"
tar -czf "$BACKUP_FILE" \
    /app/trading-app/docker-compose.production.yml \
    /app/trading-app/.env.production \
    /app/trading-app/data \
    /app/trading-app/logs \
    /var/log/nginx/trading-app*.log

if [ -f "$BACKUP_FILE" ]; then
    echo "✅ Backup created successfully"
    
    # Remove old backups
    find "$BACKUP_DIR" -name "*.tar.gz" -mtime +$RETENTION_DAYS -delete
    echo "Cleaned up backups older than $RETENTION_DAYS days"
else
    echo "❌ Backup failed"
    exit 1
fi
EOF

$ chmod +x /app/trading-app/backup.sh


PASSO 2: Criar Cron Job para Backup
────────────────────────────────────

$ (crontab -l 2>/dev/null; echo "0 2 * * * /app/trading-app/backup.sh >> /app/trading-app/logs/backup.log 2>&1") | crontab -

(Backup diário às 2 AM)


═══════════════════════════════════════════════════════════════════════════════
                    8️⃣  DEPLOYMENT AUTOMATION
═══════════════════════════════════════════════════════════════════════════════

O GitHub Actions Workflow (Phase 3) já está configurado para fazer deploy
automaticamente quando você faz push para main.

Processo Automático:
1. Push para main
2. GitHub Actions builds image
3. Push para Docker Hub
4. Deploy job executa SSH script
5. Servidor puxa nova imagem
6. Containers restartam
7. Health checks validam

IMPORTANTE: Configure os secrets no GitHub:
  • DEPLOY_HOST = seu-servidor.com
  • DEPLOY_USER = deploy
  • DEPLOY_KEY = SSH private key (Base64)
  • DEPLOY_PORT = 22


═══════════════════════════════════════════════════════════════════════════════
                    9️⃣  MAINTENANCE CHECKLIST
═══════════════════════════════════════════════════════════════════════════════

Diariamente:
  ☐ Verificar container status: docker ps
  ☐ Revisar logs de erro: docker logs trading-app-production
  ☐ Verificar backups foram criados
  
Semanalmente:
  ☐ Revisar uso de disco: df -h
  ☐ Revisar uso de memória: free -h
  ☐ Verificar segurança: fail2ban status
  
Mensalmente:
  ☐ Atualizar sistema: sudo apt update && sudo apt upgrade
  ☐ Revisar segurança: sudo ss -tulpn
  ☐ Testar restore de backup
  
Trimestralmente:
  ☐ Atualizar certificado SSL (automático com Let's Encrypt)
  ☐ Revisar access logs
  ☐ Performance tuning
  
Anualmente:
  ☐ Audit completo de segurança
  ☐ Disaster recovery drill


═══════════════════════════════════════════════════════════════════════════════
                    🔟 TROUBLESHOOTING
═══════════════════════════════════════════════════════════════════════════════

Problema: Container não inicia
─────────────────────────────────
$ docker logs trading-app-production
$ docker inspect trading-app-production
$ docker-compose -f docker-compose.production.yml up


Problema: Nginx não consegue conectar ao container
───────────────────────────────────────────────────
$ docker ps
$ curl http://localhost:3001
$ docker network ls


Problema: Sem espaço em disco
────────────────────────────────
$ docker system prune
$ docker system prune -a --volumes
$ df -h


Problema: Porta 80/443 em uso
──────────────────────────────
$ sudo ss -tulpn | grep LISTEN
$ sudo lsof -i :80
$ sudo lsof -i :443


═══════════════════════════════════════════════════════════════════════════════
                    Próxima Fase: Phase 6 - SSL/TLS
═══════════════════════════════════════════════════════════════════════════════

Com o servidor configurado, próximo será:
  1. Instalar Certbot
  2. Gerar certificado Let's Encrypt
  3. Configurar auto-renewal
  4. Setup HTTPS obrigatório


═══════════════════════════════════════════════════════════════════════════════
