# Phase 7: Monitoring Setup - Guia Executivo

## 🎯 Objetivo

Configurar stack de monitoramento com Prometheus (coleta de métricas) + Grafana (visualização) para acompanhar saúde da aplicação.

---

## 📋 Pré-requisitos

- [x] Phase 6 completado (HTTPS configurado)
- [x] SSH access ao servidor
- [x] Docker e Docker Compose instalados
- [x] Portas disponíveis: 9090 (Prometheus), 3000 (Grafana)

---

## 🔧 Passo 1: Criar Estrutura de Monitoramento

### Criar Diretórios

```bash
# No servidor
ssh -i ~/.ssh/deploy_key deploy@seu_servidor_prod

mkdir -p ~/trading-app/monitoring/prometheus
mkdir -p ~/trading-app/monitoring/grafana
mkdir -p ~/trading-app/monitoring/alertas

chmod -R 755 ~/trading-app/monitoring

exit
```

---

## 📊 Passo 2: Configurar Prometheus

### Criar prometheus.yml

```bash
# Na sua máquina local
cat > prometheus.yml << 'EOF'
global:
  scrape_interval: 15s
  evaluation_interval: 15s
  external_labels:
    monitor: 'trading-app-monitor'

alerting:
  alertmanagers:
    - static_configs:
        - targets: []

rule_files:
  - 'alerts.yml'

scrape_configs:
  # Prometheus self-monitoring
  - job_name: 'prometheus'
    static_configs:
      - targets: ['localhost:9090']

  # Docker containers
  - job_name: 'docker'
    static_configs:
      - targets: ['localhost:9323']

  # Node Exporter (server metrics)
  - job_name: 'node'
    static_configs:
      - targets: ['localhost:9100']

  # Frontend app (custom metrics)
  - job_name: 'trading-app'
    static_configs:
      - targets: ['frontend:8080/metrics']
    relabel_configs:
      - source_labels: [__scheme__]
        target_label: __scheme__
        replacement: http

EOF
```

### Criar alerts.yml

```bash
cat > alerts.yml << 'EOF'
groups:
  - name: trading-app-alerts
    interval: 30s
    rules:
      # Alert: Container down
      - alert: ContainerDown
        expr: up{job="trading-app"} == 0
        for: 5m
        labels:
          severity: critical
        annotations:
          summary: "Container {{ $labels.container_name }} is down"
          description: "Container has been down for more than 5 minutes"

      # Alert: High memory usage
      - alert: HighMemoryUsage
        expr: (container_memory_usage_bytes / 1073741824) > 0.8
        for: 2m
        labels:
          severity: warning
        annotations:
          summary: "High memory usage detected"
          description: "Container is using {{ $value }} GB of 1 GB available"

      # Alert: High CPU usage
      - alert: HighCpuUsage
        expr: rate(container_cpu_usage_seconds_total[5m]) > 0.8
        for: 2m
        labels:
          severity: warning
        annotations:
          summary: "High CPU usage detected"
          description: "CPU usage is {{ $value | humanizePercentage }}"

      # Alert: Disk space low
      - alert: DiskSpaceLow
        expr: (node_filesystem_avail_bytes / node_filesystem_size_bytes) < 0.1
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "Low disk space"
          description: "Less than 10% disk space available"

      # Alert: Response time high
      - alert: HighResponseTime
        expr: histogram_quantile(0.95, http_request_duration_seconds) > 1
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "High response time"
          description: "95th percentile response time is {{ $value }}s"

EOF
```

### Copiar para Servidor

```bash
# Na sua máquina local
scp -i ~/.ssh/deploy_key prometheus.yml \
  deploy@seu_servidor_prod:~/trading-app/monitoring/prometheus/

scp -i ~/.ssh/deploy_key alerts.yml \
  deploy@seu_servidor_prod:~/trading-app/monitoring/prometheus/
```

---

## 📈 Passo 3: Configurar Grafana

### Criar datasource config

```bash
# Na sua máquina local
mkdir -p grafana/provisioning/datasources
mkdir -p grafana/provisioning/dashboards

cat > grafana/provisioning/datasources/prometheus.yml << 'EOF'
apiVersion: 1

datasources:
  - name: Prometheus
    type: prometheus
    access: proxy
    url: http://prometheus:9090
    isDefault: true
    editable: true
EOF
```

### Criar Dashboard Config

```bash
cat > grafana/provisioning/dashboards/dashboard.yml << 'EOF'
apiVersion: 1

providers:
  - name: 'default'
    orgId: 1
    folder: ''
    type: file
    disableDeletion: false
    updateIntervalSeconds: 10
    allowUiUpdates: true
    options:
      path: /etc/grafana/provisioning/dashboards/json
EOF
```

### Copiar para Servidor

```bash
# Na sua máquina local
scp -r -i ~/.ssh/deploy_key grafana \
  deploy@seu_servidor_prod:~/trading-app/monitoring/
```

---

## 🐳 Passo 4: Docker Compose com Monitoring

### Criar docker-compose.monitoring.yml

```bash
# Na sua máquina local
cat > docker-compose.monitoring.yml << 'EOF'
version: '3.8'

services:
  prometheus:
    image: prom/prometheus:latest
    ports:
      - "9090:9090"
    volumes:
      - ./monitoring/prometheus/prometheus.yml:/etc/prometheus/prometheus.yml:ro
      - ./monitoring/prometheus/alerts.yml:/etc/prometheus/alerts.yml:ro
      - prometheus_data:/prometheus
    command:
      - '--config.file=/etc/prometheus/prometheus.yml'
      - '--storage.tsdb.path=/prometheus'
      - '--web.console.libraries=/etc/prometheus/console_libraries'
      - '--web.console.templates=/etc/prometheus/consoles'
    restart: unless-stopped
    networks:
      - monitoring

  grafana:
    image: grafana/grafana:latest
    ports:
      - "3001:3000"
    environment:
      - GF_SECURITY_ADMIN_PASSWORD=admin
      - GF_SECURITY_ADMIN_USER=admin
      - GF_INSTALL_PLUGINS=
    volumes:
      - ./monitoring/grafana/provisioning:/etc/grafana/provisioning:ro
      - grafana_data:/var/lib/grafana
    depends_on:
      - prometheus
    restart: unless-stopped
    networks:
      - monitoring

  node_exporter:
    image: prom/node-exporter:latest
    ports:
      - "9100:9100"
    volumes:
      - /proc:/host/proc:ro
      - /sys:/host/sys:ro
      - /:/rootfs:ro
    command:
      - '--path.procfs=/host/proc'
      - '--path.sysfs=/host/sys'
      - '--collector.filesystem.mount-points-exclude=^/(sys|proc|dev|host|etc)($$|/)'
    restart: unless-stopped
    networks:
      - monitoring

volumes:
  prometheus_data:
  grafana_data:

networks:
  monitoring:
    driver: bridge
EOF

# Copiar para servidor
scp -i ~/.ssh/deploy_key docker-compose.monitoring.yml \
  deploy@seu_servidor_prod:~/trading-app/monitoring/
```

---

## 🚀 Passo 5: Iniciar Stack de Monitoramento

### Ligar Monitoramento

```bash
# No servidor
ssh -i ~/.ssh/deploy_key deploy@seu_servidor_prod

cd ~/trading-app/monitoring

# Iniciar stack
docker-compose -f docker-compose.monitoring.yml up -d

# Verificar status
docker-compose -f docker-compose.monitoring.yml ps

# Output esperado:
# NAME                COMMAND               STATUS
# prometheus          /bin/prometheus      Up 2 minutes
# grafana             /run.sh               Up 2 minutes
# node_exporter       /bin/node_exporter   Up 2 minutes

exit
```

---

## 📊 Passo 6: Acessar Dashboards

### Acessar Prometheus

```bash
# No seu computador
# Abrir no navegador
https://seu_dominio.com:9090

# Verificar:
# 1. Status → Targets (devem estar UP)
# 2. Graph → Testar query: up{job="prometheus"}
```

### Acessar Grafana

```bash
# No seu computador
# Abrir no navegador
https://seu_dominio.com:3001

# Login:
# Username: admin
# Password: admin (MUDAR DEPOIS!)

# Mudar senha:
# 1. Clicar na foto do usuário (canto superior direito)
# 2. Change password
```

### Criar Dashboard Customizado

```
1. Clicar em "+" → Dashboard
2. "Add new panel"
3. Selecionar Prometheus como datasource
4. Exemplo de queries:

   - CPU Usage:
     rate(container_cpu_usage_seconds_total[5m])

   - Memory Usage:
     container_memory_usage_bytes / 1073741824

   - Request Rate:
     rate(http_requests_total[5m])

   - Response Time:
     histogram_quantile(0.95, http_request_duration_seconds)

5. Clicar em "Save dashboard"
```

---

## 🔔 Passo 7: Configurar Alertas

### Integrar com Slack (Opcional)

```bash
# No Slack
1. Criar webhook: https://api.slack.com/messaging/webhooks
2. Copiar webhook URL

# No servidor, editar alertmanager config
ssh -i ~/.ssh/deploy_key deploy@seu_servidor_prod

cat > ~/trading-app/monitoring/alertmanager.yml << 'EOF'
global:
  resolve_timeout: 5m

route:
  receiver: 'slack'
  group_by: ['alertname', 'cluster', 'service']
  group_wait: 30s
  group_interval: 5m
  repeat_interval: 24h

receivers:
  - name: 'slack'
    slack_configs:
      - api_url: 'https://hooks.slack.com/services/YOUR/WEBHOOK/URL'
        channel: '#trading-app-alerts'
        title: 'Trading App Alert'
        text: '{{ range .Alerts }}{{ .Annotations.description }}{{ end }}'

inhibit_rules:
  - source_match:
      severity: 'critical'
    target_match:
      severity: 'warning'
    equal: ['alertname', 'dev', 'instance']
EOF

exit
```

### Testar Alerta

```bash
# No Prometheus
1. Parar um container propositalmente
2. Aguardar 5 minutos
3. Verificar se alerta aparece em "Alerts"
4. Receber notificação no Slack
```

---

## 📉 Passo 8: Criar Dashboards Principais

### Dashboard 1: System Overview

Queries:
```
- Up/Down: up
- CPU: rate(container_cpu_usage_seconds_total[5m])
- Memory: container_memory_usage_bytes/1073741824
- Disk: node_filesystem_avail_bytes/node_filesystem_size_bytes
```

### Dashboard 2: Application Performance

Queries:
```
- Request Rate: rate(http_requests_total[5m])
- Error Rate: rate(http_requests_failed_total[5m])
- Response Time (p95): histogram_quantile(0.95, http_request_duration_seconds)
- Uptime: up
```

### Dashboard 3: Business Metrics

Queries:
```
- Trades executed: trading_trades_executed_total
- Active users: trading_active_users
- Portfolio value: trading_portfolio_value
- Win rate: trading_win_rate
```

---

## ✅ Passo 9: Backup e Persistência

### Backup de Dados Grafana

```bash
# No servidor
docker exec grafana grafana-cli admin export-dashboard \
  -u admin -p admin > dashboard_backup.json

# Restaurar depois
docker exec grafana grafana-cli admin import-dashboard \
  -u admin -p admin < dashboard_backup.json
```

### Verificar Volumes

```bash
# No servidor
docker volume ls | grep prometheus
docker volume ls | grep grafana

# Ver espaço usado
docker volume inspect prometheus_data
docker volume inspect grafana_data
```

---

## ⚠️ Troubleshooting

### Prometheus não conectando com containers

```bash
# Verificar network
docker network ls
docker network inspect trading_app_network

# Verificar prometheus config
docker logs prometheus | head -50
```

### Grafana não acessível

```bash
# Verificar porta
docker ps | grep grafana

# Testar conectividade
curl http://seu_servidor_prod:3001

# Ver logs
docker logs grafana
```

### Alertas não disparando

```bash
# Verificar regras
# No Prometheus: Status → Rules

# Forçar avaliação
# Editar prometheus.yml e reload
sudo systemctl reload prometheus
```

### Disco cheio com métricas antigas

```bash
# Limpar dados antigos (mais de 30 dias)
# No docker-compose, adicionar:
command:
  - '--storage.tsdb.retention.time=30d'

# Ou resetar
docker volume rm prometheus_data
```

---

## 🔐 Melhores Práticas

### 1. Segurança Grafana

```bash
# Mudar senha padrão imediatamente
# Desabilitar anonymous access
# Usar reverse proxy com auth

# Na Grafana UI:
# Configuration → Security → Change admin password
```

### 2. Alertas Efetivos

```
- Alertar apenas em problemas reais
- Incluir contexto no alerta (ex: qual serviço, qual métrica)
- Ter runbook para cada alerta
- Evitar alert fatigue
```

### 3. Retenção de Dados

```
- Prometheus: 15-30 dias de dados brutos
- Grafana: guardar dashboards
- Exportar dashboards regularmente
```

### 4. Performance

```
- Usar downsampling para dados antigos
- Configurar retention apropriado
- Monitorar tamanho do Prometheus
```

---

## ✅ Checklist de Conclusão

- [ ] Prometheus instalado e rodando
- [ ] Grafana instalado e rodando
- [ ] Datasource Prometheus adicionado em Grafana
- [ ] Node Exporter coletando métricas
- [ ] Dashboards criados
- [ ] Alertas configurados
- [ ] Slack/Email integrado (opcional)
- [ ] Testes de alerta funcionando
- [ ] Backup de dashboards realizado

---

## 🎯 Próximo Passo

Depois de monitoramento configurado:
→ **Phase 8: Validation & Smoke Tests**
   - Testes de endpoints
   - Performance validation
   - Security checks

---

## 📚 Referências

```
Prometheus: https://prometheus.io/
Grafana: https://grafana.com/
Docker Metrics: https://docs.docker.com/config/containers/runbooks/
Node Exporter: https://github.com/prometheus/node_exporter
```

---

**Status**: Phase 7 - Monitoring Setup
Generated: 26 de Outubro de 2025
Estimated Time: 20-30 minutes
