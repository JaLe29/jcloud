-- CreateTable
CREATE TABLE "DockerSecret" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "server" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DockerSecret_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ServiceDockerSecret" (
    "id" TEXT NOT NULL,
    "serviceId" TEXT NOT NULL,
    "dockerSecretId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ServiceDockerSecret_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "DockerSecret_name_key" ON "DockerSecret"("name");

-- CreateIndex
CREATE INDEX "ServiceDockerSecret_serviceId_idx" ON "ServiceDockerSecret"("serviceId");

-- CreateIndex
CREATE INDEX "ServiceDockerSecret_dockerSecretId_idx" ON "ServiceDockerSecret"("dockerSecretId");

-- CreateIndex
CREATE UNIQUE INDEX "ServiceDockerSecret_serviceId_dockerSecretId_key" ON "ServiceDockerSecret"("serviceId", "dockerSecretId");

-- AddForeignKey
ALTER TABLE "ServiceDockerSecret" ADD CONSTRAINT "ServiceDockerSecret_serviceId_fkey" FOREIGN KEY ("serviceId") REFERENCES "Service"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ServiceDockerSecret" ADD CONSTRAINT "ServiceDockerSecret_dockerSecretId_fkey" FOREIGN KEY ("dockerSecretId") REFERENCES "DockerSecret"("id") ON DELETE CASCADE ON UPDATE CASCADE;
