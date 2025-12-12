-- Alter token column from VARCHAR to BINARY(32)
ALTER TABLE `RefreshToken` 
  MODIFY COLUMN `token` BINARY(32) NOT NULL;

-- Ensure unique/index still present (some DBs keep it automatically, re-create if necessary)
DROP INDEX IF EXISTS `RefreshToken_token_idx` ON `RefreshToken`;
DROP INDEX IF EXISTS `RefreshToken_token_key` ON `RefreshToken`;

ALTER TABLE `RefreshToken` ADD UNIQUE INDEX `RefreshToken_token_key`(`token`);
ALTER TABLE `RefreshToken` ADD INDEX `RefreshToken_token_idx`(`token`);
