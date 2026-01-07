-- AlterTable
ALTER TABLE "Service" ADD COLUMN     "livenessProbeFailureThreshold" INTEGER,
ADD COLUMN     "livenessProbeInitialDelaySeconds" INTEGER,
ADD COLUMN     "livenessProbePath" TEXT,
ADD COLUMN     "livenessProbePeriodSeconds" INTEGER,
ADD COLUMN     "livenessProbeSuccessThreshold" INTEGER,
ADD COLUMN     "livenessProbeTimeoutSeconds" INTEGER,
ADD COLUMN     "readinessProbeFailureThreshold" INTEGER,
ADD COLUMN     "readinessProbeInitialDelaySeconds" INTEGER,
ADD COLUMN     "readinessProbePath" TEXT,
ADD COLUMN     "readinessProbePeriodSeconds" INTEGER,
ADD COLUMN     "readinessProbeSuccessThreshold" INTEGER,
ADD COLUMN     "readinessProbeTimeoutSeconds" INTEGER;
