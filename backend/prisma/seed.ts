import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log(' Seeding database...');

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

  console.log('✅ Created patient user:', patientUser.email);

  // Get the highest patient_id to avoid conflicts
  const maxPatient = await prisma.patientProfile.findFirst({
    orderBy: { patient_id: 'desc' },
  });
  const nextPatientId = (maxPatient?.patient_id || 0) + 1;

  // Create patient profile
  const patientProfile = await prisma.patientProfile.upsert({
    where: { user_id: patientUser.user_id },
    update: {
      date_of_birth: new Date('1985-05-15'),
      emergency_contact: '+1-555-0123',
      conditions: 'Hypertension, Type 2 Diabetes',
      medications: 'Metformin 500mg, Lisinopril 10mg',
      allergy: 'Penicillin',
    },
    create: {
      patient_id: nextPatientId,
      user_id: patientUser.user_id,
      date_of_birth: new Date('1985-05-15'),
      emergency_contact: '+1-555-0123',
      conditions: 'Hypertension, Type 2 Diabetes',
      medications: 'Metformin 500mg, Lisinopril 10mg',
      allergy: 'Penicillin',
    },
  });

  console.log(' Created patient profile for:', patientUser.email);

  // Find existing doctor (automatically)
  const doctorUser = await prisma.user.findFirst({
    where: { role: 'doctor' },
    include: { doctor_profile: true },
  });

  if (!doctorUser) {
    console.log(' No doctor found. Please:');
    console.log('   1. Log in via OAuth');
    console.log('   2. Complete your profile as a DOCTOR');
    console.log('   3. Run this seed again\n');
    return;
  }

  console.log(' Found doctor:', doctorUser.email);

  if (!doctorUser.doctor_profile) {
    console.log(' Doctor profile incomplete. Please complete your doctor profile first.\n');
    return;
  }

  const doctorProfile = doctorUser.doctor_profile;
  console.log(' Doctor profile exists, ID:', doctorProfile.doctor_id);

  // Get highest appointment_id
  const maxAppointment = await prisma.appointment.findFirst({
    orderBy: { appointment_id: 'desc' },
  });
  const nextAppointmentId = (maxAppointment?.appointment_id || 0) + 1;

  // Create an appointment linking the doctor to the patient
  const appointment = await prisma.appointment.create({
    data: {
      appointment_id: nextAppointmentId,
      doctor_id: doctorProfile.doctor_id,
      patient_id: patientProfile.patient_id,
      appointment_datetime: new Date('2025-01-15T10:00:00'),
      duration_minutes: 30,
      status: 'scheduled',
      notes: 'Initial consultation',
    },
  });

  console.log(' Created appointment:', appointment.appointment_id);

  console.log('\n✨ Seeding complete! You should now see 1 patient in the Patients page.');
}

main()
  .catch((e) => {
    console.error(' Seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
