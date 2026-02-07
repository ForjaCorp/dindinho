/*
  Warnings:

  - A unique constraint covering the columns `[token]` on the table `Invite` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `token` to the `Invite` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE `Invite` ADD COLUMN `token` VARCHAR(191) NOT NULL;

-- CreateTable
CREATE TABLE `AuditLog` (
    `id` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `action` VARCHAR(191) NOT NULL,
    `resourceType` VARCHAR(191) NOT NULL,
    `resourceId` VARCHAR(191) NOT NULL,
    `details` JSON NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `AuditLog_userId_idx`(`userId`),
    INDEX `AuditLog_resourceId_idx`(`resourceId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateIndex
CREATE UNIQUE INDEX `Invite_token_key` ON `Invite`(`token`);

-- CreateIndex
CREATE INDEX `Invite_token_idx` ON `Invite`(`token`);
