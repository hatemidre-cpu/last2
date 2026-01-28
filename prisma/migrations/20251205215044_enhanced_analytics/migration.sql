-- AlterTable
ALTER TABLE "AnalyticsLog" ADD COLUMN     "browser" TEXT,
ADD COLUMN     "deviceType" TEXT,
ADD COLUMN     "language" TEXT,
ADD COLUMN     "location" JSONB,
ADD COLUMN     "os" TEXT,
ADD COLUMN     "referrer" TEXT,
ADD COLUMN     "screenResolution" TEXT;
