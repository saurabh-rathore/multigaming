import {
  MatchmakingQueueEntry, Room, PlayerInRoom, RoomStatus,
  JoinQueueRequestBody, JoinQueueResponse, LeaveQueueResponse
} from '../types/matchmaking.types';
import { generateId } from '../utils/helpers';

// Mock game metadata (min_players, max_players for simulation)
// In a real system, this would come from GameEngineService
interface MockGameInfo {
  gameId: string;
  minPlayers: number;
  maxPlayers: number;
  name?: string; // for display
}
const mockGameData: MockGameInfo[] = [
  { gameId: 'ludo_masters_game_id', minPlayers: 2, maxPlayers: 4, name: 'Ludo Masters' },
  { gameId: 'rummy_royale_game_id', minPlayers: 2, maxPlayers: 5, name: 'Rummy Royale' },
  { gameId: 'solo_challenge_game_id', minPlayers: 1, maxPlayers: 1, name: 'Solo Challenge' },
];

// In-memory store
const queues = new Map<string, MatchmakingQueueEntry[]>(); // Key: gameId_stake (e.g., "ludo_masters_10")
const rooms = new Map<string, Room>(); // Key: roomId

export class MatchmakingService {

  private getQueueKey(gameId: string, stake: any): string {
    // Simple stake representation for key; complex stakes might need normalization
    const stakeKey = typeof stake === 'object' ? JSON.stringify(stake) : String(stake);
    return `${gameId}_${stakeKey}`;
  }

  private getGameInfo(gameId: string): MockGameInfo | undefined {
    return mockGameData.find(g => g.gameId === gameId);
  }

  async joinQueue(userId: string, data: JoinQueueRequestBody): Promise<JoinQueueResponse> {
    const { gameId, stake } = data;
    const gameInfo = this.getGameInfo(gameId);

    if (!gameInfo) {
      throw new Error(`Game with ID ${gameId} not found or not supported for matchmaking.`);
    }

    // Check if user is already in a queue for this game/stake or in an active room for this game
    const queueKey = this.getQueueKey(gameId, stake);
    const currentQueue = queues.get(queueKey) || [];
    if (currentQueue.some(entry => entry.userId === userId && entry.status === 'pending')) {
        throw new Error(`User ${userId} is already in the queue for this game/stake.`);
    }
    // More complex check: is user in any active room for this gameId already? (Out of scope for this simple sim)

    const entryId = generateId('qentry');
    const newEntry: MatchmakingQueueEntry = {
      entryId, userId, gameId, stake, status: 'pending', timestamp: new Date()
    };

    currentQueue.push(newEntry);
    queues.set(queueKey, currentQueue);
    console.log(`[MatchmakingService] User ${userId} joined queue for ${gameInfo.name} (Stake: ${stake}). Entry: ${entryId}. Queue size: ${currentQueue.length}`);

    // Attempt to form a room
    return this.tryFormRoom(gameInfo, stake, queueKey);
  }

  private async tryFormRoom(gameInfo: MockGameInfo, stake: any, queueKey: string): Promise<JoinQueueResponse> {
    const currentQueue = queues.get(queueKey) || [];
    const pendingEntries = currentQueue.filter(e => e.status === 'pending');

    if (pendingEntries.length >= gameInfo.minPlayers) {
      const playersToFormRoom = pendingEntries.slice(0, gameInfo.maxPlayers); // Take up to maxPlayers

      // For simplicity, if minPlayers are present, form a room.
      // Real matchmaking might wait for more players up to maxPlayers, or use a timeout.
      if (playersToFormRoom.length >= gameInfo.minPlayers) {
        const roomId = generateId('room');
        const roomPlayers: PlayerInRoom[] = playersToFormRoom.map(entry => ({
          userId: entry.userId,
          // displayName could be fetched here if needed
        }));

        const newRoom: Room = {
          roomId,
          gameId: gameInfo.gameId,
          players: roomPlayers,
          status: 'pending', // Game server would typically move to 'active'
          stake,
          createdAt: new Date(),
          updatedAt: new Date(),
        };
        rooms.set(roomId, newRoom);

        // Update status of matched players in queue & remove them effectively
        const matchedEntryIds = new Set(playersToFormRoom.map(p => p.entryId));
        const updatedQueue = currentQueue.map(entry =>
            matchedEntryIds.has(entry.entryId) ? {...entry, status: 'matched' as 'matched'} : entry
        ).filter(entry => entry.status !== 'matched'); // Or just filter out matched ones

        queues.set(queueKey, updatedQueue);

        console.log(`[MatchmakingService] Room ${roomId} formed for ${gameInfo.name} with players: ${roomPlayers.map(p=>p.userId).join(', ')}.`);
        // This response is for the user who triggered this check.
        // In a real system, other matched players would be notified via Socket.IO or other push mechanism.
        const currentUserEntry = playersToFormRoom.find(p => p.userId === newRoom.players[newRoom.players.length-1].userId); // Simplistic: assumes last player in list is current

        return {
          entryId: currentUserEntry?.entryId || '', // Should always find the current user
          status: 'matched',
          message: `Successfully matched! Room ID: ${roomId}`,
          room: newRoom,
        };
      }
    }

    // If no room formed for the current user yet
    const currentUserEntry = pendingEntries.find(e => e.status === 'pending'); // Find the current user's pending entry again
    return {
      entryId: currentUserEntry?.entryId || '', // Should find the entry just added
      status: 'queued',
      message: 'Successfully joined queue. Waiting for more players.',
    };
  }

  async getRoomDetails(roomId: string): Promise<Room | undefined> {
    console.log(`[MatchmakingService] Getting details for room: ${roomId}`);
    return rooms.get(roomId);
  }

  async leaveQueue(userId: string, entryId: string): Promise<LeaveQueueResponse> {
    let foundAndRemoved = false;
    for (const [key, queue] of queues.entries()) {
      const entryIndex = queue.findIndex(e => e.entryId === entryId && e.userId === userId && e.status === 'pending');
      if (entryIndex !== -1) {
        queue.splice(entryIndex, 1); // Remove the entry
        queues.set(key, queue); // Update the queue
        foundAndRemoved = true;
        console.log(`[MatchmakingService] User ${userId} (Entry: ${entryId}) left queue ${key}.`);
        break;
      }
    }
    if (foundAndRemoved) {
      return { success: true, message: 'Successfully left the matchmaking queue.' };
    } else {
      throw new Error(`Pending queue entry ${entryId} for user ${userId} not found.`);
    }
  }

  // Helper for tests/dev to see queues
  getQueuesSnapshot(): Map<string, MatchmakingQueueEntry[]> {
      return queues;
  }
}
