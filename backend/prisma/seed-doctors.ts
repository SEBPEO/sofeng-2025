import { PrismaClient, Gender, Role } from '@prisma/client';

const prisma = new PrismaClient();

// Helper function to convert day name to day number (0 = Sunday, 6 = Saturday)
function dayNameToNumber(dayName: string): number {
  const days: { [key: string]: number } = {
    sun: 0,
    mon: 1,
    tue: 2,
    wed: 3,
    thu: 4,
    fri: 5,
    sat: 6,
  };
  return days[dayName.toLowerCase().substring(0, 3)] ?? -1;
}

// Helper function to convert time from "9:00 AM" to "09:00"
function convertTimeTo24Hour(timeStr: string): string {
  const trimmed = timeStr.trim();
  const match = trimmed.match(/(\d{1,2}):(\d{2})\s*(AM|PM)/i);
  if (!match) return '09:00'; // Default fallback

  let hours = parseInt(match[1], 10);
  const minutes = match[2];
  const period = match[3].toUpperCase();

  if (period === 'PM' && hours !== 12) {
    hours += 12;
  } else if (period === 'AM' && hours === 12) {
    hours = 0;
  }

  return `${hours.toString().padStart(2, '0')}:${minutes}`;
}

// Helper function to get day range from string like "Mon-Fri" or "Tue"
function getDayRange(dayRangeStr: string): number[] {
  const days: number[] = [];
  const parts = dayRangeStr.split('-');

  if (parts.length === 1) {
    // Single day
    const dayNum = dayNameToNumber(parts[0].trim());
    if (dayNum >= 0) days.push(dayNum);
  } else {
    // Range like "Mon-Fri"
    const startDay = dayNameToNumber(parts[0].trim());
    const endDay = dayNameToNumber(parts[1].trim());
    if (startDay >= 0 && endDay >= 0) {
      if (startDay <= endDay) {
        for (let i = startDay; i <= endDay; i++) {
          days.push(i);
        }
      } else {
        // Handle wrap-around (e.g., Sat-Mon)
        for (let i = startDay; i <= 6; i++) {
          days.push(i);
        }
        for (let i = 0; i <= endDay; i++) {
          days.push(i);
        }
      }
    }
  }
  return days;
}

// Parse working hours string and return availability entries
function parseWorkingHours(workingHours: string): Array<{
  day_of_week: number;
  start_time: string;
  end_time: string;
  duration_minutes: number;
}> {
  const availabilities: Array<{
    day_of_week: number;
    start_time: string;
    end_time: string;
    duration_minutes: number;
  }> = [];

  // Handle special case: 24/7
  if (workingHours.toLowerCase().includes('24/7')) {
    for (let day = 0; day <= 6; day++) {
      availabilities.push({
        day_of_week: day,
        start_time: '00:00',
        end_time: '23:59',
        duration_minutes: 30,
      });
    }
    return availabilities;
  }

  // Split by comma to handle multiple time slots (e.g., "Mon-Fri: 9:00 AM - 5:00 PM, Sat: 9:00 AM - 1:00 PM")
  const parts = workingHours.split(',');

  for (const part of parts) {
    const match = part.match(
      /([A-Za-z-]+):\s*(\d{1,2}:\d{2}\s*[AP]M)\s*-\s*(\d{1,2}:\d{2}\s*[AP]M)/i,
    );
    if (!match) continue;

    const dayRange = match[1].trim();
    const startTime = convertTimeTo24Hour(match[2].trim());
    const endTime = convertTimeTo24Hour(match[3].trim());
    const days = getDayRange(dayRange);

    // Calculate duration in minutes (default 30, but can be adjusted)
    const startMinutes = parseInt(startTime.split(':')[0]) * 60 + parseInt(startTime.split(':')[1]);
    const endMinutes = parseInt(endTime.split(':')[0]) * 60 + parseInt(endTime.split(':')[1]);
    const totalMinutes = endMinutes - startMinutes;
    // Use 30 minutes as default, but if the slot is less than 60 minutes, use 15
    const duration = totalMinutes < 60 ? 15 : 30;

    for (const day of days) {
      availabilities.push({
        day_of_week: day,
        start_time: startTime,
        end_time: endTime,
        duration_minutes: duration,
      });
    }
  }

  return availabilities;
}

// Create availability for a doctor
async function createAvailabilityForDoctor(doctorId: number, workingHours: string): Promise<void> {
  // Check if availability already exists
  const existingAvailability = await prisma.availability.findFirst({
    where: { doctor_id: doctorId },
  });

  if (existingAvailability) {
    console.log(`   ⏭️  Availability already exists for doctor ${doctorId}, skipping...`);
    return;
  }

  const availabilities = parseWorkingHours(workingHours);

  if (availabilities.length === 0) {
    console.log(`   ⚠️  Could not parse working hours: "${workingHours}"`);
    return;
  }

  // Create availability entries
  for (const availability of availabilities) {
    try {
      await prisma.availability.create({
        data: {
          doctor_id: doctorId,
          day_of_week: availability.day_of_week,
          start_time: availability.start_time,
          end_time: availability.end_time,
          duration_minutes: availability.duration_minutes,
          is_available: true,
        },
      });
    } catch (error: unknown) {
      // Ignore unique constraint errors (availability already exists for this day)
      if (error && typeof error === 'object' && 'code' in error && error.code === 'P2002') {
        // Unique constraint violation - availability already exists for this day, skip
        return;
      }
      console.error(
        `   ❌ Error creating availability for day ${availability.day_of_week}:`,
        error,
      );
    }
  }

  console.log(`   ✅ Created ${availabilities.length} availability entries`);
}

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
      let doctorId: number;

      // Check if user already exists
      const existingUser = await prisma.user.findUnique({
        where: { email: doctorData.email },
        include: { doctor_profile: true },
      });

      if (existingUser) {
        if (existingUser.doctor_profile) {
          doctorId = existingUser.doctor_profile.doctor_id;
          console.log(
            `⏭️  Doctor ${doctorData.first_name} ${doctorData.last_name} already exists (ID: ${doctorId})`,
          );
        } else {
          // User exists but no doctor profile, create one
          const doctorProfile = await prisma.doctorProfile.create({
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
          doctorId = doctorProfile.doctor_id;
          console.log(
            `✅ Created doctor profile for ${doctorData.first_name} ${doctorData.last_name} (ID: ${doctorId})`,
          );
        }
      } else {
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
        const doctorProfile = await prisma.doctorProfile.create({
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
        doctorId = doctorProfile.doctor_id;

        console.log(
          `✅ Created doctor: ${doctorData.first_name} ${doctorData.last_name} (${doctorData.specialization}, ID: ${doctorId})`,
        );
      }

      // Create availability for the doctor
      await createAvailabilityForDoctor(doctorId, doctorData.working_hours);
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
