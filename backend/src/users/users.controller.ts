import { Controller, Get, Patch, Body, Req, UseGuards } from '@nestjs/common';
// ============================================================================
// TEMPORARY DEV MODE: Using JwtAuthGuard instead of AuthGuard('jwt') for dev bypass
// TODO: RESTORE AUTH VALIDATION - Replace JwtAuthGuard with AuthGuard('jwt')
// ============================================================================
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { UsersService } from './users.service';
import { UpdateProfileDto } from './dto/update-profile.dto';

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get('me')
  @UseGuards(JwtAuthGuard)
  async getCurrentUser(@Req() req) {
    const userId = req.user?.userId || req.user?.sub;
    const user = await this.usersService.findByIdWithProfiles(userId);
    return user;
  }

  @Patch('me')
  @UseGuards(JwtAuthGuard)
  async updateProfile(@Req() req, @Body() updateProfileDto: UpdateProfileDto) {
    const userId = req.user?.userId || req.user?.sub;
    return await this.usersService.updateProfile(userId, updateProfileDto);
  }
}
