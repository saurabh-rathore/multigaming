/**
 * Placeholder for generating a unique ID.
 * @param prefix Optional prefix for the ID (e.g., 'user_', 'badge_', 'gh_')
 */
export const generateId = (prefix: string = 'pid'): string => { // pid for profile-id as default
  return prefix + '_' + Date.now() + '_' + Math.random().toString(36).substring(2, 15);
};

/**
 * Basic date validator/converter (conceptual)
 */
export const ensureDate = (dateInput: string | Date | undefined): Date | undefined => {
  if (!dateInput) return undefined;
  if (dateInput instanceof Date) return dateInput;
  const date = new Date(dateInput);
  return isNaN(date.getTime()) ? undefined : date;
};

/**
 * Gets today's date as a YYYY-MM-DD string.
 */
export const getTodayDateString = (): string => {
  const today = new Date();
  const year = today.getFullYear();
  const month = (today.getMonth() + 1).toString().padStart(2, '0');
  const day = today.getDate().toString().padStart(2, '0');
  return `${year}-${month}-${day}`;
};

/**
 * Gets tomorrow's date as a YYYY-MM-DD string.
 */
export const getTomorrowDateString = (): string => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const year = tomorrow.getFullYear();
    const month = (tomorrow.getMonth() + 1).toString().padStart(2, '0');
    const day = tomorrow.getDate().toString().padStart(2, '0');
    return `${year}-${month}-${day}`;
};


/**
 * Calculates the difference in days between two dates.
 * Ignores time, only considers date part.
 * @param dateStr1 YYYY-MM-DD string or Date object
 * @param dateStr2 YYYY-MM-DD string or Date object
 * @returns Difference in days (date2 - date1).
 */
export const calculateDateDifferenceInDays = (dateStr1: string | Date, dateStr2: string | Date): number => {
  const d1 = new Date(dateStr1);
  d1.setUTCHours(0, 0, 0, 0); // Normalize to UTC midnight
  const d2 = new Date(dateStr2);
  d2.setUTCHours(0, 0, 0, 0); // Normalize to UTC midnight

  const diffTime = d2.getTime() - d1.getTime();
  return Math.round(diffTime / (1000 * 60 * 60 * 24));
};
