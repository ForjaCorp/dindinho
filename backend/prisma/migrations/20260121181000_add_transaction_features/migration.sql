-- AlterTable
ALTER TABLE `Transaction`
  ADD COLUMN `transferId` VARCHAR(191) NULL,
  ADD COLUMN `recurrenceFrequency` ENUM('MONTHLY', 'WEEKLY', 'YEARLY', 'CUSTOM') NULL,
  ADD COLUMN `recurrenceIntervalDays` INTEGER NULL,
  ADD COLUMN `tags` JSON NULL,
  ADD COLUMN `purchaseDate` DATETIME(3) NULL,
  ADD COLUMN `invoiceMonth` VARCHAR(7) NULL;
