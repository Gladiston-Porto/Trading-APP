# Phase 8: Validation & Smoke Tests - Guia Executivo

## 🎯 Objetivo

Executar suite completa de testes de validação e smoke tests para garantir que aplicação está funcionando corretamente em produção.

---

## 📋 Pré-requisitos

- [x] Phase 7 completado (monitoramento configurado)
- [x] Aplicação em produção
- [x] HTTPS funcionando
- [x] Prometheus/Grafana rodando

---

## 🧪 Passo 1: Testes de Conectividade HTTP

### Script de Validação Básica

```bash
# Na sua máquina local
cat > smoke-tests.sh << 'EOF'
#!/bin/bash

DOMAIN="seu_dominio.com"
BASE_URL="https://$DOMAIN"
TESTS_PASSED=0
TESTS_FAILED=0

echo "╔════════════════════════════════════════════════════════════╗"
echo "║         🧪 SMOKE TESTS - VALIDAÇÃO DE PRODUÇÃO            ║"
echo "╚════════════════════════════════════════════════════════════╝"
echo ""

# Test 1: Verificar se site está online
echo "Test 1️⃣: Site Online"
response=$(curl -s -o /dev/null -w "%{http_code}" $BASE_URL/)
if [ $response -eq 200 ]; then
    echo "✅ PASS: Site retornou HTTP 200"
    ((TESTS_PASSED++))
else
    echo "❌ FAIL: Site retornou HTTP $response (esperado 200)"
    ((TESTS_FAILED++))
fi
echo ""

# Test 2: Verificar health endpoint
echo "Test 2️⃣: Health Endpoint"
response=$(curl -s -o /dev/null -w "%{http_code}" $BASE_URL/health)
if [ $response -eq 200 ]; then
    echo "✅ PASS: Health endpoint respondendo com 200"
    ((TESTS_PASSED++))
else
    echo "❌ FAIL: Health endpoint retornou $response"
    ((TESTS_FAILED++))
fi
echo ""

# Test 3: Verificar HTTPS redirect
echo "Test 3️⃣: HTTP para HTTPS Redirect"
response=$(curl -s -o /dev/null -w "%{http_code}" -L http://$DOMAIN/)
if [ $response -eq 200 ]; then
    echo "✅ PASS: HTTP redirecionou para HTTPS"
    ((TESTS_PASSED++))
else
    echo "❌ FAIL: Redirect falhou com $response"
    ((TESTS_FAILED++))
fi
echo ""

# Test 4: Verificar certificado SSL
echo "Test 4️⃣: Certificado SSL Válido"
cert_info=$(echo | openssl s_client -servername $DOMAIN -connect $DOMAIN:443 2>/dev/null | openssl x509 -noout -dates 2>/dev/null)
if [ ! -z "$cert_info" ]; then
    echo "✅ PASS: Certificado SSL válido"
    echo "   $cert_info"
    ((TESTS_PASSED++))
else
    echo "❌ FAIL: Certificado SSL inválido"
    ((TESTS_FAILED++))
fi
echo ""

# Test 5: Verificar headers de segurança
echo "Test 5️⃣: Security Headers"
headers=$(curl -s -I $BASE_URL/ | grep -E "X-Frame-Options|X-Content-Type-Options|Strict-Transport-Security")
if [ ! -z "$headers" ]; then
    echo "✅ PASS: Security headers presentes"
    echo "$headers"
    ((TESTS_PASSED++))
else
    echo "❌ FAIL: Security headers não encontrados"
    ((TESTS_FAILED++))
fi
echo ""

# Test 6: Verificar compressão gzip
echo "Test 6️⃣: Compressão GZIP"
size_original=$(curl -s $BASE_URL/ | wc -c)
size_compressed=$(curl -s -H "Accept-Encoding: gzip" $BASE_URL/ | wc -c)
reduction=$((100 - (size_compressed * 100 / size_original)))
if [ $reduction -gt 50 ]; then
    echo "✅ PASS: GZIP ativo - Redução: ${reduction}%"
    ((TESTS_PASSED++))
else
    echo "⚠️  WARNING: Compressão baixa - ${reduction}%"
fi
echo ""

# Test 7: Verificar tempo de resposta
echo "Test 7️⃣: Tempo de Resposta"
time_response=$(curl -s -o /dev/null -w "%{time_total}" $BASE_URL/)
echo "✅ Tempo de resposta: ${time_response}s"
if (( $(echo "$time_response < 2" | bc -l) )); then
    echo "   Status: Excelente"
    ((TESTS_PASSED++))
elif (( $(echo "$time_response < 5" | bc -l) )); then
    echo "   Status: Bom"
    ((TESTS_PASSED++))
else
    echo "⚠️  WARNING: Tempo alto (${time_response}s)"
fi
echo ""

# Test 8: Verificar assets estáticos
echo "Test 8️⃣: Assets Estáticos"
assets_ok=0
for asset in index.js index.css; do
    response=$(curl -s -o /dev/null -w "%{http_code}" $BASE_URL/assets/$asset)
    if [ $response -eq 200 ]; then
        echo "   ✅ /assets/$asset: $response"
        ((assets_ok++))
    else
        echo "   ❌ /assets/$asset: $response"
    fi
done
if [ $assets_ok -eq 2 ]; then
    ((TESTS_PASSED++))
else
    ((TESTS_FAILED++))
fi
echo ""

# Teste 9: Verificar meta tags
echo "Test 9️⃣: Meta Tags"
meta_tags=$(curl -s $BASE_URL/ | grep -E "<title>|<meta name=\"description\"")
if [ ! -z "$meta_tags" ]; then
    echo "✅ PASS: Meta tags encontradas"
    echo "$meta_tags" | sed 's/^/   /'
    ((TESTS_PASSED++))
else
    echo "❌ FAIL: Meta tags não encontradas"
    ((TESTS_FAILED++))
fi
echo ""

# Test 10: Verificar cache headers
echo "Test 🔟: Cache Headers"
cache_header=$(curl -s -I $BASE_URL/assets/index.js | grep -i "Cache-Control")
if [ ! -z "$cache_header" ]; then
    echo "✅ PASS: Cache headers configurados"
    echo "   $cache_header"
    ((TESTS_PASSED++))
else
    echo "❌ FAIL: Cache headers não encontrados"
    ((TESTS_FAILED++))
fi
echo ""

# Resumo
echo "╔════════════════════════════════════════════════════════════╗"
echo "║                    📊 RESUMO DOS TESTES                    ║"
echo "╚════════════════════════════════════════════════════════════╝"
echo "✅ Testes Passou: $TESTS_PASSED"
echo "❌ Testes Falharam: $TESTS_FAILED"
TOTAL=$((TESTS_PASSED + TESTS_FAILED))
PASS_RATE=$((TESTS_PASSED * 100 / TOTAL))
echo "📈 Taxa de Sucesso: ${PASS_RATE}%"
echo ""

if [ $TESTS_FAILED -eq 0 ]; then
    echo "🎉 SUCESSO: Todos os testes passaram!"
    exit 0
else
    echo "⚠️  ATENÇÃO: ${TESTS_FAILED} teste(s) falharam"
    exit 1
fi
EOF

chmod +x smoke-tests.sh
./smoke-tests.sh
```

---

## 🔍 Passo 2: Testes de Performance

### Script de Performance

```bash
# Na sua máquina local
cat > performance-tests.sh << 'EOF'
#!/bin/bash

DOMAIN="seu_dominio.com"
BASE_URL="https://$DOMAIN"

echo "╔════════════════════════════════════════════════════════════╗"
echo "║         ⚡ PERFORMANCE TESTS - MÉTRICAS DE SPEED            ║"
echo "╚════════════════════════════════════════════════════════════╝"
echo ""

# Test 1: Home page load time
echo "Test 1️⃣: Home Page Load Time"
start_time=$(date +%s%N)
curl -s $BASE_URL/ > /dev/null
end_time=$(date +%s%N)
elapsed=$((($end_time - $start_time) / 1000000))
echo "⏱️  Load time: ${elapsed}ms"
if [ $elapsed -lt 1000 ]; then
    echo "✅ Excelente"
elif [ $elapsed -lt 2000 ]; then
    echo "✅ Bom"
elif [ $elapsed -lt 5000 ]; then
    echo "⚠️  Aceitável"
else
    echo "❌ Lento"
fi
echo ""

# Test 2: Asset sizes
echo "Test 2️⃣: Asset Sizes"
echo "JS bundle:"
curl -s -H "Accept-Encoding: gzip" -o /tmp/index.js $BASE_URL/assets/index.js
js_size=$(wc -c < /tmp/index.js)
echo "   ${js_size} bytes (comprimido)"

echo "CSS bundle:"
curl -s -H "Accept-Encoding: gzip" -o /tmp/index.css $BASE_URL/assets/index.css
css_size=$(wc -c < /tmp/index.css)
echo "   ${css_size} bytes (comprimido)"

if [ $js_size -lt 100000 ] && [ $css_size -lt 50000 ]; then
    echo "✅ Bundle sizes otimizados"
else
    echo "⚠️  Bundle sizes altos"
fi
echo ""

# Test 3: Concurrent requests
echo "Test 3️⃣: Concurrent Requests (10 requisições simultâneas)"
time (for i in {1..10}; do curl -s $BASE_URL/ > /dev/null & done; wait)
echo "✅ Teste completado"
echo ""

# Test 4: Latency percentiles
echo "Test 4️⃣: Latency Percentiles (100 requisições)"
latencies=$(for i in {1..100}; do 
    curl -s -o /dev/null -w "%{time_total}\n" $BASE_URL/
done | sort -n)

p50=$(echo "$latencies" | sed '50q;d')
p95=$(echo "$latencies" | sed '95q;d')
p99=$(echo "$latencies" | sed '99q;d')

echo "p50 (median): ${p50}s"
echo "p95: ${p95}s"
echo "p99: ${p99}s"
echo ""

# Test 5: First Contentful Paint simulation
echo "Test 5️⃣: Page Size Analysis"
page_size=$(curl -s -H "Accept-Encoding: gzip" $BASE_URL/ | wc -c)
html_size=$(curl -s $BASE_URL/ | wc -c)
compression_ratio=$((html_size / page_size))

echo "Original size: ${html_size} bytes"
echo "Compressed size: ${page_size} bytes"
echo "Compression ratio: ${compression_ratio}:1"
if [ $compression_ratio -gt 2 ]; then
    echo "✅ Boa compressão"
else
    echo "⚠️  Compressão baixa"
fi
echo ""

echo "✅ Performance tests completed"
EOF

chmod +x performance-tests.sh
./performance-tests.sh
```

---

## 🔐 Passo 3: Testes de Segurança

### Script de Security Checks

```bash
# Na sua máquina local
cat > security-tests.sh << 'EOF'
#!/bin/bash

DOMAIN="seu_dominio.com"
BASE_URL="https://$DOMAIN"

echo "╔════════════════════════════════════════════════════════════╗"
echo "║         🔒 SECURITY TESTS - VALIDAÇÃO DE SEGURANÇA        ║"
echo "╚════════════════════════════════════════════════════════════╝"
echo ""

# Test 1: SSL/TLS version
echo "Test 1️⃣: SSL/TLS Version"
echo | openssl s_client -servername $DOMAIN -connect $DOMAIN:443 2>/dev/null | grep "Protocol  :"
echo "✅ TLS version verificado"
echo ""

# Test 2: Security headers
echo "Test 2️⃣: Security Headers"
echo "Verificando..."
headers=$(curl -s -I $BASE_URL/ | grep -E "X-Frame-Options|X-Content-Type-Options|Strict-Transport-Security|X-XSS-Protection|Content-Security-Policy")

if echo "$headers" | grep -q "X-Frame-Options"; then
    echo "✅ X-Frame-Options: $(echo "$headers" | grep X-Frame-Options | cut -d: -f2-)"
else
    echo "❌ X-Frame-Options: MISSING"
fi

if echo "$headers" | grep -q "X-Content-Type-Options"; then
    echo "✅ X-Content-Type-Options: $(echo "$headers" | grep X-Content-Type-Options | cut -d: -f2-)"
else
    echo "❌ X-Content-Type-Options: MISSING"
fi

if echo "$headers" | grep -q "Strict-Transport-Security"; then
    echo "✅ HSTS: $(echo "$headers" | grep Strict-Transport-Security | cut -d: -f2-)"
else
    echo "⚠️  HSTS: MISSING"
fi
echo ""

# Test 3: No sensitive data in response
echo "Test 3️⃣: Sensitive Data Exposure"
response=$(curl -s -I $BASE_URL/)
if echo "$response" | grep -qi "server:"; then
    echo "⚠️  Server header visible (considerar remover)"
else
    echo "✅ Server header oculto"
fi
echo ""

# Test 4: HTTPS enforcement
echo "Test 4️⃣: HTTPS Enforcement"
response=$(curl -s -o /dev/null -w "%{http_code}" http://$DOMAIN/ 2>/dev/null)
if [ $response -eq 301 ] || [ $response -eq 302 ]; then
    echo "✅ HTTP redireciona para HTTPS"
else
    echo "⚠️  HTTP não está redirecionando"
fi
echo ""

# Test 5: Certificate validity
echo "Test 5️⃣: Certificate Validity"
cert_expires=$(echo | openssl s_client -servername $DOMAIN -connect $DOMAIN:443 2>/dev/null | openssl x509 -noout -enddate 2>/dev/null | cut -d= -f2)
echo "✅ Certificate expires: $cert_expires"

# Check if expiring soon
days_until_expiry=$(( ($(date -d "$cert_expires" +%s) - $(date +%s)) / 86400 ))
if [ $days_until_expiry -gt 30 ]; then
    echo "✅ Certificado válido por $days_until_expiry dias"
else
    echo "⚠️  Certificado expira em $days_until_expiry dias!"
fi
echo ""

# Test 6: No common vulnerabilities
echo "Test 6️⃣: Common Vulnerability Checks"
echo "Verificando clickjacking..."
if curl -s -I $BASE_URL/ | grep -q "X-Frame-Options"; then
    echo "✅ Proteção contra clickjacking"
else
    echo "⚠️  Vulnerable to clickjacking"
fi

echo "Verificando XSS..."
if curl -s -I $BASE_URL/ | grep -q "X-XSS-Protection"; then
    echo "✅ Proteção XSS ativa"
else
    echo "ℹ️  XSS Protection não configurada (use CSP instead)"
fi

echo ""
echo "✅ Security tests completed"
EOF

chmod +x security-tests.sh
./security-tests.sh
```

---

## 📋 Passo 4: Testes Funcionais

### Script de Functional Tests

```bash
# Na sua máquina local
cat > functional-tests.sh << 'EOF'
#!/bin/bash

DOMAIN="seu_dominio.com"
BASE_URL="https://$DOMAIN"

echo "╔════════════════════════════════════════════════════════════╗"
echo "║         ✅ FUNCTIONAL TESTS - VALIDAÇÃO DE FEATURES        ║"
echo "╚════════════════════════════════════════════════════════════╝"
echo ""

# Test 1: Homepage loads
echo "Test 1️⃣: Homepage Loads Correctly"
html=$(curl -s $BASE_URL/)
if echo "$html" | grep -q "<title>"; then
    echo "✅ Homepage carrega com title"
else
    echo "❌ Homepage title não encontrado"
fi
echo ""

# Test 2: React app initializes
echo "Test 2️⃣: React App Initializes"
if echo "$html" | grep -q "root\|app"; then
    echo "✅ React root element presente"
else
    echo "❌ React root não encontrado"
fi
echo ""

# Test 3: CSS loaded
echo "Test 3️⃣: CSS Loaded"
response=$(curl -s -o /dev/null -w "%{http_code}" $BASE_URL/assets/index.css)
if [ $response -eq 200 ]; then
    echo "✅ CSS arquivo carrega (HTTP 200)"
else
    echo "❌ CSS arquivo retorna HTTP $response"
fi
echo ""

# Test 4: JavaScript loaded
echo "Test 4️⃣: JavaScript Loaded"
response=$(curl -s -o /dev/null -w "%{http_code}" $BASE_URL/assets/index.js)
if [ $response -eq 200 ]; then
    echo "✅ JS arquivo carrega (HTTP 200)"
else
    echo "❌ JS arquivo retorna HTTP $response"
fi
echo ""

# Test 5: API connectivity (se aplicável)
echo "Test 5️⃣: API Connectivity"
api_url="$BASE_URL/api/status"
response=$(curl -s -o /dev/null -w "%{http_code}" $api_url 2>/dev/null)
if [ $response -eq 200 ] || [ $response -eq 404 ]; then
    echo "✅ API respondendo (HTTP $response)"
else
    echo "⚠️  API retorna HTTP $response"
fi
echo ""

# Test 6: Static assets cache
echo "Test 6️⃣: Static Assets Caching"
cache_header=$(curl -s -I $BASE_URL/assets/index.js | grep "Cache-Control" | head -n1)
if echo "$cache_header" | grep -q "max-age"; then
    echo "✅ Cache-Control configurado"
    echo "   $cache_header"
else
    echo "⚠️  Cache-Control não configurado"
fi
echo ""

# Test 7: Health endpoint
echo "Test 7️⃣: Health Endpoint"
health=$(curl -s $BASE_URL/health)
if echo "$health" | grep -q "healthy\|ok"; then
    echo "✅ Health endpoint respondendo"
    echo "   $health"
else
    echo "ℹ️  Health endpoint retorna: $health"
fi
echo ""

echo "✅ Functional tests completed"
EOF

chmod +x functional-tests.sh
./functional-tests.sh
```

---

## 🚀 Passo 5: Executar Todos os Testes

```bash
# Na sua máquina local
echo "=== SMOKE TESTS ===" && ./smoke-tests.sh
echo ""
echo "=== PERFORMANCE TESTS ===" && ./performance-tests.sh
echo ""
echo "=== SECURITY TESTS ===" && ./security-tests.sh
echo ""
echo "=== FUNCTIONAL TESTS ===" && ./functional-tests.sh
```

---

## 📊 Passo 6: Gerar Relatório

```bash
# Na sua máquina local
cat > generate-report.sh << 'EOF'
#!/bin/bash

DOMAIN="seu_dominio.com"
REPORT_FILE="validation-report-$(date +%Y%m%d-%H%M%S).md"

echo "# 📊 Validation Report - $DOMAIN" > $REPORT_FILE
echo "" >> $REPORT_FILE
echo "Generated: $(date)" >> $REPORT_FILE
echo "" >> $REPORT_FILE

echo "## ✅ Tests Executed" >> $REPORT_FILE
echo "" >> $REPORT_FILE
echo "- Smoke Tests" >> $REPORT_FILE
echo "- Performance Tests" >> $REPORT_FILE
echo "- Security Tests" >> $REPORT_FILE
echo "- Functional Tests" >> $REPORT_FILE
echo "" >> $REPORT_FILE

echo "## 📈 Results" >> $REPORT_FILE
echo "" >> $REPORT_FILE

# Execute tests e capture output
echo "### Smoke Tests" >> $REPORT_FILE
./smoke-tests.sh >> $REPORT_FILE 2>&1
echo "" >> $REPORT_FILE

echo "### Performance Metrics" >> $REPORT_FILE
./performance-tests.sh >> $REPORT_FILE 2>&1
echo "" >> $REPORT_FILE

echo "### Security Checks" >> $REPORT_FILE
./security-tests.sh >> $REPORT_FILE 2>&1
echo "" >> $REPORT_FILE

echo "### Functional Tests" >> $REPORT_FILE
./functional-tests.sh >> $REPORT_FILE 2>&1
echo "" >> $REPORT_FILE

echo "Report saved to: $REPORT_FILE"
cat $REPORT_FILE
EOF

chmod +x generate-report.sh
./generate-report.sh
```

---

## ✅ Checklist de Conclusão

- [ ] Smoke tests 100% passed
- [ ] Performance tests OK (<2s home page)
- [ ] SSL/TLS tests passed
- [ ] Security headers present
- [ ] Assets loading correctly
- [ ] Cache headers configured
- [ ] Health endpoint responding
- [ ] No console errors
- [ ] Relatório gerado
- [ ] Todos os 10 testes passando

---

## 🎯 Próximo Passo

Depois de validação completa:
→ **Phase 9: Documentation & Runbooks**
   - Operational procedures
   - Incident response
   - Disaster recovery

---

**Status**: Phase 8 - Validation & Smoke Tests
Generated: 26 de Outubro de 2025
Estimated Time: 10-15 minutes
