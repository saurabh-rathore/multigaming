import { NotificationService } from '../services/notificationService';
import {
    CreateTemplateRequestBody, UpdateTemplateRequestBody,
    CreateSubscriptionRequestBody, SendDirectNotificationRequestBody, ScheduleCampaignRequestBody, NotificationType
} from '../types/notification.types';

type Request = any; // { params: any, body: any, query: any, user?: { id: string }, adminUser?: {id: string} }
type Response = any;

const notificationService = new NotificationService(); // Backend service

// Template Management
export const createNotificationTemplate = async (req: Request, res: Response) => {
  try {
    // const adminUserId = req.adminUser?.id; // Conceptual admin auth
    // if (!adminUserId) return { statusCode: 401, body: { message: 'Admin not authenticated.'}};
    const data: CreateTemplateRequestBody = req.body;
    if (!data.name || !data.type || !data.bodyTemplate) {
        return { statusCode: 400, body: { message: 'Name, type, and bodyTemplate are required.'}};
    }
    const template = await notificationService.createTemplate(data);
    return { statusCode: 201, body: template };
  } catch (error: any) {
    return { statusCode: 500, body: { message: error.message }};
  }
};

export const listNotificationTemplates = async (req: Request, res: Response) => {
  try {
    const templates = await notificationService.listTemplates();
    return { statusCode: 200, body: templates };
  } catch (error: any) {
    return { statusCode: 500, body: { message: error.message }};
  }
};

export const updateNotificationTemplate = async (req: Request, res: Response) => {
  try {
    // const adminUserId = req.adminUser?.id;
    // if (!adminUserId) return { statusCode: 401, body: { message: 'Admin not authenticated.'}};
    const templateId = req.params?.templateId;
    if (!templateId) return { statusCode: 400, body: { message: 'Template ID is required.'}};
    const data: UpdateTemplateRequestBody = req.body;
    const template = await notificationService.updateTemplate(templateId, data);
    if (!template) return { statusCode: 404, body: { message: 'Template not found.'}};
    return { statusCode: 200, body: template };
  } catch (error: any) {
    return { statusCode: 500, body: { message: error.message }};
  }
};

// User Subscription Management
export const addUserSubscription = async (req: Request, res: Response) => {
    try {
        const userId = req.params?.userId; // Or from req.user.id if self-subscribing
        if (!userId) return { statusCode: 400, body: { message: 'User ID is required.'}};
        const data: CreateSubscriptionRequestBody = req.body;
        if (!data.type || !data.endpoint) {
            return { statusCode: 400, body: { message: 'Subscription type and endpoint are required.'}};
        }
        const subscription = await notificationService.addSubscription(userId, data);
        return { statusCode: 201, body: subscription };
    } catch (error: any) {
        const statusCode = error.message.includes('already exists') ? 409 : 500;
        return { statusCode, body: { message: error.message }};
    }
};

export const listUserSubscriptions = async (req: Request, res: Response) => {
    try {
        const userId = req.params?.userId;
        if (!userId) return { statusCode: 400, body: { message: 'User ID is required.'}};
        const type = req.query?.type as NotificationType | undefined;
        const subscriptions = await notificationService.getSubscriptionsForUser(userId, type);
        return { statusCode: 200, body: subscriptions };
    } catch (error: any) {
        return { statusCode: 500, body: { message: error.message }};
    }
};

export const removeUserSubscription = async (req: Request, res: Response) => {
    try {
        const userId = req.params?.userId; // For authorization check
        const subscriptionId = req.params?.subscriptionId;
        if (!subscriptionId) return { statusCode: 400, body: { message: 'Subscription ID is required.'}};

        const success = await notificationService.removeSubscription(subscriptionId, userId);
        if (!success) return { statusCode: 404, body: { message: 'Subscription not found.'}};
        return { statusCode: 204, body: {} }; // No content
    } catch (error: any) {
        const statusCode = error.message.includes('not authorized') ? 403 : 500;
        return { statusCode, body: { message: error.message }};
    }
};

// Sending & Scheduling
export const sendDirect = async (req: Request, res: Response) => {
    try {
        // This endpoint might be admin-only or for specific internal services
        const data: SendDirectNotificationRequestBody = req.body;
        if (!data.templateId || !data.contextVariables || (!data.userId && !data.targetEndpoint)) {
            return { statusCode: 400, body: { message: 'TemplateID, contextVariables, and (userId or targetEndpoint) are required.'}};
        }
        const log = await notificationService.sendDirectNotification(data);
        if (!log) return { statusCode: 500, body: { message: 'Failed to send notification (simulated).'}}; // Should be caught by service error
        return { statusCode: 202, body: log }; // 202 Accepted (as it's logged, actual send is async)
    } catch (error: any) {
        const statusCode = error.message.includes('not found') ? 404 : 500;
        return { statusCode, body: { message: error.message }};
    }
};

export const scheduleNewCampaign = async (req: Request, res: Response) => {
    try {
        // const adminUserId = req.adminUser?.id;
        // if (!adminUserId) return { statusCode: 401, body: { message: 'Admin not authenticated.'}};
        const data: ScheduleCampaignRequestBody = req.body;
        if (!data.templateId || !data.targetAudience || !data.sendAt) {
             return { statusCode: 400, body: { message: 'TemplateID, targetAudience, and sendAt are required.'}};
        }
        const scheduledItem = await notificationService.scheduleCampaign(data);
        return { statusCode: 201, body: scheduledItem };
    } catch (error: any) {
        return { statusCode: 500, body: { message: error.message }};
    }
};
