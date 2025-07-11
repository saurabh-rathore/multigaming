// Data structures for the Leaderboard Service

// Represents a single user's aggregated stats for a specific game
export interface UserLeaderboardStat {
  user_id: string;
  game_id: string;
  total_wins: number;
  total_losses: number;
  total_draws: number;
  total_games_played: number;
  total_score: number;
  high_score: number;
  average_score: number;
  current_win_streak: number;
  longest_win_streak: number;
  rating: number;
  rating_deviation?: number; // Optional, for more advanced rating systems
  rating_volatility?: number; // Optional
  last_played_at?: Date | string;
  updated_at?: Date | string;
  created_at?: Date | string;
}

// Represents an entry in a displayed leaderboard, enriched with user info
export interface LeaderboardEntry {
  rank: number;
  user_id: string;
  username?: string; // To be fetched from user-profile-service
  avatar_url?: string; // To be fetched from user-profile-service

  // Core stats from UserLeaderboardStat, chosen by the leaderboard type
  score: number; // Generic term, could be total_wins, rating, high_score, etc.
  games_played?: number;
  wins?: number;
  rating?: number;
  // Add other relevant stats as needed for display
}

// Request body for updating a user's stats after a game
// This would typically come from game-engine-service
export interface UpdateUserStatsBody {
  game_id: string;
  outcome: 'win' | 'loss' | 'draw' | 'abandoned'; // 'abandoned' might just update games_played
  score?: number; // Score in that specific game session
  // Potentially other details like opponent_rating if ELO is calculated here
}

// Response for stat update (could be simple ack or updated stats)
export interface UpdateUserStatsResponse {
  message: string;
  updated_stats?: UserLeaderboardStat; // Optionally return the new state
}

// Query parameters for GET leaderboard endpoints
export interface GetLeaderboardQuery {
  metric?: 'wins' | 'rating' | 'high_score' | 'total_score'; // Default to 'wins' or 'rating'
  limit?: number;  // Default to 10 or 25
  offset?: number; // Default to 0
  // timeframe?: 'daily' | 'weekly' | 'monthly' | 'all_time'; // For more advanced leaderboards
}

// Placeholder for user details fetched from user-profile-service
export interface ExternalUserProfile {
    user_id: string;
    username?: string;
    avatar_url?: string;
    // Add other fields if the user-profile-service /profiles/:userId endpoint returns more by default
}

// For the mock data source that LeaderboardService will use (if needed for testing)
// This mirrors GameResult from GameEngineService for simulation purposes
export interface MockGameResult {
  result_id: string;
  game_id: string;
  room_id: string;
  user_id: string;
  score: number;
  rank?: number; // Rank within that specific game room
  winnings?: number;
  game_specific_data?: any;
  recorded_at: Date; // Crucial for timeframe filtering
}
