# Task 12: Final Execution - Docker Hub & GitHub Setup

## 🚀 FASE DE EXECUÇÃO - Passos Práticos

### PASSO 1: Docker Hub Push (5 min)

#### 1.1 Criar conta no Docker Hub (se necessário)
```bash
# Go to: https://hub.docker.com
# Create account or login
# Generate Personal Access Token:
#   Settings → Security → New Access Token
```

#### 1.2 Tag da imagem
```bash
# Tag com versão
docker tag trading-app-frontend:latest \
  YOUR_USERNAME/trading-app-frontend:1.0.0

# Tag como latest
docker tag trading-app-frontend:latest \
  YOUR_USERNAME/trading-app-frontend:latest

# Verificar tags
docker images | grep trading-app
```

#### 1.3 Login no Docker Hub
```bash
# Login com token
docker login docker.io

# Username: YOUR_USERNAME
# Password: YOUR_TOKEN (not password!)
# Login Succeeded

# Verify
docker info | grep Username
```

#### 1.4 Push para registry
```bash
# Push versão específica
docker push YOUR_USERNAME/trading-app-frontend:1.0.0

# Push latest
docker push YOUR_USERNAME/trading-app-frontend:latest

# Verify on https://hub.docker.com
# Go to: Your repositories → trading-app-frontend
```

---

### PASSO 2: GitHub Secrets Setup (5 min)

#### 2.1 Configure Secrets

**Go to**: GitHub Repository → Settings → Secrets and variables → Actions

**Add these secrets**:

```
1. DOCKER_USERNAME
   Value: your-docker-hub-username

2. DOCKER_TOKEN
   Value: Your Docker Hub personal access token

3. DEPLOY_HOST (Optional - for production deployment)
   Value: your-production-server.com

4. DEPLOY_USER (Optional)
   Value: deploy-user

5. DEPLOY_KEY (Optional)
   Value: Your SSH private key (paste entire key)

6. SLACK_WEBHOOK (Optional - for notifications)
   Value: https://hooks.slack.com/services/YOUR/WEBHOOK/URL
```

#### 2.2 Verify Secrets
```bash
# In GitHub, you should see:
✅ DOCKER_USERNAME
✅ DOCKER_TOKEN
✅ DEPLOY_HOST
✅ DEPLOY_USER
✅ DEPLOY_KEY
✅ SLACK_WEBHOOK
```

---

### PASSO 3: Test CI/CD Pipeline (10 min)

#### 3.1 Trigger Pipeline Manually

**Option 1: Push to Repository**
```bash
# Make a test commit
echo "# Test deployment" >> README.md
git add README.md
git commit -m "test: trigger CI/CD pipeline"
git push origin main
```

**Option 2: Workflow Dispatch (if configured)**
```bash
# In GitHub Actions → Workflows
# Click "Run workflow" → Select branch → Run
```

#### 3.2 Monitor Pipeline
```bash
# In GitHub → Actions
# Watch the workflow run in real-time
# Monitor each job status:
# - Build & Test ⏳
# - Docker Build & Push ⏳
# - Security Scan ⏳
# - [Deploy Production - requires secrets]
# - [Deploy Staging - requires secrets]
```

#### 3.3 Verify Image Push
```bash
# Check Docker Hub
# Your repo → Tags
# You should see:
# - 1.0.0
# - latest
# - [branch]-[commit-sha]
```

---

### PASSO 4: Local Production Test (10 min)

#### 4.1 Setup Production Environment
```bash
# Copy template to actual env file
cp .env.production.example .env.production

# Edit with your values
nano .env.production

# Essential values to set:
# DOCKER_USERNAME=your-username
# IMAGE_TAG=1.0.0
# VITE_API_URL=http://localhost:3333
# APP_VERSION=1.0.0
```

#### 4.2 Test Locally with Production Config
```bash
# Load environment
export $(cat .env.production | xargs)

# Start production stack
docker-compose -f docker-compose.production.yml up -d

# Check status
docker-compose -f docker-compose.production.yml ps

# Expected output:
# STATUS: Up X seconds (healthy)
```

#### 4.3 Verify Frontend
```bash
# Health check
curl http://localhost/health
# Expected: "healthy"

# Homepage
curl -s http://localhost | head -20
# Expected: HTML with React content

# Check logs
docker-compose -f docker-compose.production.yml logs frontend

# Monitor
docker stats
```

#### 4.4 Cleanup Local Test
```bash
# Stop services
docker-compose -f docker-compose.production.yml stop

# Remove containers (keep volumes)
docker-compose -f docker-compose.production.yml down

# Or remove everything
docker-compose -f docker-compose.production.yml down -v
```

---

### PASSO 5: Production Deployment (15 min)

#### 5.1 Prepare Production Server

**On production server**:
```bash
# Create application directory
mkdir -p /app/frontend
cd /app/frontend

# Clone or copy docker-compose.production.yml
# And other config files

# Create .env.production
nano .env.production

# Set proper permissions
chmod 600 .env.production
```

#### 5.2 Deploy Application

**Option 1: Using deploy.sh (Recommended)**
```bash
# From your local machine or CI/CD
./deploy.sh production 1.0.0

# With dry-run first
./deploy.sh production 1.0.0 --dry-run

# Expected output:
# ✅ Prerequisites check passed
# ✅ Docker login successful
# ✅ Image pulled successfully
# ✅ Services started
# ✅ Health check passed
# ✅ Smoke tests passed
# ✅ Deployment completed successfully!
```

**Option 2: Manual Deployment**
```bash
# SSH to production
ssh user@your-production-server.com

# Navigate to app directory
cd /app/frontend

# Pull latest image
docker-compose -f docker-compose.production.yml pull

# Stop current services
docker-compose -f docker-compose.production.yml stop

# Start new services
docker-compose -f docker-compose.production.yml up -d

# Verify
docker-compose -f docker-compose.production.yml ps
curl http://localhost/health
```

#### 5.3 Monitor Deployment
```bash
# Watch logs
docker-compose -f docker-compose.production.yml logs -f frontend

# Monitor resources
docker stats

# Health checks
watch -n 5 'curl http://localhost/health && echo "HEALTHY"'

# Check application
curl https://your-domain.com
```

---

### PASSO 6: SSL/TLS Configuration (15 min)

#### 6.1 Setup Let's Encrypt (Certbot)

```bash
# Install certbot
apt-get update && apt-get install -y certbot python3-certbot-nginx

# Create certificate
certbot certonly --standalone \
  -d trading-app.com \
  -d www.trading-app.com \
  --email admin@trading-app.com \
  --agree-tos \
  --non-interactive

# Certificates location:
# /etc/letsencrypt/live/trading-app.com/
```

#### 6.2 Configure Nginx for HTTPS

**Create nginx-ssl.conf**:
```nginx
server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name trading-app.com www.trading-app.com;

    # SSL Certificates
    ssl_certificate /etc/letsencrypt/live/trading-app.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/trading-app.com/privkey.pem;

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

    # Proxy to Docker container
    location / {
        proxy_pass http://frontend:80;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}

# Redirect HTTP to HTTPS
server {
    listen 80;
    listen [::]:80;
    server_name trading-app.com www.trading-app.com;
    return 301 https://$server_name$request_uri;
}
```

#### 6.3 Setup Auto-Renewal
```bash
# Add to crontab
0 0 1 * * certbot renew --quiet --post-hook "systemctl reload nginx"

# Or use systemd timer
systemctl enable certbot-renew.timer
systemctl start certbot-renew.timer
```

---

### PASSO 7: Monitoring Setup (20 min)

#### 7.1 Setup Prometheus (Optional)

**Create prometheus.yml**:
```yaml
global:
  scrape_interval: 15s

scrape_configs:
  - job_name: 'docker'
    static_configs:
      - targets: ['localhost:9323']
  
  - job_name: 'node'
    static_configs:
      - targets: ['localhost:9100']
```

**Start Prometheus**:
```bash
docker run -d \
  -p 9090:9090 \
  -v $(pwd)/prometheus.yml:/etc/prometheus/prometheus.yml \
  prom/prometheus
```

#### 7.2 Setup Grafana (Optional)

```bash
docker run -d \
  -p 3000:3000 \
  -e GF_SECURITY_ADMIN_PASSWORD=admin \
  grafana/grafana

# Access: http://localhost:3000
# Login: admin / admin
# Add Prometheus as data source
# Create dashboards
```

#### 7.3 Setup Logging (ELK Stack)

```bash
# Simple approach: use Docker container logging
# Already configured in docker-compose.production.yml

# Check logs
docker-compose -f docker-compose.production.yml logs frontend

# Forward to centralized logging service:
# - Datadog
# - New Relic
# - CloudWatch
# - ELK Stack
```

#### 7.4 Setup Alerts

**Create alert rules** (prometheus):
```yaml
groups:
  - name: trading-app
    rules:
      - alert: HighErrorRate
        expr: rate(http_requests_total{status=~"5.."}[5m]) > 0.05
        for: 5m
        annotations:
          summary: "High error rate detected"
      
      - alert: HighMemoryUsage
        expr: container_memory_usage_bytes / 1024 / 1024 > 900
        for: 5m
        annotations:
          summary: "High memory usage"
```

---

### PASSO 8: Validation & Smoke Tests (10 min)

#### 8.1 Comprehensive Health Checks

```bash
#!/bin/bash
# smoke-tests.sh

echo "Running smoke tests..."

# Test 1: Application responds
echo -n "Test 1: Homepage... "
if curl -sf https://trading-app.com > /dev/null; then
  echo "✅"
else
  echo "❌"
  exit 1
fi

# Test 2: Health endpoint
echo -n "Test 2: Health endpoint... "
if curl -sf https://trading-app.com/health | grep -q "healthy"; then
  echo "✅"
else
  echo "❌"
  exit 1
fi

# Test 3: API connectivity
echo -n "Test 3: API connectivity... "
if curl -sf https://api.trading-app.com/health > /dev/null; then
  echo "✅"
else
  echo "⚠️  (optional)"
fi

# Test 4: SSL Certificate
echo -n "Test 4: SSL Certificate... "
if openssl s_client -connect trading-app.com:443 -servername trading-app.com < /dev/null 2>/dev/null | grep -q "Verify return code: 0"; then
  echo "✅"
else
  echo "❌"
  exit 1
fi

# Test 5: Performance
echo -n "Test 5: Performance (<1s)... "
RESPONSE_TIME=$(curl -s -o /dev/null -w "%{time_total}" https://trading-app.com)
if (( $(echo "$RESPONSE_TIME < 1.0" | bc -l) )); then
  echo "✅ (${RESPONSE_TIME}s)"
else
  echo "⚠️  (${RESPONSE_TIME}s)"
fi

echo ""
echo "✅ All smoke tests passed!"
```

#### 8.2 Run Validation
```bash
chmod +x smoke-tests.sh
./smoke-tests.sh
```

---

### PASSO 9: Documentation & Runbooks (10 min)

#### 9.1 Create Operations Runbook

**ops-runbook.md**:
```markdown
# Operations Runbook

## Deployment

### Automatic (via GitHub Actions)
1. Push code to main branch
2. GitHub Actions triggers CI/CD
3. Tests run automatically
4. Docker image built and pushed
5. Production deployment starts
6. Health checks verify deployment

### Manual Deployment
\`\`\`bash
./deploy.sh production 1.0.0
\`\`\`

## Monitoring

- Grafana: https://monitoring.example.com:3000
- Prometheus: https://monitoring.example.com:9090
- Logs: docker-compose logs -f frontend

## Rollback

\`\`\`bash
./deploy.sh production --rollback
\`\`\`

## Common Issues

### Application not responding
\`\`\`bash
docker-compose ps
docker-compose logs frontend
docker restart trading-app-frontend-prod
\`\`\`

### High memory usage
\`\`\`bash
docker stats
docker-compose restart frontend
\`\`\`
```

#### 9.2 Create Disaster Recovery Plan

**Create dr-plan.md**:
```markdown
# Disaster Recovery Plan

## RTO/RPO
- RTO: 15 minutes (Recovery Time Objective)
- RPO: 1 hour (Recovery Point Objective)

## Backup Strategy
- Daily backups of docker-compose config
- Weekly backups of data volumes
- Backup location: /backups/

## Recovery Procedure
1. Restore from backup
2. Verify file integrity
3. Start services: docker-compose up -d
4. Run health checks
5. Verify data
6. Update DNS if needed
```

---

### CHECKLIST FINAL

```
DEPLOYMENT CHECKLIST:
☐ Docker Hub image pushed
☐ GitHub secrets configured
☐ CI/CD pipeline tested
☐ Production environment setup
☐ Application deployed
☐ Health checks passing
☐ SSL/TLS certificates installed
☐ Monitoring configured
☐ Backup procedures tested
☐ Disaster recovery plan created
☐ Team trained
☐ Documentation complete
☐ Runbooks created
☐ On-call procedures defined
☐ Performance baselines established
```

---

## 🎯 Next Session

1. Execute Docker Hub push
2. Configure GitHub secrets
3. Test CI/CD pipeline
4. Deploy to production
5. Verify all systems

---

**Status**: READY FOR EXECUTION 🚀
**Estimated Time**: 90 minutes total
**Complexity**: Medium
**Risk**: Low (with dry-run testing)
