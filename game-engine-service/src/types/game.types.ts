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

// Generic Game Room type - matches schema.sql game_rooms table
// Specific game states like LudoGameState or TowerDefenseGameState will be stored in current_game_state
export interface GameRoom<TGameState = any> { // TGameState for specific game's state type
  room_id: string;
  game_id: string;
  game_type: 'PvP' | 'PvE';
  status: 'pending' | 'active' | 'completed' | 'abandoned';

  player1_id: string;
  player2_id?: string | null; // Nullable for PvE or if player2 hasn't joined yet

  current_game_state: TGameState; // This will hold the specific game's state object

  current_turn_player_id?: string | null; // For turn-based games

  game_settings?: any; // JSON in DB, game-specific settings

  winner_user_id?: string | null;

  created_at: Date | string;
  started_at?: Date | string | null;
  last_activity_at: Date | string;
  ended_at?: Date | string | null;
}

// Request to create a new game room
export interface CreateGameRoomRequest {
  game_id: string;
  game_type: 'PvP' | 'PvE';
  player1_id: string; // The user creating the room
  game_settings?: any; // e.g., { map_id: "map1", difficulty: "medium" } for Tower Defense
}

// Request for a player to join a game room (primarily for PvP)
export interface JoinGameRoomRequest {
  player2_id: string; // The user joining
}

// Request for a player to submit an action in a game
export interface SubmitPlayerActionRequest<TAction = any> { // TAction for specific game's action type
  player_id: string;
  action_data: TAction;
}

// Generic response for actions that modify game state
export interface GameActionResponse<TGameState = any> {
    success: boolean;
    message?: string;
    updated_room_state?: GameRoom<TGameState>; // Return the full updated room state
}

// --- Chat Message Types ---
export interface ChatMessage {
    message_id: string;
    room_id: string;
    user_id: string;
    username: string; // Denormalized for display
    message_content: string;
    timestamp: Date | string;
}

export interface SendChatMessagePayload {
    room_id: string;
    message_content: string;
    // user_id and username would come from authenticated socket
}

// --- Socket.IO Event Payloads (Conceptual) ---
// For real-time game updates, chat, and WebRTC signaling

// Generic game state update broadcast to a room
export interface SocketGameStateUpdatePayload<TGameState = any> {
    room_id: string;
    game_state: TGameState;
}

// Chat message broadcast
export interface SocketChatMessagePayload extends ChatMessage {}

// WebRTC Signaling Payloads (simplified examples)
export interface WebRTCSignalPayload {
    room_id: string;
    sender_id: string; // User ID of who sent the signal
    recipient_id?: string; // Target user ID for direct signals (offer, answer), or null for broadcast (candidates)
    signal_type: 'offer' | 'answer' | 'ice_candidate' | 'user_joined_voice' | 'user_left_voice';
    data: any; // The actual SDP offer/answer or ICE candidate
}

// When a user wants to join/leave voice chat for a room
export interface VoiceChatRoomActionPayload {
    room_id: string;
    user_id: string; // User performing the action
}
