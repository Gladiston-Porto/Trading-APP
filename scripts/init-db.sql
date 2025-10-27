-- Script inicial para configuração de BD
-- Criado para app-trade-mariadb

-- Usar DB criada por variáveis de ambiente
USE app_trade_db;

-- Criar índices para performance
-- Serão gerenciados por Prisma migrations, mas deixo aqui como referência

-- Exemplos de índices úteis após Prisma criar tabelas:
-- ALTER TABLE Candle ADD INDEX idx_ticker_timeframe (tickerId, timeframe);
-- ALTER TABLE Candle ADD INDEX idx_timestamp (ts);
-- ALTER TABLE Signal ADD INDEX idx_ticker_strategy_status (tickerId, strategyId, status);
-- ALTER TABLE Position ADD INDEX idx_user_status (userId, status);
-- ALTER TABLE AuditLog ADD INDEX idx_user_entity (userId, entity);

-- Definir charset utf8mb4 como padrão
ALTER DATABASE app_trade_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Confirmar criação
SHOW VARIABLES LIKE 'character_set_database';
SHOW VARIABLES LIKE 'collation_database';
