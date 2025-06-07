-- Database schema for Tournament-Service

CREATE TABLE tournaments (
    tournament_id VARCHAR(255) PRIMARY KEY,
    game_id VARCHAR(255) NOT NULL, -- FK to games table in GameEngine service (logical)
    name VARCHAR(255) NOT NULL,
    description TEXT,
    status VARCHAR(50) NOT NULL DEFAULT 'upcoming', -- upcoming, registration_open, registration_closed, active, paused, completed, cancelled

    scheduled_start_time TIMESTAMP NOT NULL,
    actual_start_time TIMESTAMP,
    scheduled_end_time TIMESTAMP,
    actual_end_time TIMESTAMP,

    registration_open_time TIMESTAMP NOT NULL,
    registration_close_time TIMESTAMP NOT NULL,

    min_participants INT DEFAULT 2,
    max_participants INT,

    entry_fee DECIMAL(10, 2) DEFAULT 0.00,
    currency VARCHAR(10) DEFAULT 'INR', -- Can be 'INR', 'USD', 'BONUS_COINS', etc.

    prize_pool DECIMAL(15, 2) DEFAULT 0.00,
    prize_distribution_rules JSON, -- JSON array of PrizeDistributionRule objects
    -- e.g., '[{"rank": 1, "percentage": 50}, {"rank": 2, "percentage": 30}, {"rank": 3, "percentage": 20}]'
    -- or '[{"rank": 1, "fixedAmount": 1000}, {"rank": 2, "fixedAmount": 500}]'

    rules TEXT,

    created_by VARCHAR(255), -- Admin User ID
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    CONSTRAINT check_reg_times CHECK (registration_open_time < registration_close_time),
    CONSTRAINT check_start_end_times CHECK (scheduled_start_time < scheduled_end_time OR scheduled_end_time IS NULL),
    CONSTRAINT check_min_participants CHECK (min_participants >= 2) -- Typically tournaments need at least 2
);

CREATE TABLE tournament_participants (
    participant_entry_id VARCHAR(255) PRIMARY KEY,
    tournament_id VARCHAR(255) NOT NULL, -- FK to tournaments table
    user_id VARCHAR(255) NOT NULL,       -- FK to users table in Auth service (logical)

    registration_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    status VARCHAR(50) NOT NULL DEFAULT 'registered', -- registered, checked_in, playing, eliminated, completed, disqualified, cancelled_registration

    final_rank INT,
    winnings DECIMAL(10, 2),
    winnings_currency VARCHAR(10),
    payout_status VARCHAR(20) DEFAULT 'pending', -- pending, processed, failed

    -- game_specific_scores JSON, -- Store scores from rounds if needed

    -- CONSTRAINT fk_tournament FOREIGN KEY (tournament_id) REFERENCES tournaments(tournament_id) ON DELETE CASCADE, -- Conceptual
    UNIQUE (tournament_id, user_id) -- A user can only register once for a given tournament
);

-- Indexes
CREATE INDEX idx_tournaments_game_id ON tournaments(game_id);
CREATE INDEX idx_tournaments_status ON tournaments(status);
CREATE INDEX idx_tournaments_reg_open_time ON tournaments(registration_open_time);
CREATE INDEX idx_tournaments_reg_close_time ON tournaments(registration_close_time);
CREATE INDEX idx_tournaments_start_time ON tournaments(scheduled_start_time);

CREATE INDEX idx_tournament_participants_tournament_id ON tournament_participants(tournament_id);
CREATE INDEX idx_tournament_participants_user_id ON tournament_participants(user_id);
CREATE INDEX idx_tournament_participants_status ON tournament_participants(status);
CREATE INDEX idx_tournament_participants_rank ON tournament_participants(final_rank);
