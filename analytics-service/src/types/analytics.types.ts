// Data structures for the Analytics Service

export interface AnalyticsEvent {
  eventId?: string; // Optional: Client might generate, or server can assign upon reception/storage
  eventName: string;  // e.g., "user_login", "game_start", "item_purchased", "screen_view"
  userId?: string;     // ID of the user performing the action, if applicable
  sessionId?: string;  // Session identifier
  eventTimestamp: Date | string; // Timestamp when the event occurred on the client or originating service
  eventProperties?: Record<string, any>; // Custom JSON object for event-specific data
                                        // e.g., { "gameId": "ludo123", "duration": 300, "outcome": "win" }
                                        // or { "itemId": "boostX", "price": 50, "currency": "INR" }
  // Common properties that might be added by the ingestion point or gateway:
  // clientIp?: string;
  // userAgent?: string;
  // appVersion?: string;
  // platform?: 'web' | 'android' | 'ios';
}

// For batch ingestion
export interface BatchAnalyticsEvents {
    events: AnalyticsEvent[];
}

// Response for ingestion
export interface IngestionResponse {
    success: boolean;
    message: string;
    eventsReceived: number;
    eventsAccepted?: number; // Number of events that passed initial validation
    // errorDetails?: any[]; // If some events in a batch failed validation
}
