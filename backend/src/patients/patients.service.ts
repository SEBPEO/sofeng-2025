import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class PatientsService {
  constructor(private prisma: PrismaService) {}

  /**
   * Get all patients assigned to a specific doctor.
   *
   * @param doctorUserId - The user_id of the doctor (from JWT)
   * @returns Array of patients with their user info
   *
   * Security: Filters appointments by doctor_id to ensure doctors
   * only see their own patients.
   */
  async getPatientsByDoctorUserId(doctorUserId: string) {
    // First, get the doctor's profile to find their doctor_id
    const doctorProfile = await this.prisma.doctorProfile.findUnique({
      where: { user_id: doctorUserId },
    });

    if (!doctorProfile) {
      // User is not a doctor or hasn't completed profile
      return [];
    }

    // Get all appointments for this doctor
    const appointments = await this.prisma.appointment.findMany({
      where: {
        doctor_id: doctorProfile.doctor_id,
      },
      include: {
        patient: {
          include: {
            user: true, // Include user info (name, email, etc.)
          },
        },
      },
    });

    // Extract unique patients (a patient may have multiple appointments)
    const uniquePatients = new Map();

    appointments.forEach((appointment) => {
      const patient = appointment.patient;
      const user = patient.user;

      if (!uniquePatients.has(patient.patient_id)) {
        uniquePatients.set(patient.patient_id, {
          patient_id: patient.patient_id,
          user_id: patient.user_id,
          date_of_birth: patient.date_of_birth,
          emergency_contact: patient.emergency_contact,
          conditions: patient.conditions,
          medications: patient.medications,
          allergy: patient.allergy,
          // User info
          first_name: user.first_name,
          last_name: user.last_name,
          email: user.email,
          gender: user.gender,
        });
      }
    });

    return Array.from(uniquePatients.values());
  }
}
