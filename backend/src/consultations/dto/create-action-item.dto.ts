import { IsString, IsNotEmpty } from 'class-validator';

export class CreateActionItemDto {
  @IsString()
  @IsNotEmpty()
  description: string;
}
