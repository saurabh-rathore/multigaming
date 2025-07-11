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

-- Game Rooms table
-- Stores the state and metadata of active or recently completed game instances/rooms.
CREATE TABLE game_rooms (
    room_id VARCHAR(255) PRIMARY KEY,
    game_id VARCHAR(255) NOT NULL,      -- Foreign key referencing the games table
    game_type VARCHAR(10) NOT NULL DEFAULT 'PvE' CHECK (game_type IN ('PvP', 'PvE')), -- Player vs Player or Player vs Environment
    status VARCHAR(50) NOT NULL DEFAULT 'pending',
    -- e.g., 'pending' (waiting for players/setup),
    -- 'active' (game in progress),
    -- 'completed' (game finished normally),
    -- 'abandoned' (game ended prematurely)

    player1_id VARCHAR(255) NOT NULL,   -- User ID of the first player (or host)
    player2_id VARCHAR(255),            -- User ID of the second player (for PvP), or 'AI' identifier for PvE
    -- For games with >2 players, player_ids could be a JSON array or separate table. For now, max 2.

    current_game_state JSON NOT NULL,   -- Serialized JSON string representing the current state of the game
                                        -- Specific structure depends on the game (e.g., LudoGameState, TowerDefenseGameState)

    current_turn_player_id VARCHAR(255),-- For turn-based games, user_id of the player whose turn it is

    game_settings JSON,                 -- Settings specific to this game instance (e.g., map, difficulty, stake)

    winner_user_id VARCHAR(255),        -- User ID of the winner, if applicable

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    started_at TIMESTAMP NULL,          -- When the game actually started (e.g., all players joined, first move made)
    last_activity_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, -- When the last move/action was made
    ended_at TIMESTAMP NULL,            -- When the game concluded

    -- CONSTRAINT fk_room_game FOREIGN KEY (game_id) REFERENCES games(game_id), -- Conceptual
    -- Conceptual FKs for player IDs to an auth service's users table
    -- CONSTRAINT fk_player1 FOREIGN KEY (player1_id) REFERENCES auth_users(user_id),
    -- CONSTRAINT fk_player2 FOREIGN KEY (player2_id) REFERENCES auth_users(user_id)
    -- (player2_id FK needs to allow NULL or handle 'AI' string if not FK)
);

CREATE INDEX idx_game_rooms_game_id ON game_rooms(game_id);
CREATE INDEX idx_game_rooms_status ON game_rooms(status);
CREATE INDEX idx_game_rooms_player1_id ON game_rooms(player1_id);
CREATE INDEX idx_game_rooms_player2_id ON game_rooms(player2_id);
CREATE INDEX idx_game_rooms_last_activity ON game_rooms(last_activity_at DESC);

-- Chat Messages table
-- Stores chat messages sent within game rooms.
CREATE TABLE chat_messages (
    message_id VARCHAR(255) PRIMARY KEY,
    room_id VARCHAR(255) NOT NULL,      -- Foreign key to game_rooms.room_id
    user_id VARCHAR(255) NOT NULL,      -- User ID of the sender
    username VARCHAR(100),              -- Denormalized username for quick display
    message_content TEXT NOT NULL,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (room_id) REFERENCES game_rooms(room_id) ON DELETE CASCADE
    -- Conceptual FK for user_id to an auth service's users table
);

CREATE INDEX idx_chat_messages_room_id_timestamp ON chat_messages(room_id, timestamp DESC);
CREATE INDEX idx_chat_messages_user_id ON chat_messages(user_id);
