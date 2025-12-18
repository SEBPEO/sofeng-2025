import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class PatientsService {
  constructor(private prisma: PrismaService) {}

  /**
   * Get ALL patients in the system (for browsing/discovery)
   * Returns patient info with user details
   */
  async getAllPatients() {
    const patients = await this.prisma.patientProfile.findMany({
      include: {
        user: true,
      },
    });

    return patients.map((patient) => ({
      patient_id: patient.patient_id,
      user_id: patient.user_id,
      date_of_birth: patient.date_of_birth,
      emergency_contact: patient.emergency_contact,
      conditions: patient.conditions,
      medications: patient.medications,
      allergy: patient.allergy,
      first_name: patient.user.first_name,
      last_name: patient.user.last_name,
      email: patient.user.email,
      gender: patient.user.gender,
    }));
  }

  /**
   * Get available patients (NOT assigned to ANY doctor)
   * A patient becomes exclusive to one doctor once assigned.
   * Only unassigned patients appear in available list.
   */
  async getAvailablePatients(doctorUserId: string) {
    // Get doctor profile (just to validate the user is a doctor)
    const doctorProfile = await this.prisma.doctorProfile.findUnique({
      where: { user_id: doctorUserId },
    });

    if (!doctorProfile) {
      // User hasn't set up doctor profile yet, return all patients
      return this.getAllPatients();
    }

    // Get all patients
    const allPatients = await this.prisma.patientProfile.findMany({
      include: { user: true },
    });

    // Get ALL assigned patients (regardless of which doctor)
    const allAssignedPatients = await this.prisma.doctorPatient.findMany({
      select: { patient_id: true },
    });

    const assignedPatientIds = new Set(allAssignedPatients.map((a) => a.patient_id));

    // Filter out ALL assigned patients (exclusive to one doctor)
    return allPatients
      .filter((p) => !assignedPatientIds.has(p.patient_id))
      .map((patient) => ({
        patient_id: patient.patient_id,
        user_id: patient.user_id,
        date_of_birth: patient.date_of_birth,
        emergency_contact: patient.emergency_contact,
        conditions: patient.conditions,
        medications: patient.medications,
        allergy: patient.allergy,
        first_name: patient.user.first_name,
        last_name: patient.user.last_name,
        email: patient.user.email,
        gender: patient.user.gender,
      }));
  }

  /**
   * Get patients assigned to a specific doctor (My Patients)
   * Filters by doctor_id from JWT
   */
  async getMyPatients(doctorUserId: string) {
    // Get doctor profile
    const doctorProfile = await this.prisma.doctorProfile.findUnique({
      where: { user_id: doctorUserId },
    });

    if (!doctorProfile) {
      return [];
    }

    // Get assigned patients
    const doctorPatients = await this.prisma.doctorPatient.findMany({
      where: { doctor_id: doctorProfile.doctor_id },
      include: {
        patient: {
          include: {
            user: true,
          },
        },
      },
    });

    return doctorPatients.map((dp) => ({
      patient_id: dp.patient.patient_id,
      user_id: dp.patient.user_id,
      date_of_birth: dp.patient.date_of_birth,
      emergency_contact: dp.patient.emergency_contact,
      conditions: dp.patient.conditions,
      medications: dp.patient.medications,
      allergy: dp.patient.allergy,
      first_name: dp.patient.user.first_name,
      last_name: dp.patient.user.last_name,
      email: dp.patient.user.email,
      gender: dp.patient.user.gender,
      assigned_at: dp.assigned_at,
    }));
  }

  /**
   * Assign a patient to a doctor (Add to My Patients)
   */
  async assignPatientToDoctor(doctorUserId: string, patientId: number) {
    const doctorProfile = await this.prisma.doctorProfile.findUnique({
      where: { user_id: doctorUserId },
    });

    if (!doctorProfile) {
      throw new Error('Doctor profile not found');
    }

    // Create assignment
    const assignment = await this.prisma.doctorPatient.create({
      data: {
        doctor_id: doctorProfile.doctor_id,
        patient_id: patientId,
      },
      include: {
        patient: {
          include: {
            user: true,
          },
        },
      },
    });

    return {
      patient_id: assignment.patient.patient_id,
      first_name: assignment.patient.user.first_name,
      last_name: assignment.patient.user.last_name,
      email: assignment.patient.user.email,
      assigned_at: assignment.assigned_at,
    };
  }

  /**
   * Unassign a patient from a doctor (Remove from My Patients)
   */
  async unassignPatientFromDoctor(doctorUserId: string, patientId: number) {
    const doctorProfile = await this.prisma.doctorProfile.findUnique({
      where: { user_id: doctorUserId },
    });

    if (!doctorProfile) {
      throw new Error('Doctor profile not found');
    }

    // Delete assignment
    await this.prisma.doctorPatient.delete({
      where: {
        doctor_id_patient_id: {
          doctor_id: doctorProfile.doctor_id,
          patient_id: patientId,
        },
      },
    });

    return { success: true, patientId };
  }

  /**
   * Get patients assigned to a specific doctor via appointments (legacy)
   * Kept for backward compatibility
   */
  async getPatientsByDoctorUserId(doctorUserId: string) {
    const doctorProfile = await this.prisma.doctorProfile.findUnique({
      where: { user_id: doctorUserId },
    });

    if (!doctorProfile) {
      return [];
    }

    const appointments = await this.prisma.appointment.findMany({
      where: { doctor_id: doctorProfile.doctor_id },
      include: {
        patient: {
          include: {
            user: true,
          },
        },
      },
    });

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
          first_name: user.first_name,
          last_name: user.last_name,
          email: user.email,
          gender: user.gender,
        });
      }
    });

    return Array.from(uniquePatients.values());
  }

  /**
   * Get doctors assigned to a specific patient (My Doctors)
   * Filters by patient_id from JWT
   */
  async getMyDoctors(patientUserId: string) {
    // Get patient profile
    const patientProfile = await this.prisma.patientProfile.findUnique({
      where: { user_id: patientUserId },
    });

    if (!patientProfile) {
      return [];
    }

    // Get assigned doctors
    const patientDoctors = await this.prisma.doctorPatient.findMany({
      where: { patient_id: patientProfile.patient_id },
      include: {
        doctor: {
          include: {
            user: true,
          },
        },
      },
    });

    return patientDoctors.map((pd) => ({
      doctor_id: pd.doctor.doctor_id,
      user_id: pd.doctor.user_id,
      specialization: pd.doctor.specialization,
      experience_years: pd.doctor.experience_years,
      clinic_address: pd.doctor.clinic_address,
      contact_info: pd.doctor.contact_info,
      working_hours: pd.doctor.working_hours,
      first_name: pd.doctor.user.first_name,
      last_name: pd.doctor.user.last_name,
      email: pd.doctor.user.email,
    }));
  }
}
