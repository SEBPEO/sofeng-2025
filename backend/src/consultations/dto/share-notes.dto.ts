import { IsInt, IsString, IsOptional } from 'class-validator';

export class ShareNotesDto {
  @IsInt()
  sharedWithDoctorId: number;

  @IsString()
  @IsOptional()
  permissions?: string = 'read';
}
