-- CreateIndex
CREATE INDEX `AuditLog_resourceType_resourceId_idx` ON `AuditLog`(`resourceType`, `resourceId`);
