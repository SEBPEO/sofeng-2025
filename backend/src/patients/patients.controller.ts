import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  UseGuards,
  Request,
  BadRequestException,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { PatientsService } from './patients.service';

@Controller('patients')
export class PatientsController {
  constructor(private readonly patientsService: PatientsService) {}

  /**
   * GET /patients
   * Returns ALL patients in the system (for browsing/discovery)
   * Public endpoint (no auth required, but clients can filter on frontend)
   */
  @Get()
  async getAllPatients() {
    return await this.patientsService.getAllPatients();
  }

  /**
   * GET /patients/available
   * Returns only patients NOT already assigned to the authenticated doctor
   * Protected: requires JWT
   */
  @Get('available')
  @UseGuards(AuthGuard('jwt'))
  async getAvailablePatients(@Request() req) {
    const doctorUserId = req.user.userId;
    return await this.patientsService.getAvailablePatients(doctorUserId);
  }

  /**
   * GET /patients/my
   * Returns only patients assigned to the authenticated doctor (My Patients)
   * Protected: requires JWT
   */
  @Get('my')
  @UseGuards(AuthGuard('jwt'))
  async getMyPatients(@Request() req) {
    const doctorUserId = req.user.userId;
    return await this.patientsService.getMyPatients(doctorUserId);
  }

  /**
   * POST /patients/:patientId/assign
   * Assigns a patient to the authenticated doctor (Add to My Patients)
   * Protected: requires JWT
   */
  @Post(':patientId/assign')
  @UseGuards(AuthGuard('jwt'))
  async assignPatient(@Param('patientId') patientId: string, @Request() req) {
    const doctorUserId = req.user.userId;
    const patientIdNum = parseInt(patientId, 10);

    if (isNaN(patientIdNum)) {
      throw new BadRequestException('Invalid patient ID');
    }

    try {
      return await this.patientsService.assignPatientToDoctor(doctorUserId, patientIdNum);
    } catch (error) {
      throw new BadRequestException(error.message || 'Failed to assign patient');
    }
  }

  /**
   * DELETE /patients/:patientId/unassign
   * Removes a patient from the authenticated doctor (Remove from My Patients)
   * Protected: requires JWT
   */
  @Delete(':patientId/unassign')
  @UseGuards(AuthGuard('jwt'))
  async unassignPatient(@Param('patientId') patientId: string, @Request() req) {
    const doctorUserId = req.user.userId;
    const patientIdNum = parseInt(patientId, 10);

    if (isNaN(patientIdNum)) {
      throw new BadRequestException('Invalid patient ID');
    }

    try {
      return await this.patientsService.unassignPatientFromDoctor(doctorUserId, patientIdNum);
    } catch (error) {
      throw new BadRequestException(error.message || 'Failed to unassign patient');
    }
  }

  /**
   * GET /patients/my-doctors
   * Returns only doctors assigned to the authenticated patient (My Doctors)
   * Protected: requires JWT
   */
  @Get('my-doctors')
  @UseGuards(AuthGuard('jwt'))
  async getMyDoctors(@Request() req) {
    const patientUserId = req.user.userId;
    return await this.patientsService.getMyDoctors(patientUserId);
  }
}
