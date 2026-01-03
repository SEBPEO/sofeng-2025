import { PrismaClient, Gender, Role } from '@prisma/client';

const prisma = new PrismaClient();

const doctors = [
  {
    first_name: 'Sarah',
    last_name: 'Johnson',
    email: 'sarah.johnson@clinic.com',
    gender: 'female' as Gender,
    specialization: 'Cardiology',
    experience_years: 15,
    clinic_address: '123 Medical Center Dr, Suite 200, Health City, HC 12345',
    contact_info: '+1-555-0101',
    working_hours: 'Mon-Fri: 9:00 AM - 5:00 PM',
  },
  {
    first_name: 'Michael',
    last_name: 'Chen',
    email: 'michael.chen@clinic.com',
    gender: 'male' as Gender,
    specialization: 'Pediatrics',
    experience_years: 10,
    clinic_address: "456 Children's Hospital Way, Building B, Care Town, CT 67890",
    contact_info: '+1-555-0102',
    working_hours: 'Mon-Sat: 8:00 AM - 6:00 PM',
  },
  {
    first_name: 'Emily',
    last_name: 'Rodriguez',
    email: 'emily.rodriguez@clinic.com',
    gender: 'female' as Gender,
    specialization: 'Dermatology',
    experience_years: 8,
    clinic_address: '789 Skin Care Blvd, Floor 3, Wellness District, WD 11111',
    contact_info: '+1-555-0103',
    working_hours: 'Tue-Sat: 10:00 AM - 4:00 PM',
  },
  {
    first_name: 'David',
    last_name: 'Kim',
    email: 'david.kim@clinic.com',
    gender: 'male' as Gender,
    specialization: 'Orthopedics',
    experience_years: 12,
    clinic_address: '321 Bone & Joint Ave, Medical Plaza, Health City, HC 12345',
    contact_info: '+1-555-0104',
    working_hours: 'Mon-Fri: 7:00 AM - 3:00 PM',
  },
  {
    first_name: 'Lisa',
    last_name: 'Anderson',
    email: 'lisa.anderson@clinic.com',
    gender: 'female' as Gender,
    specialization: 'Neurology',
    experience_years: 20,
    clinic_address: '654 Brain Health Center, Suite 500, Care Town, CT 67890',
    contact_info: '+1-555-0105',
    working_hours: 'Mon-Thu: 9:00 AM - 5:00 PM',
  },
  {
    first_name: 'James',
    last_name: 'Wilson',
    email: 'james.wilson@clinic.com',
    gender: 'male' as Gender,
    specialization: 'Internal Medicine',
    experience_years: 18,
    clinic_address: '987 General Practice St, Floor 2, Wellness District, WD 11111',
    contact_info: '+1-555-0106',
    working_hours: 'Mon-Fri: 8:00 AM - 6:00 PM',
  },
  {
    first_name: 'Maria',
    last_name: 'Garcia',
    email: 'maria.garcia@clinic.com',
    gender: 'female' as Gender,
    specialization: 'Gynecology',
    experience_years: 14,
    clinic_address: "147 Women's Health Center, Building A, Health City, HC 12345",
    contact_info: '+1-555-0107',
    working_hours: 'Mon-Fri: 9:00 AM - 5:00 PM, Sat: 9:00 AM - 1:00 PM',
  },
  {
    first_name: 'Robert',
    last_name: 'Taylor',
    email: 'robert.taylor@clinic.com',
    gender: 'male' as Gender,
    specialization: 'Psychiatry',
    experience_years: 16,
    clinic_address: '258 Mental Wellness Dr, Suite 100, Care Town, CT 67890',
    contact_info: '+1-555-0108',
    working_hours: 'Mon-Fri: 10:00 AM - 6:00 PM',
  },
  {
    first_name: 'Jennifer',
    last_name: 'Martinez',
    email: 'jennifer.martinez@clinic.com',
    gender: 'female' as Gender,
    specialization: 'Ophthalmology',
    experience_years: 11,
    clinic_address: '369 Eye Care Center, Floor 4, Wellness District, WD 11111',
    contact_info: '+1-555-0109',
    working_hours: 'Tue-Sat: 8:00 AM - 5:00 PM',
  },
  {
    first_name: 'William',
    last_name: 'Brown',
    email: 'william.brown@clinic.com',
    gender: 'male' as Gender,
    specialization: 'Emergency Medicine',
    experience_years: 13,
    clinic_address: '741 Emergency Care Unit, 24/7 Access, Health City, HC 12345',
    contact_info: '+1-555-0110',
    working_hours: '24/7 Rotating Shifts',
  },
];

async function main() {
  console.log('🌱 Starting to seed doctors...\n');

  // Get the current max doctor_id
  const maxDoctor = await prisma.doctorProfile.findFirst({
    orderBy: { doctor_id: 'desc' },
  });
  let nextDoctorId = (maxDoctor?.doctor_id || 0) + 1;

  for (const doctorData of doctors) {
    try {
      // Check if user already exists
      const existingUser = await prisma.user.findUnique({
        where: { email: doctorData.email },
        include: { doctor_profile: true },
      });

      if (existingUser) {
        if (existingUser.doctor_profile) {
          console.log(
            `⏭️  Doctor ${doctorData.first_name} ${doctorData.last_name} already exists, skipping...`,
          );
          continue;
        } else {
          // User exists but no doctor profile, create one
          await prisma.doctorProfile.create({
            data: {
              doctor_id: nextDoctorId++,
              user_id: existingUser.user_id,
              specialization: doctorData.specialization,
              experience_years: doctorData.experience_years,
              clinic_address: doctorData.clinic_address,
              contact_info: doctorData.contact_info,
              working_hours: doctorData.working_hours,
            },
          });
          console.log(
            `✅ Created doctor profile for ${doctorData.first_name} ${doctorData.last_name}`,
          );
          continue;
        }
      }

      // Create new user
      const user = await prisma.user.create({
        data: {
          first_name: doctorData.first_name,
          last_name: doctorData.last_name,
          email: doctorData.email,
          gender: doctorData.gender,
          role: 'doctor' as Role,
        },
      });

      // Create doctor profile
      await prisma.doctorProfile.create({
        data: {
          doctor_id: nextDoctorId++,
          user_id: user.user_id,
          specialization: doctorData.specialization,
          experience_years: doctorData.experience_years,
          clinic_address: doctorData.clinic_address,
          contact_info: doctorData.contact_info,
          working_hours: doctorData.working_hours,
        },
      });

      console.log(
        `✅ Created doctor: ${doctorData.first_name} ${doctorData.last_name} (${doctorData.specialization})`,
      );
    } catch (error) {
      console.error(
        `❌ Error creating doctor ${doctorData.first_name} ${doctorData.last_name}:`,
        error,
      );
    }
  }

  console.log('\n✨ Seeding completed!');
}

main()
  .catch((e) => {
    console.error('❌ Seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
