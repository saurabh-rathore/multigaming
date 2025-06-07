import {
  NotificationTemplate, UserNotificationSubscription, ScheduledNotification, NotificationDeliveryLog,
  NotificationType, ScheduledNotificationStatus, NotificationDeliveryStatus,
  CreateTemplateRequestBody, UpdateTemplateRequestBody, CreateSubscriptionRequestBody,
  SendDirectNotificationRequestBody, ScheduleCampaignRequestBody
} from '../types/notification.types';
import { generateId, renderTemplate } from '../utils/helpers';

// --- Mock Data Store ---
const mockTemplates = new Map<string, NotificationTemplate>();
const mockSubscriptions = new Map<string, UserNotificationSubscription>(); // key: subscriptionId
const mockScheduledNotifications = new Map<string, ScheduledNotification>();
const mockDeliveryLogs: NotificationDeliveryLog[] = [];

// Pre-populate with a sample template
const WELCOME_EMAIL_TEMPLATE_ID = generateId('tpl_email');
mockTemplates.set(WELCOME_EMAIL_TEMPLATE_ID, {
    templateId: WELCOME_EMAIL_TEMPLATE_ID, name: 'Welcome Email', type: 'email',
    subjectTemplate: 'Welcome to {{appName}}, {{userName}}!',
    bodyTemplate: 'Hello {{userName}},

Thanks for signing up for {{appName}}.

Enjoy your gaming experience!

Best,
The {{appName}} Team',
    requiredVariables: ['appName', 'userName'],
    createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
});
const OTP_SMS_TEMPLATE_ID = generateId('tpl_sms');
mockTemplates.set(OTP_SMS_TEMPLATE_ID, {
    templateId: OTP_SMS_TEMPLATE_ID, name: 'OTP SMS', type: 'sms',
    bodyTemplate: 'Your OTP for {{action}} is: {{otp}}. It is valid for 5 minutes. Do not share this OTP. - {{appName}}',
    requiredVariables: ['action', 'otp', 'appName'],
    createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
});


export class NotificationService { // Backend service

  // === Template Management ===
  async createTemplate(data: CreateTemplateRequestBody): Promise<NotificationTemplate> {
    const templateId = generateId('tpl');
    const now = new Date().toISOString();
    const newTemplate: NotificationTemplate = { ...data, templateId, createdAt: now, updatedAt: now };
    mockTemplates.set(templateId, newTemplate);
    console.log(`[NotificationService] Created template: ${templateId} - ${data.name}`);
    return newTemplate;
  }

  async listTemplates(): Promise<NotificationTemplate[]> {
    return Array.from(mockTemplates.values());
  }

  async getTemplateById(templateId: string): Promise<NotificationTemplate | undefined> {
      return mockTemplates.get(templateId);
  }

  async updateTemplate(templateId: string, data: UpdateTemplateRequestBody): Promise<NotificationTemplate | null> {
    const existingTemplate = mockTemplates.get(templateId);
    if (!existingTemplate) return null;
    const updatedTemplate = { ...existingTemplate, ...data, templateId, updatedAt: new Date().toISOString() };
    mockTemplates.set(templateId, updatedTemplate);
    console.log(`[NotificationService] Updated template: ${templateId}`);
    return updatedTemplate;
  }

  // === User Subscription Management ===
  async addSubscription(userId: string, data: CreateSubscriptionRequestBody): Promise<UserNotificationSubscription> {
    // Check for duplicates (user_id, type, endpoint) conceptually
    const existing = Array.from(mockSubscriptions.values()).find(
        s => s.userId === userId && s.type === data.type && s.endpoint === data.endpoint
    );
    if (existing) throw new Error('Subscription already exists for this user, type, and endpoint.');

    const subscriptionId = generateId('sub');
    const now = new Date().toISOString();
    const newSubscription: UserNotificationSubscription = { ...data, userId, subscriptionId, subscribedAt: now, isActive: data.isActive !== undefined ? data.isActive : true };
    mockSubscriptions.set(subscriptionId, newSubscription);
    console.log(`[NotificationService] Added subscription ${subscriptionId} for user ${userId} (${data.type}: ${data.endpoint})`);
    return newSubscription;
  }

  async getSubscriptionsForUser(userId: string, type?: NotificationType): Promise<UserNotificationSubscription[]> {
    let userSubs = Array.from(mockSubscriptions.values()).filter(s => s.userId === userId && s.isActive);
    if (type) {
      userSubs = userSubs.filter(s => s.type === type);
    }
    return userSubs;
  }

  async removeSubscription(subscriptionId: string, userId?: string): Promise<boolean> {
    // Optional: check if userId matches the owner of subscriptionId for auth
    if (mockSubscriptions.has(subscriptionId)) {
        if (userId && mockSubscriptions.get(subscriptionId)?.userId !== userId) {
            throw new Error('User not authorized to remove this subscription.');
        }
        mockSubscriptions.delete(subscriptionId);
        console.log(`[NotificationService] Removed subscription ${subscriptionId}`);
        return true;
    }
    return false;
  }

  // === Sending Notifications (Direct) ===
  async sendDirectNotification(data: SendDirectNotificationRequestBody): Promise<NotificationDeliveryLog | null> {
    const { userId, targetEndpoint, targetType, templateId, contextVariables } = data;

    const template = mockTemplates.get(templateId);
    if (!template) throw new Error(`Template ${templateId} not found.`);

    let subscription: UserNotificationSubscription | undefined;
    let finalEndpoint: string | undefined = targetEndpoint;
    let finalType: NotificationType | undefined = targetType || template.type;

    if (userId) {
      const userSubs = await this.getSubscriptionsForUser(userId, finalType);
      subscription = userSubs.find(s => s.isPrimary) || userSubs[0]; // Prefer primary, else first active
      if (!subscription) throw new Error(`No active subscription of type ${finalType} found for user ${userId}.`);
      finalEndpoint = subscription.endpoint;
    } else if (!targetEndpoint) {
      throw new Error('Either userId or targetEndpoint must be provided.');
    }
    if (!finalEndpoint) throw new Error('Could not determine target endpoint.');


    // Render template (conceptual)
    const subject = template.subjectTemplate ? renderTemplate(template.subjectTemplate, contextVariables) : undefined;
    const body = renderTemplate(template.bodyTemplate, contextVariables);

    console.log(`[NotificationService] SIMULATING SEND:
      To: ${finalEndpoint} (User: ${userId || 'N/A'}, SubID: ${subscription?.subscriptionId || 'N/A'})
      Type: ${finalType}
      Template: ${template.name} (${templateId})
      Subject: ${subject || '(No Subject)'}
      Body: ${body.substring(0, 100)}...`);

    // Log it
    const logEntry: NotificationDeliveryLog = {
      logId: generateId('log'),
      userId,
      subscriptionId: subscription?.subscriptionId,
      templateId,
      type: finalType,
      sentToEndpoint: finalEndpoint,
      status: 'sent', // Simulate immediate success from provider for direct sends
      statusMessage: 'Simulated send successful via mock provider.',
      providerMessageId: generateId('mockProvMsg'),
      attemptedAt: new Date().toISOString(),
      finalizedAt: new Date().toISOString(),
      // contextUsed: contextVariables // For detailed logging if needed
    };
    mockDeliveryLogs.push(logEntry);
    return logEntry;
  }

  // === Campaign Scheduling ===
  async scheduleCampaign(data: ScheduleCampaignRequestBody): Promise<ScheduledNotification> {
    const scheduleId = generateId('sched');
    const now = new Date().toISOString();
    const newScheduledNotification: ScheduledNotification = {
      ...data,
      scheduleId,
      status: 'pending',
      createdAt: now,
      updatedAt: now,
    };
    mockScheduledNotifications.set(scheduleId, newScheduledNotification);
    console.log(`[NotificationService] Scheduled campaign ${data.campaignName || scheduleId} to be sent at ${data.sendAt}`);
    return newScheduledNotification;
  }

  // For testing
  getDeliveryLogs(): NotificationDeliveryLog[] { return [...mockDeliveryLogs]; }
  getScheduledCampaigns(): ScheduledNotification[] { return Array.from(mockScheduledNotifications.values()); }
}
