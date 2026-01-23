-- CreateTable
CREATE TABLE "ConsultationActionItem" (
    "action_item_id" SERIAL NOT NULL,
    "consultation_id" INTEGER NOT NULL,
    "description" TEXT NOT NULL,
    "is_completed" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ConsultationActionItem_pkey" PRIMARY KEY ("action_item_id")
);

-- CreateIndex
CREATE INDEX "ConsultationActionItem_consultation_id_idx" ON "ConsultationActionItem"("consultation_id");

-- CreateIndex
CREATE INDEX "ConsultationActionItem_consultation_id_is_completed_idx" ON "ConsultationActionItem"("consultation_id", "is_completed");

-- AddForeignKey
ALTER TABLE "ConsultationActionItem" ADD CONSTRAINT "ConsultationActionItem_consultation_id_fkey" FOREIGN KEY ("consultation_id") REFERENCES "Consultation"("consultation_id") ON DELETE CASCADE ON UPDATE CASCADE;
