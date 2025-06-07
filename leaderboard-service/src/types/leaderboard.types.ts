// Data structures for the Leaderboard Service

export interface LeaderboardEntry {
  userId: string;
  rank: number;
  score: number; // Could be total score, average score, highest score depending on leaderboard config
  gamesPlayed: number;
  wins?: number; // Optional, if applicable to the game/leaderboard
  totalWinnings?: number; // Optional, if tracking monetary winnings on leaderboard
  lastPlayedAt?: Date; // Could be used for tie-breaking or showing activity
  displayName?: string; // Denormalized from UserProfile service for convenience
}

export type Timeframe = 'daily' | 'weekly' | 'monthly' | 'allTime';

export interface Leaderboard {
  leaderboardId: string; // e.g., game_ludo_weekly_2023_45 or game_rummy_allTime
  gameId: string;
  gameName?: string; // Denormalized for display convenience
  timeframe: Timeframe;
  entries: LeaderboardEntry[];
  generatedAt: Date; // Timestamp when this specific leaderboard data was generated/calculated
  // Optional: Information about what metric is used for ranking
  // rankingMetric?: 'score_high' | 'score_sum' | 'wins' | 'winnings_sum';
  // Optional: Next update time for this leaderboard
  // nextUpdateAt?: Date;
}

// --- Request & Response Types for API Endpoints (conceptual) ---

export interface GetLeaderboardRequestParams {
  gameId: string;
}

export interface GetLeaderboardRequestQuery {
  timeframe?: Timeframe;
  limit?: number; // Number of entries to return
  offset?: number; // For pagination
  // userId?: string; // To highlight a specific user's rank - advanced
}

export interface GetLeaderboardResponse extends Leaderboard {}

// For the mock data source that LeaderboardService will use
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
