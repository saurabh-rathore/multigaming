import { NotificationService } from '../services/notificationService'; // Backend service
import {
    NotificationTemplate, UserNotificationSubscription, ScheduledNotification, NotificationDeliveryLog,
    CreateTemplateRequestBody, UpdateTemplateRequestBody, CreateSubscriptionRequestBody,
    SendDirectNotificationRequestBody, ScheduleCampaignRequestBody, NotificationType
} from '../types/notification.types';

// Simple assertion function for testing
const assert = (condition: boolean, message: string) => {
  if (!condition) {
    console.error('Assertion Failed:', message);
    (globalThis as any).notificationTestFailures = ((globalThis as any).notificationTestFailures || 0) + 1;
  } else {
    console.log('Assertion Passed:', message);
    (globalThis as any).notificationTestSuccesses = ((globalThis as any).notificationTestSuccesses || 0) + 1;
  }
};

const USER_ID_NOTIFY_1 = 'user_notify_001';
const USER_ID_NOTIFY_2 = 'user_notify_002';
const MOCK_ADMIN_ID_NOTIFY = 'admin_notify_ops'; // For conceptual audit if it were part of service

const runNotificationServiceTests = async () => {
  (globalThis as any).notificationTestFailures = 0;
  (globalThis as any).notificationTestSuccesses = 0;

  let notificationService: NotificationService;

  console.log('\n--- Running NotificationService: Template Management Tests ---');
  notificationService = new NotificationService(); // Fresh service instance

  // Test 1: Create a new template
  const newEmailTemplateData: CreateTemplateRequestBody = {
    name: 'Test Email Template', type: 'email',
    subjectTemplate: 'Test Subject: {{eventName}}',
    bodyTemplate: 'Hello {{userName}}, this is a test for {{eventName}}.',
    requiredVariables: ['userName', 'eventName']
  };
  const createdEmailTemplate = await notificationService.createTemplate(newEmailTemplateData);
  assert(createdEmailTemplate.templateId !== undefined, 'TPL-CREATE-1: Created email template should have an ID.');
  assert(createdEmailTemplate.name === newEmailTemplateData.name, 'TPL-CREATE-2: Email template name should match.');

  // Test 2: List templates
  let templates = await notificationService.listTemplates();
  const initialTemplateCount = templates.length; // Includes pre-populated ones
  assert(templates.some(t => t.templateId === createdEmailTemplate.templateId), 'TPL-LIST-1: Created email template should be in the list.');

  // Test 3: Get template by ID
  const fetchedTemplate = await notificationService.getTemplateById(createdEmailTemplate.templateId);
  assert(fetchedTemplate?.name === newEmailTemplateData.name, 'TPL-GET-1: Fetched template should match created one.');

  // Test 4: Update an existing template
  const updateData: UpdateTemplateRequestBody = { description: 'Updated description.', subjectTemplate: 'New Subject: {{eventName}}!' };
  const updatedEmailTemplate = await notificationService.updateTemplate(createdEmailTemplate.templateId, updateData);
  assert(updatedEmailTemplate !== null, 'TPL-UPDATE-1: Updated email template should not be null.');
  assert(updatedEmailTemplate?.description === updateData.description, 'TPL-UPDATE-2: Email template description should be updated.');
  assert(updatedEmailTemplate?.subjectTemplate === updateData.subjectTemplate, 'TPL-UPDATE-3: Email template subject should be updated.');


  console.log('\n--- Running NotificationService: User Subscription Management Tests ---');
  notificationService = new NotificationService(); // Fresh instance

  // Test 5: Add a new email subscription for a user
  const emailSubData: CreateSubscriptionRequestBody = { type: 'email', endpoint: 'user1@example.com', isPrimary: true, isActive: true };
  const createdEmailSub = await notificationService.addSubscription(USER_ID_NOTIFY_1, emailSubData);
  assert(createdEmailSub.subscriptionId !== undefined, 'SUB-CREATE-EMAIL-1: Email subscription should have an ID.');
  assert(createdEmailSub.userId === USER_ID_NOTIFY_1 && createdEmailSub.endpoint === emailSubData.endpoint, 'SUB-CREATE-EMAIL-2: Email subscription details correct.');

  // Test 6: Add an SMS subscription for the same user
  const smsSubData: CreateSubscriptionRequestBody = { type: 'sms', endpoint: '+1234567890', isActive: true };
  const createdSmsSub = await notificationService.addSubscription(USER_ID_NOTIFY_1, smsSubData);
  assert(createdSmsSub.subscriptionId !== undefined && createdSmsSub.type === 'sms', 'SUB-CREATE-SMS-1: SMS subscription created.');

  // Test 7: Attempt to add duplicate subscription
  try {
      await notificationService.addSubscription(USER_ID_NOTIFY_1, emailSubData);
      assert(false, 'SUB-DUPLICATE-FAIL: Should throw error for duplicate subscription.');
  } catch (e: any) {
      assert(e.message.includes('already exists'), `SUB-DUPLICATE-1: Correct error. Got: ${e.message}`);
  }

  // Test 8: List subscriptions for the user
  let user1Subs = await notificationService.getSubscriptionsForUser(USER_ID_NOTIFY_1);
  assert(user1Subs.length === 2, 'SUB-LIST-USER-1: User1 should have 2 subscriptions.');
  assert(user1Subs.some(s => s.type === 'email' && s.endpoint === 'user1@example.com'), 'SUB-LIST-USER-2: Email sub should be present.');
  assert(user1Subs.some(s => s.type === 'sms' && s.endpoint === '+1234567890'), 'SUB-LIST-USER-3: SMS sub should be present.');

  // Test 9: List subscriptions for user by type
  let user1EmailSubs = await notificationService.getSubscriptionsForUser(USER_ID_NOTIFY_1, 'email');
  assert(user1EmailSubs.length === 1 && user1EmailSubs[0].endpoint === 'user1@example.com', 'SUB-LIST-TYPE-1: Should list only email subscription.');

  // Test 10: Remove an SMS subscription
  const removeSmsResult = await notificationService.removeSubscription(createdSmsSub.subscriptionId, USER_ID_NOTIFY_1);
  assert(removeSmsResult === true, 'SUB-REMOVE-1: SMS subscription should be removed successfully.');
  user1Subs = await notificationService.getSubscriptionsForUser(USER_ID_NOTIFY_1);
  assert(user1Subs.length === 1 && user1Subs[0].type === 'email', 'SUB-REMOVE-2: User1 should now have 1 (email) subscription.');

  // Test 11: Attempt to remove non-existent subscription
  const removeFakeResult = await notificationService.removeSubscription('fake_sub_id');
  assert(removeFakeResult === false, 'SUB-REMOVE-FAKE-1: Removing non-existent sub should return false.');


  console.log('\n--- Running NotificationService: Direct Notification Sending Tests ---');
  // notificationService is already reset with user1 having an email subscription.
  // We need the welcome email template ID from the service's pre-populated data or create one.
  // Let's assume the pre-populated WELCOME_EMAIL_TEMPLATE_ID is accessible or we use its name.
  const welcomeTpl = (await notificationService.listTemplates()).find(t=>t.name === 'Welcome Email');
  assert(welcomeTpl !== undefined, 'SEND-PRECHECK-1: Welcome email template must exist.');
  const welcomeTplId = welcomeTpl!.templateId;

  // Test 12: Send a direct welcome email to USER_ID_NOTIFY_1
  const directSendData: SendDirectNotificationRequestBody = {
    userId: USER_ID_NOTIFY_1,
    templateId: welcomeTplId,
    contextVariables: { appName: 'My Awesome Game', userName: 'NotifyUser1' }
  };
  const deliveryLog1 = await notificationService.sendDirectNotification(directSendData);
  assert(deliveryLog1 !== null, 'SEND-DIRECT-1: Delivery log should be created for welcome email.');
  assert(deliveryLog1?.userId === USER_ID_NOTIFY_1, 'SEND-DIRECT-2: Logged userId should be correct.');
  assert(deliveryLog1?.templateId === welcomeTplId, 'SEND-DIRECT-3: Logged templateId should be correct.');
  assert(deliveryLog1?.status === 'sent', 'SEND-DIRECT-4: Logged status should be "sent".');
  assert(deliveryLog1?.sentToEndpoint === 'user1@example.com', 'SEND-DIRECT-5: Logged endpoint should be user1 email.');

  // Test 13: Send direct notification to an endpoint without userId (e.g., test email)
  const directEndpointData: SendDirectNotificationRequestBody = {
      targetEndpoint: 'test@example.com',
      targetType: 'email', // Must provide if no userId to infer from subscriptions
      templateId: welcomeTplId,
      contextVariables: { appName: "Test Platform", userName: "Tester" }
  };
  const deliveryLog2 = await notificationService.sendDirectNotification(directEndpointData);
  assert(deliveryLog2 !== null && deliveryLog2.sentToEndpoint === 'test@example.com', 'SEND-DIRECT-ENDPOINT-1: Sent to direct endpoint.');

  // Test 14: Attempt to send with non-existent template
  const badSendData: SendDirectNotificationRequestBody = { userId: USER_ID_NOTIFY_1, templateId: 'fake_template_id', contextVariables: {} };
  try {
    await notificationService.sendDirectNotification(badSendData);
    assert(false, 'SEND-BAD-TEMPLATE-FAIL: Should throw error for non-existent template.');
  } catch (e: any) {
    assert(e.message.includes('not found'), `SEND-BAD-TEMPLATE-1: Correct error. Got: ${e.message}`);
  }

  // Test 15: Attempt to send to user with no matching active subscription
  await notificationService.removeSubscription(createdEmailSub.subscriptionId, USER_ID_NOTIFY_1); // Remove user1's only sub
  try {
    await notificationService.sendDirectNotification(directSendData); // Try sending to user1 again
    assert(false, 'SEND-NO-SUB-FAIL: Should throw error if no active sub found.');
  } catch (e: any) {
    assert(e.message.includes('No active subscription'), `SEND-NO-SUB-1: Correct error. Got: ${e.message}`);
  }

  console.log('\n--- Running NotificationService: Campaign Scheduling Tests ---');
  notificationService = new NotificationService(); // Fresh instance for campaign tests
  const campaignTpl = (await notificationService.listTemplates()).find(t=>t.name === 'Welcome Email')!; // Re-use welcome

  // Test 16: Schedule a campaign for all users
  const campaignDataAll: ScheduleCampaignRequestBody = {
    campaignName: 'Welcome All New Users Campaign',
    templateId: campaignTpl.templateId,
    targetAudience: { type: 'all_users' },
    contextVariables: { appName: 'Grand Gaming Gala' },
    sendAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString() // Tomorrow
  };
  const scheduledCampaign1 = await notificationService.scheduleCampaign(campaignDataAll);
  assert(scheduledCampaign1.scheduleId !== undefined, 'SCHED-CAMP-1: Scheduled campaign should have an ID.');
  assert(scheduledCampaign1.status === 'pending', 'SCHED-CAMP-2: Campaign status should be pending.');
  assert(scheduledCampaign1.targetAudience.type === 'all_users', 'SCHED-CAMP-3: Target audience should be all_users.');

  // Test 17: Schedule a campaign for specific users
  const campaignDataSpecific: ScheduleCampaignRequestBody = {
    templateId: campaignTpl.templateId,
    targetAudience: { type: 'specific_users', userIds: [USER_ID_NOTIFY_1, USER_ID_NOTIFY_2] },
    sendAt: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString() // Day after tomorrow
  };
  const scheduledCampaign2 = await notificationService.scheduleCampaign(campaignDataSpecific);
  assert(scheduledCampaign2.targetAudience.type === 'specific_users', 'SCHED-CAMP-SPECIFIC-1: Target audience type correct.');
  assert(scheduledCampaign2.targetAudience.userIds?.length === 2, 'SCHED-CAMP-SPECIFIC-2: Correct number of userIds.');

  // Verify campaigns are in mock store
  const allScheduled = notificationService.getScheduledCampaigns();
  assert(allScheduled.some(s => s.scheduleId === scheduledCampaign1.scheduleId), 'SCHED-LIST-1: Campaign 1 should be in scheduled list.');
  assert(allScheduled.some(s => s.scheduleId === scheduledCampaign2.scheduleId), 'SCHED-LIST-2: Campaign 2 should be in scheduled list.');


  console.log('\n--- Notification Service Test Summary ---');
  console.log(`Successes: ${(globalThis as any).notificationTestSuccesses || 0}`);
  console.log(`Failures: ${(globalThis as any).notificationTestFailures || 0}`);
  if ((globalThis as any).notificationTestFailures > 0) {
    console.error('SOME NOTIFICATION SERVICE TESTS FAILED!');
  } else {
    console.log('All notification service tests passed (within this simulated environment)!');
  }
};

runNotificationServiceTests();

export { runNotificationServiceTests };
