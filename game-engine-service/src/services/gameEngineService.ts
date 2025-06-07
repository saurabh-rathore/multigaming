import { Game, GameResult, GameResultRequestBody } from '../types/game.types';
import { generateId } from '../utils/helpers';

// Placeholder for database interactions
const db = {
  games: new Map<string, Game>(),
  game_results: new Map<string, GameResult>(),
};

// Pre-populate with some mock games
const mockGame1: Game = {
  game_id: generateId('game'), name: 'Ludo Masters', description: 'Classic Ludo game', genre: 'Board',
  min_players: 2, max_players: 4, is_active: true, stake_options: [{amount: 10, currency: "INR"}, {amount: 50, currency: "INR"}],
  created_at: new Date(), updated_at: new Date()
};
const mockGame2: Game = {
  game_id: generateId('game'), name: 'Rummy Royale', description: 'Indian Rummy card game', genre: 'Card',
  min_players: 2, max_players: 5, is_active: true, stake_options: [{amount: 25, currency: "INR"}, {amount: 100, currency: "INR"}],
  created_at: new Date(), updated_at: new Date()
};
const mockGame3: Game = {
  game_id: generateId('game'), name: 'Inactive Game', description: 'This game is not active', genre: 'Puzzle',
  min_players: 1, max_players: 1, is_active: false,
  created_at: new Date(), updated_at: new Date()
};
db.games.set(mockGame1.game_id, mockGame1);
db.games.set(mockGame2.game_id, mockGame2);
db.games.set(mockGame3.game_id, mockGame3);


export class GameEngineService {
  async listActiveGames(): Promise<Game[]> {
    console.log('[GameEngineService] Listing active games.');
    return Array.from(db.games.values()).filter(game => game.is_active);
  }

  async getGameById(gameId: string): Promise<Game | undefined> {
    console.log(`[GameEngineService] Getting game by ID: ${gameId}`);
    return db.games.get(gameId);
  }

  async recordGameResult(gameId: string, data: GameResultRequestBody): Promise<GameResult> {
    console.log(`[GameEngineService] Recording result for game ${gameId}, user ${data.user_id}`);
    const game = db.games.get(gameId);
    if (!game) {
      throw new Error(`Game with ID ${gameId} not found.`);
    }
    if (!game.is_active) {
      throw new Error(`Game with ID ${gameId} is not active and cannot accept results.`);
    }

    // Check for duplicate result (user_id, room_id, game_id) - conceptual
    const existingResult = Array.from(db.game_results.values()).find(
        r => r.game_id === gameId && r.room_id === data.room_id && r.user_id === data.user_id
    );
    if (existingResult) {
        // Depending on policy, could update or throw error. For now, let's throw.
        throw new Error(`Duplicate game result for user ${data.user_id} in room ${data.room_id} for game ${gameId}.`);
    }

    const resultId = generateId('result');
    const newResult: GameResult = {
      result_id: resultId,
      game_id: gameId,
      room_id: data.room_id,
      user_id: data.user_id,
      score: data.score,
      rank: data.rank,
      winnings: data.winnings,
      game_specific_data: data.game_specific_data,
      recorded_at: new Date(),
    };
    db.game_results.set(resultId, newResult);
    console.log(`[GameEngineService] Result ${resultId} recorded.`);
    return newResult;
  }

  async getResultsByRoom(roomId: string): Promise<GameResult[]> {
      return Array.from(db.game_results.values()).filter(r => r.room_id === roomId).sort((a,b) => (a.rank ?? Infinity) - (b.rank ?? Infinity));
  }
}
