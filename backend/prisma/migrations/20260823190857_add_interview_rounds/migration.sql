-- CreateEnum
CREATE TYPE "InterviewRoundType" AS ENUM ('PHONE_SCREEN', 'ONLINE_ASSESSMENT', 'TECHNICAL', 'SYSTEM_DESIGN', 'BEHAVIORAL', 'HIRING_MANAGER', 'HR', 'OTHER');

-- CreateEnum
CREATE TYPE "InterviewRoundResult" AS ENUM ('PENDING', 'CLEARED', 'REJECTED');

-- CreateTable
CREATE TABLE "InterviewRound" (
    "id" TEXT NOT NULL,
    "applicationId" TEXT NOT NULL,
    "position" INTEGER NOT NULL,
    "type" "InterviewRoundType" NOT NULL DEFAULT 'TECHNICAL',
    "typeOther" TEXT,
    "scheduledAt" TIMESTAMP(3),
    "result" "InterviewRoundResult" NOT NULL DEFAULT 'PENDING',
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InterviewRound_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "InterviewRound_applicationId_position_idx" ON "InterviewRound"("applicationId", "position");

-- AddForeignKey
ALTER TABLE "InterviewRound" ADD CONSTRAINT "InterviewRound_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "Application"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
