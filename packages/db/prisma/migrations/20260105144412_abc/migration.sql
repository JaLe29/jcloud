/*
  Warnings:

  - You are about to drop the column `serviceId` on the `Env` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[key]` on the table `Env` will be added. If there are existing duplicate values, this will fail.

*/
-- DropForeignKey
ALTER TABLE "Env" DROP CONSTRAINT "Env_serviceId_fkey";

-- DropIndex
DROP INDEX "Env_serviceId_idx";

-- DropIndex
DROP INDEX "Env_serviceId_key_key";

-- AlterTable
ALTER TABLE "Env" DROP COLUMN "serviceId";

-- CreateTable
CREATE TABLE "ServiceEnv" (
    "id" TEXT NOT NULL,
    "serviceId" TEXT NOT NULL,
    "envId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ServiceEnv_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ServiceEnv_serviceId_idx" ON "ServiceEnv"("serviceId");

-- CreateIndex
CREATE INDEX "ServiceEnv_envId_idx" ON "ServiceEnv"("envId");

-- CreateIndex
CREATE UNIQUE INDEX "ServiceEnv_serviceId_envId_key" ON "ServiceEnv"("serviceId", "envId");

-- CreateIndex
CREATE UNIQUE INDEX "Env_key_key" ON "Env"("key");

-- AddForeignKey
ALTER TABLE "ServiceEnv" ADD CONSTRAINT "ServiceEnv_serviceId_fkey" FOREIGN KEY ("serviceId") REFERENCES "Service"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ServiceEnv" ADD CONSTRAINT "ServiceEnv_envId_fkey" FOREIGN KEY ("envId") REFERENCES "Env"("id") ON DELETE CASCADE ON UPDATE CASCADE;
