-- AlterTable
ALTER TABLE "Notification" ADD COLUMN     "count" INTEGER,
ALTER COLUMN "actorHandle" DROP NOT NULL;

-- AlterTable
ALTER TABLE "Sink" ADD COLUMN     "notifiedBuoyMilestone" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "notifiedPollMilestone" INTEGER NOT NULL DEFAULT 0;
