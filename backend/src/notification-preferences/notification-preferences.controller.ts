import {
  Controller,
  Get,
  Put,
  Body,
  UseGuards,
  Request,
} from '@nestjs/common';
import { NotificationPreferencesService } from './notification-preferences.service';
import { UpdateNotificationPreferencesDto } from './dto/update-notification-preferences.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('notification-preferences')
@UseGuards(JwtAuthGuard)
export class NotificationPreferencesController {
  constructor(
    private readonly notificationPreferencesService: NotificationPreferencesService,
  ) {}

  @Get()
  async getPreferences(@Request() req) {
    return this.notificationPreferencesService.getPreferences(req.user.userId);
  }

  @Put()
  async updatePreferences(
    @Request() req,
    @Body() updateDto: UpdateNotificationPreferencesDto,
  ) {
    return this.notificationPreferencesService.updatePreferences(
      req.user.userId,
      updateDto,
    );
  }
}
