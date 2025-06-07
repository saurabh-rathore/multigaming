-- Database schema for Admin-Service

-- Admin Audit Logs table
-- Records all significant actions performed by administrators via the admin portal or tools.
CREATE TABLE admin_audit_logs (
    log_id VARCHAR(255) PRIMARY KEY,          -- Unique identifier for the log entry
    admin_user_id VARCHAR(255) NOT NULL,      -- ID of the administrator who performed the action
                                              -- (This would typically be a user with admin privileges from the Auth service)
    action VARCHAR(255) NOT NULL,             -- A code or short description of the action performed
                                              -- e.g., 'USER_BANNED', 'GAME_ACTIVATED', 'WALLET_CREDITED_MANUALLY'
    target_entity_type VARCHAR(50),           -- The type of entity that was affected by the action
                                              -- e.g., 'USER', 'GAME', 'WALLET', 'TOURNAMENT'
    target_entity_id VARCHAR(255),            -- The unique identifier of the specific entity affected

    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP, -- When the action was performed/logged

    details JSON,                             -- JSON object to store additional context or data about the action
                                              -- e.g., { "reason": "...", "old_value": "...", "new_value": "..." }
                                              -- For wallet ops: { "amount": 100, "currency": "INR", "balance_before": "...", "balance_after": "..." }

    ip_address VARCHAR(45),                   -- IP address from which the admin action was initiated (IPv4 or IPv6)

    user_agent TEXT                           -- User agent string of the admin's client, if available
);

-- Indexes for performance and querying audit logs
CREATE INDEX idx_admin_audit_admin_user_id ON admin_audit_logs(admin_user_id);
CREATE INDEX idx_admin_audit_action ON admin_audit_logs(action);
CREATE INDEX idx_admin_audit_target_entity ON admin_audit_logs(target_entity_type, target_entity_id);
CREATE INDEX idx_admin_audit_timestamp ON admin_audit_logs(timestamp);
