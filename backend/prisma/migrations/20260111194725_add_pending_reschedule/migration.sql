-- AlterEnum
ALTER TYPE "AppointmentStatus" ADD VALUE 'pending_reschedule';

-- AlterTable
ALTER TABLE "Appointment" ADD COLUMN     "proposed_appointment_datetime" TIMESTAMP(3),
ADD COLUMN     "reschedule_note" TEXT;
