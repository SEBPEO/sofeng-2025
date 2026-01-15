import {
  Controller,
  Post,
  Get,
  Put,
  Param,
  Body,
  UseGuards,
  Req,
  ParseIntPipe,
  UseInterceptors,
  UploadedFile,
  Res,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import * as fs from 'fs';
import type { File as MulterFile } from 'multer';
import { ConsultationsService } from './consultations.service';
import * as path from 'path';
import { PrismaClient } from '@prisma/client';
import { createReadStream } from 'fs';
import { Response } from 'express';
import { UpdateNotesDto } from './dto/update-notes.dto';

@Controller('consultations')
@UseGuards(AuthGuard('jwt'))
export class ConsultationsController {
  constructor(private readonly consultationsService: ConsultationsService) {}

  private prisma = new PrismaClient();

  @Post('start')
  async start(@Req() req, @Body('appointmentId', ParseIntPipe) appointmentId: number) {
    const userId = req.user?.userId || req.user?.sub;
    return this.consultationsService.startConsultation(userId, appointmentId);
  }

  @Get('by-appointment/:appointmentId')
  async byAppointment(@Req() req, @Param('appointmentId', ParseIntPipe) appointmentId: number) {
    const userId = req.user?.userId || req.user?.sub;
    const user = await this.prisma.user.findUnique({
      where: { user_id: userId },
      include: { doctor_profile: true, patient_profile: true },
    });
    return this.consultationsService.getByAppointmentForUser(user, appointmentId);
  }

  @Post(':consultationId/recording')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: (_req, _file, cb) => {
          const dir = path.join(process.cwd(), 'uploads', 'recordings');
          if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
          }
          cb(null, dir);
        },
        filename: (_req, file, cb) => {
          const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
          const ext = path.extname(file.originalname);
          cb(null, `${uniqueSuffix}${ext || '.webm'}`);
        },
      }),
      limits: { fileSize: 25 * 1024 * 1024 },
      fileFilter: (_req, file, cb) => {
        if (!file.mimetype.startsWith('audio/')) {
          return cb(new Error('Only audio uploads are allowed'), false);
        }
        cb(null, true);
      },
    }),
  )
  async uploadRecording(
    @Req() req,
    @Param('consultationId', ParseIntPipe) consultationId: number,
    @UploadedFile() file: MulterFile,
  ) {
    const userId = req.user?.userId || req.user?.sub;
    return this.consultationsService.saveRecording(userId, consultationId, file);
  }

  @Get(':consultationId/recordings/:recordingId/download')
  async downloadRecording(
    @Req() req,
    @Param('consultationId', ParseIntPipe) consultationId: number,
    @Param('recordingId', ParseIntPipe) recordingId: number,
    @Res() res: Response,
  ) {
    const userId = req.user?.userId || req.user?.sub;
    const { fullPath, filename } = await this.consultationsService.getRecordingFile(
      userId,
      consultationId,
      recordingId,
    );

    res.setHeader('Content-Type', 'application/octet-stream');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    const stream = createReadStream(fullPath);
    stream.pipe(res);
  }

  @Post(':consultationId/generate-notes')
  async generateNotes(
    @Req() req,
    @Param('consultationId', ParseIntPipe) consultationId: number,
  ) {
    const userId = req.user?.userId || req.user?.sub;
    return this.consultationsService.generateNotes(userId, consultationId);
  }

  @Put(':consultationId/notes')
  async updateNotes(
    @Req() req,
    @Param('consultationId', ParseIntPipe) consultationId: number,
    @Body() updateDto: UpdateNotesDto,
  ) {
    const userId = req.user?.userId || req.user?.sub;
    return this.consultationsService.updateNotes(userId, consultationId, updateDto);
  }
}
