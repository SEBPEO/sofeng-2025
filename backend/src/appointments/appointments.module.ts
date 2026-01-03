import { Module } from '@nestjs/common';
import { AppointmentsController } from './appointments.controller';
import { AppointmentsService } from './appointments.service';
import { GoogleCalendarService } from './google-calendar.service';
// ============================================================================
// TEMPORARY DEV MODE: Import UsersModule for JwtAuthGuard dependency
// TODO: RESTORE AUTH VALIDATION - Remove UsersModule import if not needed
// ============================================================================
import { UsersModule } from '../users/users.module';
import { AvailabilityModule } from '../availability/availability.module';

@Module({
  imports: [UsersModule, AvailabilityModule], // Required for JwtAuthGuard to inject UsersService
  controllers: [AppointmentsController],
  providers: [AppointmentsService, GoogleCalendarService],
  exports: [AppointmentsService],
})
export class AppointmentsModule {}
