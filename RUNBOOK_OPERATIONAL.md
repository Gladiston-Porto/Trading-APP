═══════════════════════════════════════════════════════════════════════════════
                        📋 OPERATIONAL RUNBOOK
                  Trading APP - Procedimentos Operacionais Diários
═══════════════════════════════════════════════════════════════════════════════

Este documento descreve os procedimentos operacionais normais e rotineiros.


═══════════════════════════════════════════════════════════════════════════════
                    1️⃣  CHECKLIST DIÁRIO (Daily Standup)
═══════════════════════════════════════════════════════════════════════════════

Executar todos os dias às 9:00 AM:

Conectar ao Servidor:
─────────────────────
$ ssh deploy@seu-servidor.com


Verificação de Saúde (Health Check):
────────────────────────────────────

# 1. Containers rodando?
$ docker ps | grep trading-app
✅ Esperado: 2 linhas (production + staging)

# 2. CPU/Memória OK?
$ docker stats --no-stream trading-app-production trading-app-staging
✅ CPU: < 5%
✅ Memory: < 300MB (60% limit)

# 3. Discos OK?
$ df -h /app
✅ Uso: < 70%

# 4. Aplicação respondendo?
$ curl -s -w "%{http_code}\n" http://localhost:3001
✅ Esperado: 200

# 5. Nginx rodando?
$ sudo systemctl status nginx
✅ Esperado: "active (running)"

# 6. Backups recentes?
$ ls -lt /app/trading-app/backups/ | head -3
✅ Esperado: backup de hoje


Documentar Resultado:
─────────────────────

# Template para Slack/status board:
```
🟢 Daily Health Check - [DATA]
✅ Production: Healthy
✅ Staging: Healthy
✅ Disk: 45% usage
✅ Memory: 120MB/512MB
✅ CPU: 2% avg
⚠️  Items: [listar qualquer warning]
```


═══════════════════════════════════════════════════════════════════════════════
                    2️⃣  DEPLOY DE NOVA VERSÃO
═══════════════════════════════════════════════════════════════════════════════

Cenário: Frontend tem nova release, need to push to production

Pre-Deployment Checklist:
────────────────────────

☐ Todos os testes passando no GitHub Actions?
  https://github.com/Gladiston-Porto/Trading-APP/actions

☐ Code review aprovado?

☐ Docker image built e disponível no Docker Hub?
  https://hub.docker.com/r/gladistonporto/trading-app-frontend

☐ Nada crítico rodando agora? (quiet time)

☐ Team notificado? (Slack: #trading-app-deployments)


Deployment Step-by-Step:
───────────────────────

# 1. Conectar ao servidor
$ ssh deploy@seu-servidor.com
$ cd /app/trading-app

# 2. Ver versão atual
$ docker images | grep trading-app
$ docker ps | grep trading-app

# 3. Fazer backup preventivo
$ bash /app/trading-app/scripts/backup.sh

# 4. Pull da nova imagem
$ docker-compose -f docker-compose.production.yml pull

# 5. Verificar o que vai mudar
$ docker-compose -f docker-compose.production.yml config | diff - <(docker-compose -f docker-compose.production.yml config --old-services)

# 6. Desligar container antigo (com graceful shutdown)
$ docker-compose -f docker-compose.production.yml down

# 7. Ligar novo container
$ docker-compose -f docker-compose.production.yml up -d

# 8. Aguardar container estar pronto
$ sleep 5
$ docker logs trading-app-production --tail 20

# 9. Testar nova versão
$ curl http://localhost:3001
$ curl http://seu-dominio.com


Post-Deployment Validation:
──────────────────────────

# Rodar health check
$ bash /app/trading-app/health-check.sh

# Verificar CPU/Memory
$ docker stats --no-stream trading-app-production

# Verificar Nginx error logs
$ tail -20 /var/log/nginx/trading-app-error.log

# Testar endpoints principais
$ curl -s http://seu-dominio.com | head -100
$ curl -s http://seu-dominio.com/api/health


Rollback (Se Algo Ruim Acontecer):
──────────────────────────────────

# Voltar para versão anterior
$ docker-compose -f docker-compose.production.yml down
$ docker-compose -f docker-compose.production.yml pull  # vai puxar latest-1
$ docker-compose -f docker-compose.production.yml up -d

# OU restaurar de backup
$ tar -xzf /app/trading-app/backups/trading-app-backup-YYYYMMDD_HHMMSS.tar.gz -C /
$ docker-compose -f docker-compose.production.yml pull
$ docker-compose -f docker-compose.production.yml up -d


Comunicação Pós-Deploy:
──────────────────────

```
🚀 Deployment Completed - [VERSION]
✅ Timestamp: [ISO timestamp]
✅ Status: Successful
📊 Metrics:
  • Response time: [avg ms]
  • Error rate: [0.1%]
  • Users: [X] concurrent
💬 Changes: [resumo do que mudou]
📞 Rollback: 5 min (if needed)
```


═══════════════════════════════════════════════════════════════════════════════
                    3️⃣  VERIFICAÇÃO SEMANAL
═══════════════════════════════════════════════════════════════════════════════

Executar toda semana (exemplo: sexta-feira, 3PM):

Auditoria de Segurança:
──────────────────────

# 1. Revisar Docker image vulnerabilities
$ docker run --rm -v /var/run/docker.sock:/var/run/docker.sock \
  aquasec/trivy image gladistonporto/trading-app-frontend:latest

# 2. Revisar permissões de arquivo
$ find /app/trading-app -perm /g+w,o+w | head -20

# 3. Revisar usuários SSH autorizados
$ cat ~/.ssh/authorized_keys

# 4. Revisar logs de acesso suspeitos
$ grep "403\|401\|500" /var/log/nginx/trading-app-access.log | wc -l


Auditoria de Performance:
─────────────────────────

# 1. Top 10 requisições lentas
$ grep "time_response" /var/log/nginx/trading-app-access.log | \
  sort -k12 -rn | head -10

# 2. Tráfego por hora (últimas 24h)
$ grep "$(date -d yesterday +%d/%b/%Y)" /var/log/nginx/trading-app-access.log | wc -l

# 3. Taxa de erro HTTP
$ awk '{print $9}' /var/log/nginx/trading-app-access.log | sort | uniq -c | sort -rn

# 4. Consumo de bandwidth
$ du -sh /app/trading-app/backups/


Auditoria de Backup:
───────────────────

# 1. Backups recentes?
$ ls -lt /app/trading-app/backups/ | head -7

# 2. Backup mais antigo (> 30 dias)?
$ find /app/trading-app/backups -name "*.tar.gz" -mtime +30

# 3. Espaço total de backups
$ du -sh /app/trading-app/backups/

# 4. Testar restaurar de backup (no staging!)
$ docker-compose -f docker-compose.production.yml down
$ tar -xzf /app/trading-app/backups/latest.tar.gz -C /tmp/test-restore/
$ # verificar integridade dos arquivos


Relatório Semanal:
──────────────────

Template para email/document:

```
WEEKLY OPERATIONS REPORT
───────────────────────

Date: [week of]
Prepared by: [your name]

HEALTH STATUS
  ✅ Uptime: 99.98% (XX min downtime)
  ✅ Avg Response Time: X ms
  ✅ Error Rate: 0.05%
  ✅ Security: No incidents

SECURITY
  ✅ Docker images: No critical CVEs
  ✅ SSH: Only expected keys
  ✅ Logs: No suspicious activity
  ✅ Backups: 7 backups, all valid

PERFORMANCE
  ✅ CPU Avg: 1.2%
  ✅ Memory Avg: 120MB
  ✅ Disk Usage: 45%
  ✅ Network: Normal

CHANGES
  • Deployed: [versão]
  • Scaled: [changes]
  • Updated: [updates]

ISSUES
  ☐ [issue 1 se houver]
  ☐ [issue 2 se houver]

ACTION ITEMS
  - [ ] [action 1]
  - [ ] [action 2]
```


═══════════════════════════════════════════════════════════════════════════════
                    4️⃣  SCALING (Aumentar Capacidade)
═══════════════════════════════════════════════════════════════════════════════

Quando aumentar?
  • Baseline CPU > 70%
  • Baseline Memory > 70%
  • Response time > 500ms
  • Error rate > 1%


Opção A: Aumentar Recursos do Container
───────────────────────────────────────

# 1. Editar docker-compose.production.yml
$ vim /app/trading-app/docker-compose.production.yml

# Alterar:
services:
  production:
    cpus: '1.0'       # antes: 0.5
    mem_limit: 1g     # antes: 512m

# 2. Reiniciar
$ docker-compose -f docker-compose.production.yml down
$ docker-compose -f docker-compose.production.yml up -d


Opção B: Aumentar Máquina
─────────────────────────

1. Provisionar novo servidor (2vCPU → 4vCPU, 4GB → 8GB)
2. Setup identicamente ao atual (vide FASE_5_PRODUCTION_SERVER_SETUP.md)
3. Fazer health check
4. Migrar com load balancer (fora do scope deste runbook)
5. Decommission servidor antigo


Monitorar Após Scale:
─────────────────────

$ watch -n 5 'docker stats --no-stream trading-app-production'

Deve ver: CPU/Memory caindo para ~50% do novo limite


═══════════════════════════════════════════════════════════════════════════════
                    5️⃣  MANUTENÇÃO PLANEJADA
═══════════════════════════════════════════════════════════════════════════════

Antes da Manutenção (Janela de Manutenção):
──────────────────────────────────────────

T-7 dias:
  □ Anunciar janela (Slack, status page)
  □ Confirmar time disponível
  □ Preparar rollback plan

T-24 horas:
  □ Enviar lembrete
  □ Confirmar backup recente
  □ Preparar scripts

T-5 minutos (antes de iniciar):
  □ Avisar users finais
  □ Ativar "Maintenance Mode" (se houver)


Durante Manutenção:
───────────────────

# 1. Notificar monitoring (desativar alertas)
$ # Desativar healthchecks: echo "MAINTENANCE" > /tmp/maintenance-mode

# 2. Fazer backup imediato
$ bash /app/trading-app/scripts/backup.sh

# 3. Executar procedimento [vide seções abaixo]

# 4. Testar tudo
$ bash /app/trading-app/health-check.sh

# 5. Reativar monitoring
$ rm /tmp/maintenance-mode


Casos Comuns de Manutenção:

A) Atualizar Docker
───────────────────
$ sudo apt update && sudo apt upgrade -y docker-ce docker-compose
$ sudo systemctl restart docker
$ docker pull gladistonporto/trading-app-frontend:latest
$ docker-compose -f docker-compose.production.yml pull
$ docker-compose -f docker-compose.production.yml restart

B) Atualizar OS
───────────────
$ sudo apt update && sudo apt upgrade -y
$ # Algumas atualizações exigem reboot
$ sudo reboot now
# Esperar ~2-3 minutos para reconnect
$ docker ps  # Verificar que containers reiniciaram


C) Limpar Logs & Lixo
──────────────────────
$ docker system prune -a -f
$ sudo journalctl --vacuum=30d
$ find /var/log -name "*.gz" -mtime +60 -delete


D) Testar Disaster Recovery
────────────────────────────
Recomendado: 1x/mês

# 1. Selecionar backup
$ ls -lt /app/trading-app/backups/ | head -1

# 2. Simular restore (em máquina de teste):
$ mkdir -p /tmp/restore-test
$ tar -xzf /app/trading-app/backups/trading-app-backup-YYYYMMDD_HHMMSS.tar.gz -C /tmp/restore-test

# 3. Verificar integridade
$ du -sh /tmp/restore-test
$ find /tmp/restore-test -type f | wc -l

# 4. Limpar teste
$ rm -rf /tmp/restore-test


E) Atualizar SSL Certificate
──────────────────────────────
$ sudo certbot renew --dry-run
$ sudo certbot renew  # se tudo OK
$ sudo systemctl reload nginx


Depois da Manutenção:
────────────────────

□ Confirmar app respondendo
□ Confirmar logs normais (sem erros)
□ Confirmar metrics voltaram ao normal
□ Comunicar fim da manutenção
□ Documentar o que foi feito
□ Compartilhar lições aprendidas


═══════════════════════════════════════════════════════════════════════════════
                    6️⃣  MONITORAMENTO E ALERTAS
═══════════════════════════════════════════════════════════════════════════════

Métricas para Monitorar:
────────────────────────

1. Uptime
   • Esperado: 99.9% (máx 43 min downtime/mês)
   • Alerta: Se < 99%

2. Response Time
   • Esperado: 50-100ms
   • Alerta: Se > 500ms

3. Error Rate
   • Esperado: < 0.1% (1 erro per 1000 requests)
   • Alerta: Se > 1%

4. CPU
   • Esperado: 1-5% baseline, < 50% peak
   • Alerta: Se > 70% por > 5 min

5. Memory
   • Esperado: 120-200MB (30% limit)
   • Alerta: Se > 400MB (80% limit)

6. Disk
   • Esperado: < 60%
   • Alerta: Se > 80%

7. HTTP Errors
   • Esperado: < 10 erros 5xx por dia
   • Alerta: Se > 50/hora

8. Backup Freshness
   • Esperado: Backup daily
   • Alerta: Se backup > 24h old


Configurar Alertas (Exemplo com Cron):
──────────────────────────────────────

# Arquivo: /app/trading-app/scripts/check-alerts.sh

#!/bin/bash
export SLACK_WEBHOOK="$SLACK_WEBHOOK_URL"

# Check CPU
CPU=$(docker stats --no-stream --format "{{.CPUPerc}}" trading-app-production | sed 's/%//')
if (( $(echo "$CPU > 70" | bc -l) )); then
    curl -X POST -H 'Content-type: application/json' \
      --data "{\"text\":\"🚨 HIGH CPU: ${CPU}%\"}" \
      $SLACK_WEBHOOK
fi

# Check Memory
MEM=$(docker stats --no-stream --format "{{.MemPerc}}" trading-app-production | sed 's/%//')
if (( $(echo "$MEM > 80" | bc -l) )); then
    curl -X POST -H 'Content-type: application/json' \
      --data "{\"text\":\"🚨 HIGH MEMORY: ${MEM}%\"}" \
      $SLACK_WEBHOOK
fi

# Check Disk
DISK=$(df /app | awk 'NR==2 {print $5}' | sed 's/%//')
if [ "$DISK" -gt 80 ]; then
    curl -X POST -H 'Content-type: application/json' \
      --data "{\"text\":\"🚨 LOW DISK SPACE: ${DISK}% used\"}" \
      $SLACK_WEBHOOK
fi

# Adicionar ao crontab:
# */5 * * * * /app/trading-app/scripts/check-alerts.sh


═══════════════════════════════════════════════════════════════════════════════
                    7️⃣  RESPOSTA A ALERTAS
═══════════════════════════════════════════════════════════════════════════════

Alert: High CPU (> 70%)
──────────────────────

Diagnóstico:
$ docker stats trading-app-production

Causas comuns:
1. Request spike
   → Aumentar replicas (se usar orchestration)
   → Ou aumentar resources

2. Memory leak / Infinite loop
   → Ver docker logs
   → Fazer rollback se recente deploy

3. DDoS/Attack
   → Revisar nginx access logs
   → Bloquear IP fonte


Alert: High Memory (> 80%)
──────────────────────────

Diagnóstico:
$ docker inspect trading-app-production | grep -i memory
$ docker exec trading-app-production free -m

Ação:
1. Se próximo ao limite → aumentar limit
2. Se houver memory leak → reiniciar container
3. Se frequente → investigar application code


Alert: Low Disk Space (> 80%)
─────────────────────────────

Ação Imediata:
$ docker system prune -a -f  # libera ~1-2GB
$ find /var/log -name "*.gz" -delete  # libera ~100MB

Verificar:
$ docker system df
$ du -sh /app/trading-app/*


Alert: High Response Time (> 500ms)
───────────────────────────────────

Diagnóstico:
$ curl -w "@curl-format.txt" -o /dev/null http://seu-dominio.com
$ docker logs trading-app-production --tail 50

Ação:
1. Verificar CPU/Memory primeiro
2. Verificar network latency: ping seu-dominio.com
3. Se problemas de app → fazer rollback


═══════════════════════════════════════════════════════════════════════════════
                    8️⃣  TROUBLESHOOTING RÁPIDO
═══════════════════════════════════════════════════════════════════════════════

Coletânea de problemas comuns & soluções rápidas:

Problema: Container não inicia
Solução:
  $ docker logs trading-app-production
  $ docker-compose -f docker-compose.production.yml down
  $ docker system prune -a
  $ docker-compose -f docker-compose.production.yml up -d


Problema: SSH connection timeout
Solução:
  $ ssh -vvv deploy@seu-servidor.com  # verbose
  $ cat ~/.ssh/config  # verificar config
  $ ssh-keyscan seu-servidor.com >> ~/.ssh/known_hosts


Problema: Out of memory
Solução:
  $ docker stats
  $ docker system prune -a --volumes
  $ Aumentar mem_limit no docker-compose.yml


Problema: Permission denied
Solução:
  $ sudo usermod -aG docker deploy
  $ newgrp docker
  $ docker ps


Problema: Network unreachable
Solução:
  $ docker network ls
  $ docker network inspect bridge
  $ docker-compose -f docker-compose.production.yml down
  $ docker-compose -f docker-compose.production.yml up -d


═══════════════════════════════════════════════════════════════════════════════
                    COMMAND QUICK REFERENCE
═══════════════════════════════════════════════════════════════════════════════

# Conexão
ssh deploy@seu-servidor.com

# Status
docker ps
docker ps -a
docker logs trading-app-production -f
docker stats

# Controle
docker-compose -f docker-compose.production.yml up -d
docker-compose -f docker-compose.production.yml down
docker-compose -f docker-compose.production.yml restart
docker-compose -f docker-compose.production.yml pull

# Monitoramento
docker stats --no-stream
df -h
free -h
top

# Logs
tail -f /var/log/nginx/trading-app-error.log
tail -f /var/log/nginx/trading-app-access.log
journalctl -u docker -f

# Backup
bash /app/trading-app/scripts/backup.sh
ls -la /app/trading-app/backups/

# Nginx
sudo systemctl status nginx
sudo systemctl reload nginx
sudo nginx -t

# Health
bash /app/trading-app/health-check.sh
curl http://seu-dominio.com


═══════════════════════════════════════════════════════════════════════════════

Última atualização: 31 Oct 2025
Versão: 1.0

═══════════════════════════════════════════════════════════════════════════════
