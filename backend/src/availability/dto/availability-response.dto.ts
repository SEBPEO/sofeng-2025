export class AvailabilityResponseDto {
  availability_id: number;
  doctor_id: number;
  day_of_week: number;
  start_time: string;
  end_time: string;
  duration_minutes: number;
  is_available: boolean;
}


