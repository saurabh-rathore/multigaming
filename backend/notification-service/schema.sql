-- Database schema for Notification-Service

CREATE TABLE IF NOT EXISTS notification_templates (
    template_id VARCHAR(255) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    type VARCHAR(20) NOT NULL, -- 'email', 'sms', 'push_fcm', 'push_apns', 'in_app'
    subject_template TEXT,     -- Nullable, not for SMS/Push
    body_template TEXT NOT NULL,
    required_variables JSON,   -- JSON array of strings: '["var1", "var2"]'
    -- version INT DEFAULT 1,
    -- is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE (name, type) -- Ensure template names are unique per type
);

CREATE TABLE IF NOT EXISTS user_notification_subscriptions (
    subscription_id VARCHAR(255) PRIMARY KEY,
    user_id VARCHAR(255) NOT NULL, -- Logical FK to users table
    type VARCHAR(20) NOT NULL,     -- 'email', 'sms', 'push_fcm', 'push_apns'
    endpoint TEXT NOT NULL,        -- Email address, phone number, device token
    is_primary BOOLEAN DEFAULT FALSE,
    is_active BOOLEAN DEFAULT TRUE,
    subscribed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    -- last_verified_at TIMESTAMP,
    -- verification_token VARCHAR(255),
    -- metadata JSON, -- e.g. device info for push tokens
    UNIQUE (user_id, type, endpoint(255)) -- User can't have same endpoint for same type multiple times
    -- UNIQUE (user_id, type, is_primary) where is_primary = TRUE -- only one primary per type (DB specific syntax)
);
CREATE INDEX idx_uns_user_id_type_active ON user_notification_subscriptions(user_id, type, is_active);


CREATE TABLE scheduled_notifications (
    schedule_id VARCHAR(255) PRIMARY KEY,
    campaign_name VARCHAR(255),
    template_id VARCHAR(255) NOT NULL, -- FK to notification_templates
    target_audience JSON NOT NULL,
    -- { "type": "all_users" }
    -- { "type": "specific_users", "userIds": ["id1", "id2"] }
    -- { "type": "segment_id", "segmentId": "active_players_last_7_days" }
    context_variables JSON,            -- Global variables for the template
    send_at TIMESTAMP NOT NULL,
    status VARCHAR(30) NOT NULL DEFAULT 'pending', -- 'pending', 'processing', 'sent', 'partially_failed', 'failed', 'cancelled'
    processing_started_at TIMESTAMP,
    processing_completed_at TIMESTAMP,
    -- summary JSON, -- { "total_targeted": 0, "attempted": 0, "sent_successfully": 0, "failed": 0 }
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    -- CONSTRAINT fk_sn_template FOREIGN KEY (template_id) REFERENCES notification_templates(template_id) -- Conceptual
);
CREATE INDEX idx_sn_status_send_at ON scheduled_notifications(status, send_at);


CREATE TABLE notification_delivery_logs (
    log_id VARCHAR(255) PRIMARY KEY,
    schedule_id VARCHAR(255),          -- FK to scheduled_notifications, if applicable
    user_id VARCHAR(255),              -- Recipient user ID, if applicable
    subscription_id VARCHAR(255),      -- FK to user_notification_subscriptions, if applicable
    template_id VARCHAR(255) NOT NULL, -- FK to notification_templates
    type VARCHAR(20) NOT NULL,
    sent_to_endpoint TEXT NOT NULL,    -- The actual address/token it was sent to
    status VARCHAR(30) NOT NULL,       -- 'pending_dispatch', 'sent', 'failed_to_send', 'delivered', 'opened', 'bounced', 'complained'
    status_message TEXT,               -- Error message from provider or reason for status
    provider_message_id VARCHAR(255),  -- Message ID from external provider (e.g., SES Message ID)
    attempted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    finalized_at TIMESTAMP             -- When the status became terminal
    -- context_used JSON,              -- Actual variables used for this specific notification
    -- CONSTRAINT fk_ndl_schedule FOREIGN KEY (schedule_id) REFERENCES scheduled_notifications(schedule_id), -- Conceptual
    -- CONSTRAINT fk_ndl_template FOREIGN KEY (template_id) REFERENCES notification_templates(template_id), -- Conceptual
    -- CONSTRAINT fk_ndl_subscription FOREIGN KEY (subscription_id) REFERENCES user_notification_subscriptions(subscription_id) -- Conceptual
);
CREATE INDEX idx_ndl_user_id ON notification_delivery_logs(user_id);
CREATE INDEX idx_ndl_status ON notification_delivery_logs(status);
CREATE INDEX idx_ndl_template_id ON notification_delivery_logs(template_id);
CREATE INDEX idx_ndl_schedule_id ON notification_delivery_logs(schedule_id);
CREATE INDEX idx_ndl_attempted_at ON notification_delivery_logs(attempted_at);
