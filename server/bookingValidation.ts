import { Pool } from 'pg';

export interface BookingValidationResult {
  isValid: boolean;
  error?: string;
}

export interface SlotCapacityResult {
  isAvailable: boolean;
  currentBookings: number;
  maxBookings: number;
  error?: string;
}

/**
 * Validates that booking date/time is not in the past
 */
export function validateNotPastDate(date: string, timeSlot: string): BookingValidationResult {
  try {
    // Parse the date and extract time from timeSlot
    const bookingDate = new Date(date);
    
    // Extract start time from slot (e.g., "9:00 AM - 11:00 AM" -> "9:00 AM")
    const startTime = timeSlot.split('-')[0]?.trim() || '';
    
    // Combine date and time
    const bookingDateTime = parseDateTimeSlot(date, startTime);
    const now = new Date();
    
    if (bookingDateTime <= now) {
      return {
        isValid: false,
        error: 'Cannot book appointments in the past. Please select a future date and time.'
      };
    }
    
    return { isValid: true };
  } catch (error) {
    return {
      isValid: false,
      error: 'Invalid date or time format'
    };
  }
}

/**
 * Validates minimum advance booking window (e.g., must be at least 12 hours in future)
 */
export function validateMinimumLeadTime(
  date: string,
  timeSlot: string,
  minLeadHours: number
): BookingValidationResult {
  try {
    const startTime = timeSlot.split('-')[0]?.trim() || '';
    const bookingDateTime = parseDateTimeSlot(date, startTime);
    const now = new Date();
    
    const hoursUntilBooking = (bookingDateTime.getTime() - now.getTime()) / (1000 * 60 * 60);
    
    if (hoursUntilBooking < minLeadHours) {
      return {
        isValid: false,
        error: `Bookings must be made at least ${minLeadHours} hours in advance. Please select a later time.`
      };
    }
    
    return { isValid: true };
  } catch (error) {
    return {
      isValid: false,
      error: 'Invalid date or time format'
    };
  }
}

/**
 * Checks if a time slot has available capacity
 */
export async function checkSlotCapacity(
  pool: Pool,
  date: string,
  timeSlot: string,
  maxBookingsPerSlot: number,
  excludeBookingId?: string
): Promise<SlotCapacityResult> {
  try {
    let query = `
      SELECT COUNT(*) as count
      FROM bookings
      WHERE date = $1
        AND time_slot = $2
        AND status NOT IN ('cancelled', 'rejected')
    `;
    
    const params: any[] = [date, timeSlot];
    
    // Exclude current booking if editing
    if (excludeBookingId) {
      query += ` AND id != $3`;
      params.push(excludeBookingId);
    }
    
    const result = await pool.query(query, params);
    const currentBookings = parseInt(result.rows[0]?.count || '0', 10);
    
    if (currentBookings >= maxBookingsPerSlot) {
      return {
        isAvailable: false,
        currentBookings,
        maxBookings: maxBookingsPerSlot,
        error: `This time slot is fully booked (${currentBookings}/${maxBookingsPerSlot}). Please select a different time.`
      };
    }
    
    return {
      isAvailable: true,
      currentBookings,
      maxBookings: maxBookingsPerSlot
    };
  } catch (error) {
    console.error('Error checking slot capacity:', error);
    return {
      isAvailable: false,
      currentBookings: 0,
      maxBookings: maxBookingsPerSlot,
      error: 'Error checking availability'
    };
  }
}

/**
 * Parses a date string and time slot into a JavaScript Date object
 */
function parseDateTimeSlot(dateStr: string, timeStr: string): Date {
  const date = new Date(dateStr);
  
  // Parse time (handles "9:00 AM", "9:00AM", "09:00 AM", etc.)
  const timeMatch = timeStr.match(/(\d{1,2}):(\d{2})\s*(AM|PM)/i);
  
  if (!timeMatch) {
    throw new Error('Invalid time format');
  }
  
  let hours = parseInt(timeMatch[1], 10);
  const minutes = parseInt(timeMatch[2], 10);
  const meridiem = timeMatch[3].toUpperCase();
  
  // Convert to 24-hour format
  if (meridiem === 'PM' && hours !== 12) {
    hours += 12;
  } else if (meridiem === 'AM' && hours === 12) {
    hours = 0;
  }
  
  date.setHours(hours, minutes, 0, 0);
  return date;
}

/**
 * Get next available time slots based on current bookings and capacity
 */
export async function getAvailableSlots(
  pool: Pool,
  date: string,
  maxBookingsPerSlot: number,
  allTimeSlots: string[]
): Promise<Array<{ slot: string; available: number; total: number }>> {
  const result = await pool.query(
    `SELECT time_slot, COUNT(*) as count
     FROM bookings
     WHERE date = $1 AND status NOT IN ('cancelled', 'rejected')
     GROUP BY time_slot`,
    [date]
  );
  
  const bookingCounts = new Map<string, number>();
  result.rows.forEach(row => {
    bookingCounts.set(row.time_slot, parseInt(row.count, 10));
  });
  
  return allTimeSlots.map(slot => ({
    slot,
    available: maxBookingsPerSlot - (bookingCounts.get(slot) || 0),
    total: maxBookingsPerSlot
  }));
}
