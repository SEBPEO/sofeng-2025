import { IsBoolean } from 'class-validator';

export class RespondRescheduleDto {
  @IsBoolean()
  accept: boolean;
}
