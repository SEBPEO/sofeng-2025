import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Req,
  UseGuards,
  ParseIntPipe,
} from '@nestjs/common';
// ============================================================================
// TEMPORARY DEV MODE: Using JwtAuthGuard instead of AuthGuard('jwt') for dev bypass
// TODO: RESTORE AUTH VALIDATION - Replace JwtAuthGuard with AuthGuard('jwt')
// ============================================================================
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AppointmentsService } from './appointments.service';
import { CreateAppointmentDto } from './dto/create-appointment.dto';
import { UpdateAppointmentDto } from './dto/update-appointment.dto';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

@Controller('appointments')
@UseGuards(JwtAuthGuard)
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
      user.email,
    );
  }

  @Get()
  async findAll(@Req() req) {
    const userId = req.user?.userId || req.user?.sub;
    const user = await prisma.user.findUnique({
      where: { user_id: userId },
      include: { patient_profile: true },
    });

    if (!user || !user.patient_profile) {
      throw new Error('Patient profile not found');
    }

    return this.appointmentsService.findAll(user.patient_profile.patient_id);
  }

  @Get('doctors')
  async findAllDoctors() {
    return this.appointmentsService.findAllDoctors();
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
      user.email,
    );
  }

  @Delete(':id')
  async cancel(@Req() req, @Param('id', ParseIntPipe) id: number) {
    const userId = req.user?.userId || req.user?.sub;
    const user = await prisma.user.findUnique({
      where: { user_id: userId },
      include: { patient_profile: true },
    });

    if (!user || !user.patient_profile) {
      throw new Error('Patient profile not found');
    }

    await this.appointmentsService.cancel(id, user.patient_profile.patient_id, user.email);
    return { message: 'Appointment cancelled successfully' };
  }
}
