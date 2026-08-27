-- AlterTable
ALTER TABLE "Category" ADD COLUMN     "reactions" JSONB;

-- AlterTable
ALTER TABLE "Sink" ADD COLUMN     "reactionCounts" JSONB NOT NULL DEFAULT '{}';

-- CreateTable
CREATE TABLE "Reaction" (
    "id" TEXT NOT NULL,
    "sinkId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Reaction_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Reaction_sinkId_idx" ON "Reaction"("sinkId");

-- CreateIndex
CREATE UNIQUE INDEX "Reaction_sinkId_userId_key" ON "Reaction"("sinkId", "userId");

-- AddForeignKey
ALTER TABLE "Reaction" ADD CONSTRAINT "Reaction_sinkId_fkey" FOREIGN KEY ("sinkId") REFERENCES "Sink"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Reaction" ADD CONSTRAINT "Reaction_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
