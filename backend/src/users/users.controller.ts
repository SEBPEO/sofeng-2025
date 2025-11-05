import { Controller, Get, Patch, Body, Req, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { UsersService } from './users.service';
import { UpdateProfileDto } from './dto/update-profile.dto';

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get('me')
  @UseGuards(AuthGuard('jwt'))
  async getCurrentUser(@Req() req) {
    const userId = req.user?.userId || req.user?.sub;
    const user = await this.usersService.findByIdWithProfiles(userId);
    return user;
  }

  @Patch('me')
  @UseGuards(AuthGuard('jwt'))
  async updateProfile(@Req() req, @Body() updateProfileDto: UpdateProfileDto) {
    const userId = req.user?.userId || req.user?.sub;
    return await this.usersService.updateProfile(userId, updateProfileDto);
  }
}
