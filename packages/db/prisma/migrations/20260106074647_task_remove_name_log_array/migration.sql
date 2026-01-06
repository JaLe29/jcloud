/*
  Warnings:

  - You are about to drop the column `name` on the `Task` table. All the data in the column will be lost.
  - The `log` column on the `Task` table would be dropped and recreated. This will lead to data loss if there is data in the column.

*/
-- AlterTable
ALTER TABLE "Task" DROP COLUMN "name",
DROP COLUMN "log",
ADD COLUMN     "log" TEXT[] DEFAULT ARRAY[]::TEXT[];
