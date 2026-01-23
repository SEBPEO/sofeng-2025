import {
  Controller,
  Get,
  Patch,
  Post,
  Body,
  Req,
  UseGuards,
  Delete,
  Param,
  ParseIntPipe,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { UsersService } from './users.service';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { RequestAccountDeletionDto } from './dto/request-account-deletion.dto';

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

  @Get('doctors')
  @UseGuards(AuthGuard('jwt'))
  async listDoctors(@Req() req) {
    const userId = req.user?.userId || req.user?.sub;
    return this.usersService.listDoctors(userId);
  }

  // Privacy requests: list my requests (deletion + export)
  @Get('privacy-requests')
  @UseGuards(AuthGuard('jwt'))
  async getMyPrivacyRequests(@Req() req) {
    const userId = req.user?.userId || req.user?.sub;
    return this.usersService.getMyPrivacyRequests(userId);
  }

  // Cancel a pending deletion request
  @Delete('privacy-requests/deletion/:id')
  @UseGuards(AuthGuard('jwt'))
  async cancelDeletion(@Req() req, @Param('id', ParseIntPipe) id: number) {
    const userId = req.user?.userId || req.user?.sub;
    return this.usersService.cancelDeletionRequest(userId, id);
  }

  // Cancel a pending/processing export request
  @Delete('privacy-requests/export/:id')
  @UseGuards(AuthGuard('jwt'))
  async cancelExport(@Req() req, @Param('id', ParseIntPipe) id: number) {
    const userId = req.user?.userId || req.user?.sub;
    return this.usersService.cancelExportRequest(userId, id);
  }

  // Approve and complete a deletion request
  @Post('privacy-requests/deletion/:id/approve')
  @UseGuards(AuthGuard('jwt'))
  async approveDeletion(@Req() req, @Param('id', ParseIntPipe) id: number) {
    const userId = req.user?.userId || req.user?.sub;
    return this.usersService.approveDeletionRequest(userId, id);
  }

  // Approve and complete an export request
  @Post('privacy-requests/export/:id/approve')
  @UseGuards(AuthGuard('jwt'))
  async approveExport(@Req() req, @Param('id', ParseIntPipe) id: number) {
    const userId = req.user?.userId || req.user?.sub;
    return this.usersService.approveExportRequest(userId, id);
  }

  @Post('request-deletion')
  @UseGuards(AuthGuard('jwt'))
  async requestAccountDeletion(@Req() req, @Body() dto: RequestAccountDeletionDto) {
    const userId = req.user?.userId || req.user?.sub;
    return this.usersService.requestAccountDeletion(userId, dto);
  }

  @Post('request-export')
  @UseGuards(AuthGuard('jwt'))
  async requestDataExport(@Req() req) {
    const userId = req.user?.userId || req.user?.sub;
    return this.usersService.requestDataExport(userId);
  }

  @Get('export-data')
  @UseGuards(AuthGuard('jwt'))
  async exportUserData(@Req() req) {
    const userId = req.user?.userId || req.user?.sub;
    return this.usersService.exportUserData(userId);
  }
}
