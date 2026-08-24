-- AlterTable
ALTER TABLE "Sink" ADD COLUMN     "companyId" TEXT;

-- CreateIndex
CREATE INDEX "Sink_companyId_idx" ON "Sink"("companyId");

-- AddForeignKey
ALTER TABLE "Sink" ADD CONSTRAINT "Sink_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE SET NULL ON UPDATE CASCADE;
