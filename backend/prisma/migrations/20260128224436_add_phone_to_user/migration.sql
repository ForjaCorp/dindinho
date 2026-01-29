-- DropForeignKey
ALTER TABLE `Account` DROP FOREIGN KEY `Wallet_ownerId_fkey`;

-- DropForeignKey
ALTER TABLE `AccountAccess` DROP FOREIGN KEY `WalletAccess_userId_fkey`;

-- DropForeignKey
ALTER TABLE `AccountAccess` DROP FOREIGN KEY `WalletAccess_walletId_fkey`;

-- DropForeignKey
ALTER TABLE `CreditCardInfo` DROP FOREIGN KEY `CreditCardInfo_walletId_fkey`;

-- DropForeignKey
ALTER TABLE `Transaction` DROP FOREIGN KEY `Transaction_walletId_fkey`;

-- AlterTable
ALTER TABLE `User` ADD COLUMN `phone` VARCHAR(191) NULL;

-- AddForeignKey
ALTER TABLE `Account` ADD CONSTRAINT `Account_ownerId_fkey` FOREIGN KEY (`ownerId`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `CreditCardInfo` ADD CONSTRAINT `CreditCardInfo_accountId_fkey` FOREIGN KEY (`accountId`) REFERENCES `Account`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `AccountAccess` ADD CONSTRAINT `AccountAccess_accountId_fkey` FOREIGN KEY (`accountId`) REFERENCES `Account`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `AccountAccess` ADD CONSTRAINT `AccountAccess_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Transaction` ADD CONSTRAINT `Transaction_accountId_fkey` FOREIGN KEY (`accountId`) REFERENCES `Account`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- RenameIndex
ALTER TABLE `AccountAccess` RENAME INDEX `WalletAccess_walletId_userId_key` TO `AccountAccess_accountId_userId_key`;

-- RenameIndex
ALTER TABLE `CreditCardInfo` RENAME INDEX `CreditCardInfo_walletId_key` TO `CreditCardInfo_accountId_key`;

-- RenameIndex
ALTER TABLE `Transaction` RENAME INDEX `Transaction_walletId_idx` TO `Transaction_accountId_idx`;
