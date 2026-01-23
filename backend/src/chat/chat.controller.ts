import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  UseGuards,
  Request,
  UseInterceptors,
  UploadedFile,
  StreamableFile,
  Res,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { AuthGuard } from '@nestjs/passport';
import { ChatService } from './chat.service';
import { SendMessageDto } from './dto/send-message.dto';
import type { Response } from 'express';
import * as fs from 'fs';

@Controller('chat')
@UseGuards(AuthGuard('jwt'))
export class ChatController {
  constructor(private readonly chatService: ChatService) {}

  @Get('conversations')
  async getConversations(@Request() req) {
    return this.chatService.getConversations(req.user.userId);
  }

  @Get('messages/:userId')
  async getMessages(@Request() req, @Param('userId') userId: string) {
    return this.chatService.getMessages(req.user.userId, userId);
  }

  @Post('send')
  async sendMessage(@Request() req, @Body() dto: SendMessageDto) {
    return this.chatService.sendMessage(req.user.userId, dto.receiver_id, dto.content);
  }

  @Post('send-with-attachment')
  @UseInterceptors(
    FileInterceptor('file', {
      limits: { fileSize: 10 * 1024 * 1024 },
    }),
  )
  async sendMessageWithAttachment(@Request() req, @Body() body: any, @UploadedFile() file: any) {
    return this.chatService.sendMessageWithAttachment(req.user.userId, body.receiver_id, body.content, file);
  }

  @Patch('mark-read/:userId')
  async markAsRead(@Request() req, @Param('userId') userId: string) {
    await this.chatService.markAsRead(req.user.userId, userId);
    return { success: true };
  }

  @Get('attachment/:messageId')
  async getAttachment(@Request() req, @Param('messageId') messageId: string, @Res({ passthrough: true }) res: Response) {
    const { filePath, fileName } = await this.chatService.getAttachment(parseInt(messageId), req.user.userId);

    const file = fs.createReadStream(filePath);
    res.set({
      'Content-Type': 'application/octet-stream',
      'Content-Disposition': `attachment; filename="${fileName}"`,
    });

    return new StreamableFile(file);
  }
}
