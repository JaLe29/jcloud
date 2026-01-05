/*
  Warnings:

  - You are about to drop the `ApiKeyUsage` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "ApiKeyUsage" DROP CONSTRAINT "ApiKeyUsage_apiKeyId_fkey";

-- DropTable
DROP TABLE "ApiKeyUsage";

-- CreateTable
CREATE TABLE "ApiDeploy" (
    "id" TEXT NOT NULL,
    "image" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "apiKeyId" TEXT NOT NULL,

    CONSTRAINT "ApiDeploy_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ApiDeploy_apiKeyId_idx" ON "ApiDeploy"("apiKeyId");

-- CreateIndex
CREATE INDEX "ApiDeploy_createdAt_idx" ON "ApiDeploy"("createdAt");

-- AddForeignKey
ALTER TABLE "ApiDeploy" ADD CONSTRAINT "ApiDeploy_apiKeyId_fkey" FOREIGN KEY ("apiKeyId") REFERENCES "ApiKey"("id") ON DELETE CASCADE ON UPDATE CASCADE;
