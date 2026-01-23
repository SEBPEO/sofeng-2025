export class TimeSlotDto {
  start_time: string; // ISO datetime string
  end_time: string; // ISO datetime string
  duration_minutes: number;
}

export class AvailableSlotsDto {
  date: string; // YYYY-MM-DD
  slots: TimeSlotDto[];
}


