-- Database schema for Auth-Service

-- Users table
-- Stores basic user information for authentication and identification.
CREATE TABLE users (
    id VARCHAR(255) PRIMARY KEY, -- Using VARCHAR for ID to allow for UUIDs or other string-based IDs
    phone VARCHAR(20) UNIQUE,    -- Phone number, should be unique
    email VARCHAR(255) UNIQUE,   -- Email address, should be unique and is used for login
    password_hash VARCHAR(255) NOT NULL, -- Hashed password
    status VARCHAR(50) DEFAULT 'pending_verification', -- e.g., pending_verification, active, suspended, banned
    phone_verified BOOLEAN DEFAULT FALSE,
    is_otp_enabled BOOLEAN DEFAULT FALSE, -- For 2FA
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Sessions table
-- Stores active user sessions, linking a session token to a user.
CREATE TABLE sessions (
    session_id VARCHAR(255) PRIMARY KEY, -- Unique session identifier (e.g., a secure random string or JWT ID)
    user_id VARCHAR(255) NOT NULL,       -- Foreign key referencing the users table
    token_hash VARCHAR(255) NOT NULL,    -- Hashed version of the session token (if storing the token itself is too risky)
                                         -- Alternatively, this could store the full JWT if it's short-lived and opaque.
                                         -- For simplicity in this phase, let's assume it's a hash of an issued token.
    user_agent TEXT,                     -- User agent of the client device
    ip_address VARCHAR(45),              -- IP address from which the session originated
    expires_at TIMESTAMP NOT NULL,       -- Timestamp when the session will expire
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_accessed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Adding some basic indexes for performance
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_phone ON users(phone); -- Index for phone number lookups
CREATE INDEX idx_sessions_user_id ON sessions(user_id);
CREATE INDEX idx_sessions_expires_at ON sessions(expires_at);

-- OTP Codes table
-- Stores OTP codes for phone verification or 2FA.
CREATE TABLE otp_codes (
    id VARCHAR(255) PRIMARY KEY,
    phone VARCHAR(20) NOT NULL,          -- Phone number the OTP was sent to
    otp_hash VARCHAR(255) NOT NULL,      -- Hashed OTP code
    purpose VARCHAR(50) DEFAULT 'verification', -- e.g., 'verification', 'login_2fa', 'password_reset'
    used BOOLEAN DEFAULT FALSE,
    expires_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE INDEX idx_otp_codes_phone ON otp_codes(phone);
CREATE INDEX idx_otp_codes_expires_at ON otp_codes(expires_at);
