-- CreateTable
CREATE TABLE "Availability" (
    "availability_id" SERIAL NOT NULL,
    "doctor_id" INTEGER NOT NULL,
    "day_of_week" INTEGER NOT NULL,
    "start_time" VARCHAR(5) NOT NULL,
    "end_time" VARCHAR(5) NOT NULL,
    "duration_minutes" INTEGER NOT NULL,
    "is_available" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "Availability_pkey" PRIMARY KEY ("availability_id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Availability_doctor_id_day_of_week_key" ON "Availability"("doctor_id", "day_of_week");

-- AddForeignKey
ALTER TABLE "Availability" ADD CONSTRAINT "Availability_doctor_id_fkey" FOREIGN KEY ("doctor_id") REFERENCES "DoctorProfile"("doctor_id") ON DELETE CASCADE ON UPDATE CASCADE;
