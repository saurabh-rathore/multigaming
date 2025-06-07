-- Database schema for User-Profile-Service

-- Profiles table
-- Stores extended user profile information, linking back to the users table in Auth-Service.
CREATE TABLE profiles (
    user_id VARCHAR(255) PRIMARY KEY,      -- Foreign key referencing the users.id from Auth-Service
    username VARCHAR(50) UNIQUE,           -- Optional unique username/nickname
    first_name VARCHAR(100),
    last_name VARCHAR(100),
    avatar_url TEXT,                       -- URL to the user's avatar image
    date_of_birth DATE,

    kyc_status VARCHAR(50) DEFAULT 'not_started', -- e.g., not_started, pending_verification, verified, rejected
    kyc_document_id VARCHAR(255),          -- Reference to a document in a secure storage, if applicable
    kyc_rejection_reason TEXT,             -- Reason if KYC was rejected

    address_line1 VARCHAR(255),
    address_line2 VARCHAR(255),
    city VARCHAR(100),
    state_province VARCHAR(100),
    postal_code VARCHAR(20),
    country VARCHAR(50),

    bio TEXT,                              -- Short user biography

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP

    -- CONSTRAINT fk_user FOREIGN KEY (user_id) REFERENCES auth_service.users(id) -- Conceptual: In a real multi-schema setup
                                                                                -- or if tables were in the same DB.
                                                                                -- For microservices, this link is logical.
);

-- Friends table
-- Manages relationships between users (friend requests, accepted friendships).
CREATE TABLE friends (
    friendship_id VARCHAR(255) PRIMARY KEY, -- Unique ID for the friendship record
    user_id_1 VARCHAR(255) NOT NULL,        -- ID of the user initiating or involved in the friendship
    user_id_2 VARCHAR(255) NOT NULL,        -- ID of the other user involved in the friendship

    status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'declined', 'blocked')),
    -- 'pending': user_id_1 sent request to user_id_2
    -- 'accepted': friendship is active
    -- 'declined': user_id_2 declined request from user_id_1
    -- 'blocked': user_id_1 blocked user_id_2, or vice-versa (application logic to determine direction if needed)

    requested_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, -- When the friend request was sent or block initiated
    responded_at TIMESTAMP,                          -- When the request was accepted/declined

    -- CONSTRAINT fk_user1 FOREIGN KEY (user_id_1) REFERENCES profiles(user_id) ON DELETE CASCADE, -- Conceptual
    -- CONSTRAINT fk_user2 FOREIGN KEY (user_id_2) REFERENCES profiles(user_id) ON DELETE CASCADE, -- Conceptual

    UNIQUE (user_id_1, user_id_2), -- Ensures no duplicate relationships in either direction if handled by app logic
                                   -- (e.g., always store lower ID first, or check both combinations)
    CONSTRAINT check_different_users CHECK (user_id_1 <> user_id_2) -- Users cannot friend themselves
);

-- Indexes for performance
CREATE INDEX idx_profiles_username ON profiles(username);
CREATE INDEX idx_profiles_kyc_status ON profiles(kyc_status);

CREATE INDEX idx_friends_user1 ON friends(user_id_1);
CREATE INDEX idx_friends_user2 ON friends(user_id_2);
CREATE INDEX idx_friends_status ON friends(status);
