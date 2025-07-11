// Data structures specific to the "Chess - Router Wars" game

// Telecom-themed piece names (conceptual)
// Standard names can be used internally by the engine, and themed names for display.
export type TelecomPieceType =
  'DataPacket' | // Pawn
  'Modem'      | // Knight
  'Repeater'   | // Bishop
  'Firewall'   | // Rook
  'Switch'     | // Queen
  'Router';      // King

// Standard piece types for internal logic (using lowercase for compatibility with libraries like chess.js)
export type StandardPieceType = 'p' | 'n' | 'b' | 'r' | 'q' | 'k';
export type PieceColor = 'w' | 'b'; // White or Black

export interface ChessPiece {
  type: StandardPieceType; // Could also store themed_type: TelecomPieceType
  color: PieceColor;
  // Position can be represented by algebraic notation (e.g., "e4") or square index (0-63)
  // For simplicity in game state, algebraic notation is often human-readable.
  // Square indices might be more performant for engine logic.
  // Let's assume the game state might store board as a map of algebraic_pos -> ChessPiece
}

export interface ChessPlayer {
  userId: string; // Platform user ID
  color: PieceColor;
  // Optional: captured_pieces, time_remaining_ms (if timed game)
}

// Represents the state of the chessboard, typically using Forsyth-Edwards Notation (FEN)
// or a more structured object representation. FEN is standard and concise.
export interface ChessBoardState {
  // Option 1: FEN string
  fen?: string;
  // Option 2: Structured board (example: 8x8 array or map)
  // Example: squares: ({ [algebraicPos: string]: ChessPiece | null })
  // For this example, we'll assume the core chess logic might use FEN internally
  // and the GameState might expose a simpler board representation if needed for clients,
  // or clients also understand FEN.
  // For now, let's assume the game state will store the board as a map for easier updates.
  board: { [square: string]: ChessPiece | null }; // e.g., "e2": { type: 'p', color: 'w' }
}

export interface ChessGameState {
  room_id: string;
  game_id: "chess_router_wars"; // Static game ID

  board_state: ChessBoardState; // Current arrangement of pieces

  players: ChessPlayer[]; // [whitePlayer, blackPlayer]
  current_turn_player_id: string; // userId of the player whose turn it is
  current_turn_color: PieceColor;

  // Game status and rules state
  status: 'active' | 'check' | 'checkmate' | 'stalemate' | 'draw_agreement' | 'draw_repetition' | 'draw_fifty_move' | 'draw_insufficient_material' | 'abandoned';
  is_check: boolean;
  is_checkmate: boolean;
  is_stalemate: boolean;
  is_draw: boolean; // General draw flag

  // Castling availability (standard chess notation: KQkq)
  // K = white king-side, Q = white queen-side, k = black king-side, q = black queen-side
  // Example: { wK: true, wQ: true, bK: true, bQ: true }
  castling_availability: {
    wK: boolean; wQ: boolean;
    bK: boolean; bQ: boolean;
  };

  en_passant_target_square?: string | null; // Algebraic notation of the target square, if any

  halfmove_clock: number; // For 50-move rule
  fullmove_number: number; // Starts at 1, increments after Black's move

  move_history_pgn?: string[]; // Array of moves in PGN format
  move_history_uci?: string[]; // Array of moves in UCI format (e.g., "e2e4")

  game_over_details: {
    is_over: boolean;
    winner_player_id?: string | null; // null for a draw
    winner_color?: PieceColor | null;
    reason: string; // e.g., "Checkmate", "Stalemate", "Resignation"
  };

  // Timestamps
  created_at: Date | string;
  started_at?: Date | string;
  last_move_at?: Date | string;
  ended_at?: Date | string;
}

// --- API Request/Response types for Chess actions ---

// Action for a player making a move
export interface ChessMoveAction {
  type: 'MOVE_PIECE';
  player_id: string; // userId of the player making the move
  from_square: string; // Algebraic notation, e.g., "e2"
  to_square: string;   // Algebraic notation, e.g., "e4"
  promotion_piece?: StandardPieceType; // Optional: 'q', 'r', 'b', 'n' if pawn promotion
}

// Action for offering/accepting a draw or resigning
export interface ChessGameControlAction {
    type: 'OFFER_DRAW' | 'ACCEPT_DRAW' | 'DECLINE_DRAW' | 'RESIGN';
    player_id: string;
}

export type ChessPlayerAction = ChessMoveAction | ChessGameControlAction;

// Response after a player action
export interface ChessActionResponse {
  success: boolean;
  message?: string;
  new_game_state: ChessGameState; // The full updated game state
}
