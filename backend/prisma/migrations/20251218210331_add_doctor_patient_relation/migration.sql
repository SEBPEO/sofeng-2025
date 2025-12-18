-- CreateTable
CREATE TABLE "DoctorPatient" (
    "id" SERIAL NOT NULL,
    "doctor_id" INTEGER NOT NULL,
    "patient_id" INTEGER NOT NULL,
    "assigned_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DoctorPatient_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "DoctorPatient_doctor_id_patient_id_key" ON "DoctorPatient"("doctor_id", "patient_id");

-- AddForeignKey
ALTER TABLE "DoctorPatient" ADD CONSTRAINT "DoctorPatient_doctor_id_fkey" FOREIGN KEY ("doctor_id") REFERENCES "DoctorProfile"("doctor_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DoctorPatient" ADD CONSTRAINT "DoctorPatient_patient_id_fkey" FOREIGN KEY ("patient_id") REFERENCES "PatientProfile"("patient_id") ON DELETE CASCADE ON UPDATE CASCADE;
