import { Router } from 'express';
import { ingestAnalyticsEvents } from '../controllers/analyticsController';

const router = Router();

router.post('/ingest', ingestAnalyticsEvents);

export default router;
