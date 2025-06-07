-- Database schema for Game-Engine-Service

-- Games table
-- Stores metadata for each game available on the platform.
CREATE TABLE games (
    game_id VARCHAR(255) PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    genre VARCHAR(50),
    min_players INT DEFAULT 1,
    max_players INT DEFAULT 1,
    stake_options JSON,
    -- Example JSON: '[{"amount": 10, "currency": "INR"}, {"amount": 50, "currency": "INR"}]'
    -- Or: '{"min_stake": 5, "max_stake": 100, "currency": "INR", "allowed_stakes": [5,10,25,50,100]}'
    rules_url TEXT,                     -- URL to detailed game rules
    assets_url TEXT,                    -- URL to game assets (e.g., bundle, images)
    version VARCHAR(20),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    CONSTRAINT check_min_max_players CHECK (min_players <= max_players AND min_players > 0)
);

-- Game Results table
-- Stores the results of completed game instances/rooms for each user.
CREATE TABLE game_results (
    result_id VARCHAR(255) PRIMARY KEY,
    game_id VARCHAR(255) NOT NULL,      -- Foreign key referencing the games table
    room_id VARCHAR(255) NOT NULL,      -- Identifier for the specific game room/instance
    user_id VARCHAR(255) NOT NULL,      -- Foreign key referencing the users table (logical link)
    score INT DEFAULT 0,
    rank INT,                           -- Optional: Rank in the game/room, if applicable
    winnings DECIMAL(10, 2) DEFAULT 0.00, -- Winnings from this specific game, if any
    game_specific_data JSON,            -- Any other data specific to the game's outcome for this user
    recorded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    -- CONSTRAINT fk_game FOREIGN KEY (game_id) REFERENCES games(game_id), -- Conceptual
    UNIQUE (game_id, room_id, user_id) -- Ensures one result per user per game room
);

-- Indexes for performance
CREATE INDEX idx_games_name ON games(name);
CREATE INDEX idx_games_genre ON games(genre);
CREATE INDEX idx_games_is_active ON games(is_active);

CREATE INDEX idx_game_results_game_id ON game_results(game_id);
CREATE INDEX idx_game_results_room_id ON game_results(room_id);
CREATE INDEX idx_game_results_user_id ON game_results(user_id);
CREATE INDEX idx_game_results_recorded_at ON game_results(recorded_at);
