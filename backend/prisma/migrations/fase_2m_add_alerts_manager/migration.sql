-- AlterTable
ALTER TABLE `alerts` ADD COLUMN `name` VARCHAR(255) NOT NULL AFTER `userId`;
ALTER TABLE `alerts` ADD COLUMN `description` TEXT AFTER `name`;
ALTER TABLE `alerts` ADD COLUMN `type` ENUM('SIGNAL_BUY', 'SIGNAL_SELL', 'POSITION_OPENED', 'POSITION_CLOSED', 'TP_HIT', 'SL_HIT', 'PORTFOLIO_MILESTONE', 'HIGH_VOLATILITY', 'BACKTEST_COMPLETE', 'STRATEGY_UPDATED', 'RISK_THRESHOLD_HIT', 'DIVIDEND_UPCOMING', 'EARNINGS_REPORT', 'MARKET_OPENING', 'MARKET_CLOSING', 'SYSTEM_ERROR', 'SYSTEM_WARNING', 'SYSTEM_INFO', 'MAINTENANCE_ALERT', 'PERFORMANCE_ALERT') NOT NULL AFTER `description`;
ALTER TABLE `alerts` ADD COLUMN `priority` ENUM('LOW', 'MEDIUM', 'HIGH', 'CRITICAL') NOT NULL DEFAULT 'MEDIUM' AFTER `type`;
ALTER TABLE `alerts` ADD COLUMN `channels` JSON NOT NULL AFTER `priority`;
ALTER TABLE `alerts` ADD COLUMN `channelConfigs` JSON NOT NULL AFTER `channels`;
ALTER TABLE `alerts` ADD COLUMN `condition` JSON AFTER `channelConfigs`;
ALTER TABLE `alerts` ADD COLUMN `quietHours` JSON AFTER `condition`;
ALTER TABLE `alerts` ADD COLUMN `enabled` BOOLEAN NOT NULL DEFAULT true AFTER `quietHours`;
ALTER TABLE `alerts` ADD COLUMN `sendCount` INT NOT NULL DEFAULT 0 AFTER `enabled`;
ALTER TABLE `alerts` ADD COLUMN `lastSent` DATETIME AFTER `sendCount`;
ALTER TABLE `alerts` ADD COLUMN `tags` JSON NOT NULL DEFAULT '[]' AFTER `lastSent`;
ALTER TABLE `alerts` ADD COLUMN `updatedAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP AFTER `createdAt`;

-- Drop old columns
ALTER TABLE `alerts` DROP COLUMN `channel`;
ALTER TABLE `alerts` DROP COLUMN `payload`;
ALTER TABLE `alerts` DROP COLUMN `status`;
ALTER TABLE `alerts` DROP COLUMN `sentAt`;
ALTER TABLE `alerts` DROP COLUMN `error`;

-- CreateIndex
CREATE UNIQUE INDEX `alerts_userId_name_key` ON `alerts`(`userId`, `name`);
CREATE INDEX `alerts_type_idx` ON `alerts`(`type`);
CREATE INDEX `alerts_priority_idx` ON `alerts`(`priority`);
CREATE INDEX `alerts_enabled_idx` ON `alerts`(`enabled`);
