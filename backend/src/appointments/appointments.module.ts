import { Module } from '@nestjs/common';
import { AppointmentsController } from './appointments.controller';
import { AppointmentsService } from './appointments.service';
import { GoogleCalendarService } from './google-calendar.service';

@Module({
  controllers: [AppointmentsController],
  providers: [AppointmentsService, GoogleCalendarService],
  exports: [AppointmentsService],
})
export class AppointmentsModule {}
