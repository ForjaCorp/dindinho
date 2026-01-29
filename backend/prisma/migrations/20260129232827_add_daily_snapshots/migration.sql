-- CreateTable
CREATE TABLE `DailySnapshot` (
    `id` VARCHAR(191) NOT NULL,
    `accountId` VARCHAR(191) NOT NULL,
    `date` DATETIME(3) NOT NULL,
    `balance` DECIMAL(10, 2) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `DailySnapshot_date_idx`(`date`),
    UNIQUE INDEX `DailySnapshot_accountId_date_key`(`accountId`, `date`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `DailySnapshot` ADD CONSTRAINT `DailySnapshot_accountId_fkey` FOREIGN KEY (`accountId`) REFERENCES `Account`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
