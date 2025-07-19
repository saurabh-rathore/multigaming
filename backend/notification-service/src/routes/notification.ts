import * as ctrl from '../controllers/notificationController'; // Using ctrl alias

export const notificationRoutes = {
  // Admin Template Routes
  post_admin_template: ctrl.createNotificationTemplate,    // POST /admin/notification-templates
  get_admin_templates: ctrl.listNotificationTemplates,     // GET /admin/notification-templates
  put_admin_template_by_id: ctrl.updateNotificationTemplate, // PUT /admin/notification-templates/:templateId

  // User Subscription Routes
  post_user_subscription: ctrl.addUserSubscription,        // POST /users/:userId/notification-subscriptions
  get_user_subscriptions: ctrl.listUserSubscriptions,      // GET /users/:userId/notification-subscriptions
  delete_user_subscription: ctrl.removeUserSubscription,   // DELETE /users/:userId/notification-subscriptions/:subscriptionId

  // Sending & Scheduling Routes
  post_send_direct: ctrl.sendDirect,                       // POST /notifications/send-direct
  post_admin_schedule_campaign: ctrl.scheduleNewCampaign,    // POST /admin/notification-campaigns
};
