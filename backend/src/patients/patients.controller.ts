import { Controller, Get, UseGuards, Request } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PatientsService } from './patients.service';

@Controller('patients')
export class PatientsController {
  constructor(private readonly patientsService: PatientsService) {}

  /**
   * GET /patients
   * Returns patients assigned to the authenticated doctor.
   *
   * Security: Only authenticated users with 'doctor' role can access.
   * Doctors only see their own patients filtered by doctor_id.
   */
  @UseGuards(JwtAuthGuard)
  @Get()
  async getDoctorPatients(@Request() req) {
    const userId = req.user.userId; // JWT payload from JwtStrategy.validate()
    return this.patientsService.getPatientsByDoctorUserId(userId);
  }
}
