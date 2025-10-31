═══════════════════════════════════════════════════════════════════════════════
                        🚨 EMERGENCY RUNBOOK
                   Trading APP - Troubleshooting & Recovery
═══════════════════════════════════════════════════════════════════════════════

Este documento fornece soluções rápidas para situações de emergência.


═══════════════════════════════════════════════════════════════════════════════
                    1️⃣  APLICAÇÃO NÃO RESPONDE
═══════════════════════════════════════════════════════════════════════════════

Sintomas:
  • Timeout ao acessar http://seu-dominio.com
  • 502 Bad Gateway (Nginx não consegue conectar)
  • Error connecting to upstream

Diagnosis:
─────────

$ ssh deploy@seu-servidor.com

# Verificar containers
$ docker ps
$ docker ps -a | grep trading-app

# Ver logs
$ docker logs trading-app-production
$ docker logs trading-app-production --tail 50 -f

# Verificar se container está rodando
$ docker inspect trading-app-production | grep -i "state"

# Testar conectividade
$ curl http://localhost:3001
$ curl -v http://localhost:3001


Solução Rápida (Restart):
────────────────────────

# Opção 1: Restart via docker-compose
$ cd /app/trading-app
$ docker-compose -f docker-compose.production.yml restart

# Opção 2: Rebuild e reiniciar
$ docker-compose -f docker-compose.production.yml down
$ docker-compose -f docker-compose.production.yml pull
$ docker-compose -f docker-compose.production.yml up -d

# Opção 3: Restart Docker daemon
$ sudo systemctl restart docker


Verificar Saúde Após Restart:
─────────────────────────────

$ sleep 10  # Aguardar container iniciar
$ docker ps
$ /app/trading-app/health-check.sh
$ curl http://seu-dominio.com


═══════════════════════════════════════════════════════════════════════════════
                    2️⃣  NGINX RETORNANDO ERRO
═══════════════════════════════════════════════════════════════════════════════

Erro: 502 Bad Gateway
─────────────────────

Diagnóstico:
$ sudo nginx -t
$ sudo journalctl -u nginx -n 50
$ cat /var/log/nginx/trading-app-error.log | tail -20

Solução:
1. Verificar se aplicação está rodando:
   $ docker ps | grep trading-app

2. Verificar se proxy_pass está correto:
   $ grep proxy_pass /etc/nginx/sites-enabled/trading-app

3. Testar conexão localhost:
   $ curl http://localhost:3001

4. Recarregar Nginx:
   $ sudo systemctl reload nginx


Erro: 404 Not Found
───────────────────

Possível Causa: Static files não encontrados

Solução:
$ docker logs trading-app-production | grep -i error
$ docker exec trading-app-production ls -la /usr/share/nginx/html/


Erro: SSL Certificate Error
────────────────────────────

$ sudo certbot certificates
$ sudo certbot renew --dry-run


═══════════════════════════════════════════════════════════════════════════════
                    3️⃣  CONTAINER TRAVADO OU USANDO MUITA MEMÓRIA
═══════════════════════════════════════════════════════════════════════════════

Diagnóstico:
────────────

$ docker stats
$ docker stats trading-app-production

# Verificar limite de memória
$ docker inspect trading-app-production | grep -i memory

# Ver processos dentro do container
$ docker exec trading-app-production ps aux


Solução Gradual:
────────────────

# 1. Tentar limpar cache do Docker
$ docker system prune
$ docker system prune -a --volumes

# 2. Aumentar limite de memória no docker-compose.yml
# Editar: docker-compose.production.yml
# Mudar: mem_limit: 512m para mem_limit: 1g

# 3. Reiniciar container
$ cd /app/trading-app
$ docker-compose -f docker-compose.production.yml restart

# 4. Se ainda tiver problema, fazer rebuild
$ docker-compose -f docker-compose.production.yml down
$ docker rmi gladistonporto/trading-app-frontend:latest
$ docker-compose -f docker-compose.production.yml up -d


═══════════════════════════════════════════════════════════════════════════════
                    4️⃣  SEM ESPAÇO EM DISCO
═══════════════════════════════════════════════════════════════════════════════

Diagnóstico:
────────────

$ df -h
$ docker system df
$ du -sh /app/trading-app
$ du -sh /var/lib/docker

Limpeza Imediata:
─────────────────

# 1. Remover containers parados
$ docker container prune -f

# 2. Remover imagens não usadas
$ docker image prune -a -f

# 3. Remover volumes não usados
$ docker volume prune -f

# 4. Limpar Nginx cache
$ sudo rm -rf /var/log/nginx/*.log*

# 5. Limpar backups antigos
$ find /app/trading-app/backups -name "*.tar.gz" -mtime +30 -delete

# 6. Limpar Docker system (CUIDADO!)
$ docker system prune -a --volumes -f

Resultado esperado: Libera 2-5 GB de espaço


═══════════════════════════════════════════════════════════════════════════════
                    5️⃣  DEPLOY FALHOU
═══════════════════════════════════════════════════════════════════════════════

Problema: GitHub Actions deploy job falhou

Verificação no Servidor:
───────────────────────

# Verificar se SSH key está correta
$ grep -r "trading-app-deploy" ~/.ssh/authorized_keys

# Verificar permissões SSH
$ stat ~/.ssh
$ stat ~/.ssh/authorized_keys

# Testar conexão SSH
ssh -i ~/.ssh/trading-app-deploy deploy@seu-servidor.com "echo OK"

# Ver logs do GitHub Actions
# Ir para: https://github.com/Gladiston-Porto/Trading-APP/actions

# Verificar Docker Hub credentials
docker login -u gladistonporto

Solução:
────────

1. Regenerar SSH key:
   $ ssh-keygen -t ed25519 -f ~/.ssh/trading-app-deploy -N ""
   $ cat ~/.ssh/trading-app-deploy | base64

2. Atualizar secret no GitHub:
   $ echo -n "$(cat ~/.ssh/trading-app-deploy | base64)" | gh secret set DEPLOY_KEY

3. Testar deploy manualmente:
   $ cd /app/trading-app
   $ git pull origin main
   $ docker-compose -f docker-compose.production.yml pull
   $ docker-compose -f docker-compose.production.yml up -d


═══════════════════════════════════════════════════════════════════════════════
                    6️⃣  ALTA LATÊNCIA / LENTIDÃO
═══════════════════════════════════════════════════════════════════════════════

Diagnóstico:
────────────

# Verificar CPU
$ top
$ docker stats

# Verificar network
$ iftop
$ nethogs

# Verificar I/O de disco
$ iostat -x 1

# Verificar logs de erro
$ docker logs trading-app-production --tail 100

# Medir response time
$ curl -w "@curl-format.txt" -o /dev/null -s http://localhost:3001


Possíveis Causas & Soluções:
─────────────────────────────

1. Alta CPU/Memória:
   → Ver section "3. CONTAINER TRAVADO"

2. Problema de Network:
   $ docker network ls
   $ docker network inspect trading-app_trading-network

3. Limite de Conexões:
   $ docker exec trading-app-production ss -an | grep ESTABLISHED | wc -l

4. Problema de DNS:
   $ nslookup seu-dominio.com
   $ dig seu-dominio.com

5. Rate limiting/DDoS:
   $ grep "too many connections" /var/log/nginx/trading-app-error.log
   → Ver fail2ban setup

6. Cache do Nginx:
   $ sudo rm -rf /var/cache/nginx/*
   $ sudo systemctl reload nginx


═══════════════════════════════════════════════════════════════════════════════
                    7️⃣  RECUPERAR DE BACKUP
═══════════════════════════════════════════════════════════════════════════════

Situações de Uso:
  • Corrupção de dados
  • Ataque de segurança
  • Falha de deploy
  • Disaster recovery

Procedure:
──────────

# 1. Listar backups disponíveis
$ ls -la /app/trading-app/backups/

# 2. Desligar aplicação
$ cd /app/trading-app
$ docker-compose -f docker-compose.production.yml down

# 3. Fazer backup do estado atual (para auditoria)
$ tar -czf /app/trading-app/backups/pre-recovery-$(date +%s).tar.gz /app/trading-app

# 4. Restaurar backup
$ cd /app/trading-app
$ tar -xzf /app/trading-app/backups/trading-app-backup-YYYYMMDD_HHMMSS.tar.gz -C /

# 5. Reiniciar containers
$ docker-compose -f docker-compose.production.yml pull
$ docker-compose -f docker-compose.production.yml up -d

# 6. Verificar saúde
$ /app/trading-app/health-check.sh


═══════════════════════════════════════════════════════════════════════════════
                    8️⃣  ROLLBACK DE DEPLOY
═══════════════════════════════════════════════════════════════════════════════

Se deploy quebrou a aplicação:

Opção 1: Voltar para imagem anterior
────────────────────────────────────

# Ver histórico de imagens
$ docker image ls | grep trading-app

# Usar imagem anterior
$ docker tag gladistonporto/trading-app-frontend:latest-backup trading-app-prod:latest
$ cd /app/trading-app
$ docker-compose -f docker-compose.production.yml down
$ docker-compose -f docker-compose.production.yml up -d


Opção 2: Git rollback
──────────────────────

$ cd /app/trading-app
$ git log --oneline | head -10
$ git reset --hard HEAD~1
$ docker-compose -f docker-compose.production.yml down
$ docker-compose -f docker-compose.production.yml pull
$ docker-compose -f docker-compose.production.yml up -d


═══════════════════════════════════════════════════════════════════════════════
                    9️⃣  VERIFICAÇÃO DE SEGURANÇA DE EMERGÊNCIA
═══════════════════════════════════════════════════════════════════════════════

Se suspeitar de ataque/comprometimento:

# 1. Revisar logs de acesso
$ tail -100 /var/log/nginx/trading-app-access.log | grep -i "suspicious|hack|admin"

# 2. Verificar processos estranhos
$ ps aux | grep -v "grep"
$ docker ps
$ docker exec trading-app-production ps aux

# 3. Revisar mudanças recentes
$ git log --oneline | head -20
$ docker image history gladistonporto/trading-app-frontend:latest

# 4. Verificar permissões de arquivo
$ stat /app/trading-app
$ find /app/trading-app -perm /u+s,g+s

# 5. Se confirmado comprometimento:
  a) Desligar container: docker-compose down
  b) Fazer backup para análise: tar -czf compromised-$(date +%s).tar.gz /app/trading-app
  c) Restaurar de backup confiável (vide section 7)
  d) Audit completo de segurança

# 6. Alertar time de segurança
# (Contate seu time de DevSecOps/SRE)


═══════════════════════════════════════════════════════════════════════════════
                    🔟 ESCALAÇÃO DE PROBLEMAS
═══════════════════════════════════════════════════════════════════════════════

Se nenhuma solução acima funcionar:

Escalação (em ordem):
─────────────────────

1. DevOps Engineer
   • Verificar infra
   • Analisar logs de sistema
   • Fazer recovery completo

2. Database/Infrastructure Team
   • Se problema for de armazenamento/backup
   • Verificar health dos discos

3. Cloud Provider Support (AWS/DigitalOcean/etc)
   • Se problema for de hypervisor/network
   • Hardware issues

4. Vendor Support
   • Se problema for de Docker/Nginx versions


Informações para Incluir em Ticket:
──────────────────────────────────

```
INCIDENT REPORT
───────────────
Date/Time: [quando começou]
Symptom: [o que está acontecendo]
Impact: [% users afetados, serviço down/degraded]
Business Impact: [valor/importância]

Diagnostic:
$ docker ps
$ docker stats
$ docker logs trading-app-production --tail 50
$ curl -v http://localhost:3001
$ df -h
$ free -h

Attempted Solutions:
- [o que já tentou]
- [o que funcionou/não funcionou]

Timeline:
- [15:30] Problema começou
- [15:35] Iniciou troubleshooting
- [15:40] Tentou restart
- [etc]

Stacktrace/Error Messages:
[Colar error messages aqui]
```


═══════════════════════════════════════════════════════════════════════════════
                    CONTATOS IMPORTANTES
═══════════════════════════════════════════════════════════════════════════════

Equipe Interna:
  • DevOps Lead: [email]
  • SRE On-Call: [phone/pager]
  • Security Team: [email]
  • Database Team: [email]

Fornecedores:
  • Docker: support@docker.com
  • GitHub: support@github.com
  • Your Cloud Provider: [support URL]

Escalação Externa:
  • Status Page: [monitoring dashboard URL]
  • Incident Commander: [contact info]

Emergency Channels:
  • Slack: #trading-app-incidents
  • PagerDuty: [on-call info]
  • War Room: [video call link]


═══════════════════════════════════════════════════════════════════════════════

Última atualização: 31 Oct 2025
Versão: 1.0

═══════════════════════════════════════════════════════════════════════════════
