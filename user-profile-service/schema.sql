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

    -- Daily Rewards / Engagement Tracking
    last_login_date DATE,                  -- Last date the user logged in (YYYY-MM-DD)
    login_streak_days INT DEFAULT 0,       -- Current consecutive daily login streak
    last_reward_claimed_date DATE,         -- Last date a daily streak reward was claimed
    last_wheel_spin_date DATE,             -- Last date a free wheel spin was used
    available_wheel_spins INT DEFAULT 0,   -- Number of wheel spins the user has accumulated

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

-- Badges table (Lookup table for available badges)
CREATE TABLE badges (
    id VARCHAR(255) PRIMARY KEY,         -- e.g., "10_wins_ludo", "first_game_played"
    name VARCHAR(100) NOT NULL,          -- e.g., "Ludo Champion (10 Wins)", "Welcome Aboard!"
    description TEXT,
    icon_url TEXT NOT NULL,              -- URL to the badge icon
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX idx_badges_name ON badges(name);

-- UserBadges table (Many-to-Many relationship between users and badges)
CREATE TABLE user_badges (
    user_id VARCHAR(255) NOT NULL,
    badge_id VARCHAR(255) NOT NULL,
    earned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    PRIMARY KEY (user_id, badge_id),
    -- CONSTRAINT fk_user_profile_for_badge FOREIGN KEY (user_id) REFERENCES profiles(user_id) ON DELETE CASCADE, -- Conceptual
    -- CONSTRAINT fk_badge_definition FOREIGN KEY (badge_id) REFERENCES badges(id) ON DELETE CASCADE -- Conceptual
    FOREIGN KEY (user_id) REFERENCES profiles(user_id) ON DELETE CASCADE,
    FOREIGN KEY (badge_id) REFERENCES badges(id) ON DELETE CASCADE
);
CREATE INDEX idx_user_badges_user_id ON user_badges(user_id);
CREATE INDEX idx_user_badges_badge_id ON user_badges(badge_id);


-- GameHistory table
CREATE TABLE game_history (
    id VARCHAR(255) PRIMARY KEY,             -- Unique ID for the history entry
    user_id VARCHAR(255) NOT NULL,           -- ID of the user this history entry belongs to
    game_id VARCHAR(100) NOT NULL,           -- Identifier for the game played (e.g., "ludo", "chess_router_wars")
    game_type VARCHAR(50) DEFAULT 'classic', -- e.g. 'classic', 'telecom_themed' (matches game categories)
    score INT,
    win_loss_draw VARCHAR(20) CHECK (win_loss_draw IN ('win', 'loss', 'draw', 'incomplete', 'abandoned')),
    played_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    opponent_id VARCHAR(255),                -- user_id of the opponent if PvP, NULL or 'AI' for PvE
    game_duration_seconds INT,               -- Duration of the game in seconds

    -- CONSTRAINT fk_user_profile_for_history FOREIGN KEY (user_id) REFERENCES profiles(user_id) ON DELETE CASCADE -- Conceptual
    FOREIGN KEY (user_id) REFERENCES profiles(user_id) ON DELETE CASCADE
    -- Note: opponent_id could also be a foreign key to profiles(user_id) if it's always another registered user.
    -- If opponent can be AI or non-registered, then it's just a VARCHAR.
);
CREATE INDEX idx_game_history_user_id ON game_history(user_id);
CREATE INDEX idx_game_history_game_id ON game_history(game_id);
CREATE INDEX idx_game_history_played_at ON game_history(played_at);

-- Indexes for new daily reward fields in profiles table
CREATE INDEX idx_profiles_last_login_date ON profiles(last_login_date);
CREATE INDEX idx_profiles_login_streak_days ON profiles(login_streak_days);


-- Reward Definitions table (for daily login streak rewards)
CREATE TABLE reward_definitions (
    streak_day INT PRIMARY KEY,                 -- e.g., 1, 2, ..., 7 (for a 7-day streak cycle)
    reward_type VARCHAR(50) NOT NULL,           -- e.g., "coins", "power_up_id", "avatar_item_id", "wheel_spin"
    reward_value VARCHAR(255) NOT NULL,         -- e.g., "100" (coins), "extra_life" (power_up_id), "1" (wheel_spin)
    description TEXT,                           -- e.g., "100 Bonus Coins!", "1 Free Wheel Spin"
    icon_url TEXT                               -- Optional icon for the reward
);

-- Wheel Spin Prizes table (defines possible outcomes of a wheel spin)
CREATE TABLE wheel_spin_prizes (
    prize_id VARCHAR(255) PRIMARY KEY,
    prize_type VARCHAR(50) NOT NULL,            -- e.g., "coins", "game_entry_ticket", "badge_id", "no_prize"
    prize_value VARCHAR(255) NOT NULL,          -- e.g., "50", "1", "rare_badge_001"
    prize_display_name VARCHAR(100) NOT NULL,   -- e.g., "50 Coins", "1 Game Ticket", "Rare Badge!"
    icon_url TEXT,
    probability_weight INT NOT NULL DEFAULT 1,  -- Relative weight for selection; higher is more likely
    is_jackpot BOOLEAN DEFAULT FALSE,
    is_active BOOLEAN DEFAULT TRUE              -- To enable/disable specific prizes
);
CREATE INDEX idx_wheel_prizes_active_weight ON wheel_spin_prizes(is_active, probability_weight);
