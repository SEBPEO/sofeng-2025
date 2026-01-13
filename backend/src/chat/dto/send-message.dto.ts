import { IsString, IsUUID, IsNotEmpty } from 'class-validator';

export class SendMessageDto {
  @IsUUID()
  @IsNotEmpty()
  receiver_id: string;

  @IsString()
  @IsNotEmpty()
  content: string;
}
