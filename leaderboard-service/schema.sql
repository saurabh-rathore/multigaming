-- Database schema for Leaderboard-Service

CREATE TABLE leaderboard_stats (
    user_id VARCHAR(255) NOT NULL,
    game_id VARCHAR(100) NOT NULL,          -- e.g., "ludo", "chess_router_wars", "5g_tower_defense", or "overall"

    total_wins INT DEFAULT 0,
    total_losses INT DEFAULT 0,
    total_draws INT DEFAULT 0,
    total_games_played INT DEFAULT 0,

    total_score BIGINT DEFAULT 0,           -- Sum of scores if applicable
    high_score INT DEFAULT 0,               -- Highest score achieved in a single game session
    average_score FLOAT DEFAULT 0,

    current_win_streak INT DEFAULT 0,
    longest_win_streak INT DEFAULT 0,

    rating INT DEFAULT 1000,                -- ELO-like rating, starting at 1000
    rating_deviation INT DEFAULT 350,       -- For Glicko-like systems, if used
    rating_volatility FLOAT DEFAULT 0.06,   -- For Glicko-like systems, if used

    last_played_at TIMESTAMP NULL,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    PRIMARY KEY (user_id, game_id)
    -- Foreign key to user_profiles.user_id is conceptual.
    -- This service would need to trust the user_id provided or validate it against auth-service.
);

-- Indexes for common query patterns
CREATE INDEX idx_leaderboard_game_wins ON leaderboard_stats(game_id, total_wins DESC);
CREATE INDEX idx_leaderboard_game_rating ON leaderboard_stats(game_id, rating DESC);
CREATE INDEX idx_leaderboard_game_highscore ON leaderboard_stats(game_id, high_score DESC);
CREATE INDEX idx_leaderboard_user_last_played ON leaderboard_stats(user_id, last_played_at DESC);

-- Could also have a table for specific game types if their stats differ greatly,
-- or add JSONB columns for game-specific flexible stats.

-- Example: Table for storing periodic snapshots if historical leaderboards are needed (more advanced)
-- CREATE TABLE leaderboard_snapshots (
--   snapshot_id VARCHAR(255) PRIMARY KEY,
--   game_id VARCHAR(100) NOT NULL,
--   period_type VARCHAR(20) NOT NULL, -- e.g., 'daily', 'weekly', 'monthly_YYYY_MM'
--   created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
--   leaderboard_data JSON -- Store top N players or full snapshot
-- );
-- CREATE INDEX idx_snapshots_game_period ON leaderboard_snapshots(game_id, period_type, created_at DESC);
