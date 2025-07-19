import { Router } from 'express';
import * as ctrl from '../controllers/notificationController'; // Using ctrl alias

const router = Router();

// Admin Template Routes
router.post('/admin/notification-templates', ctrl.createNotificationTemplate);
router.get('/admin/notification-templates', ctrl.listNotificationTemplates);
router.put('/admin/notification-templates/:templateId', ctrl.updateNotificationTemplate);

// User Subscription Routes
router.post('/users/:userId/notification-subscriptions', ctrl.addUserSubscription);
router.get('/users/:userId/notification-subscriptions', ctrl.listUserSubscriptions);
router.delete('/users/:userId/notification-subscriptions/:subscriptionId', ctrl.removeUserSubscription);

// Sending & Scheduling Routes
router.post('/notifications/send-direct', ctrl.sendDirect);
router.post('/admin/notification-campaigns', ctrl.scheduleNewCampaign);

export default router;
