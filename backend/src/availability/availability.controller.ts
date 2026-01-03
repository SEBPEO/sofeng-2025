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
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AvailabilityService } from './availability.service';
import { CreateAvailabilityDto } from './dto/create-availability.dto';
import { UpdateAvailabilityDto } from './dto/update-availability.dto';
import { AvailabilityResponseDto } from './dto/availability-response.dto';
import { TimeSlotDto } from './dto/available-slots.dto';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

@Controller('availability')
@UseGuards(JwtAuthGuard)
export class AvailabilityController {
  constructor(private readonly availabilityService: AvailabilityService) {}

  @Post()
  async create(@Req() req, @Body() createAvailabilityDto: CreateAvailabilityDto) {
    const userId = req.user?.userId || req.user?.sub;
    const user = await prisma.user.findUnique({
      where: { user_id: userId },
      include: { doctor_profile: true },
    });

    if (!user || !user.doctor_profile) {
      throw new Error('Doctor profile not found');
    }

    return this.availabilityService.createAvailability(
      user.doctor_profile.doctor_id,
      createAvailabilityDto,
    );
  }

  @Get('me')
  async getMyAvailability(@Req() req): Promise<AvailabilityResponseDto[]> {
    const userId = req.user?.userId || req.user?.sub;
    const user = await prisma.user.findUnique({
      where: { user_id: userId },
      include: { doctor_profile: true },
    });

    if (!user || !user.doctor_profile) {
      throw new Error('Doctor profile not found');
    }

    return this.availabilityService.getDoctorAvailability(user.doctor_profile.doctor_id);
  }

  @Get('doctor/:doctorId')
  async getDoctorAvailability(
    @Param('doctorId', ParseIntPipe) doctorId: number,
  ): Promise<AvailabilityResponseDto[]> {
    return this.availabilityService.getDoctorAvailability(doctorId);
  }

  @Get('doctor/:doctorId/slots')
  async getAvailableSlots(
    @Param('doctorId', ParseIntPipe) doctorId: number,
    @Query('date') date: string,
  ): Promise<TimeSlotDto[]> {
    if (!date) {
      throw new Error('Date query parameter is required (format: YYYY-MM-DD)');
    }

    // Validate date format
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(date)) {
      throw new Error('Date must be in YYYY-MM-DD format');
    }

    return this.availabilityService.getAvailableSlots(doctorId, date);
  }

  @Patch(':id')
  async update(
    @Req() req,
    @Param('id', ParseIntPipe) id: number,
    @Body() updateAvailabilityDto: UpdateAvailabilityDto,
  ) {
    const userId = req.user?.userId || req.user?.sub;
    const user = await prisma.user.findUnique({
      where: { user_id: userId },
      include: { doctor_profile: true },
    });

    if (!user || !user.doctor_profile) {
      throw new Error('Doctor profile not found');
    }

    return this.availabilityService.updateAvailability(
      id,
      user.doctor_profile.doctor_id,
      updateAvailabilityDto,
    );
  }

  @Delete(':id')
  async delete(@Req() req, @Param('id', ParseIntPipe) id: number) {
    const userId = req.user?.userId || req.user?.sub;
    const user = await prisma.user.findUnique({
      where: { user_id: userId },
      include: { doctor_profile: true },
    });

    if (!user || !user.doctor_profile) {
      throw new Error('Doctor profile not found');
    }

    await this.availabilityService.deleteAvailability(id, user.doctor_profile.doctor_id);
    return { message: 'Availability deleted successfully' };
  }
}


