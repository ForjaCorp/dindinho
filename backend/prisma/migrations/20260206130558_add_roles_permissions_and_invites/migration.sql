/*
  Warnings:

  - You are about to drop the column `role` on the `AccountAccess` table. All the data in the column will be lost.
  - You are about to drop the column `role` on the `InviteAccount` table. All the data in the column will be lost.
  - You are about to drop the column `role` on the `User` table. All the data in the column will be lost.

*/
-- AlterTable (Step 1: Add new columns)
ALTER TABLE `AccountAccess` ADD COLUMN `permission` ENUM('VIEWER', 'EDITOR', 'OWNER') NOT NULL DEFAULT 'VIEWER';
ALTER TABLE `InviteAccount` ADD COLUMN `permission` ENUM('VIEWER', 'EDITOR', 'OWNER') NOT NULL DEFAULT 'VIEWER';
ALTER TABLE `User` ADD COLUMN `systemRole` ENUM('USER', 'ADMIN') NOT NULL DEFAULT 'USER';

-- Data Migration (Step 2: Map old role to new columns)
-- Mapping logic:
-- AccountAccess/InviteAccount: VIEWER, EDITOR, OWNER (same values)
-- User: ADMIN -> ADMIN, others (VIEWER, EDITOR) -> USER
UPDATE `AccountAccess` SET `permission` = `role` WHERE `role` IN ('VIEWER', 'EDITOR', 'OWNER');
UPDATE `InviteAccount` SET `permission` = `role` WHERE `role` IN ('VIEWER', 'EDITOR', 'OWNER');
UPDATE `User` SET `systemRole` = 'ADMIN' WHERE `role` = 'ADMIN';
UPDATE `User` SET `systemRole` = 'USER' WHERE `role` != 'ADMIN';

-- AlterTable (Step 3: Drop old columns)
ALTER TABLE `AccountAccess` DROP COLUMN `role`;
ALTER TABLE `InviteAccount` DROP COLUMN `role`;
ALTER TABLE `User` DROP COLUMN `role`;
