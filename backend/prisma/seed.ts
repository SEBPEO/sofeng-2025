import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  // Create a patient user
  const patientUser = await prisma.user.upsert({
    where: { email: 'patient.demo@example.com' },
    update: {},
    create: {
      user_id: 'patient-demo-001',
      email: 'patient.demo@example.com',
      first_name: 'John',
      last_name: 'Doe',
      gender: 'male',
      role: 'patient',
    },
  });

  // Create patient profile
  const patientProfile = await prisma.patientProfile.upsert({
    where: { user_id: patientUser.user_id },
    update: {},
    create: {
      patient_id: 1,
      user_id: patientUser.user_id,
      date_of_birth: new Date('1985-05-15'),
      emergency_contact: '+1-555-0123',
      conditions: 'Hypertension, Type 2 Diabetes',
      medications: 'Metformin 500mg, Lisinopril 10mg',
      allergy: 'Penicillin',
    },
  });

  // Find existing doctor (automatically)
  const doctorUser = await prisma.user.findFirst({
    where: { role: 'doctor' },
    include: { doctor_profile: true },
  });

  if (!doctorUser) {
    return;
  }

  if (!doctorUser.doctor_profile) {
    return;
  }

  const doctorProfile = doctorUser.doctor_profile;

  // Create an appointment linking the doctor to the patient
  const appointment = await prisma.appointment.upsert({
    where: { appointment_id: 1 },
    update: {},
    create: {
      appointment_id: 1,
      doctor_id: doctorProfile.doctor_id,
      patient_id: patientProfile.patient_id,
      appointment_datetime: new Date('2025-01-15T10:00:00'),
      duration_minutes: 30,
      status: 'scheduled',
      notes: 'Initial consultation',
    },
  });
}

main()
  .catch((e) => {
    console.error(' Seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
