/*
  Warnings:

  - You are about to drop the column `namespace` on the `Service` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Service" DROP COLUMN "namespace",
ADD COLUMN     "cpuLimit" INTEGER,
ADD COLUMN     "cpuRequest" INTEGER,
ADD COLUMN     "ingressUrl" TEXT,
ADD COLUMN     "memoryLimit" INTEGER,
ADD COLUMN     "memoryRequest" INTEGER,
ADD COLUMN     "replicas" INTEGER NOT NULL DEFAULT 1;
