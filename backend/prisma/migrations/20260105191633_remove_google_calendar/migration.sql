/*
  Warnings:

  - You are about to drop the column `google_calendar_event_id` on the `Appointment` table. All the data in the column will be lost.
  - You are about to drop the column `google_refresh_token` on the `User` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Appointment" DROP COLUMN "google_calendar_event_id";

-- AlterTable
ALTER TABLE "User" DROP COLUMN "google_refresh_token";
