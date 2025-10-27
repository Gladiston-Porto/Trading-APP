# Phase 1: Docker Hub Push - Guia Executivo

## 📊 Status da Imagem Docker Local

```
Image:      trading-app-frontend:latest
Size:       81.3 MB
Created:    15 minutes ago
ID:         21396a26a51f
Status:     ✅ Ready to push
```

## 🔐 Pré-requisitos

- [x] Imagem Docker local construída ✅
- [ ] Docker Hub account (criar se não tiver: https://hub.docker.com/signup)
- [ ] Docker CLI configurado
- [ ] Permissão para push (account ou organization)

## 📝 Step-by-Step: Docker Hub Push

### **STEP 1: Login no Docker Hub** (2 min)

```bash
# Fazer login no Docker Hub
docker login

# Será solicitado:
# - Username: seu_usuario_docker_hub
# - Password: seu_password_ou_token
# - Email: seu_email@example.com
```

**Dica**: Use um Personal Access Token em vez de senha para mais segurança:
1. Acesse https://hub.docker.com/settings/security
2. Clique em "New Access Token"
3. Dê um nome (ex: "CLI Token")
4. Copie o token
5. Use como password no `docker login`

---

### **STEP 2: Preparar Tags** (1 min)

Defina variáveis para facilitar:

```bash
# Defina seu username do Docker Hub
export DOCKER_USERNAME="seu_usuario_aqui"
export IMAGE_VERSION="1.0.0"
export IMAGE_NAME="trading-app-frontend"

# Exemplo prático:
export DOCKER_USERNAME="gladpros"
export IMAGE_VERSION="1.0.0"
export IMAGE_NAME="trading-app-frontend"

# Verificar as variáveis
echo "Docker Hub Username: $DOCKER_USERNAME"
echo "Image Version: $IMAGE_VERSION"
echo "Image Name: $IMAGE_NAME"
```

---

### **STEP 3: Tag da Imagem Local** (1 min)

```bash
# Tag da imagem local com o registry do Docker Hub
docker tag $IMAGE_NAME:latest $DOCKER_USERNAME/$IMAGE_NAME:$IMAGE_VERSION
docker tag $IMAGE_NAME:latest $DOCKER_USERNAME/$IMAGE_NAME:latest

# Verificar tags criadas
docker images | grep $IMAGE_NAME

# Saída esperada:
# REPOSITORY                      TAG       IMAGE ID      SIZE
# trading-app-frontend            latest    21396a26a51f  81.3MB
# gladpros/trading-app-frontend   1.0.0     21396a26a51f  81.3MB
# gladpros/trading-app-frontend   latest    21396a26a51f  81.3MB
```

---

### **STEP 4: Push para Docker Hub** (2-3 min)

```bash
# Push da versão específica
docker push $DOCKER_USERNAME/$IMAGE_NAME:$IMAGE_VERSION

# Exemplo real:
# docker push gladpros/trading-app-frontend:1.0.0

# Output esperado:
# The push refers to repository [docker.io/gladpros/trading-app-frontend]
# 9f86d081884c: Pushed
# 5f70bf18a086: Pushed
# 8ac2541b26c9: Pushed
# 1.0.0: digest: sha256:abcd1234... size: 5432

# Push da tag latest
docker push $DOCKER_USERNAME/$IMAGE_NAME:latest

# Exemplo real:
# docker push gladpros/trading-app-frontend:latest
```

---

### **STEP 5: Verificar no Docker Hub** (1 min)

1. Acesse: `https://hub.docker.com/r/SEU_USERNAME/trading-app-frontend`
2. Exemplo: `https://hub.docker.com/r/gladpros/trading-app-frontend`
3. Verifique as tags:
   - `1.0.0` ✓
   - `latest` ✓

---

### **STEP 6: Verificar Pull** (1 min)

```bash
# Testar se consegue fazer pull da imagem
docker pull $DOCKER_USERNAME/$IMAGE_NAME:$IMAGE_VERSION

# Exemplo:
# docker pull gladpros/trading-app-frontend:1.0.0

# Verificar se a imagem foi baixada
docker images | grep $DOCKER_USERNAME/$IMAGE_NAME
```

---

## 🔄 Script Automático Completo

```bash
#!/bin/bash

# ===== CONFIGURAÇÃO =====
DOCKER_USERNAME="${DOCKER_USERNAME:-seu_usuario}"
IMAGE_VERSION="${IMAGE_VERSION:-1.0.0}"
IMAGE_NAME="${IMAGE_NAME:-trading-app-frontend}"

# Cores para output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# ===== STEP 1: Login =====
echo -e "${BLUE}[STEP 1]${NC} Fazendo login no Docker Hub..."
docker login

# ===== STEP 2: Tag =====
echo -e "${BLUE}[STEP 2]${NC} Criando tags..."
docker tag $IMAGE_NAME:latest $DOCKER_USERNAME/$IMAGE_NAME:$IMAGE_VERSION
docker tag $IMAGE_NAME:latest $DOCKER_USERNAME/$IMAGE_NAME:latest
echo -e "${GREEN}✓ Tags criadas com sucesso${NC}"

# ===== STEP 3: Push =====
echo -e "${BLUE}[STEP 3]${NC} Fazendo push para Docker Hub..."
docker push $DOCKER_USERNAME/$IMAGE_NAME:$IMAGE_VERSION
docker push $DOCKER_USERNAME/$IMAGE_NAME:latest
echo -e "${GREEN}✓ Push concluído com sucesso${NC}"

# ===== STEP 4: Verificar =====
echo -e "${BLUE}[STEP 4]${NC} Verificando imagem no Docker Hub..."
echo -e "${YELLOW}Acesse: https://hub.docker.com/r/$DOCKER_USERNAME/$IMAGE_NAME${NC}"
echo -e "${GREEN}✓ Verifique as tags 1.0.0 e latest${NC}"

# ===== STEP 5: Test Pull =====
echo -e "${BLUE}[STEP 5]${NC} Testando pull da imagem..."
docker pull $DOCKER_USERNAME/$IMAGE_NAME:$IMAGE_VERSION
echo -e "${GREEN}✓ Pull teste concluído${NC}"

echo -e "${GREEN}================================${NC}"
echo -e "${GREEN}✨ PHASE 1 CONCLUÍDO COM SUCESSO${NC}"
echo -e "${GREEN}================================${NC}"
echo ""
echo -e "Imagem publicada em: ${YELLOW}$DOCKER_USERNAME/$IMAGE_NAME${NC}"
echo -e "Versão: ${YELLOW}$IMAGE_VERSION${NC}"
echo -e "Hub: ${YELLOW}https://hub.docker.com/r/$DOCKER_USERNAME/$IMAGE_NAME${NC}"
```

---

## ⚠️ Troubleshooting

### Erro: "permission denied"
```bash
# Solução: Fazer login novamente
docker logout
docker login
```

### Erro: "denied: requested access to the resource is denied"
```bash
# Possível causa: Username errado ou sem permissão
# Solução: Verificar username no Docker Hub
docker info | grep Username
```

### Erro: "no such file or directory"
```bash
# Solução: Verificar se a imagem existe
docker images
```

### Imagem muito grande (demora muito para push)
```bash
# É normal para 81.3 MB. Tempo estimado: 2-5 minutos
# Dependendo da velocidade de internet

# Para verificar progresso:
docker push $DOCKER_USERNAME/$IMAGE_NAME:$IMAGE_VERSION

# Você verá output como:
# 9f86d081884c: Pushed
# 5f70bf18a086: Pushing [==========>              ]  15.3 MB/45.2 MB
```

---

## ✅ Checklist de Conclusão

- [ ] Docker Hub account criada
- [ ] Docker login realizado com sucesso
- [ ] Imagem local taggeada com versão
- [ ] Imagem local taggeada com latest
- [ ] Push para versão concluído
- [ ] Push para latest concluído
- [ ] Verificação no Docker Hub OK
- [ ] Pull teste realizado com sucesso

---

## 📋 Comandos Rápidos

```bash
# Login
docker login

# Tag
docker tag trading-app-frontend:latest $DOCKER_USERNAME/trading-app-frontend:1.0.0
docker tag trading-app-frontend:latest $DOCKER_USERNAME/trading-app-frontend:latest

# Push
docker push $DOCKER_USERNAME/trading-app-frontend:1.0.0
docker push $DOCKER_USERNAME/trading-app-frontend:latest

# Verificar
docker images | grep trading-app-frontend

# Pull teste
docker pull $DOCKER_USERNAME/trading-app-frontend:1.0.0
```

---

## 🎯 Próximo Passo

Depois de completar o Docker Hub Push:
→ **Phase 2: GitHub Secrets Setup**
   - Configure 6 secrets no GitHub
   - Ative o GitHub Actions workflow
   - Monitore os jobs

---

## 📊 Status do Projeto

| Item | Status |
|------|--------|
| Imagem Docker Local | ✅ 81.3 MB, pronta |
| Docker Hub Account | ⏳ Criar/Usar existente |
| Docker Login | ⏳ Fazer login |
| Image Tag | ⏳ Criar tags |
| Push | ⏳ Executar push |
| Verificação | ⏳ Confirmar no hub |

---

**Próximo comando recomendado**:
```bash
docker login
```

Estimated time: 5-10 minutes total

Generated: 26 de Outubro de 2025
