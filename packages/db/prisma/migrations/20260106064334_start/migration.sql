-- CreateTable
CREATE TABLE "Application" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "namespace" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Application_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Service" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "replicas" INTEGER NOT NULL DEFAULT 1,
    "ingressUrl" TEXT,
    "cpuRequest" INTEGER,
    "memoryRequest" INTEGER,
    "cpuLimit" INTEGER,
    "memoryLimit" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "applicationId" TEXT NOT NULL,

    CONSTRAINT "Service_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Env" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Env_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ServiceEnv" (
    "id" TEXT NOT NULL,
    "serviceId" TEXT NOT NULL,
    "envId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ServiceEnv_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ApiKey" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "serviceId" TEXT NOT NULL,

    CONSTRAINT "ApiKey_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ApiDeploy" (
    "id" TEXT NOT NULL,
    "image" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "apiKeyId" TEXT NOT NULL,

    CONSTRAINT "ApiDeploy_pkey" PRIMARY KEY ("id")
);

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
CREATE UNIQUE INDEX "Application_name_key" ON "Application"("name");

-- CreateIndex
CREATE INDEX "Service_applicationId_idx" ON "Service"("applicationId");

-- CreateIndex
CREATE UNIQUE INDEX "Service_applicationId_name_key" ON "Service"("applicationId", "name");

-- CreateIndex
CREATE INDEX "ServiceEnv_serviceId_idx" ON "ServiceEnv"("serviceId");

-- CreateIndex
CREATE INDEX "ServiceEnv_envId_idx" ON "ServiceEnv"("envId");

-- CreateIndex
CREATE UNIQUE INDEX "ServiceEnv_serviceId_envId_key" ON "ServiceEnv"("serviceId", "envId");

-- CreateIndex
CREATE UNIQUE INDEX "ApiKey_key_key" ON "ApiKey"("key");

-- CreateIndex
CREATE UNIQUE INDEX "ApiKey_serviceId_key" ON "ApiKey"("serviceId");

-- CreateIndex
CREATE INDEX "ApiKey_serviceId_idx" ON "ApiKey"("serviceId");

-- CreateIndex
CREATE INDEX "ApiKey_key_idx" ON "ApiKey"("key");

-- CreateIndex
CREATE INDEX "ApiDeploy_apiKeyId_idx" ON "ApiDeploy"("apiKeyId");

-- CreateIndex
CREATE INDEX "ApiDeploy_createdAt_idx" ON "ApiDeploy"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "DockerSecret_name_key" ON "DockerSecret"("name");

-- CreateIndex
CREATE INDEX "ServiceDockerSecret_serviceId_idx" ON "ServiceDockerSecret"("serviceId");

-- CreateIndex
CREATE INDEX "ServiceDockerSecret_dockerSecretId_idx" ON "ServiceDockerSecret"("dockerSecretId");

-- CreateIndex
CREATE UNIQUE INDEX "ServiceDockerSecret_serviceId_dockerSecretId_key" ON "ServiceDockerSecret"("serviceId", "dockerSecretId");

-- AddForeignKey
ALTER TABLE "Service" ADD CONSTRAINT "Service_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "Application"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ServiceEnv" ADD CONSTRAINT "ServiceEnv_serviceId_fkey" FOREIGN KEY ("serviceId") REFERENCES "Service"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ServiceEnv" ADD CONSTRAINT "ServiceEnv_envId_fkey" FOREIGN KEY ("envId") REFERENCES "Env"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ApiKey" ADD CONSTRAINT "ApiKey_serviceId_fkey" FOREIGN KEY ("serviceId") REFERENCES "Service"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ApiDeploy" ADD CONSTRAINT "ApiDeploy_apiKeyId_fkey" FOREIGN KEY ("apiKeyId") REFERENCES "ApiKey"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ServiceDockerSecret" ADD CONSTRAINT "ServiceDockerSecret_serviceId_fkey" FOREIGN KEY ("serviceId") REFERENCES "Service"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ServiceDockerSecret" ADD CONSTRAINT "ServiceDockerSecret_dockerSecretId_fkey" FOREIGN KEY ("dockerSecretId") REFERENCES "DockerSecret"("id") ON DELETE CASCADE ON UPDATE CASCADE;
