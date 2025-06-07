import { Timeframe } from '../types/leaderboard.types';

export const generateId = (prefix: string = 'id'): string => {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).substring(2, 10)}`;
};

export const getStartDateForTimeframe = (timeframe: Timeframe, now: Date = new Date()): Date => {
  const startDate = new Date(now);
  startDate.setHours(0, 0, 0, 0); // Start of the day

  switch (timeframe) {
    case 'daily':
      // Already set to start of today
      break;
    case 'weekly':
      // Assuming week starts on Sunday (day 0)
      const dayOfWeek = startDate.getDay();
      startDate.setDate(startDate.getDate() - dayOfWeek);
      break;
    case 'monthly':
      startDate.setDate(1);
      break;
    case 'allTime':
      // A very early date to include all results
      return new Date(0); // Epoch time
    default:
      return new Date(0); // Fallback to allTime
  }
  return startDate;
};
