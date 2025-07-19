import {
  AnalyticsEvent, BatchAnalyticsEvents, IngestionResponse
} from '../types/analytics.types';
import { generateServerEventId } from '../utils/helpers';

// --- Mock Data Store ---
// Simulates a temporary buffer or a stream where events are sent.
// In a real system, this would be a message queue (Kafka, SQS) or direct to a data lake/warehouse.
const mockEventStore: AnalyticsEvent[] = [];

export class AnalyticsService { // Backend service

  constructor() {}

  async ingestEvents(data: AnalyticsEvent | BatchAnalyticsEvents): Promise<IngestionResponse> {
    let receivedEvents: AnalyticsEvent[];
    let sourceIsBatch = false;

    if ('events' in data && Array.isArray(data.events)) {
      // Batch of events
      receivedEvents = data.events;
      sourceIsBatch = true;
    } else if ('eventName' in data) {
      // Single event
      receivedEvents = [data as AnalyticsEvent];
    } else {
      return {
        success: false,
        message: "Invalid event data format. Expecting a single AnalyticsEvent or { events: AnalyticsEvent[] }.",
        eventsReceived: 0,
      };
    }

    const eventsReceivedCount = receivedEvents.length;
    let eventsAcceptedCount = 0;
    // const processingErrors: any[] = []; // For detailed error reporting per event in batch

    console.log(`[AnalyticsService] Received ${eventsReceivedCount} event(s) for ingestion.`);

    for (const event of receivedEvents) {
      // Basic Validation
      if (!event.eventName || typeof event.eventName !== 'string' || event.eventName.trim() === '') {
        console.warn('[AnalyticsService] Invalid event: missing or empty eventName.', event);
        // processingErrors.push({ event, error: "Missing or empty eventName" });
        continue; // Skip this event
      }
      if (!event.eventTimestamp) {
        console.warn('[AnalyticsService] Invalid event: missing eventTimestamp.', event);
        // processingErrors.push({ event, error: "Missing eventTimestamp" });
        continue; // Skip this event
      }
      try {
        // Attempt to parse timestamp to ensure it's valid, or it's already a Date object
        if (typeof event.eventTimestamp === 'string') {
            const parsedDate = new Date(event.eventTimestamp);
            if (isNaN(parsedDate.getTime())) {
                 console.warn('[AnalyticsService] Invalid event: unparseable eventTimestamp string.', event);
                 continue;
            }
        } else if (!(event.eventTimestamp instanceof Date)) {
             console.warn('[AnalyticsService] Invalid event: eventTimestamp is not a Date object or string.', event);
             continue;
        }
      } catch (e) {
          console.warn('[AnalyticsService] Invalid event: error processing eventTimestamp.', event, e);
          continue;
      }


      // Assign a server-side ID if not provided by client (or always override/add one)
      const processedEvent: AnalyticsEvent = {
        ...event,
        eventId: event.eventId || generateServerEventId(), // Ensure eventId exists
        // serverReceivedTimestamp: new Date() // Could be added here before pushing to store
      };

      mockEventStore.push(processedEvent);
      eventsAcceptedCount++;
      // In a real system:
      // - Add to a batch for writing to a database like raw_events
      // - Send to a message queue (Kafka, Kinesis, SQS)
      // - Write to a log file that gets collected
      // console.log(`[AnalyticsService] Event ingested: ${processedEvent.eventName} (ID: ${processedEvent.eventId})`);
    }

    console.log(`[AnalyticsService] Ingestion complete. Accepted: ${eventsAcceptedCount}/${eventsReceivedCount}. Current store size: ${mockEventStore.length}`);

    if (sourceIsBatch) {
        if (eventsAcceptedCount === eventsReceivedCount) {
            return { success: true, message: `Batch of ${eventsReceivedCount} events processed successfully.`, eventsReceived: eventsReceivedCount, eventsAccepted: eventsAcceptedCount };
        } else {
             return {
                 success: eventsAcceptedCount > 0, // Success if at least one event was accepted
                 message: `Batch processed. Accepted ${eventsAcceptedCount} out of ${eventsReceivedCount} events. Some events may have had validation issues.`,
                 eventsReceived: eventsReceivedCount,
                 eventsAccepted: eventsAcceptedCount
                 // errors: processingErrors // Optionally include error details
             };
        }
    } else { // Single event
        if (eventsAcceptedCount === 1) {
            return { success: true, message: 'Event ingested successfully.', eventsReceived: 1, eventsAccepted: 1 };
        } else {
            return { success: false, message: 'Event ingestion failed due to validation issues.', eventsReceived: 1, eventsAccepted: 0 };
        }
    }
  }

  // For testing purposes to inspect the mock store
  getStoredEvents(): AnalyticsEvent[] {
      return [...mockEventStore]; // Return a copy
  }
  clearStoredEvents(): void { // For test cleanup
      mockEventStore.length = 0;
  }
}
