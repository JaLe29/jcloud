/*
  Warnings:

  - You are about to drop the column `applicationId` on the `Env` table. All the data in the column will be lost.
  - You are about to drop the `ServiceEnv` table. If the table is not empty, all the data it contains will be lost.
  - A unique constraint covering the columns `[serviceId,key]` on the table `Env` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `serviceId` to the `Env` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "Env" DROP CONSTRAINT "Env_applicationId_fkey";

-- DropForeignKey
ALTER TABLE "ServiceEnv" DROP CONSTRAINT "ServiceEnv_envId_fkey";

-- DropForeignKey
ALTER TABLE "ServiceEnv" DROP CONSTRAINT "ServiceEnv_serviceId_fkey";

-- DropIndex
DROP INDEX "Env_applicationId_idx";

-- DropIndex
DROP INDEX "Env_applicationId_key_key";

-- AlterTable
ALTER TABLE "Env" DROP COLUMN "applicationId",
ADD COLUMN     "serviceId" TEXT NOT NULL;

-- DropTable
DROP TABLE "ServiceEnv";

-- CreateIndex
CREATE INDEX "Env_serviceId_idx" ON "Env"("serviceId");

-- CreateIndex
CREATE UNIQUE INDEX "Env_serviceId_key_key" ON "Env"("serviceId", "key");

-- AddForeignKey
ALTER TABLE "Env" ADD CONSTRAINT "Env_serviceId_fkey" FOREIGN KEY ("serviceId") REFERENCES "Service"("id") ON DELETE CASCADE ON UPDATE CASCADE;
