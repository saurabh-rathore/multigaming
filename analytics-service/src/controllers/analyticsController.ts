import { AnalyticsService } from '../services/analyticsService';
import { AnalyticsEvent, BatchAnalyticsEvents } from '../types/analytics.types';

type Request = any; // { body: any }
type Response = any;

const analyticsService = new AnalyticsService(); // Backend service

export const ingestAnalyticsEvents = async (req: Request, res: Response) => {
  try {
    const eventData: AnalyticsEvent | BatchAnalyticsEvents = req.body;
    if (!eventData || (typeof eventData !== 'object') || Object.keys(eventData).length === 0) {
        return { statusCode: 400, body: { success: false, message: 'Request body cannot be empty.' }};
    }

    const result = await analyticsService.ingestEvents(eventData);

    // Determine appropriate status code based on result
    let httpStatusCode = 200; // OK for partial success in batch
    if (!result.success) {
        httpStatusCode = 400; // Bad Request if all events failed (e.g. single event invalid format)
    } else if (result.eventsAccepted === result.eventsReceived && result.eventsReceived > 0) {
        httpStatusCode = 202; // Accepted: request has been accepted for processing
    }
    // If it's a batch and some failed, 207 (Multi-Status) could be used with detailed errors,
    // but for simplicity, 200 or 202 with a descriptive message is fine.

    return { statusCode: httpStatusCode, body: result };

  } catch (error: any) { // Should not happen if service handles errors gracefully
    console.error("[AnalyticsController] Unexpected error during event ingestion:", error);
    return { statusCode: 500, body: { success: false, message: 'Internal server error during event ingestion.' }};
  }
};
