import { Module } from '@nestjs/common';
import { ConsultationsService } from './consultations.service';
import { ConsultationsController } from './consultations.controller';
import { AiService } from './ai.service';

@Module({
  controllers: [ConsultationsController],
  providers: [ConsultationsService, AiService],
})
export class ConsultationsModule {}
