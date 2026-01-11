import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  Req,
  UseGuards,
  ParseIntPipe,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { AppointmentsService } from './appointments.service';
import { CreateAppointmentDto } from './dto/create-appointment.dto';
import { UpdateAppointmentDto } from './dto/update-appointment.dto';
import { PrismaClient } from '@prisma/client';
import { RequestRescheduleDto } from './dto/request-reschedule.dto';
import { RespondRescheduleDto } from './dto/respond-reschedule.dto';

const prisma = new PrismaClient();

@Controller('appointments')
@UseGuards(AuthGuard('jwt'))
export class AppointmentsController {
  constructor(private readonly appointmentsService: AppointmentsService) {}

  @Post()
  async create(@Req() req, @Body() createAppointmentDto: CreateAppointmentDto) {
    const userId = req.user?.userId || req.user?.sub;
    const user = await prisma.user.findUnique({
      where: { user_id: userId },
      include: { patient_profile: true },
    });

    if (!user || !user.patient_profile) {
      throw new Error('Patient profile not found');
    }

    return this.appointmentsService.create(
      user.patient_profile.patient_id,
      createAppointmentDto,
    );
  }

  @Get()
  async findAll(@Req() req) {
    const userId = req.user?.userId || req.user?.sub;
    const user = await prisma.user.findUnique({
      where: { user_id: userId },
      include: { patient_profile: true, doctor_profile: true },
    });

    // Check if user is a doctor
    if (user?.doctor_profile) {
      return this.appointmentsService.findAllForDoctor(user.doctor_profile.doctor_id);
    }

    // Otherwise, treat as patient
    if (!user || !user.patient_profile) {
      throw new Error('Patient profile not found');
    }

    return this.appointmentsService.findAll(user.patient_profile.patient_id);
  }

  @Get('doctors')
  async findAllDoctors() {
    return this.appointmentsService.findAllDoctors();
  }

  @Get('doctors/:doctorId/available-slots')
  async getAvailableSlots(
    @Param('doctorId', ParseIntPipe) doctorId: number,
    @Query('date') date: string,
  ) {
    if (!date) {
      throw new Error('Date query parameter is required (format: YYYY-MM-DD)');
    }

    // Validate date format
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(date)) {
      throw new Error('Date must be in YYYY-MM-DD format');
    }

    return await this.appointmentsService.getAvailableSlots(doctorId, date);
  }

  @Get(':id')
  async findOne(@Req() req, @Param('id', ParseIntPipe) id: number) {
    const userId = req.user?.userId || req.user?.sub;
    const user = await prisma.user.findUnique({
      where: { user_id: userId },
      include: { patient_profile: true },
    });

    if (!user || !user.patient_profile) {
      throw new Error('Patient profile not found');
    }

    return this.appointmentsService.findOne(id, user.patient_profile.patient_id);
  }

  @Patch(':id')
  async update(
    @Req() req,
    @Param('id', ParseIntPipe) id: number,
    @Body() updateAppointmentDto: UpdateAppointmentDto,
  ) {
    const userId = req.user?.userId || req.user?.sub;
    const user = await prisma.user.findUnique({
      where: { user_id: userId },
      include: { patient_profile: true },
    });

    if (!user || !user.patient_profile) {
      throw new Error('Patient profile not found');
    }

    return this.appointmentsService.update(
      id,
      user.patient_profile.patient_id,
      updateAppointmentDto,
    );
  }

  @Patch(':id/request-reschedule')
  async requestReschedule(
    @Req() req,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: RequestRescheduleDto,
  ) {
    const userId = req.user?.userId || req.user?.sub;
    const user = await prisma.user.findUnique({
      where: { user_id: userId },
      include: { doctor_profile: true },
    });

    if (!user?.doctor_profile) {
      throw new Error('Doctor profile not found');
    }

    return this.appointmentsService.requestReschedule(
      id,
      user.user_id,
      dto,
    );
  }

  @Patch(':id/respond-reschedule')
  async respondReschedule(
    @Req() req,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: RespondRescheduleDto,
  ) {
    const userId = req.user?.userId || req.user?.sub;
    const user = await prisma.user.findUnique({
      where: { user_id: userId },
      include: { patient_profile: true },
    });

    if (!user?.patient_profile) {
      throw new Error('Patient profile not found');
    }

    return this.appointmentsService.respondReschedule(
      id,
      user.patient_profile.patient_id,
      dto.accept,
    );
  }

  @Delete(':id')
  async cancel(@Req() req, @Param('id', ParseIntPipe) id: number) {
    const userId = req.user?.userId || req.user?.sub;
    const user = await prisma.user.findUnique({
      where: { user_id: userId },
      include: { patient_profile: true, doctor_profile: true },
    });

    if (!user) {
      throw new Error('User not found');
    }

    await this.appointmentsService.cancel(
      id,
      user.patient_profile?.patient_id,
      user.doctor_profile?.doctor_id,
    );
    return { message: 'Appointment cancelled successfully' };
  }
}
