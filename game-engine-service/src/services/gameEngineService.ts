import { Game, GameResult, GameResultRequestBody } from '../types/game.types'; // Existing types
import {
    LudoGameState, LudoPlayer, LudoPiece, LudoColor, LudoPieceState, LudoGamePhase,
    CreateLudoGameRequest, LudoRollDiceRequest, LudoMovePieceRequest
} from '../types/ludo.types'; // New Ludo types
import { generateId } from '../utils/helpers';

// --- Mock Data Store for Generic Games & Results (from previous setup) ---
const db = {
  games: new Map<string, Game>(), // Generic game metadata
  game_results: new Map<string, GameResult>(), // Generic game results
};

// Pre-populate with some mock generic games (from previous setup)
const mockGame1_meta: Game = {
  game_id: 'ludo_masters_meta_id', name: 'Ludo Masters', description: 'Classic Ludo game', genre: 'Board',
  min_players: 2, max_players: 4, is_active: true, stake_options: [{amount: 10, currency: "INR"}],
  created_at: new Date(), updated_at: new Date()
};
// Add more mock games if they were part of the original setup
db.games.set(mockGame1_meta.game_id, mockGame1_meta);
// Add Ludo Game ID to metadata if not already present
const LUDO_GAME_ID_CONST = 'ludo_game_official_id'; // Static ID for Ludo game type
if (!db.games.has(LUDO_GAME_ID_CONST)) {
    db.games.set(LUDO_GAME_ID_CONST, {
        game_id: LUDO_GAME_ID_CONST, name: "Ludo Classic",
        description: "The game of Ludo.", genre: "Board",
        min_players: 2, max_players: 4, is_active: true,
        created_at: new Date(), updatedAt: new Date()
    });
}


// --- Mock Data Store for Active Ludo Game States ---
const activeLudoGames = new Map<string, LudoGameState>(); // Key: roomId

export class GameEngineService {
  // === Existing Generic Game Metadata & Results Methods ===
  async listActiveGames(): Promise<Game[]> {
    console.log('[GameEngineService] Listing active games (metadata).');
    return Array.from(db.games.values()).filter(game => game.is_active);
  }

  async getGameById(gameId: string): Promise<Game | undefined> {
    console.log(`[GameEngineService] Getting game metadata by ID: ${gameId}`);
    return db.games.get(gameId);
  }

  async recordGameResult(gameId: string, data: GameResultRequestBody): Promise<GameResult> {
    // ... (implementation from previous step for generic results) ...
    console.log(`[GameEngineService] Recording generic result for game ${gameId}, user ${data.user_id}`);
    const game = db.games.get(gameId);
    if (!game) throw new Error(`Game with ID ${gameId} not found.`);
    if (!game.is_active) throw new Error(`Game with ID ${gameId} is not active.`);
    const resultId = generateId('result');
    const newResult: GameResult = { /* ... as before ... */
        result_id: resultId, game_id: gameId, room_id: data.room_id, user_id: data.user_id,
        score: data.score, rank: data.rank, winnings: data.winnings, recorded_at: new Date()
    };
    db.game_results.set(resultId, newResult);
    return newResult;
  }
  async getResultsByRoom(roomId: string): Promise<GameResult[]> {
      return Array.from(db.game_results.values()).filter(r => r.room_id === roomId);
  }


  // === Ludo Specific Game Logic Methods (Conceptual) ===

  private initializeLudoPieces(color: LudoColor, count: number = 4): LudoPiece[] {
    const pieces: LudoPiece[] = [];
    for (let i = 0; i < count; i++) {
      pieces.push({
        pieceId: `${color}_${i + 1}`,
        color: color,
        position: -1, // Start in home yard (conceptual position)
        state: 'home_yard'
      });
    }
    return pieces;
  }

  async startLudoGame(roomId: string, userIds: string[], gameId: string = LUDO_GAME_ID_CONST): Promise<LudoGameState> {
    console.log(`[GameEngineService] Starting Ludo game in room ${roomId} for users: ${userIds.join(', ')}`);
    if (activeLudoGames.has(roomId)) {
      throw new Error(`Ludo game already active in room ${roomId}.`);
    }
    if (userIds.length < 2 || userIds.length > 4) {
      throw new Error('Ludo requires 2 to 4 players.');
    }

    const colors: LudoColor[] = ['red', 'green', 'yellow', 'blue'];
    const players: LudoPlayer[] = userIds.map((uid, index) => ({
      userId: uid,
      color: colors[index],
      pieces: this.initializeLudoPieces(colors[index]),
      hasRolledSixRecently: false,
      consecutiveSixes: 0,
    }));

    const initialGameState: LudoGameState = {
      roomId,
      gameId, // Static Ludo game ID from metadata
      players,
      currentPlayerUserId: players[0].userId, // First player starts
      gamePhase: 'dice_to_roll',
      turnLog: [`Game started. ${players[0].userId} (Color: ${players[0].color}) to roll.`],
      createdAt: new Date().toISOString(),
      startedAt: new Date().toISOString(),
      lastMoveAt: new Date().toISOString(),
    };
    activeLudoGames.set(roomId, initialGameState);
    return { ...initialGameState }; // Return a copy
  }

  async rollDiceForLudo(roomId: string, userId: string): Promise<LudoGameState> {
    const gameState = activeLudoGames.get(roomId);
    if (!gameState) throw new Error(`Ludo game not found in room ${roomId}.`);
    if (gameState.currentPlayerUserId !== userId) throw new Error(`Not player ${userId}'s turn.`);
    if (gameState.gamePhase !== 'dice_to_roll') throw new Error(`Not the time to roll dice. Current phase: ${gameState.gamePhase}`);

    const diceRoll = Math.floor(Math.random() * 6) + 1;
    gameState.currentDiceRoll = diceRoll;
    gameState.lastMoveAt = new Date().toISOString();

    // Simplified logic:
    gameState.gamePhase = 'piece_to_move';
    gameState.turnLog.push(`${userId} rolled a ${diceRoll}.`);

    // Placeholder for "can any piece move?" logic
    const canMove = true; // Assume player can always move for simplicity here
    if (!canMove) {
        gameState.turnLog.push(`${userId} has no valid moves with ${diceRoll}.`);
        // gameState.gamePhase = 'turn_ended'; // And then switch player
    }

    // Placeholder for "rolled six" logic
    const playerState = gameState.players.find(p => p.userId === userId);
    if (playerState) {
        if (diceRoll === 6) {
            playerState.hasRolledSixRecently = true;
            playerState.consecutiveSixes = (playerState.consecutiveSixes || 0) + 1;
            if (playerState.consecutiveSixes === 3) {
                gameState.turnLog.push(`${userId} rolled three consecutive sixes. Turn skipped.`);
                // gameState.gamePhase = 'turn_ended'; // And switch player
                playerState.consecutiveSixes = 0; // Reset
            } else {
                 // gameState.turnLog.push(`${userId} rolls again.`); // Stays 'piece_to_move' or back to 'dice_to_roll' for same player
            }
        } else {
            playerState.hasRolledSixRecently = false;
            playerState.consecutiveSixes = 0;
        }
    }


    activeLudoGames.set(roomId, gameState);
    return { ...gameState };
  }

  async moveLudoPiece(roomId: string, userId: string, pieceId: string, stepsToTake?: number): Promise<LudoGameState> {
    const gameState = activeLudoGames.get(roomId);
    if (!gameState) throw new Error(`Ludo game not found in room ${roomId}.`);
    if (gameState.currentPlayerUserId !== userId) throw new Error(`Not player ${userId}'s turn.`);
    if (gameState.gamePhase !== 'piece_to_move') throw new Error(`Not the time to move a piece. Phase: ${gameState.gamePhase}`);
    if (!gameState.currentDiceRoll && !stepsToTake) throw new Error('No dice roll available or steps provided to move piece.');

    const player = gameState.players.find(p => p.userId === userId);
    if (!player) throw new Error('Player not found in game state.');
    const piece = player.pieces.find(p => p.pieceId === pieceId);
    if (!piece) throw new Error(`Piece ${pieceId} not found for player ${userId}.`);

    const steps = stepsToTake || gameState.currentDiceRoll!; // Use currentDiceRoll if stepsToTake not provided

    // --- Highly simplified placeholder logic for piece movement ---
    // This does NOT implement actual Ludo board rules, safe zones, captures, home entry, etc.
    if (piece.state === 'home_yard') {
      if (gameState.currentDiceRoll === 6) {
        piece.position = 0; // Conceptual 'start' position for the color
        piece.state = 'on_track';
        gameState.turnLog.push(`${userId} moved ${pieceId} out of home yard.`);
      } else {
        throw new Error(`Piece ${pieceId} needs a 6 to move out of home yard.`);
      }
    } else if (piece.state === 'on_track') {
      piece.position += steps; // Simple addition, no board wrap-around or complex paths
      gameState.turnLog.push(`${userId} moved ${pieceId} by ${steps} steps to ${piece.position}.`);
      // Conceptual: if piece.position > 51 (end of main track for some colors) -> move to 'safe_home_run'
      // Conceptual: if piece.position leads to 'finished' -> update state
    } else if (piece.state === 'safe_home_run') {
        piece.position += steps; // Simplified
        gameState.turnLog.push(`${userId} moved ${pieceId} in home run to ${piece.position}.`);
    }
    // --- End of simplified placeholder logic ---

    gameState.lastMoveAt = new Date().toISOString();

    // Placeholder: Check for win condition (all 4 pieces of a player are 'finished')
    // const allFinished = player.pieces.every(p => p.state === 'finished');
    // if (allFinished) {
    //   gameState.winnerUserId = userId;
    //   gameState.gamePhase = 'finished';
    //   gameState.turnLog.push(`Player ${userId} has won the game!`);
    // } else {
      // Placeholder: Switch turn or roll again if it was a six (simplified)
      if (gameState.currentDiceRoll === 6 && playerState?.consecutiveSixes !==3) { // Check if turn should be skipped due to 3 sixes
        gameState.gamePhase = 'dice_to_roll'; // Same player rolls again
        gameState.turnLog.push(`${userId} (Color: ${player.color}) gets another turn.`);
      } else {
        // Switch to next player
        const currentPlayerIndex = gameState.players.findIndex(p => p.userId === userId);
        const nextPlayerIndex = (currentPlayerIndex + 1) % gameState.players.length;
        gameState.currentPlayerUserId = gameState.players[nextPlayerIndex].userId;
        gameState.gamePhase = 'dice_to_roll';
        gameState.currentDiceRoll = undefined; // Clear dice roll for next player
        if(playerState) { // playerState should exist if we reached here
            playerState.consecutiveSixes = 0; // Reset for current player as their turn part is done
            playerState.hasRolledSixRecently = false;
        }
        gameState.turnLog.push(`Turn ended. ${gameState.currentPlayerUserId} (Color: ${gameState.players[nextPlayerIndex].color}) to play.`);
      }
    // }

    activeLudoGames.set(roomId, gameState);
    return { ...gameState };
  }

  // Method to get current Ludo game state (for polling or UI updates)
  async getLudoGameState(roomId: string): Promise<LudoGameState | undefined> {
    return activeLudoGames.get(roomId);
  }

  // For testing/cleanup
  clearLudoGames(): void {
      activeLudoGames.clear();
  }
}
