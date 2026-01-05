-- CreateTable
CREATE TABLE "Env" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "applicationId" TEXT NOT NULL,

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

-- CreateIndex
CREATE INDEX "Env_applicationId_idx" ON "Env"("applicationId");

-- CreateIndex
CREATE UNIQUE INDEX "Env_applicationId_key_key" ON "Env"("applicationId", "key");

-- CreateIndex
CREATE INDEX "ServiceEnv_serviceId_idx" ON "ServiceEnv"("serviceId");

-- CreateIndex
CREATE INDEX "ServiceEnv_envId_idx" ON "ServiceEnv"("envId");

-- CreateIndex
CREATE UNIQUE INDEX "ServiceEnv_serviceId_envId_key" ON "ServiceEnv"("serviceId", "envId");

-- AddForeignKey
ALTER TABLE "Env" ADD CONSTRAINT "Env_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "Application"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ServiceEnv" ADD CONSTRAINT "ServiceEnv_serviceId_fkey" FOREIGN KEY ("serviceId") REFERENCES "Service"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ServiceEnv" ADD CONSTRAINT "ServiceEnv_envId_fkey" FOREIGN KEY ("envId") REFERENCES "Env"("id") ON DELETE CASCADE ON UPDATE CASCADE;
