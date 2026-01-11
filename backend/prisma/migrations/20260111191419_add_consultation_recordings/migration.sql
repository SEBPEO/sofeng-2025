-- CreateTable
CREATE TABLE "ConsultationRecording" (
    "consultation_recording_id" SERIAL NOT NULL,
    "consultation_id" INTEGER NOT NULL,
    "file_path" VARCHAR(300) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ConsultationRecording_pkey" PRIMARY KEY ("consultation_recording_id")
);

-- CreateIndex
CREATE INDEX "ConsultationRecording_consultation_id_idx" ON "ConsultationRecording"("consultation_id");

-- AddForeignKey
ALTER TABLE "ConsultationRecording" ADD CONSTRAINT "ConsultationRecording_consultation_id_fkey" FOREIGN KEY ("consultation_id") REFERENCES "Consultation"("consultation_id") ON DELETE CASCADE ON UPDATE CASCADE;
