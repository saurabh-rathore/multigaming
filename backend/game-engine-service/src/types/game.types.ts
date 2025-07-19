export interface Game {
  game_id: string;
  name: string;
  description?: string;
  genre?: string;
  min_players: number;
  max_players: number;
  stake_options?: any; // JSON in DB, could be more specific object here
  rules_url?: string;
  assets_url?: string;
  version?: string;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface GameResult {
  result_id: string;
  game_id: string;
  room_id: string;
  user_id: string;
  score: number;
  rank?: number;
  winnings?: number; // Using number for simplicity, consider Decimal.js for precision
  game_specific_data?: any; // JSON in DB
  recorded_at: Date;
}

export interface GameResultRequestBody {
  room_id: string;
  user_id: string;
  score: number;
  rank?: number;
  winnings?: number;
  game_specific_data?: any;
}
