#!/bin/bash

# ============================================================================
# 🔐 CONFIGURE GITHUB SECRETS - AUTOMATED
# ============================================================================

REPO="Gladiston-Porto/Trading-APP"

echo "📍 Repository: $REPO"
echo ""

# Secret 1: DOCKER_USERNAME
echo "⏳ Adding DOCKER_USERNAME..."
echo -n "gladistonporto" | gh secret set DOCKER_USERNAME -R "$REPO"
echo "✅ Done"

# Secret 2: DOCKER_PASSWORD (você vai fornecer)
echo ""
echo "⏳ Adding DOCKER_PASSWORD..."
echo "Cole seu Docker Hub token (Personal Access Token) e pressione Enter:"
read DOCKER_TOKEN
echo -n "$DOCKER_TOKEN" | gh secret set DOCKER_PASSWORD -R "$REPO"
echo "✅ Done"

# Secret 3: DEPLOY_HOST
echo ""
echo "⏳ Adding DEPLOY_HOST..."
echo -n "localhost" | gh secret set DEPLOY_HOST -R "$REPO"
echo "✅ Done"

# Secret 4: DEPLOY_USER
echo ""
echo "⏳ Adding DEPLOY_USER..."
echo -n "gladistonporto" | gh secret set DEPLOY_USER -R "$REPO"
echo "✅ Done"

# Secret 5: DEPLOY_PORT
echo ""
echo "⏳ Adding DEPLOY_PORT..."
echo -n "22" | gh secret set DEPLOY_PORT -R "$REPO"
echo "✅ Done"

# Secret 6: DEPLOY_KEY (Base64)
echo ""
echo "⏳ Adding DEPLOY_KEY (Base64)..."
DEPLOY_KEY=$(cat ~/.ssh/trading-app-deploy | base64)
echo -n "$DEPLOY_KEY" | gh secret set DEPLOY_KEY -R "$REPO"
echo "✅ Done"

# Secret 7: SLACK_WEBHOOK_URL (dummy)
echo ""
echo "⏳ Adding SLACK_WEBHOOK_URL (dummy)..."
echo -n "https://hooks.slack.com/services/dummy/webhook/url" | gh secret set SLACK_WEBHOOK_URL -R "$REPO"
echo "✅ Done"

echo ""
echo "════════════════════════════════════════════════════════════════════════════"
echo "✅ TODOS OS SECRETS FORAM ADICIONADOS COM SUCESSO!"
echo "════════════════════════════════════════════════════════════════════════════"
echo ""
echo "Listando secrets:"
gh secret list -R "$REPO"
echo ""
