-- RenameTable
RENAME TABLE `Wallet` TO `Account`;

-- RenameTable
RENAME TABLE `WalletAccess` TO `AccountAccess`;

-- AlterTable
ALTER TABLE `CreditCardInfo` RENAME COLUMN `walletId` TO `accountId`;

-- AlterTable
ALTER TABLE `AccountAccess` RENAME COLUMN `walletId` TO `accountId`;

-- AlterTable
ALTER TABLE `Transaction` RENAME COLUMN `walletId` TO `accountId`;
