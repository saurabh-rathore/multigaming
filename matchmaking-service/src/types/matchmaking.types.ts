// Data structures for the Matchmaking Service

export interface MatchmakingQueueEntry {
  entryId: string; // Unique ID for this queue entry
  userId: string;
  gameId: string;
  stake: any; // Could be an amount, or an object like { amount: number, currency: string }
  timestamp: Date;
  status: 'pending' | 'matched' | 'cancelled'; // 'cancelled' if user leaves queue
  // Optional: User's skill level or rating for more advanced matchmaking
  // skillLevel?: number;
}

export interface PlayerInRoom {
  userId: string;
  displayName?: string; // Could be fetched from UserProfile service if needed
  // Other player-specific state for the room if necessary
  // seatNumber?: number;
}

export type RoomStatus = 'pending' | 'active' | 'finished' | 'aborted';
// 'pending': Room created, waiting for players to confirm or game to start
// 'active': Game is currently in progress in this room
// 'finished': Game has concluded, results may be available
// 'aborted': Game did not start or was cancelled prematurely

export interface Room {
  roomId: string;
  gameId: string;
  players: PlayerInRoom[];
  status: RoomStatus;
  stake: any; // Stake level for this room, consistent with queue entry
  createdAt: Date;
  updatedAt: Date; // When status or player list last changed
  // Optional: gameServerUrl, if applicable once game starts
  // gameServerUrl?: string;
  // Optional: reference to the game results if available
  // gameResultIds?: string[];
}

// --- Request & Response Types for API Endpoints (conceptual) ---

export interface JoinQueueRequestBody {
  gameId: string;
  stake: any;
  // userId is typically from auth context (e.g. JWT)
}

export interface JoinQueueResponse {
  entryId: string;
  status: 'queued' | 'matched'; // 'queued' if waiting, 'matched' if room created immediately
  message: string;
  room?: Room; // Provided if status is 'matched'
}

export interface LeaveQueueRequestBody {
  entryId: string; // User needs to provide their queue entry ID to leave
  // userId from auth context for validation
}

export interface LeaveQueueResponse {
  success: boolean;
  message: string;
}

export interface GetRoomResponse extends Room {}
