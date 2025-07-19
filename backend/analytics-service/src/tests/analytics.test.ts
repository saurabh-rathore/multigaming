import { AnalyticsService } from '../services/analyticsService'; // Backend service
import { AnalyticsEvent, BatchAnalyticsEvents, IngestionResponse } from '../types/analytics.types';

// Simple assertion function for testing
const assert = (condition: boolean, message: string) => {
  if (!condition) {
    console.error('Assertion Failed:', message);
    (globalThis as any).analyticsTestFailures = ((globalThis as any).analyticsTestFailures || 0) + 1;
  } else {
    console.log('Assertion Passed:', message);
    (globalThis as any).analyticsTestSuccesses = ((globalThis as any).analyticsTestSuccesses || 0) + 1;
  }
};

const USER_ID_ANALYTICS = 'user_analytics_test_001';
const SESSION_ID_ANALYTICS = 'session_analytics_test_abc';

const runAnalyticsServiceTests = async () => {
  (globalThis as any).analyticsTestFailures = 0;
  (globalThis as any).analyticsTestSuccesses = 0;

  let analyticsService: AnalyticsService;

  const createValidEvent = (name: string, id?: string): AnalyticsEvent => ({
    eventId: id,
    eventName: name,
    userId: USER_ID_ANALYTICS,
    sessionId: SESSION_ID_ANALYTICS,
    eventTimestamp: new Date().toISOString(),
    eventProperties: { page: `/${name}`, source: 'test' }
  });

  console.log('\n--- Running AnalyticsService: Single Event Ingestion Tests ---');
  analyticsService = new AnalyticsService();
  analyticsService.clearStoredEvents(); // Ensure clean state

  // Test 1: Ingest a single valid event (client-provided eventId)
  const event1ClientUUID = `client_${Date.now()}`;
  const validEvent1 = createValidEvent('user_login', event1ClientUUID);
  let response1 = await analyticsService.ingestEvents(validEvent1);
  assert(response1.success === true, 'INGEST-SINGLE-1: Response should indicate success for valid single event.');
  assert(response1.eventsReceived === 1, 'INGEST-SINGLE-2: eventsReceived should be 1.');
  assert(response1.eventsAccepted === 1, 'INGEST-SINGLE-3: eventsAccepted should be 1.');
  let storedEvents1 = analyticsService.getStoredEvents();
  assert(storedEvents1.length === 1, 'INGEST-SINGLE-4: One event should be in store.');
  assert(storedEvents1[0].eventName === 'user_login', 'INGEST-SINGLE-5: Stored event name should be correct.');
  assert(storedEvents1[0].eventId === event1ClientUUID, 'INGEST-SINGLE-6: Client-provided eventId should be preserved.');

  // Test 2: Ingest a single valid event (server generates eventId)
  analyticsService.clearStoredEvents();
  const validEvent2 = createValidEvent('page_view');
  delete validEvent2.eventId; // Remove client ID to test server generation
  let response2 = await analyticsService.ingestEvents(validEvent2);
  assert(response2.success === true && response2.eventsAccepted === 1, 'INGEST-SINGLE-SERVERID-1: Success for event needing server ID.');
  let storedEvents2 = analyticsService.getStoredEvents();
  assert(storedEvents2.length === 1, 'INGEST-SINGLE-SERVERID-2: One event stored.');
  assert(storedEvents2[0].eventId !== undefined && storedEvents2[0].eventId!.startsWith('evt_srv_'), 'INGEST-SINGLE-SERVERID-3: Server-generated eventId should be present.');


  console.log('\n--- Running AnalyticsService: Batch Event Ingestion Tests ---');
  analyticsService = new AnalyticsService();
  analyticsService.clearStoredEvents();

  // Test 3: Ingest a batch of valid events
  const batchEvent1 = createValidEvent('game_start');
  const batchEvent2 = createValidEvent('item_purchase', `client_item_${Date.now()}`);
  const validBatch: BatchAnalyticsEvents = { events: [batchEvent1, batchEvent2] };
  let responseBatch1 = await analyticsService.ingestEvents(validBatch);
  assert(responseBatch1.success === true, 'INGEST-BATCH-VALID-1: Response success for valid batch.');
  assert(responseBatch1.eventsReceived === 2, 'INGEST-BATCH-VALID-2: eventsReceived should be 2.');
  assert(responseBatch1.eventsAccepted === 2, 'INGEST-BATCH-VALID-3: eventsAccepted should be 2.');
  let storedBatch1 = analyticsService.getStoredEvents();
  assert(storedBatch1.length === 2, 'INGEST-BATCH-VALID-4: Two events should be in store.');
  assert(storedBatch1.some(e => e.eventName === 'game_start'), 'INGEST-BATCH-VALID-5: game_start event present.');
  assert(storedBatch1.some(e => e.eventName === 'item_purchase'), 'INGEST-BATCH-VALID-6: item_purchase event present.');


  console.log('\n--- Running AnalyticsService: Invalid Event Tests ---');
  analyticsService = new AnalyticsService();
  analyticsService.clearStoredEvents();

  // Test 4: Ingest single event with missing eventName
  const invalidEventName: any = { eventTimestamp: new Date().toISOString(), userId: 'test' };
  let responseInvalidName = await analyticsService.ingestEvents(invalidEventName as AnalyticsEvent);
  assert(responseInvalidName.success === false, 'INGEST-INVALID-NAME-1: Response success should be false.');
  assert(responseInvalidName.eventsAccepted === 0, 'INGEST-INVALID-NAME-2: No events accepted.');
  assert(analyticsService.getStoredEvents().length === 0, 'INGEST-INVALID-NAME-3: Store should be empty.');

  // Test 5: Ingest single event with missing eventTimestamp
  const invalidEventTimestamp: any = { eventName: 'test_event', userId: 'test' };
  let responseInvalidTimestamp = await analyticsService.ingestEvents(invalidEventTimestamp as AnalyticsEvent);
  assert(responseInvalidTimestamp.success === false, 'INGEST-INVALID-TS-1: Response success false for missing timestamp.');
  assert(responseInvalidTimestamp.eventsAccepted === 0, 'INGEST-INVALID-TS-2: No events accepted.');
  assert(analyticsService.getStoredEvents().length === 0, 'INGEST-INVALID-TS-3: Store should be empty.');

  // Test 6: Ingest single event with unparseable eventTimestamp string
  const invalidEventTimestampStr: AnalyticsEvent = createValidEvent('bad_ts_str');
  invalidEventTimestampStr.eventTimestamp = "this is not a date";
  let responseInvalidTimestampStr = await analyticsService.ingestEvents(invalidEventTimestampStr);
  assert(responseInvalidTimestampStr.success === false, 'INGEST-INVALID-TS-STR-1: Response success false for bad timestamp string.');
  assert(responseInvalidTimestampStr.eventsAccepted === 0, 'INGEST-INVALID-TS-STR-2: No events accepted.');
  assert(analyticsService.getStoredEvents().length === 0, 'INGEST-INVALID-TS-STR-3: Store should be empty.');


  console.log('\n--- Running AnalyticsService: Mixed Batch (Valid & Invalid) Tests ---');
  analyticsService = new AnalyticsService();
  analyticsService.clearStoredEvents();

  // Test 7: Ingest a batch with one valid and one invalid event
  const mixedBatchEventValid = createValidEvent('valid_in_mixed_batch');
  const mixedBatchEventInvalidName: any = { eventTimestamp: new Date().toISOString() };
  const mixedBatch: BatchAnalyticsEvents = { events: [mixedBatchEventValid, mixedBatchEventInvalidName as AnalyticsEvent] };

  let responseMixedBatch = await analyticsService.ingestEvents(mixedBatch);
  assert(responseMixedBatch.success === true, 'INGEST-MIXED-1: Response success should be true (partial success).');
  assert(responseMixedBatch.eventsReceived === 2, 'INGEST-MIXED-2: eventsReceived should be 2.');
  assert(responseMixedBatch.eventsAccepted === 1, 'INGEST-MIXED-3: eventsAccepted should be 1 (only valid one).');
  let storedMixedBatch = analyticsService.getStoredEvents();
  assert(storedMixedBatch.length === 1, 'INGEST-MIXED-4: One valid event should be in store.');
  assert(storedMixedBatch[0].eventName === 'valid_in_mixed_batch', 'INGEST-MIXED-5: Correct event stored.');

  // Test 8: Ingest an empty batch
  analyticsService.clearStoredEvents();
  const emptyBatch: BatchAnalyticsEvents = { events: [] };
  let responseEmptyBatch = await analyticsService.ingestEvents(emptyBatch);
  assert(responseEmptyBatch.success === true, 'INGEST-EMPTYBATCH-1: Response success for empty batch (vacuously true).');
  assert(responseEmptyBatch.eventsReceived === 0, 'INGEST-EMPTYBATCH-2: eventsReceived should be 0.');
  assert(responseEmptyBatch.eventsAccepted === 0, 'INGEST-EMPTYBATCH-3: eventsAccepted should be 0.');
  assert(analyticsService.getStoredEvents().length === 0, 'INGEST-EMPTYBATCH-4: Store should be empty.');

  // Test 9: Ingest invalid data format (not single event, not BatchAnalyticsEvents)
  const completelyInvalidData: any = { someOtherProperty: "foo" };
  let responseInvalidFormat = await analyticsService.ingestEvents(completelyInvalidData);
  assert(responseInvalidFormat.success === false, 'INGEST-BADFORMAT-1: Response success false for invalid format.');
  assert(responseInvalidFormat.message.includes('Invalid event data format'), 'INGEST-BADFORMAT-2: Correct error message.');
  assert(analyticsService.getStoredEvents().length === 0, 'INGEST-BADFORMAT-3: Store should be empty.');


  console.log('\n--- Analytics Service Test Summary ---');
  console.log(`Successes: ${(globalThis as any).analyticsTestSuccesses || 0}`);
  console.log(`Failures: ${(globalThis as any).analyticsTestFailures || 0}`);
  if ((globalThis as any).analyticsTestFailures > 0) {
    console.error('SOME ANALYTICS SERVICE TESTS FAILED!');
  } else {
    console.log('All analytics service tests passed (within this simulated environment)!');
  }
};

runAnalyticsServiceTests();

export { runAnalyticsServiceTests };
