import React, { useState, useEffect, useRef, useCallback } from 'react';
import styles from './DateTimePicker.module.css';

export interface DateTimePickerProps {
  value?: string;
  onChange: (value: string) => void;
  minDate?: Date;
  label?: string;
  error?: string;
  placeholder?: string;
  disabled?: boolean;
  showTime?: boolean;
}

const MONTHS = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

const DAYS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

export const DateTimePicker: React.FC<DateTimePickerProps> = ({
  value,
  onChange,
  minDate = new Date(),
  label,
  error,
  placeholder,
  disabled = false,
  showTime = true,
}) => {
  const defaultPlaceholder = showTime ? 'Select date and time' : 'Select date';
  const [isOpen, setIsOpen] = useState(false);
  const [viewDate, setViewDate] = useState<Date>(() => {
    if (value) return new Date(value);
    return new Date();
  });
  const [selectedDate, setSelectedDate] = useState<Date | null>(() => {
    if (value) return new Date(value);
    return null;
  });
  const [selectedHour, setSelectedHour] = useState<number>(() => {
    if (value) return new Date(value).getHours();
    return 9;
  });
  const [selectedMinute, setSelectedMinute] = useState<number>(() => {
    if (value) return new Date(value).getMinutes();
    return 0;
  });

  const containerRef = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Update internal state when value prop changes
  useEffect(() => {
    if (value) {
      const date = new Date(value);
      setSelectedDate(date);
      setSelectedHour(date.getHours());
      setSelectedMinute(date.getMinutes());
      setViewDate(date);
    }
  }, [value]);

  const getDaysInMonth = useCallback((year: number, month: number) => {
    return new Date(year, month + 1, 0).getDate();
  }, []);

  const getFirstDayOfMonth = useCallback((year: number, month: number) => {
    return new Date(year, month, 1).getDay();
  }, []);

  const isDateDisabled = useCallback(
    (date: Date) => {
      const today = new Date(minDate);
      today.setHours(0, 0, 0, 0);
      const compareDate = new Date(date);
      compareDate.setHours(0, 0, 0, 0);
      return compareDate < today;
    },
    [minDate],
  );

  const handlePrevMonth = () => {
    setViewDate((prev) => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
  };

  const handleNextMonth = () => {
    setViewDate((prev) => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));
  };

  const handleDateSelect = (day: number) => {
    const newDate = new Date(
      viewDate.getFullYear(),
      viewDate.getMonth(),
      day,
      selectedHour,
      selectedMinute,
    );
    if (!isDateDisabled(newDate)) {
      setSelectedDate(newDate);
      // Emit the change - this calls the parent onChange
      emitChange(newDate, selectedHour, selectedMinute);
      // Auto-close when date is selected and time picker is hidden
      if (!showTime) {
        // Use setTimeout to ensure the onChange has been processed
        setTimeout(() => setIsOpen(false), 0);
      }
    }
  };

  const handleHourChange = (hour: number) => {
    setSelectedHour(hour);
    if (selectedDate) {
      emitChange(selectedDate, hour, selectedMinute);
    }
  };

  const handleMinuteChange = (minute: number) => {
    setSelectedMinute(minute);
    if (selectedDate) {
      emitChange(selectedDate, selectedHour, minute);
    }
  };

  const emitChange = (date: Date, hour: number, minute: number) => {
    const newDateTime = new Date(date);
    newDateTime.setHours(hour, minute, 0, 0);
    // Format as ISO string for the value
    const year = newDateTime.getFullYear();
    const month = String(newDateTime.getMonth() + 1).padStart(2, '0');
    const day = String(newDateTime.getDate()).padStart(2, '0');
    const hours = String(newDateTime.getHours()).padStart(2, '0');
    const minutes = String(newDateTime.getMinutes()).padStart(2, '0');
    onChange(`${year}-${month}-${day}T${hours}:${minutes}`);
  };

  const formatDisplayValue = () => {
    if (!selectedDate) return '';
    const options: Intl.DateTimeFormatOptions = {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    };
    if (showTime) {
      options.hour = 'numeric';
      options.minute = '2-digit';
      options.hour12 = true;
    }
    return selectedDate.toLocaleDateString('en-US', options);
  };

  const renderCalendarDays = () => {
    const year = viewDate.getFullYear();
    const month = viewDate.getMonth();
    const daysInMonth = getDaysInMonth(year, month);
    const firstDay = getFirstDayOfMonth(year, month);
    const days: React.ReactNode[] = [];

    // Empty cells for days before the first day of the month
    for (let i = 0; i < firstDay; i++) {
      days.push(<div key={`empty-${i}`} className={styles.emptyDay} />);
    }

    // Days of the month
    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(year, month, day);
      const isDisabled = isDateDisabled(date);
      const isSelected =
        selectedDate &&
        selectedDate.getDate() === day &&
        selectedDate.getMonth() === month &&
        selectedDate.getFullYear() === year;
      const isToday = new Date().toDateString() === date.toDateString();

      days.push(
        <button
          key={day}
          type="button"
          className={`${styles.day} ${isSelected ? styles.selected : ''} ${isDisabled ? styles.disabled : ''} ${isToday ? styles.today : ''}`}
          onClick={(e) => {
            e.stopPropagation();
            handleDateSelect(day);
          }}
          disabled={isDisabled}
        >
          {day}
        </button>,
      );
    }

    return days;
  };

  const generateHours = () => {
    const hours = [];
    for (let i = 0; i < 24; i++) {
      hours.push(i);
    }
    return hours;
  };

  const generateMinutes = () => {
    const minutes = [];
    for (let i = 0; i < 60; i += 15) {
      minutes.push(i);
    }
    return minutes;
  };

  const formatHour = (hour: number) => {
    const period = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour % 12 || 12;
    return `${displayHour} ${period}`;
  };

  const formatMinuteDisplay = (minute: number) => {
    return String(minute).padStart(2, '0');
  };

  return (
    <div className={styles.wrapper} ref={containerRef}>
      {label && <label className={styles.label}>{label}</label>}

      <button
        type="button"
        className={`${styles.trigger} ${error ? styles.hasError : ''} ${disabled ? styles.disabled : ''}`}
        onClick={() => !disabled && setIsOpen(!isOpen)}
        disabled={disabled}
      >
        <span className={styles.calendarIcon}>📅</span>
        <span className={selectedDate ? styles.value : styles.placeholder}>
          {selectedDate ? formatDisplayValue() : placeholder || defaultPlaceholder}
        </span>
        <span className={`${styles.chevron} ${isOpen ? styles.open : ''}`}>▾</span>
      </button>

      {isOpen && (
        <div
          className={`${styles.dropdown} ${!showTime ? styles.dateOnly : ''}`}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Calendar */}
          <div className={styles.calendar}>
            <div className={styles.header}>
              <button type="button" onClick={handlePrevMonth} className={styles.navButton}>
                ‹
              </button>
              <span className={styles.monthYear}>
                {MONTHS[viewDate.getMonth()].slice(0, 3)} {viewDate.getFullYear()}
              </span>
              <button type="button" onClick={handleNextMonth} className={styles.navButton}>
                ›
              </button>
            </div>
            <div className={styles.dayNames}>
              {DAYS.map((day, i) => (
                <div key={i} className={styles.dayName}>
                  {day}
                </div>
              ))}
            </div>
            <div className={styles.daysGrid}>{renderCalendarDays()}</div>
          </div>

          {/* Time picker side panel - only show when showTime is true */}
          {showTime && (
            <div className={styles.timePicker}>
              <div className={styles.timeLabel}>⏰ Time</div>
              <div className={styles.timeSelectors}>
                <div className={styles.timeColumn}>
                  <span className={styles.timeColumnLabel}>Hour</span>
                  <div className={styles.timeOptions}>
                    {generateHours().map((hour) => (
                      <button
                        key={hour}
                        type="button"
                        className={`${styles.timeOption} ${selectedHour === hour ? styles.selected : ''}`}
                        onClick={() => handleHourChange(hour)}
                      >
                        {formatHour(hour)}
                      </button>
                    ))}
                  </div>
                </div>
                <div className={styles.timeColumn}>
                  <span className={styles.timeColumnLabel}>Min</span>
                  <div className={styles.timeOptions}>
                    {generateMinutes().map((minute) => (
                      <button
                        key={minute}
                        type="button"
                        className={`${styles.timeOption} ${selectedMinute === minute ? styles.selected : ''}`}
                        onClick={() => handleMinuteChange(minute)}
                      >
                        :{formatMinuteDisplay(minute)}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
              <button
                type="button"
                className={styles.confirmButton}
                onClick={() => setIsOpen(false)}
                disabled={!selectedDate}
              >
                Done
              </button>
            </div>
          )}
        </div>
      )}

      {error && <span className={styles.errorText}>{error}</span>}
    </div>
  );
};

export default DateTimePicker;
