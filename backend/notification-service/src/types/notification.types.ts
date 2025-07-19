// Data structures for the Notification Service

export type NotificationType = 'email' | 'sms' | 'push_fcm' | 'push_apns' | 'in_app';

export interface NotificationTemplate {
  templateId: string; // e.g., "welcome_email", "password_reset_sms"
  name: string; // User-friendly name for the template
  description?: string;
  type: NotificationType;
  subjectTemplate?: string; // For email: "Welcome to {{appName}}!"
  bodyTemplate: string;    // For email (HTML/text), SMS, Push message: "Hi {{userName}}, your OTP is {{otp}}."
  requiredVariables?: string[]; // List of variable names expected by the template, e.g., ["userName", "otp", "appName"]
  // version?: number;
  // isActive?: boolean;
  createdAt: Date | string;
  updatedAt: Date | string;
}

export interface UserNotificationSubscription {
  subscriptionId: string;
  userId: string; // Foreign key to user
  type: NotificationType; // email, sms, push_fcm, push_apns etc.
  endpoint: string; // Email address, phone number, device token
  isPrimary?: boolean; // e.g. primary email for notifications
  isActive: boolean; // User can disable certain notification channels
  subscribedAt: Date | string;
  // lastVerifiedAt?: Date | string; // For email/phone verification
}

export type ScheduledNotificationStatus = 'pending' | 'processing' | 'sent' | 'partially_failed' | 'failed' | 'cancelled';

export interface ScheduledNotification {
  scheduleId: string;
  campaignName?: string; // Optional name for this scheduled broadcast/campaign
  templateId: string;   // Which template to use
  // Targeting criteria (simplified for now, could be complex JSON for segments)
  targetAudience: {
    type: 'all_users' | 'specific_users' | 'segment_id'; // segment_id is conceptual
    userIds?: string[]; // if type is 'specific_users'
    segmentId?: string; // if type is 'segment_id'
  };
  contextVariables?: Record<string, any>; // Global variables for the template if not user-specific
                                          // User-specific variables would be resolved at send time
  sendAt: Date | string; // When the notification should be sent
  status: ScheduledNotificationStatus;
  processingStartedAt?: Date | string;
  processingCompletedAt?: Date | string;
  // summary?: { total_targeted: number, total_sent: number, total_failed: number };
  createdAt: Date | string;
  updatedAt: Date | string;
}

export type NotificationDeliveryStatus =
  | 'pending_dispatch' // Handed to provider, awaiting confirmation
  | 'sent'             // Confirmed sent by first-hop provider (e.g., email SMTP, SMS gateway)
  | 'failed_to_send'   // Provider rejected or failed to send
  | 'delivered'        // Confirmed delivery to end device (if supported by provider, e.g., some push services)
  | 'opened'           // User opened/interacted (if tracked, e.g., email open pixel, push open event)
  | 'bounced'          // For email: hard bounce
  | 'complained';      // For email: user marked as spam

export interface NotificationDeliveryLog {
  logId: string;
  scheduleId?: string; // If part of a scheduled campaign
  userId?: string;     // Recipient user ID, if applicable
  subscriptionId?: string; // Which subscription was used
  templateId: string;
  type: NotificationType;
  sentToEndpoint: string; // Actual email, phone, token used
  status: NotificationDeliveryStatus;
  statusMessage?: string; // e.g., error message from provider
  providerMessageId?: string; // ID from the external notification provider
  attemptedAt: Date | string;
  finalizedAt?: Date | string; // When status became terminal (sent, failed, delivered etc.)
  // contextUsed?: Record<string, any>; // Variables used for this specific notification
}

// --- Request Body Types (Conceptual) ---
export interface CreateTemplateRequestBody extends Omit<NotificationTemplate, 'templateId' | 'createdAt' | 'updatedAt'> {}
export interface UpdateTemplateRequestBody extends Partial<Omit<NotificationTemplate, 'templateId' | 'createdAt' | 'updatedAt'>> {}

export interface CreateSubscriptionRequestBody extends Omit<UserNotificationSubscription, 'subscriptionId' | 'subscribedAt'> {}

export interface SendDirectNotificationRequestBody {
    userId?: string; // If sending to a specific user
    targetEndpoint?: string; // If sending directly to an endpoint (e.g. test email)
    targetType?: NotificationType; // Must be provided if targetEndpoint is used without userId
    templateId: string;
    contextVariables: Record<string, any>; // Variables for the template
}

export interface ScheduleCampaignRequestBody extends Omit<ScheduledNotification, 'scheduleId' | 'status' | 'createdAt' | 'updatedAt' | 'processingStartedAt' | 'processingCompletedAt'> {}
