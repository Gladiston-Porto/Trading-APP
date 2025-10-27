# Documentação do Sistema de Trading/Swing (B3 + Expansão Futura)

**Data de Criação:** Outubro 25, 2025  
**Versão:** 1.0  
**Autor:** GitHub Copilot (engenheiro full-stack TypeScript + quant dev)  
**Cliente:** Gladiston Porto  
**Domínio de Produção:** gladpros.net  
**Hospedagem:** Hostinger (MariaDB)

Esta documentação consolida o prompt original "PROMPT MESTRE v2", as discussões realizadas e o roadmap de desenvolvimento. Serve como guia completo para o projeto, garantindo auditabilidade, backtestabilidade e foco em estratégias determinísticas para trading/swing com 70-90% de acertividade inicial.

## 1. Visão Geral do Sistema
O sistema é um app full-stack para análise e gestão de posições em ações da B3, com expansão futura para EUA. Propósito: Identificar ações em baixa com potencial de repique (trade curto) e reversão (swing), enviando alertas acionáveis (compra/venda) com SL/TP. Inclui monitoramento, KPIs e relatórios exportáveis.

### Premissas de Negócio
- Giro rápido de capital com lucros recorrentes (dias/semanas).
- Scanner diário e intraday (5m/15m) via fontes gratuitas inicialmente.
- Alertas: In-app (WebSocket), e-mail, Telegram (priorizado).
- Risco controlado: 1-2% por trade, perda diária máxima 3%.
- Suporte inicial: Nubank (leitura/paper); expansão para XP, Inter, etc.

### Estratégias
- Entrada swing: Preço ≥ EMA9/21, cruzamento EMA9>EMA21, RSI <30 saindo, padrão reversão (hammer/engulfing), volume ≥1.2x, filtro tendência (preço ≥ SMA200).
- Entrada trade curto: Inside bar + rompimento, EMAs alinhadas.
- Saída: TP parcial, trailing por ATR, sinal contrário.

## 2. Arquitetura Técnica
Monorepo com pnpm workspaces.

### Backend (Node + Express + TypeScript + Prisma)
- **Banco:** MariaDB (Hostinger).
- **Tempo Real:** WebSocket (socket.io).
- **Jobs:** Cron (node-cron) para atualização de mercado, scan de sinais, gestão de posições, KPIs.
- **Estrutura:**
  - `src/server.ts`: Entrada principal.
  - `config/`: Env, segurança.
  - `db/prisma.ts`: Conexão.
  - `prisma/schema.prisma`: Schema do banco.
  - `domain/`: Entities, providers (Brapi/Yahoo stubs), strategies (engine, indicadores, padrões), risk manager.
  - `services/`: Signal, Backtest, PaperTrade, Alert, Portfolio, Auth.
  - `jobs/`: Cron workers.
  - `api/`: Routes, controllers, DTOs, middlewares (auth/rbac/error/rate-limit).
  - `utils/`: Candles, TA, math, logger, dates.

### Frontend (React + Vite + Tailwind, pt-BR)
- **Estrutura:**
  - `src/main.tsx`: Entrada.
  - `components/`: Reutilizáveis (Chart, Table, etc.).
  - `pages/`: Login, Dashboard, Watchlist, Screener, Signals, Positions, Backtest, Reports, Settings.
  - `api/`: HTTP client (axios), WS (socket.io).
  - `stores/`: Zustand para estado.

### Segurança e Conformidade
- OWASP: Helmet, CORS, validação, rate-limit.
- Auth: JWT (15min) + refresh (7 dias), bcrypt, RBAC.
- Auditoria: AuditLog para mudanças.
- Disclaimer: Avisos legais/risco.

### APIs Principais
- Auth: Register/Login/Refresh/Logout.
- Tickers: Busca com filtros.
- Market: Candles por símbolo/tf.
- Screener: Top oportunidades com Score.
- Strategies: CRUD.
- Signals: Lista, ack.
- Paper Trading: Enter/Exit posições.
- Positions: Lista.
- Backtest: Run com params.
- KPIs/Reports: P&L por período, export CSV/PDF.
- Alerts: Teste.

## 3. Discussões e Decisões
- **Provedores de Dados:** Prioridade em gratuitos (Brapi para B3, Yahoo para EUA) para custos em reais. Intraday via XP (R$50/mês) se necessário. Pagamentos em BRL para Brasil, USD para EUA.
- **Alertas:** Telegram gratuito (bot token) vs. WhatsApp (burocrático); optado por Telegram.
- **Precisão:** 70-90% de acerto com dados gratuitos; backtesting essencial.
- **Hospedagem:** Hostinger com MariaDB; deploy via FTP.
- **Controle:** Roadmap com fases; monitoramento semanal; foco em P&L, acertividade, custos.

## 4. Roadmap de Desenvolvimento
Ver seção anterior para detalhes completos.

## 5. Extensões Futuras
- Integrações: Corretoras reais (NuInvest, XP).
- News/Calendário: Peso de eventos.
- Parciais Automáticas.
- LLM: Explicações opcionais.

## 6. Scripts e Setup
- `pnpm i && pnpm dev`: Desenvolvimento.
- `pnpm db:push`: Prisma.
- `pnpm seed`: Dados iniciais.
- `pnpm test`: Testes.
- Docker: Compose com MariaDB.

## 7. Riscos e Mitigações
- Dependências externas: Mocks para testes.
- Custos: Iniciar gratuito; avaliar ROI.
- Compliance: Disclaimer e logs.

Para converter este arquivo .md para .doc, copie o conteúdo para Microsoft Word ou use uma ferramenta online como Pandoc.