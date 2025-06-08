import { ingestAnalyticsEvents } from '../controllers/analyticsController';

export const analyticsRoutes = {
  post_ingest_events: ingestAnalyticsEvents,    // POST /analytics/ingest
};
